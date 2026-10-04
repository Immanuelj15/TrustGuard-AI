from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models import Evidence, AnalysisJob, AnalysisResult, AnalysisStatus, User, EvidenceType
from app.core.storage import storage_client
from app.core.config import settings
from app.ai.text_analyzer import analyze_scam_text
from app.ai.audio_analyzer import analyze_audio_file
from app.ai.video_analyzer import analyze_video_file
from app.services.audit_service import log_audit_event

def create_and_run_analysis(
    db: Session,
    evidence_id: str,
    analysis_type: str,
    user: User
) -> AnalysisJob:
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence not found")

    # Map analysis type
    atype = analysis_type.lower()
    if atype == "auto":
        if evidence.evidence_type == EvidenceType.AUDIO.value:
            atype = "audio"
        elif evidence.evidence_type == EvidenceType.VIDEO.value:
            atype = "video"
        else:
            atype = "text"

    # Create job entry
    job = AnalysisJob(
        evidence_id=evidence_id,
        analysis_type=atype,
        status=AnalysisStatus.PROCESSING.value,
        model_name="TrustGuard-ForensicEngine",
        model_version="1.0"
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Perform analysis
    try:
        if atype == "text":
            # Read text content from storage
            raw_bytes = storage_client.get_bytes(evidence.stored_object_key)
            text_content = raw_bytes.decode("utf-8", errors="replace") if raw_bytes else ""
            analysis_output = analyze_scam_text(text_content)
        elif atype == "audio":
            local_path = storage_client.get_local_path(evidence.stored_object_key)
            analysis_output = analyze_audio_file(local_path or "", is_demo_mode=settings.DEMO_MODE)
        elif atype == "video":
            local_path = storage_client.get_local_path(evidence.stored_object_key)
            analysis_output = analyze_video_file(local_path or "", is_demo_mode=settings.DEMO_MODE)
        else:
            # Fallback text analysis
            raw_bytes = storage_client.get_bytes(evidence.stored_object_key)
            text_content = raw_bytes.decode("utf-8", errors="replace") if raw_bytes else ""
            analysis_output = analyze_scam_text(text_content)

        # Update Job
        job.status = AnalysisStatus.COMPLETED.value
        job.model_name = analysis_output.get("model_name", "TrustGuard-Engine")
        job.model_version = analysis_output.get("model_version", "1.0")
        job.completed_at = datetime.now(timezone.utc)

        # Create Result
        result = AnalysisResult(
            analysis_job_id=job.id,
            risk_level=analysis_output["risk_level"],
            risk_score=analysis_output["risk_score"],
            model_confidence=analysis_output.get("model_confidence", 0.8),
            findings_json=analysis_output.get("findings", {}),
            limitations_json=analysis_output.get("limitations", [])
        )
        db.add(result)
        
        evidence.processing_status = "analyzed"
        db.commit()
        db.refresh(job)

        log_audit_event(
            db,
            action="ANALYSIS_COMPLETED",
            user_id=user.id,
            case_id=evidence.case_id,
            evidence_id=evidence.id,
            metadata={
                "job_id": job.id,
                "analysis_type": atype,
                "risk_level": result.risk_level,
                "risk_score": result.risk_score
            }
        )
        return job

    except Exception as e:
        job.status = AnalysisStatus.FAILED.value
        job.error_message = str(e)
        job.completed_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(job)

        log_audit_event(
            db,
            action="ANALYSIS_FAILED",
            user_id=user.id,
            case_id=evidence.case_id,
            evidence_id=evidence.id,
            metadata={"job_id": job.id, "error": str(e)},
            outcome="failure"
        )
        return job
