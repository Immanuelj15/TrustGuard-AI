from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models import User, UserRole
from app.schemas import EvidenceOut
from app.services.auth_service import get_current_user, require_role
from app.services.synthetic_data_service import SyntheticDataService

router = APIRouter(prefix="/demo", tags=["Synthetic Demo Benchmark"])

class LoadDemoRequest(BaseModel):
    case_id: str
    sample_id: str

@router.get("/manifest")
def get_synthetic_manifest(current_user: User = Depends(get_current_user)):
    """Returns dataset summary manifest for the synthetic demonstration benchmark."""
    return SyntheticDataService.get_manifest()

@router.get("/samples")
def get_synthetic_samples(
    modality: Optional[str] = None,
    limit: int = 100,
    current_user: User = Depends(get_current_user)
):
    """Lists available synthetic demonstration samples across modalities."""
    return SyntheticDataService.get_samples(modality=modality, limit=limit)

@router.post("/load-to-case", response_model=EvidenceOut)
def load_sample_to_case(
    req: LoadDemoRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN.value, UserRole.INVESTIGATOR.value]))
):
    """
    Attaches a synthetic demo asset as verified evidence to an active case.
    Preserves SHA-256 integrity and attaches an immutable audit notice.
    """
    return SyntheticDataService.load_sample_to_case(db, req.case_id, req.sample_id, current_user)

@router.post("/direct-analyze/{sample_id}")
def direct_analyze_sample(
    sample_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Executes live AI inference directly on a synthetic sample without manual uploading.
    Guarantees visible 'DEMO RESULT — GENERATED SYNTHETIC DATA' marking.
    """
    return SyntheticDataService.direct_analyze_sample(sample_id)
