import io
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models import User, UserRole, GeneratedReport
from app.schemas import ReportOut, ReportGenerateRequest
from app.services.auth_service import get_current_user, require_role
from app.services.report_service import generate_case_report, list_case_reports, get_report_bytes

router = APIRouter(tags=["Investigation Reports"])

@router.post("/cases/{case_id}/reports", response_model=ReportOut, status_code=status.HTTP_201_CREATED)
def api_generate_report(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN.value, UserRole.INVESTIGATOR.value]))
):
    report = generate_case_report(db, case_id, current_user)
    return report

@router.get("/cases/{case_id}/reports", response_model=List[ReportOut])
def api_list_reports(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return list_case_reports(db, case_id)

@router.get("/reports/{report_id}/download")
def api_download_report(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    data, filename = get_report_bytes(db, report_id, current_user)
    return StreamingResponse(
        io.BytesIO(data),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
