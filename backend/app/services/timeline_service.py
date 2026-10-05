import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models import TimelineEvent, Case, Evidence, User

def record_timeline_event(
    db: Session,
    case_id: str,
    event_type: str,
    title: str,
    description: Optional[str] = None,
    evidence_id: Optional[str] = None,
    user_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> TimelineEvent:
    """
    Persists an auditable event in the evidence and case lifecycle timeline.
    """
    event = TimelineEvent(
        id=str(uuid.uuid4()),
        case_id=case_id,
        evidence_id=evidence_id,
        user_id=user_id,
        event_type=event_type,
        title=title,
        description=description,
        metadata_json=metadata or {},
        created_at=datetime.now(timezone.utc)
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event

def get_case_timeline(
    db: Session,
    case_id: str,
    evidence_id: Optional[str] = None,
    limit: int = 150
) -> List[TimelineEvent]:
    """
    Retrieves chronological timeline events for a given case, optionally filtered by evidence.
    """
    query = db.query(TimelineEvent).filter(TimelineEvent.case_id == case_id)
    if evidence_id:
        query = query.filter(TimelineEvent.evidence_id == evidence_id)
    
    events = query.order_by(TimelineEvent.created_at.asc()).limit(limit).all()
    return events
