from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.core.database import get_db
from app.models import AuditLog, User, UserRole
from app.schemas import AuditLogOut
from app.services.auth_service import require_role

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])

@router.get("", response_model=List[AuditLogOut])
def api_get_audit_logs(
    case_id: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN.value, UserRole.INVESTIGATOR.value, UserRole.REVIEWER.value]))
):
    query = db.query(AuditLog)
    if case_id:
        query = query.filter(AuditLog.case_id == case_id)
    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))

    logs = query.order_by(desc(AuditLog.created_at)).offset(skip).limit(limit).all()

    result = []
    for l in logs:
        result.append(
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
        )
    return result
