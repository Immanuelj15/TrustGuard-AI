import io
from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models import User, UserRole, Evidence
from app.schemas import EvidenceOut
from app.services.auth_service import get_current_user, require_role
from app.services.evidence_service import (
    process_and_store_evidence, get_evidence_by_id, get_evidence_file_bytes
)

router = APIRouter(tags=["Evidence Management"])

@router.post("/cases/{case_id}/evidence", response_model=EvidenceOut, status_code=status.HTTP_201_CREATED)
async def api_upload_evidence(
    case_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN.value, UserRole.INVESTIGATOR.value]))
):
    evidence = process_and_store_evidence(db, case_id, file, current_user)
    return evidence

@router.get("/cases/{case_id}/evidence", response_model=List[EvidenceOut])
def api_list_case_evidence(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    evidence_items = db.query(Evidence).filter(Evidence.case_id == case_id).all()
    return evidence_items

@router.get("/evidence/{evidence_id}", response_model=EvidenceOut)
def api_get_evidence(
    evidence_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    evidence = get_evidence_by_id(db, evidence_id)
    if not evidence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence item not found")
    return evidence

@router.get("/evidence/{evidence_id}/download")
def api_download_evidence(
    evidence_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    data, filename, mime_type = get_evidence_file_bytes(db, evidence_id, current_user)
    return StreamingResponse(
        io.BytesIO(data),
        media_type=mime_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
