from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models import User
from app.schemas import CallerCheckRequest, CallerCheckResponse, CallerReportCreate, CallerReportOut
from app.services.auth_service import get_current_user
from app.services.caller_service import check_caller_reputation, create_caller_report, list_caller_reports

router = APIRouter(prefix="/caller", tags=["Caller Reputation"])

@router.post("/check", response_model=CallerCheckResponse)
def api_check_caller(
    check_req: CallerCheckRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return check_caller_reputation(
        db=db,
        phone_number=check_req.phone_number,
        country_code=check_req.country_code,
        user=current_user
    )

@router.post("/report", response_model=CallerReportOut, status_code=status.HTTP_201_CREATED)
def api_report_caller(
    report_in: CallerReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    report = create_caller_report(db, report_in, current_user)
    return report

@router.get("/reports", response_model=List[CallerReportOut])
def api_get_caller_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    reports = list_caller_reports(db)
    return reports
