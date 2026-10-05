from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models import User, Evidence, Case, AnalysisJob, AnalysisStatus, EvidenceType
from app.core.storage import storage_client
from app.services.audit_service import log_audit_event
from app.schemas.llm import (
    SuspiciousIndicator,
    EvidenceExplanationResponse,
    CaseSummaryResponse
)
from .config import OpenRouterConfig
from .redaction import sanitize_and_redact_evidence
from .client import OpenRouterClient, OpenRouterError

class OpenRouterService:
    def __init__(self):
        self.client = OpenRouterClient()

    def explain_evidence(
        self,
        db: Session,
        evidence_id: str,
        user: User,
        consent: bool,
        additional_context: Optional[str] = None
    ) -> EvidenceExplanationResponse:
        """
        Explains existing automated analysis findings and evidence excerpts using OpenRouter.
        Enforces explicit user consent, strict PII redaction, and access authorization.
        """
        if not consent:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Explicit user consent is required before transmitting evidence to an external AI service."
            )

        if not OpenRouterConfig.is_enabled():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="OpenRouter external AI service is currently disabled in system configuration."
            )

        if not OpenRouterConfig.get_api_key():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="OpenRouter API key is missing. Please configure OPENROUTER_API_KEY."
            )

        evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
        if not evidence:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence item not found")

        # Extract text content or transcript
        text_source = ""
        analysis_context = {}

        # Fetch latest completed analysis result if present
        latest_job = (
            db.query(AnalysisJob)
            .filter(AnalysisJob.evidence_id == evidence.id, AnalysisJob.status == AnalysisStatus.COMPLETED.value)
            .order_by(AnalysisJob.started_at.desc())
            .first()
        )

        if latest_job and latest_job.result:
            res = latest_job.result
            analysis_context = {
                "risk_level": res.risk_level,
                "risk_score": res.risk_score,
                "model_name": latest_job.model_name,
                "findings": res.findings_json,
                "existing_limitations": res.limitations_json
            }

        if evidence.evidence_type == EvidenceType.TEXT.value:
            raw_bytes = storage_client.get_bytes(evidence.stored_object_key)
            text_source = raw_bytes.decode("utf-8", errors="replace") if raw_bytes else ""
        elif evidence.evidence_type == EvidenceType.AUDIO.value:
            # For audio, use Whisper transcription from analysis findings ONLY
            transcript = ""
            if latest_job and latest_job.result:
                transcript = latest_job.result.findings_json.get("transcription", "")
            
            if not transcript:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No speech-to-text transcript found for this audio evidence. Please run audio analysis first to generate a Whisper transcript."
                )
            text_source = transcript
        elif evidence.evidence_type == EvidenceType.VIDEO.value:
            # For video, do NOT send raw media; summarize findings metadata
            text_source = f"Video Analysis Findings Summary: {latest_job.result.findings_json if (latest_job and latest_job.result) else 'Metadata analysis pending.'}"
        else:
            raw_bytes = storage_client.get_bytes(evidence.stored_object_key)
            text_source = raw_bytes.decode("utf-8", errors="replace") if raw_bytes else ""

        if not text_source.strip() and latest_job and latest_job.result and latest_job.result.findings_json:
            snippets = []
            for ind in latest_job.result.findings_json.get("indicators", []):
                for m in ind.get("matches", []):
                    if m.get("context_snippet"):
                        snippets.append(m.get("context_snippet"))
                    elif m.get("matched_text"):
                        snippets.append(m.get("matched_text"))
            if snippets:
                text_source = " ".join(snippets)

        if not text_source.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Evidence text is empty or could not be retrieved for explanation."
            )

        # Apply Privacy & PII Redaction
        redacted_text, was_redacted, redaction_notes = sanitize_and_redact_evidence(text_source)
        redaction_notice = "; ".join(redaction_notes) if was_redacted else "No sensitive identifiers detected."

        # Construct System & User Prompts
        system_prompt = (
            "You are TrustGuard AI's forensic reasoning and evidence explanation assistant. "
            "Your objective is to provide clear, neutral, explainable insights on digital communication evidence, "
            "identify social-engineering techniques, explain why automated indicators triggered, and recommend "
            "practical next investigative steps.\n\n"
            "STRICT RULES:\n"
            "1. NEVER make definitive claims of legal criminal guilt or evidence authenticity.\n"
            "2. Treat all text as allegations/claims under investigation.\n"
            "3. Return ONLY valid JSON adhering strictly to the required schema.\n"
            "4. Your response must be an objective investigative aid."
        )

        user_prompt = (
            f"Please analyze and explain the following evidence excerpt and automated detection findings.\n\n"
            f"--- EVIDENCE TYPE: {evidence.evidence_type.upper()} ({evidence.original_filename}) ---\n"
            f"--- REDACTED EXCERPT / TRANSCRIPT ---\n{redacted_text}\n\n"
            f"--- EXISTING AUTOMATED DETECTION CONTEXT ---\n"
            f"Initial Risk Level: {analysis_context.get('risk_level', 'Not Yet Assessed')}\n"
            f"Initial Risk Score: {analysis_context.get('risk_score', 'N/A')}\n"
            f"Inspecting Model: {analysis_context.get('model_name', 'RuleEngine')}\n"
            f"Automated Indicators: {analysis_context.get('findings', {}).get('distinct_indicator_categories', [])}\n"
        )
        if additional_context:
            user_prompt += f"\n--- INVESTIGATOR NOTES ---\n{additional_context}\n"

        user_prompt += (
            "\nOutput must be a JSON object with keys:\n"
            "- summary: string (concise explanation)\n"
            "- suspicious_indicators: list of objects {indicator: str, reason: str, supporting_text: str}\n"
            "- possible_social_engineering_tactics: list of strings\n"
            "- recommended_investigation_steps: list of strings\n"
            "- limitations: list of strings (always include that this is an AI aid, not definitive proof)\n"
            "- overall_assessment: string ('LOW', 'MEDIUM', 'HIGH', or 'INCONCLUSIVE')\n"
        )

        model_name = OpenRouterConfig.get_model()

        try:
            raw_response = self.client.complete_chat(system_prompt, user_prompt)
            
            # Parse indicators safely
            indicators_data = raw_response.get("suspicious_indicators", [])
            parsed_indicators = []
            for item in indicators_data:
                if isinstance(item, dict):
                    parsed_indicators.append(
                        SuspiciousIndicator(
                            indicator=str(item.get("indicator", "Indicator")),
                            reason=str(item.get("reason", "")),
                            supporting_text=str(item.get("supporting_text", ""))
                        )
                    )

            explanation = EvidenceExplanationResponse(
                summary=raw_response.get("summary", "Analysis explanation completed."),
                suspicious_indicators=parsed_indicators,
                possible_social_engineering_tactics=raw_response.get("possible_social_engineering_tactics", []),
                recommended_investigation_steps=raw_response.get("recommended_investigation_steps", []),
                limitations=raw_response.get("limitations", [
                    "AI-generated explanation is an investigative aid, not proof or a legal conclusion."
                ]),
                overall_assessment=raw_response.get("overall_assessment", "INCONCLUSIVE").upper(),
                provider="OpenRouter",
                model_id=model_name,
                generated_at=datetime.now(timezone.utc).isoformat(),
                is_live_inference=True,
                was_redacted=was_redacted,
                redaction_notice=redaction_notice,
                evidence_id=evidence.id,
                case_id=evidence.case_id
            )

            # Audit log record (no secrets, no full sensitive prompt)
            log_audit_event(
                db,
                action="EXTERNAL_LLM_EXPLANATION_GENERATED",
                user_id=user.id,
                case_id=evidence.case_id,
                evidence_id=evidence.id,
                metadata={
                    "provider": "OpenRouter",
                    "model": model_name,
                    "evidence_type": evidence.evidence_type,
                    "was_redacted": was_redacted,
                    "redaction_notice": redaction_notice,
                    "overall_assessment": explanation.overall_assessment
                },
                outcome="success"
            )

            return explanation

        except OpenRouterError as e:
            log_audit_event(
                db,
                action="EXTERNAL_LLM_EXPLANATION_FAILED",
                user_id=user.id,
                case_id=evidence.case_id,
                evidence_id=evidence.id,
                metadata={"provider": "OpenRouter", "model": model_name, "error": str(e.message)},
                outcome="failure"
            )
            raise HTTPException(status_code=e.status_code, detail=f"OpenRouter Error: {e.message}")
        except Exception as e:
            log_audit_event(
                db,
                action="EXTERNAL_LLM_EXPLANATION_FAILED",
                user_id=user.id,
                case_id=evidence.case_id,
                evidence_id=evidence.id,
                metadata={"provider": "OpenRouter", "model": model_name, "error": str(e)},
                outcome="failure"
            )
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to generate explanation: {str(e)}")

    def summarize_case(
        self,
        db: Session,
        case_id: str,
        user: User,
        consent: bool,
        focus_areas: Optional[List[str]] = None
    ) -> CaseSummaryResponse:
        """
        Generates an executive case overview from non-sensitive case metadata and analysis findings.
        """
        if not consent:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Explicit user consent is required before transmitting case data to an external AI service."
            )

        case = db.query(Case).filter(Case.id == case_id).first()
        if not case:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

        # Compile evidence summary
        evidence_summaries = []
        for ev in case.evidence_items:
            ev_summary = f"- Evidence {ev.original_filename} ({ev.evidence_type}): Status={ev.processing_status}"
            for job in ev.analysis_jobs:
                if job.result:
                    ev_summary += f", Risk={job.result.risk_level} ({job.result.risk_score}/100)"
            evidence_summaries.append(ev_summary)

        evidence_block = "\n".join(evidence_summaries) if evidence_summaries else "No evidence uploaded yet."
        case_desc, was_redacted, notes = sanitize_and_redact_evidence(case.description or "")

        system_prompt = (
            "You are TrustGuard AI's senior cybersecurity investigation assistant. "
            "Synthesize the following cybercrime case details into an executive summary and recommended follow-up steps. "
            "Maintain strict objectivity and do not draw uncorroborated legal conclusions. "
            "Return valid JSON only."
        )

        user_prompt = (
            f"Case Number: {case.case_number}\n"
            f"Title: {case.title}\n"
            f"Complaint Category: {case.complaint_category}\n"
            f"Priority: {case.priority}\n"
            f"Status: {case.status}\n"
            f"Redacted Description: {case_desc}\n\n"
            f"Evidence & Risk Overview:\n{evidence_block}\n"
        )
        if focus_areas:
            user_prompt += f"Specific Focus Areas Requested: {', '.join(focus_areas)}\n"

        user_prompt += (
            "\nOutput must be a JSON object with keys:\n"
            "- summary: string\n"
            "- key_findings: list of strings\n"
            "- threat_actor_tactics: list of strings\n"
            "- recommended_next_steps: list of strings\n"
            "- limitations: list of strings\n"
        )

        model_name = OpenRouterConfig.get_model()

        try:
            raw_response = self.client.complete_chat(system_prompt, user_prompt)
            
            response = CaseSummaryResponse(
                case_id=case.id,
                case_number=case.case_number,
                summary=raw_response.get("summary", "Case summary generated."),
                key_findings=raw_response.get("key_findings", []),
                threat_actor_tactics=raw_response.get("threat_actor_tactics", []),
                recommended_next_steps=raw_response.get("recommended_next_steps", []),
                limitations=raw_response.get("limitations", [
                    "AI case synthesis is an investigative briefing aid, not legal proof."
                ]),
                provider="OpenRouter",
                model_id=model_name,
                generated_at=datetime.now(timezone.utc).isoformat(),
                is_live_inference=True,
                was_redacted=was_redacted,
                redaction_notice="; ".join(notes) if was_redacted else None
            )

            log_audit_event(
                db,
                action="EXTERNAL_LLM_CASE_SUMMARY_GENERATED",
                user_id=user.id,
                case_id=case.id,
                metadata={
                    "provider": "OpenRouter",
                    "model": model_name,
                    "case_number": case.case_number,
                    "was_redacted": was_redacted
                },
                outcome="success"
            )

            return response

        except OpenRouterError as e:
            raise HTTPException(status_code=e.status_code, detail=f"OpenRouter Error: {e.message}")
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to generate case summary: {str(e)}")
