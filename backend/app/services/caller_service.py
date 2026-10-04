from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import phonenumbers
from phonenumbers import geocoder, carrier, number_type, PhoneNumberType
from sqlalchemy.orm import Session
from app.models import CallerReport, User
from app.schemas import CallerReportCreate, CallerCheckResponse, CallerReportOut
from app.services.audit_service import log_audit_event

DISCLAIMER_TEXT = (
    "DISCLAIMER: Digital reputation data is probabilistic and derived from reported suspicious incidents "
    "and telecom format validation. TrustGuard AI does not track real-time geographic locations, device GPS, "
    "or unverified subscriber identities without lawful judicial warrant."
)

def normalize_phone_number(raw_number: str, default_region: Optional[str] = "IN") -> Dict[str, Any]:
    try:
        parsed = phonenumbers.parse(raw_number, default_region)
        is_valid = phonenumbers.is_valid_number(parsed)
        formatted_e164 = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
        country_code = f"+{parsed.country_code}"
        
        # Region / general country (NOT exact GPS)
        region_desc = geocoder.description_for_number(parsed, "en") or "Global"
        carrier_name = carrier.name_for_number(parsed, "en") or "Telecom Provider"
        
        ntype = phonenumbers.number_type(parsed)
        type_str = "Mobile" if ntype == PhoneNumberType.MOBILE else "Fixed Line" if ntype == PhoneNumberType.FIXED_LINE else "VoIP / Virtual" if ntype == PhoneNumberType.VOIP else "Standard"

        return {
            "is_valid": is_valid,
            "normalised": formatted_e164,
            "country_code": country_code,
            "general_region": region_desc,
            "carrier": carrier_name,
            "number_type": type_str
        }
    except Exception:
        # Fallback normalisation
        clean_num = "".join(c for c in raw_number if c.isdigit() or c == "+")
        if not clean_num.startswith("+"):
            clean_num = f"+{clean_num}"
        return {
            "is_valid": False,
            "normalised": clean_num,
            "country_code": "+91" if clean_num.startswith("+91") else "+1",
            "general_region": "Unverified Format",
            "carrier": "Unknown",
            "number_type": "Unspecified"
        }

def check_caller_reputation(
    db: Session,
    phone_number: str,
    country_code: Optional[str] = None,
    user: Optional[User] = None
) -> CallerCheckResponse:
    norm_info = normalize_phone_number(phone_number, country_code or "IN")
    normalised = norm_info["normalised"]

    # Query internal reports
    db_reports = db.query(CallerReport).filter(CallerReport.normalised_number == normalised).order_by(CallerReport.created_at.desc()).all()
    report_count = len(db_reports)

    # Check known suspicious prefixes / VoIP patterns
    risk_score = 0.0
    if not norm_info["is_valid"]:
        risk_score += 20.0
    if norm_info["number_type"] == "VoIP / Virtual":
        risk_score += 25.0
    
    # Each reported incident adds weight
    risk_score += min(50.0, report_count * 25.0)

    if risk_score >= 60.0 or report_count >= 2:
        risk_level = "HIGH"
    elif risk_score >= 30.0 or report_count == 1:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    # Format reports for output
    reports_out = [
        CallerReportOut(
            id=r.id,
            normalised_number=r.normalised_number,
            report_category=r.report_category,
            description=r.description,
            verification_status=r.verification_status,
            created_at=r.created_at
        )
        for r in db_reports
    ]

    data_sources = ["TrustGuard Incident Registry", "ITU E.164 Format Engine"]
    if report_count > 0:
        data_sources.append("Verified Investigator Flagging")

    if user:
        log_audit_event(
            db,
            action="CALLER_REPUTATION_CHECKED",
            user_id=user.id,
            metadata={
                "phone_number": normalised,
                "risk_level": risk_level,
                "reports_found": report_count
            }
        )

    return CallerCheckResponse(
        normalised_number=normalised,
        is_valid_format=norm_info["is_valid"],
        country_code=norm_info["country_code"],
        carrier=norm_info["carrier"],
        number_type=norm_info["number_type"],
        risk_level=risk_level,
        risk_score=min(100.0, risk_score),
        report_count=report_count,
        reports=reports_out,
        disclaimer=DISCLAIMER_TEXT,
        checked_at=datetime.now(timezone.utc),
        data_sources=data_sources
    )

def create_caller_report(db: Session, report_in: CallerReportCreate, user: User) -> CallerReport:
    norm_info = normalize_phone_number(report_in.phone_number)
    normalised = norm_info["normalised"]

    report = CallerReport(
        normalised_number=normalised,
        report_category=report_in.report_category,
        description=report_in.description,
        submitted_by=user.id,
        verification_status="verified_suspicious" if user.role in ["admin", "investigator"] else "unverified"
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    log_audit_event(
        db,
        action="CALLER_REPORT_SUBMITTED",
        user_id=user.id,
        metadata={"phone_number": normalised, "category": report.report_category}
    )
    return report

def list_caller_reports(db: Session, limit: int = 50) -> List[CallerReport]:
    return db.query(CallerReport).order_by(CallerReport.created_at.desc()).limit(limit).all()
