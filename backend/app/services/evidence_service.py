import hashlib
import os
import uuid
from typing import List, Optional, Tuple
from datetime import datetime, timezone
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.orm import Session
from app.models import Evidence, Case, User, EvidenceType
from app.core.storage import storage_client
from app.services.audit_service import log_audit_event

ALLOWED_EXTENSIONS = {
    # Audio
    "wav": EvidenceType.AUDIO.value,
    "mp3": EvidenceType.AUDIO.value,
    "m4a": EvidenceType.AUDIO.value,
    "ogg": EvidenceType.AUDIO.value,
    "webm": EvidenceType.AUDIO.value,
    # Video
    "mp4": EvidenceType.VIDEO.value,
    "mov": EvidenceType.VIDEO.value,
    "avi": EvidenceType.VIDEO.value,
    "mkv": EvidenceType.VIDEO.value,
    # Images
    "jpg": EvidenceType.IMAGE.value,
    "jpeg": EvidenceType.IMAGE.value,
    "png": EvidenceType.IMAGE.value,
    # Text
    "txt": EvidenceType.TEXT.value,
    "json": EvidenceType.TEXT.value,
    "pdf": EvidenceType.DOCUMENT.value
}

MAX_FILE_SIZE = 100 * 1024 * 1024  # 100 MB max

def detect_evidence_type(filename: str, mime_type: str) -> str:
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    if ext in ALLOWED_EXTENSIONS:
        return ALLOWED_EXTENSIONS[ext]
    
    if "audio" in mime_type:
        return EvidenceType.AUDIO.value
    elif "video" in mime_type:
        return EvidenceType.VIDEO.value
    elif "image" in mime_type:
        return EvidenceType.IMAGE.value
    elif "text" in mime_type:
        return EvidenceType.TEXT.value
    
    return EvidenceType.DOCUMENT.value

def process_and_store_evidence(
    db: Session,
    case_id: str,
    file: UploadFile,
    user: User
) -> Evidence:
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    raw_name = file.filename or "unnamed_evidence"
    filename = os.path.basename(raw_name.replace('\\', '/'))
    if not filename or filename in ('.', '..'):
        filename = "unnamed_evidence"
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS and not any(k in (file.content_type or "") for k in ["audio", "video", "image", "text"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format. Supported extensions: {', '.join(ALLOWED_EXTENSIONS.keys())}"
        )

    # Read content, compute SHA-256 and size
    hasher = hashlib.sha256()
    content = file.file.read()
    file_size = len(content)

    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded evidence file is empty (0 bytes). Cannot ingest empty evidence."
        )

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE // (1024*1024)}MB."
        )

    hasher.update(content)
    sha256_hash = hasher.hexdigest()

    evidence_id = str(uuid.uuid4())
    evidence_type = detect_evidence_type(filename, file.content_type or "")

    # Storage object key structure: cases/<case_id>/<evidence_id>_<safe_name>
    safe_name = os.path.basename(filename).replace(" ", "_")
    object_key = f"cases/{case_id}/{evidence_id}_{safe_name}"

    # Store file in private object storage
    storage_client.save_bytes(
        object_key=object_key,
        data=content,
        content_type=file.content_type or "application/octet-stream"
    )

    evidence = Evidence(
        id=evidence_id,
        case_id=case_id,
        original_filename=filename,
        stored_object_key=object_key,
        mime_type=file.content_type or "application/octet-stream",
        file_size=file_size,
        sha256_hash=sha256_hash,
        evidence_type=evidence_type,
        uploaded_by=user.id,
        processing_status="ready"
    )

    db.add(evidence)
    db.commit()
    db.refresh(evidence)

    # Record in Evidence Timeline
    from app.services.timeline_service import record_timeline_event
    record_timeline_event(
        db,
        case_id=case_id,
        evidence_id=evidence.id,
        user_id=user.id,
        event_type="EVIDENCE_UPLOADED",
        title=f"Evidence Ingested: {filename}",
        description=f"File ingested into vault. Cryptographic SHA-256 digest recorded.",
        metadata={
            "filename": filename,
            "sha256": sha256_hash,
            "file_size": file_size,
            "evidence_type": evidence_type
        }
    )

    log_audit_event(
        db,
        action="EVIDENCE_UPLOADED",
        user_id=user.id,
        case_id=case_id,
        evidence_id=evidence.id,
        metadata={
            "filename": filename,
            "sha256": sha256_hash,
            "size_bytes": file_size,
            "type": evidence_type
        }
    )
    return evidence

def get_evidence_by_id(db: Session, evidence_id: str) -> Optional[Evidence]:
    return db.query(Evidence).filter(Evidence.id == evidence_id).first()

def get_evidence_file_bytes(db: Session, evidence_id: str, user: User) -> Tuple[bytes, str, str]:
    evidence = get_evidence_by_id(db, evidence_id)
    if not evidence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence not found")

    data = storage_client.get_bytes(evidence.stored_object_key)
    if data is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence file missing in storage")

    log_audit_event(
        db,
        action="EVIDENCE_DOWNLOADED",
        user_id=user.id,
        case_id=evidence.case_id,
        evidence_id=evidence.id,
        metadata={"filename": evidence.original_filename}
    )
    return data, evidence.original_filename, evidence.mime_type
