import re
import uuid
from urllib.parse import urlparse
from typing import List, Dict, Any, Set
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models import IOC, Evidence, Case
from app.services.timeline_service import record_timeline_event

# High-precision deterministic regex patterns
EMAIL_REGEX = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b')
URL_REGEX = re.compile(r'https?://[^\s<>"\'{}|\\^`]+', re.IGNORECASE)
IPV4_REGEX = re.compile(
    r'\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}'
    r'(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b'
)
DOMAIN_REGEX = re.compile(
    r'\b(?:[a-zA-Z0-9-]+\.)+(?:com|org|net|in|gov|io|xyz|top|site|info|co|cc|biz|ru|cn|online|club|app|live|tech|me)\b',
    re.IGNORECASE
)
PHONE_REGEX = re.compile(
    r'(?:\+?(\d{1,3})[\s-]?)?\(?([6-9]\d{2})\)?[\s-]?(\d{3})[\s-]?(\d{4})\b'
    r'|(?:\+91[\s-]?)?[6-9]\d{9}\b'
    r'|\+\d{1,3}[\s-]?\d{3,4}[\s-]?\d{3,4}[\s-]?\d{3,4}\b'
)
UPI_REGEX = re.compile(
    r'\b[a-zA-Z0-9.\-_]{2,64}@(oksbi|okhdfcbank|okaxis|paytm|ybl|apl|upi|axl|ibl|barodampay)\b',
    re.IGNORECASE
)

def normalize_phone(phone_str: str) -> str:
    cleaned = re.sub(r'[\s\-\(\)]', '', phone_str)
    if cleaned.startswith('0') and len(cleaned) == 11:
        cleaned = '+91' + cleaned[1:]
    elif len(cleaned) == 10 and cleaned[0] in '6789':
        cleaned = '+91' + cleaned
    elif not cleaned.startswith('+') and len(cleaned) > 10:
        cleaned = '+' + cleaned
    return cleaned

def extract_iocs_from_text(text: str) -> List[Dict[str, Any]]:
    """
    Scans raw text to extract deterministic Indicators of Compromise (IOCs).
    """
    if not text:
        return []

    extracted: List[Dict[str, Any]] = []
    seen: Set[str] = set()

    def add_ioc(ioc_type: str, value: str, norm_val: str, start: int, end: int):
        key = f"{ioc_type}:{norm_val}"
        if key in seen:
            return
        seen.add(key)
        start_snip = max(0, start - 25)
        end_snip = min(len(text), end + 25)
        snippet = text[start_snip:end_snip].strip().replace('\n', ' ')
        extracted.append({
            "ioc_type": ioc_type,
            "value": value.strip(),
            "normalized_value": norm_val.strip(),
            "context_snippet": snippet
        })

    # 1. Emails
    for m in EMAIL_REGEX.finditer(text):
        val = m.group(0)
        add_ioc("email", val, val.lower(), m.start(), m.end())

    # 2. URLs
    urls_found = []
    for m in URL_REGEX.finditer(text):
        val = m.group(0).rstrip('.,;:)!?"\'')
        norm = val.lower()
        add_ioc("url", val, norm, m.start(), m.end())
        urls_found.append((val, m.start(), m.end()))
        # Extract domain from URL
        try:
            parsed = urlparse(val)
            if parsed.netloc:
                domain_val = parsed.netloc.split(':')[0]
                norm_d = domain_val.lower().removeprefix("www.")
                add_ioc("domain", domain_val, norm_d, m.start(), m.end())
        except Exception:
            pass

    # 3. Standalone Domains (not already inside URL)
    for m in DOMAIN_REGEX.finditer(text):
        val = m.group(0)
        norm_d = val.lower().removeprefix("www.")
        # check if already covered by an email or url
        if not any(val.lower() in u[0].lower() for u in urls_found):
            add_ioc("domain", val, norm_d, m.start(), m.end())

    # 4. IPv4 Addresses
    for m in IPV4_REGEX.finditer(text):
        val = m.group(0)
        # Exclude standard zero or subnet masks
        if val not in ("0.0.0.0", "255.255.255.255"):
            add_ioc("ipv4", val, val, m.start(), m.end())

    # 5. UPI / Payment Identifiers
    for m in UPI_REGEX.finditer(text):
        val = m.group(0)
        add_ioc("upi", val, val.lower(), m.start(), m.end())

    # 6. Phone Numbers
    for m in PHONE_REGEX.finditer(text):
        val = m.group(0).strip()
        norm = normalize_phone(val)
        if len(re.sub(r'\D', '', norm)) >= 10:
            add_ioc("phone", val, norm, m.start(), m.end())

    return extracted

def extract_and_store_iocs(
    db: Session,
    case_id: str,
    evidence_id: str,
    text: str
) -> List[IOC]:
    """
    Extracts and stores deduplicated IOC records in the database for an evidence item.
    """
    items = extract_iocs_from_text(text)
    if not items:
        return []

    # Get already stored IOCs for this evidence to prevent duplicates
    existing = db.query(IOC).filter(IOC.evidence_id == evidence_id).all()
    existing_keys = {f"{i.ioc_type}:{i.normalized_value}" for i in existing}

    created_objs: List[IOC] = []
    for item in items:
        key = f"{item['ioc_type']}:{item['normalized_value']}"
        if key in existing_keys:
            continue
        ioc_obj = IOC(
            id=str(uuid.uuid4()),
            case_id=case_id,
            evidence_id=evidence_id,
            ioc_type=item["ioc_type"],
            value=item["value"],
            normalized_value=item["normalized_value"],
            context_snippet=item["context_snippet"],
            created_at=datetime.now(timezone.utc)
        )
        db.add(ioc_obj)
        created_objs.append(ioc_obj)
        existing_keys.add(key)

    if created_objs:
        db.commit()
        record_timeline_event(
            db,
            case_id=case_id,
            evidence_id=evidence_id,
            event_type="IOC_EXTRACTED",
            title=f"Extracted {len(created_objs)} IOCs",
            description=f"Identified {len(created_objs)} new digital indicators (domains, URLs, phones, emails).",
            metadata={"count": len(created_objs), "types": list({i.ioc_type for i in created_objs})}
        )

    return created_objs

def get_case_iocs(db: Session, case_id: str) -> List[Dict[str, Any]]:
    """
    Returns all IOCs extracted within a case, annotated with occurrences.
    """
    iocs = db.query(IOC).filter(IOC.case_id == case_id).all()
    
    # Calculate occurrences across evidence items
    grouped: Dict[str, Dict[str, Any]] = {}
    for item in iocs:
        key = f"{item.ioc_type}:{item.normalized_value}"
        if key not in grouped:
            grouped[key] = {
                "ioc_type": item.ioc_type,
                "value": item.value,
                "normalized_value": item.normalized_value,
                "evidence_ids": [item.evidence_id],
                "occurrences": 1,
                "first_seen": item.created_at.isoformat(),
                "sample_context": item.context_snippet
            }
        else:
            if item.evidence_id not in grouped[key]["evidence_ids"]:
                grouped[key]["evidence_ids"].append(item.evidence_id)
                grouped[key]["occurrences"] += 1

    return list(grouped.values())
