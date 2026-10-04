from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models import User, UserRole, InvestigatorNote
from app.schemas import (
    CaseCreate, CaseUpdate, CaseOut, CaseDetailOut,
    InvestigatorNoteCreate, InvestigatorNoteOut
)
from app.services.auth_service import get_current_user, require_role
from app.services.case_service import (
    create_case, list_cases, get_case_by_id, update_case, add_investigator_note
)
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/cases", tags=["Cases"])

@router.post("", response_model=CaseOut, status_code=status.HTTP_201_CREATED)
def api_create_case(
    case_in: CaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN.value, UserRole.INVESTIGATOR.value]))
):
    return create_case(db, case_in, current_user)

@router.get("", response_model=List[CaseOut])
def api_list_cases(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cases, _ = list_cases(
        db=db,
        status_filter=status,
        priority_filter=priority,
        category_filter=category,
        search=search,
        skip=skip,
        limit=limit
    )
    result = []
    for c in cases:
        c_dict = {
            "id": c.id,
            "case_number": c.case_number,
            "title": c.title,
            "description": c.description,
            "complaint_category": c.complaint_category,
            "priority": c.priority,
            "status": c.status,
            "assigned_investigator_id": c.assigned_investigator_id,
            "created_by": c.created_by,
            "created_at": c.created_at,
            "updated_at": c.updated_at,
            "evidence_count": len(c.evidence_items)
        }
        result.append(CaseOut(**c_dict))
    return result

@router.get("/{case_id}", response_model=CaseDetailOut)
def api_get_case(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    case = get_case_by_id(db, case_id)
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    
    notes_out = []
    for n in case.notes:
        notes_out.append(
            InvestigatorNoteOut(
                id=n.id,
                case_id=n.case_id,
                evidence_id=n.evidence_id,
                user_id=n.user_id,
                author_name=n.user.full_name if n.user else "Unknown",
                note=n.note,
                created_at=n.created_at
            )
        )

    evidence_out = [
        {
            "id": e.id,
            "case_id": e.case_id,
            "original_filename": e.original_filename,
            "mime_type": e.mime_type,
            "file_size": e.file_size,
            "sha256_hash": e.sha256_hash,
            "evidence_type": e.evidence_type,
            "uploaded_by": e.uploaded_by,
            "uploaded_at": e.uploaded_at,
            "processing_status": e.processing_status
        }
        for e in case.evidence_items
    ]

    return CaseDetailOut(
        id=case.id,
        case_number=case.case_number,
        title=case.title,
        description=case.description,
        complaint_category=case.complaint_category,
        priority=case.priority,
        status=case.status,
        assigned_investigator_id=case.assigned_investigator_id,
        assigned_investigator_name=case.assigned_investigator.full_name if case.assigned_investigator else None,
        created_by=case.created_by,
        creator_name=case.creator.full_name if case.creator else None,
        created_at=case.created_at,
        updated_at=case.updated_at,
        evidence_count=len(case.evidence_items),
        evidence_items=evidence_out,
        notes=notes_out
    )

@router.patch("/{case_id}", response_model=CaseOut)
def api_update_case(
    case_id: str,
    case_in: CaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN.value, UserRole.INVESTIGATOR.value, UserRole.REVIEWER.value]))
):
    case = update_case(db, case_id, case_in, current_user)
    return CaseOut(
        id=case.id,
        case_number=case.case_number,
        title=case.title,
        description=case.description,
        complaint_category=case.complaint_category,
        priority=case.priority,
        status=case.status,
        assigned_investigator_id=case.assigned_investigator_id,
        created_by=case.created_by,
        created_at=case.created_at,
        updated_at=case.updated_at,
        evidence_count=len(case.evidence_items)
    )

@router.post("/{case_id}/notes", response_model=InvestigatorNoteOut)
def api_add_note(
    case_id: str,
    note_in: InvestigatorNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    note = add_investigator_note(db, case_id, note_in, current_user)
    return InvestigatorNoteOut(
        id=note.id,
        case_id=note.case_id,
        evidence_id=note.evidence_id,
        user_id=note.user_id,
        author_name=current_user.full_name,
        note=note.note,
        created_at=note.created_at
    )
