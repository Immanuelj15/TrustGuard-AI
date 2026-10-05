from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.models import Case, Evidence, AnalysisJob, IOC, InvestigatorNote
from app.core.config import settings
from app.ai.openrouter.client import OpenRouterClient
from app.ai.openrouter.config import OpenRouterConfig
from app.ai.openrouter.redaction import redact_pii

def build_case_context(db: Session, case_id: str) -> Dict[str, Any]:
    """
    Assembles complete factual context for a case to ground Copilot responses.
    """
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        return {}

    evidence_list = db.query(Evidence).filter(Evidence.case_id == case_id).all()
    iocs = db.query(IOC).filter(IOC.case_id == case_id).all()
    notes = db.query(InvestigatorNote).filter(InvestigatorNote.case_id == case_id).all()

    evidence_summaries = []
    for ev in evidence_list:
        jobs = db.query(AnalysisJob).filter(
            AnalysisJob.evidence_id == ev.id,
            AnalysisJob.status == "completed"
        ).all()
        
        job_findings = []
        for j in jobs:
            if j.result:
                job_findings.append({
                    "type": j.analysis_type,
                    "risk_score": j.result.risk_score,
                    "risk_level": j.result.risk_level,
                    "indicators": j.result.findings_json.get("indicators", []),
                    "transcript": j.result.findings_json.get("transcript", "")
                })

        evidence_summaries.append({
            "evidence_id": ev.id,
            "filename": ev.original_filename,
            "type": ev.evidence_type,
            "sha256": ev.sha256_hash,
            "findings": job_findings
        })

    ioc_list = [
        {"type": i.ioc_type, "value": i.value, "evidence_id": i.evidence_id}
        for i in iocs
    ]

    note_list = [
        {"author_id": n.user_id, "note": n.note, "created_at": n.created_at.isoformat()}
        for n in notes
    ]

    return {
        "case_number": case.case_number,
        "title": case.title,
        "category": case.complaint_category,
        "priority": case.priority,
        "status": case.status,
        "evidence_items": evidence_summaries,
        "extracted_iocs": ioc_list,
        "investigator_notes": note_list
    }

def answer_case_question_locally(question: str, context: Dict[str, Any]) -> str:
    """
    Deterministic rule-based QA engine when OpenRouter is disabled or unreachable.
    """
    q = question.lower()
    
    # 1. Indicators query
    if any(k in q for k in ["strongest", "indicator", "suspicious", "risk", "scam"]):
        all_indicators = []
        for ev in context.get("evidence_items", []):
            for f in ev.get("findings", []):
                for ind in f.get("indicators", []):
                    all_indicators.append((ev["filename"], ind.get("category", "General"), ind.get("description", "")))
        
        if not all_indicators:
            return f"No severe scam indicators were flagged in the {len(context.get('evidence_items', []))} analyzed evidence items for {context.get('case_number')}."
        
        lines = [f"Strongest suspicious indicators identified in Case {context.get('case_number')}:"]
        for fn, cat, desc in all_indicators[:5]:
            lines.append(f"• [{fn}] {cat}: {desc}")
        return "\n".join(lines)

    # 2. Shared domain / URL query
    if any(k in q for k in ["domain", "url", "same", "shared", "link", "website"]):
        domains = [i["value"] for i in context.get("extracted_iocs", []) if i["type"] in ("domain", "url")]
        if not domains:
            return f"Insufficient domain/URL evidence in Case {context.get('case_number')}. No external links were extracted."
        return f"Domains and URLs extracted in Case {context.get('case_number')}:\n" + "\n".join(f"• {d}" for d in set(domains))

    # 3. Summary query
    if any(k in q for k in ["summarize", "summary", "overview", "what happened"]):
        ev_count = len(context.get("evidence_items", []))
        ioc_count = len(context.get("extracted_iocs", []))
        notes_count = len(context.get("investigator_notes", []))
        return (
            f"Investigation Summary for {context.get('case_number')} ({context.get('title')}):\n"
            f"• Category: {context.get('category')} (Priority: {context.get('priority').upper()})\n"
            f"• Status: {context.get('status')}\n"
            f"• Evidence Vault: {ev_count} digital artifacts ingested and hashed with SHA-256.\n"
            f"• IOCs Identified: {ioc_count} extracted indicators (phones, emails, domains).\n"
            f"• Investigator Notes: {notes_count} entries recorded.\n"
            f"This summary is generated from local deterministic records."
        )

    # 4. Next steps / verify query
    if any(k in q for k in ["verify", "next", "what should i", "recommend", "action"]):
        return (
            f"Recommended Forensic Next Steps for Case {context.get('case_number')}:\n"
            f"1. Independent Domain Verification: Check WHOIS creation dates for extracted domains to detect freshly registered lookalikes.\n"
            f"2. Telecom Carrier Triage: Query suspect phone numbers via the Caller Reputation tab to verify line type and reported fraud flags.\n"
            f"3. SHA-256 Hash Audit: Re-verify cryptographic integrity of stored evidence in the Evidence Vault.\n"
            f"4. Official Verification: Never rely solely on digital notices; verify any alleged police/court summons via official state helplines."
        )

    # Default fallback
    return (
        f"Case {context.get('case_number')} contains {len(context.get('evidence_items', []))} evidence item(s) and {len(context.get('extracted_iocs', []))} extracted IOC(s). "
        f"For deeper conversational reasoning, enable the optional OpenRouter LLM in backend settings. Otherwise, query specific indicators, domains, or investigation summaries."
    )

def query_case_copilot(
    db: Session,
    case_id: str,
    question: str,
    investigator_consent: bool = False
) -> Dict[str, Any]:
    """
    Executes a grounded question-answering workflow against the case's evidence context.
    Uses OpenRouter with strict PII redaction if enabled and consent is granted,
    or falls back to local deterministic analysis.
    """
    context = build_case_context(db, case_id)
    if not context:
        return {
            "answer": "Case not found.",
            "provider": "LOCAL_FALLBACK",
            "references": []
        }

    # Extract references from evidence and IOCs
    references = [e["filename"] for e in context.get("evidence_items", [])]

    # Check if OpenRouter is enabled and consent given
    if OpenRouterConfig.is_enabled() and OpenRouterConfig.is_configured() and investigator_consent:
        try:
            # Build redacted context prompt
            raw_context_str = (
                f"Case: {context['case_number']} - {context['title']}\n"
                f"Category: {context['category']}, Priority: {context['priority']}\n"
                f"Evidence Items: {[e['filename'] for e in context['evidence_items']]}\n"
                f"IOCs: {[i['value'] for i in context['extracted_iocs']]}\n"
                f"Notes: {[n['note'] for n in context['investigator_notes']]}\n"
            )
            clean_context, _ = redact_pii(raw_context_str)

            system_prompt = (
                "You are TrustGuard AI Copilot, a forensic investigation decision-support assistant. "
                "Answer the investigator's question STRICTLY based on the provided Case Evidence Context. "
                "Cite evidence filenames and IOC values where relevant. "
                "Do NOT make legal conclusions, accuse individuals of crimes, or invent evidence. "
                "If information is unavailable in the context, explicitly state: 'Insufficient evidence in the current case context.' "
                "Never execute commands or write code to modify evidence."
            )

            client = OpenRouterClient()
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Case Evidence Context:\n{clean_context}\n\nQuestion: {question}"}
            ]

            resp = client.chat_completion(messages=messages, temperature=0.2)
            answer = resp["choices"][0]["message"]["content"]

            return {
                "answer": answer,
                "provider": "OPENROUTER_LLM",
                "model": resp.get("model", OpenRouterConfig.MODEL),
                "references": references,
                "disclaimer": "AI-generated Copilot guidance is an investigative aid and requires human verification."
            }
        except Exception as e:
            # Fallback to local answering if cloud LLM call fails
            local_ans = answer_case_question_locally(question, context)
            return {
                "answer": local_ans,
                "provider": "LOCAL_RULE_BASED",
                "note": f"OpenRouter unavailable ({str(e)[:50]}). Responded using local forensic engine.",
                "references": references,
                "disclaimer": "Deterministic local extraction based on case database records."
            }

    # Local fallback
    local_ans = answer_case_question_locally(question, context)
    return {
        "answer": local_ans,
        "provider": "LOCAL_RULE_BASED",
        "references": references,
        "disclaimer": "Deterministic local extraction based on case database records."
    }
