from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models import AuditLog

# List of sensitive keys that must never be recorded in audit metadata
SENSITIVE_KEYS = {"password", "token", "access_token", "secret", "authorization"}

def sanitize_metadata(data: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if not data:
        return {}
    sanitized = {}
    for k, v in data.items():
        if any(sens in k.lower() for sens in SENSITIVE_KEYS):
            sanitized[k] = "[REDACTED]"
        elif isinstance(v, dict):
            sanitized[k] = sanitize_metadata(v)
        else:
            sanitized[k] = v
    return sanitized

def log_audit_event(
    db: Session,
    action: str,
    user_id: Optional[str] = None,
    case_id: Optional[str] = None,
    evidence_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    outcome: str = "success"
) -> AuditLog:
    clean_meta = sanitize_metadata(metadata)
    audit_entry = AuditLog(
        user_id=user_id,
        action=action,
        case_id=case_id,
        evidence_id=evidence_id,
        metadata_json=clean_meta,
        outcome=outcome
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(audit_entry)
    return audit_entry
