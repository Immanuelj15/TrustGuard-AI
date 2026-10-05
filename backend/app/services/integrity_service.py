import hashlib
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models import Evidence, User
from app.core.storage import storage_client
from app.services.timeline_service import record_timeline_event
from app.services.audit_service import log_audit_event

def verify_evidence_integrity(
    db: Session,
    evidence_id: str,
    user: Optional[User] = None
) -> Dict[str, Any]:
    """
    Recomputes the cryptographic SHA-256 digest of stored evidence bytes
    and validates it against the immutable hash captured at ingestion.
    """
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence artifact not found."
        )

    data = storage_client.get_bytes(evidence.stored_object_key)
    now_utc = datetime.now(timezone.utc)

    if data is None:
        status_code = "UNAVAILABLE"
        computed_hash = None
        detail = "Evidence file missing in physical storage vault."
    else:
        computed_hash = hashlib.sha256(data).hexdigest()
        if computed_hash.lower() == evidence.sha256_hash.lower():
            status_code = "VERIFIED"
            detail = "Cryptographic integrity intact. Stored file matches ingestion digest bit-for-bit."
        else:
            status_code = "HASH_MISMATCH"
            detail = "CRITICAL ALERT: Recomputed digest does not match ingestion record. File may have been altered or corrupted."

    # Record timeline event
    record_timeline_event(
        db,
        case_id=evidence.case_id,
        evidence_id=evidence.id,
        user_id=user.id if user else None,
        event_type="HASH_VERIFIED",
        title=f"SHA-256 Integrity Verification: {status_code}",
        description=detail,
        metadata={
            "algorithm": "SHA-256",
            "original_hash": evidence.sha256_hash,
            "computed_hash": computed_hash,
            "status": status_code,
            "file_size": len(data) if data else 0
        }
    )

    # Log to audit trail
    if user:
        log_audit_event(
            db,
            action="EVIDENCE_INTEGRITY_VERIFIED",
            user_id=user.id,
            case_id=evidence.case_id,
            evidence_id=evidence.id,
            metadata={
                "status": status_code,
                "algorithm": "SHA-256",
                "match": (status_code == "VERIFIED")
            }
        )

    return {
        "evidence_id": evidence.id,
        "case_id": evidence.case_id,
        "original_filename": evidence.original_filename,
        "algorithm": "SHA-256",
        "original_hash": evidence.sha256_hash,
        "computed_hash": computed_hash,
        "integrity_status": status_code,
        "status": status_code,
        "file_size_bytes": len(data) if data else 0,
        "verified_at": now_utc.isoformat(),
        "detail": detail,
        "disclaimer": "SHA-256 is used to detect changes to the stored file. It does not independently prove when, where, or by whom evidence was created."
    }
