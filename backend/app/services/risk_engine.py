from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models import Case, Evidence, AnalysisJob, AnalysisResult

def compute_case_aggregated_risk(db: Session, case_id: str) -> Dict[str, Any]:
    """
    Transparent Multi-Modal Case Risk Aggregator.
    Inspects all analyzed evidence items under the case and builds
    an explainable risk profile based on weighted contributing factors.
    """
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        return {
            "overall_risk_level": "UNKNOWN",
            "overall_risk_score": 0.0,
            "contributing_factors": [],
            "analysis_count": 0
        }

    evidence_items = db.query(Evidence).filter(Evidence.case_id == case_id).all()
    evidence_ids = [e.id for e in evidence_items]

    jobs = db.query(AnalysisJob).filter(
        AnalysisJob.evidence_id.in_(evidence_ids),
        AnalysisJob.status == "completed"
    ).all() if evidence_ids else []

    contributing_factors = []
    total_weighted_score = 0.0
    weight_sum = 0.0

    has_critical_indicator = False
    high_count = 0

    for job in jobs:
        if not job.result:
            continue
        res = job.result
        score = res.risk_score
        level = res.risk_level

        weight = 1.0
        if job.analysis_type == "text":
            weight = 1.2
            factor_desc = f"Text analysis detected scam / social-engineering patterns (Score: {score}/100)"
        elif job.analysis_type == "audio":
            weight = 1.0
            factor_desc = f"Audio acoustic telemetry assessed for voice manipulation (Score: {score}/100)"
        elif job.analysis_type == "video":
            weight = 1.1
            factor_desc = f"Video visual inspection assessed for manipulation cues (Score: {score}/100)"
        else:
            weight = 0.8
            factor_desc = f"Evidence item analyzed (Score: {score}/100)"

        if level == "CRITICAL":
            has_critical_indicator = True
        elif level == "HIGH":
            high_count += 1

        contributing_factors.append({
            "evidence_id": job.evidence_id,
            "analysis_type": job.analysis_type,
            "model_name": job.model_name,
            "risk_level": level,
            "risk_score": score,
            "description": factor_desc,
            "weight": weight
        })

        total_weighted_score += score * weight
        weight_sum += weight

    if weight_sum > 0:
        base_score = round(total_weighted_score / weight_sum, 1)
    else:
        base_score = 0.0

    # Cross-modal correlation boost
    if len(contributing_factors) >= 2 and base_score > 30.0:
        base_score = min(100.0, round(base_score * 1.1, 1))

    if has_critical_indicator or base_score >= 80.0:
        overall_level = "CRITICAL"
    elif high_count >= 1 or base_score >= 60.0:
        overall_level = "HIGH"
    elif base_score >= 35.0:
        overall_level = "MEDIUM"
    elif len(contributing_factors) == 0:
        overall_level = "NEEDS_REVIEW"
    else:
        overall_level = "LOW"

    return {
        "overall_risk_level": overall_level,
        "overall_risk_score": base_score,
        "contributing_factors": contributing_factors,
        "analysis_count": len(jobs)
    }
