import uuid
from typing import List, Optional, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models import Case, Evidence, AnalysisJob, AnalysisResult, InvestigatorNote, GeneratedReport, User
from app.core.storage import storage_client
from app.services.risk_engine import compute_case_aggregated_risk
from app.reports.pdf_generator import generate_investigation_pdf
from app.services.audit_service import log_audit_event

def generate_case_report(db: Session, case_id: str, user: User) -> GeneratedReport:
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    evidence_items = db.query(Evidence).filter(Evidence.case_id == case_id).all()
    evidence_data = [
        {
            "id": e.id,
            "original_filename": e.original_filename,
            "evidence_type": e.evidence_type,
            "file_size": e.file_size,
            "sha256_hash": e.sha256_hash,
            "uploaded_at": e.uploaded_at.strftime("%Y-%m-%d %H:%M")
        }
        for e in evidence_items
    ]

    evidence_ids = [e.id for e in evidence_items]
    jobs = db.query(AnalysisJob).filter(
        AnalysisJob.evidence_id.in_(evidence_ids),
        AnalysisJob.status == "completed"
    ).all() if evidence_ids else []

    analysis_data = []
    for j in jobs:
        if j.result:
            analysis_data.append({
                "analysis_type": j.analysis_type,
                "model_name": j.model_name,
                "model_version": j.model_version,
                "risk_level": j.result.risk_level,
                "risk_score": j.result.risk_score,
                "findings_json": j.result.findings_json,
                "limitations_json": j.result.limitations_json
            })

    notes = db.query(InvestigatorNote).filter(InvestigatorNote.case_id == case_id).all()
    notes_data = [
        {
            "author_name": n.user.full_name if n.user else "Investigator",
            "note": n.note,
            "created_at": n.created_at.strftime("%Y-%m-%d %H:%M")
        }
        for n in notes
    ]

    risk_profile = compute_case_aggregated_risk(db, case_id)

    # Fetch IOCs, timeline events, and correlations
    from app.services.ioc_service import get_case_iocs
    from app.services.timeline_service import get_case_timeline, record_timeline_event
    from app.services.correlation_service import get_case_correlations

    iocs_list = get_case_iocs(db, case_id)
    timeline_objs = get_case_timeline(db, case_id)
    timeline_data = [
        {
            "event_type": t.event_type,
            "title": t.title,
            "description": t.description,
            "created_at": t.created_at.strftime("%Y-%m-%d %H:%M:%S")
        }
        for t in timeline_objs
    ]
    correlations_data = get_case_correlations(db, case_id)

    case_dict = {
        "case_number": case.case_number,
        "title": case.title,
        "complaint_category": case.complaint_category,
        "priority": case.priority,
        "status": case.status,
        "assigned_investigator_name": case.assigned_investigator.full_name if case.assigned_investigator else "Unassigned",
    }

    # Generate PDF bytes
    pdf_bytes = generate_investigation_pdf(
        case_data=case_dict,
        evidence_list=evidence_data,
        analysis_results=analysis_data,
        risk_profile=risk_profile,
        investigator_notes=notes_data,
        generated_by_user=user.full_name,
        iocs_list=iocs_list,
        timeline_events=timeline_data,
        correlations=correlations_data
    )

    report_id = str(uuid.uuid4())
    safe_case_num = case.case_number.replace("/", "_")
    filename = f"TrustGuard_Report_{safe_case_num}_{report_id[:8]}.pdf"
    object_key = f"cases/{case_id}/reports/{report_id}_{filename}"

    # Store in private storage
    storage_client.save_bytes(
        object_key=object_key,
        data=pdf_bytes,
        content_type="application/pdf"
    )

    report = GeneratedReport(
        id=report_id,
        case_id=case_id,
        generated_by=user.id,
        report_object_key=object_key,
        file_name=filename,
        report_metadata_json={
            "risk_level": risk_profile.get("overall_risk_level"),
            "risk_score": risk_profile.get("overall_risk_score"),
            "evidence_count": len(evidence_items),
            "ioc_count": len(iocs_list)
        }
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    # Record in Timeline
    record_timeline_event(
        db,
        case_id=case_id,
        user_id=user.id,
        event_type="REPORT_GENERATED",
        title="Forensic PDF Dossier Generated",
        description=f"Exported certified dossier {filename}.",
        metadata={"report_id": report.id, "filename": filename}
    )

    log_audit_event(
        db,
        action="REPORT_GENERATED",
        user_id=user.id,
        case_id=case_id,
        metadata={"report_id": report.id, "filename": filename}
    )
    return report

def list_case_reports(db: Session, case_id: str) -> List[GeneratedReport]:
    return db.query(GeneratedReport).filter(GeneratedReport.case_id == case_id).order_by(GeneratedReport.created_at.desc()).all()

def get_report_bytes(db: Session, report_id: str, user: User) -> Tuple[bytes, str]:
    report = db.query(GeneratedReport).filter(GeneratedReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    data = storage_client.get_bytes(report.report_object_key)
    if not data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report file not found in storage")

    log_audit_event(
        db,
        action="REPORT_DOWNLOADED",
        user_id=user.id,
        case_id=report.case_id,
        metadata={"report_id": report.id, "filename": report.file_name}
    )
    return data, report.file_name
