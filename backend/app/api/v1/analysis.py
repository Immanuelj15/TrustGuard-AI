from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models import User, UserRole, AnalysisJob, AnalysisResult
from app.schemas import AnalysisJobOut, AnalysisResultOut, AnalysisTriggerRequest
from app.services.auth_service import get_current_user, require_role
from app.services.analysis_service import create_and_run_analysis

router = APIRouter(tags=["Analysis Engine"])

@router.post("/evidence/{evidence_id}/analyze/audio", response_model=AnalysisJobOut)
def api_analyze_audio(
    evidence_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN.value, UserRole.INVESTIGATOR.value]))
):
    return create_and_run_analysis(db, evidence_id, "audio", current_user)

@router.post("/evidence/{evidence_id}/analyze/video", response_model=AnalysisJobOut)
def api_analyze_video(
    evidence_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN.value, UserRole.INVESTIGATOR.value]))
):
    return create_and_run_analysis(db, evidence_id, "video", current_user)

@router.post("/evidence/{evidence_id}/analyze/text", response_model=AnalysisJobOut)
def api_analyze_text(
    evidence_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN.value, UserRole.INVESTIGATOR.value]))
):
    return create_and_run_analysis(db, evidence_id, "text", current_user)

@router.post("/evidence/{evidence_id}/analyze", response_model=AnalysisJobOut)
def api_analyze_generic(
    evidence_id: str,
    trigger_req: Optional[AnalysisTriggerRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN.value, UserRole.INVESTIGATOR.value]))
):
    atype = trigger_req.analysis_type if trigger_req and trigger_req.analysis_type else "auto"
    return create_and_run_analysis(db, evidence_id, atype, current_user)

@router.get("/analysis/{job_id}", response_model=AnalysisJobOut)
def api_get_analysis_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    job = db.query(AnalysisJob).filter(AnalysisJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis job not found")
    return job

@router.get("/evidence/{evidence_id}/results", response_model=List[AnalysisJobOut])
def api_get_evidence_analysis_results(
    evidence_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    jobs = db.query(AnalysisJob).filter(AnalysisJob.evidence_id == evidence_id).order_by(AnalysisJob.started_at.desc()).all()
    return jobs
