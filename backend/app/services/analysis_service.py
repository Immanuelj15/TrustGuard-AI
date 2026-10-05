from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models import Evidence, AnalysisJob, AnalysisResult, AnalysisStatus, User, EvidenceType
from app.core.storage import storage_client
from app.core.config import settings
from app.services.ml_services import (
    ScamTextAnalysisService,
    AudioAnalysisService,
    VideoAnalysisService,
    ModelRegistryService
)
from app.services.audit_service import log_audit_event

# Initialize services
text_service = ScamTextAnalysisService()
audio_service = AudioAnalysisService()
video_service = VideoAnalysisService()

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

    # Fetch model registry metadata
    meta = ModelRegistryService.get_instance().get_metadata(atype)

    # Create job entry
    job = AnalysisJob(
        evidence_id=evidence_id,
        analysis_type=atype,
        status=AnalysisStatus.PROCESSING.value,
        model_name=meta.get("model_name", "TrustGuard-Engine"),
        model_version=meta.get("model_version", "1.0")
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    from app.services.timeline_service import record_timeline_event
    from app.services.ioc_service import extract_and_store_iocs

    record_timeline_event(
        db,
        case_id=evidence.case_id,
        evidence_id=evidence.id,
        user_id=user.id,
        event_type="ANALYSIS_STARTED",
        title=f"Analysis Started: {atype.upper()}",
        description=f"Initiated {atype} inspection with {job.model_name}.",
        metadata={"job_id": job.id, "analysis_type": atype}
    )

    # Perform analysis
    try:
        text_for_iocs = ""
        if atype == "text":
            raw_bytes = storage_client.get_bytes(evidence.stored_object_key)
            text_content = raw_bytes.decode("utf-8", errors="replace") if raw_bytes else ""
            analysis_output = text_service.analyze(text_content)
            text_for_iocs = text_content
        elif atype == "audio":
            local_path = storage_client.get_local_path(evidence.stored_object_key)
            analysis_output = audio_service.analyze(local_path or "", is_demo_mode=settings.DEMO_MODE)
            text_for_iocs = analysis_output.get("findings", {}).get("transcript", "")
        elif atype == "video":
            local_path = storage_client.get_local_path(evidence.stored_object_key)
            analysis_output = video_service.analyze(local_path or "", is_demo_mode=settings.DEMO_MODE)
        else:
            raw_bytes = storage_client.get_bytes(evidence.stored_object_key)
            text_content = raw_bytes.decode("utf-8", errors="replace") if raw_bytes else ""
            analysis_output = text_service.analyze(text_content)
            text_for_iocs = text_content

        # Update Job
        job.status = AnalysisStatus.COMPLETED.value
        job.model_name = analysis_output.get("model_name", meta.get("model_name"))
        job.model_version = analysis_output.get("model_version", meta.get("model_version"))
        job.completed_at = datetime.now(timezone.utc)

        # Create Result
        findings = analysis_output.get("findings", {})
        findings["dataset_version_used_for_training"] = analysis_output.get("dataset_version_used_for_training", "Benchmark")

        result = AnalysisResult(
            analysis_job_id=job.id,
            risk_level=analysis_output["risk_level"],
            risk_score=analysis_output["risk_score"],
            model_confidence=analysis_output.get("model_confidence", 0.8),
            findings_json=findings,
            limitations_json=analysis_output.get("limitations", [])
        )
        db.add(result)
        
        evidence.processing_status = "analyzed"
        db.commit()
        db.refresh(job)

        # Extract and persist IOCs if text/transcript is available
        if text_for_iocs:
            try:
                extract_and_store_iocs(db, case_id=evidence.case_id, evidence_id=evidence.id, text=text_for_iocs)
            except Exception as e:
                pass

        # Record timeline event
        record_timeline_event(
            db,
            case_id=evidence.case_id,
            evidence_id=evidence.id,
            user_id=user.id,
            event_type="ANALYSIS_COMPLETED",
            title=f"Analysis Completed ({atype.upper()}): {result.risk_level} ({result.risk_score}/100)",
            description=f"Completed with {job.model_name}. Risk score: {result.risk_score}.",
            metadata={
                "job_id": job.id,
                "analysis_type": atype,
                "risk_level": result.risk_level,
                "risk_score": result.risk_score
            }
        )

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
                "risk_score": result.risk_score,
                "dataset_trained_on": findings["dataset_version_used_for_training"]
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
