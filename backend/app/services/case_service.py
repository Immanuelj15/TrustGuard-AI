import random
from typing import List, Optional, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from fastapi import HTTPException, status
from app.models import Case, User, InvestigatorNote, Evidence, CaseStatus
from app.schemas import CaseCreate, CaseUpdate, InvestigatorNoteCreate
from app.services.audit_service import log_audit_event

def generate_case_number(db: Session) -> str:
    year = datetime.now().year
    random_digits = random.randint(10000, 99999)
    case_num = f"TG-{year}-{random_digits}"
    # Ensure uniqueness
    while db.query(Case).filter(Case.case_number == case_num).first():
        random_digits = random.randint(10000, 99999)
        case_num = f"TG-{year}-{random_digits}"
    return case_num

def create_case(db: Session, case_in: CaseCreate, user: User) -> Case:
    case_number = generate_case_number(db)
    new_case = Case(
        case_number=case_number,
        title=case_in.title,
        description=case_in.description,
        complaint_category=case_in.complaint_category,
        priority=case_in.priority,
        status=CaseStatus.OPEN.value,
        assigned_investigator_id=case_in.assigned_investigator_id or user.id,
        created_by=user.id
    )
    db.add(new_case)
    db.commit()
    db.refresh(new_case)

    log_audit_event(
        db,
        action="CASE_CREATED",
        user_id=user.id,
        case_id=new_case.id,
        metadata={"case_number": case_number, "title": new_case.title, "priority": new_case.priority}
    )
    return new_case

def list_cases(
    db: Session,
    status_filter: Optional[str] = None,
    priority_filter: Optional[str] = None,
    category_filter: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
) -> Tuple[List[Case], int]:
    query = db.query(Case)

    if status_filter and status_filter != "all":
        query = query.filter(Case.status == status_filter)
    if priority_filter and priority_filter != "all":
        query = query.filter(Case.priority == priority_filter)
    if category_filter and category_filter != "all":
        query = query.filter(Case.complaint_category == category_filter)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Case.title.ilike(search_pattern),
                Case.case_number.ilike(search_pattern),
                Case.description.ilike(search_pattern),
                Case.complaint_category.ilike(search_pattern)
            )
        )

    total = query.count()
    cases = query.order_by(desc(Case.created_at)).offset(skip).limit(limit).all()
    return cases, total

def get_case_by_id(db: Session, case_id: str) -> Optional[Case]:
    return db.query(Case).filter(Case.id == case_id).first()

def update_case(db: Session, case_id: str, case_in: CaseUpdate, user: User) -> Case:
    case = get_case_by_id(db, case_id)
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    update_data = case_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(case, field, val)
    case.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(case)

    log_audit_event(
        db,
        action="CASE_UPDATED",
        user_id=user.id,
        case_id=case.id,
        metadata={"updated_fields": list(update_data.keys()), "status": case.status}
    )
    return case

def add_investigator_note(db: Session, case_id: str, note_in: InvestigatorNoteCreate, user: User) -> InvestigatorNote:
    case = get_case_by_id(db, case_id)
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    
    note = InvestigatorNote(
        case_id=case_id,
        evidence_id=note_in.evidence_id,
        user_id=user.id,
        note=note_in.note
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    from app.services.timeline_service import record_timeline_event
    record_timeline_event(
        db,
        case_id=case_id,
        evidence_id=note_in.evidence_id,
        user_id=user.id,
        event_type="NOTE_ADDED",
        title="Investigator Note Attached",
        description=note_in.note[:100] + ("..." if len(note_in.note) > 100 else ""),
        metadata={"note_id": note.id}
    )

    log_audit_event(
        db,
        action="INVESTIGATOR_NOTE_ADDED",
        user_id=user.id,
        case_id=case_id,
        evidence_id=note_in.evidence_id,
        metadata={"note_id": note.id}
    )
    return note
