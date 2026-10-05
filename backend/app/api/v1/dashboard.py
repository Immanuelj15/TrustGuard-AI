from typing import Dict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.core.database import get_db
from app.models import Case, Evidence, AnalysisResult, User, AuditLog, CaseStatus, IOC
from app.schemas import DashboardSummary, DashboardCharts, AuditLogOut
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary", response_model=DashboardSummary)
def api_get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    total_cases = db.query(Case).count()
    open_cases = db.query(Case).filter(Case.status == CaseStatus.OPEN.value).count()
    under_inv = db.query(Case).filter(Case.status == CaseStatus.UNDER_INVESTIGATION.value).count()
    awaiting_review = db.query(Case).filter(Case.status == CaseStatus.AWAITING_REVIEW.value).count()
    
    total_evidence = db.query(Evidence).count()
    evidence_analyzed = db.query(Evidence).filter(Evidence.processing_status == "analyzed").count()
    high_risk_findings = db.query(AnalysisResult).filter(
        AnalysisResult.risk_level.in_(["HIGH", "CRITICAL"])
    ).count()
    iocs_found = db.query(IOC).count()
    active_investigators = db.query(User).filter(User.is_active == True).count()

    return DashboardSummary(
        total_cases=total_cases,
        total_evidence=total_evidence,
        open_cases=open_cases,
        open_investigations=open_cases + under_inv,
        cases_awaiting_review=awaiting_review,
        evidence_analyzed=evidence_analyzed,
        high_risk_findings=high_risk_findings,
        iocs_found=iocs_found,
        active_investigators=active_investigators
    )

@router.get("/charts", response_model=DashboardCharts)
def api_get_dashboard_charts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Cases by status
    cases = db.query(Case).all()
    status_map: Dict[str, int] = {}
    priority_map: Dict[str, int] = {}
    for c in cases:
        status_map[c.status] = status_map.get(c.status, 0) + 1
        priority_map[c.priority] = priority_map.get(c.priority, 0) + 1

    # Evidence by type
    evidence_items = db.query(Evidence).all()
    type_map: Dict[str, int] = {}
    for e in evidence_items:
        type_map[e.evidence_type] = type_map.get(e.evidence_type, 0) + 1

    # Risk distribution
    results = db.query(AnalysisResult).all()
    risk_map: Dict[str, int] = {}
    for r in results:
        risk_map[r.risk_level] = risk_map.get(r.risk_level, 0) + 1

    # IOC frequency by type
    iocs = db.query(IOC).all()
    ioc_freq_map: Dict[str, int] = {}
    for i in iocs:
        ioc_freq_map[i.ioc_type] = ioc_freq_map.get(i.ioc_type, 0) + 1

    # Recent activity
    recent_logs = db.query(AuditLog).order_by(desc(AuditLog.created_at)).limit(8).all()
    recent_activity = [
        AuditLogOut(
            id=l.id,
            user_id=l.user_id,
            user_email=l.user.email if l.user else "System",
            action=l.action,
            case_id=l.case_id,
            evidence_id=l.evidence_id,
            metadata_json=l.metadata_json,
            outcome=l.outcome,
            created_at=l.created_at
        )
        for l in recent_logs
    ]

    return DashboardCharts(
        cases_by_status=status_map,
        cases_by_priority=priority_map,
        evidence_by_type=type_map,
        risk_distribution=risk_map,
        ioc_frequency=ioc_freq_map,
        recent_activity=recent_activity
    )

