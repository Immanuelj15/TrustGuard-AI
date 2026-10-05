from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models import User, UserRole
from app.services.auth_service import get_current_user, require_role
from app.schemas.llm import (
    OpenRouterStatusOut,
    ExplainEvidenceRequest,
    CaseSummaryRequest,
    EvidenceExplanationResponse,
    CaseSummaryResponse
)
from app.ai.openrouter import OpenRouterConfig, OpenRouterService

router = APIRouter(tags=["LLM Explanation Layer"])
openrouter_service = OpenRouterService()

@router.get("/llm/status", response_model=OpenRouterStatusOut)
def api_get_openrouter_status(
    current_user: User = Depends(get_current_user)
):
    """
    Returns public status and active model of the OpenRouter LLM reasoning layer.
    Strictly excludes API keys and credentials.
    """
    safe_status = OpenRouterConfig.get_safe_status()
    return OpenRouterStatusOut(**safe_status)

@router.post("/evidence/{evidence_id}/explain", response_model=EvidenceExplanationResponse)
def api_explain_evidence(
    evidence_id: str,
    payload: ExplainEvidenceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN.value, UserRole.INVESTIGATOR.value, UserRole.REVIEWER.value]))
):
    """
    Investigator-triggered explanation of digital evidence and existing detection findings.
    Requires explicit user consent and executes strict PII redaction before transmission.
    """
    return openrouter_service.explain_evidence(
        db=db,
        evidence_id=evidence_id,
        user=current_user,
        consent=payload.user_consent,
        additional_context=payload.additional_context
    )

@router.post("/cases/{case_id}/summary", response_model=CaseSummaryResponse)
def api_summarize_case(
    case_id: str,
    payload: CaseSummaryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN.value, UserRole.INVESTIGATOR.value, UserRole.REVIEWER.value]))
):
    """
    Generates an executive case overview and recommended next steps using OpenRouter.
    Requires explicit user consent.
    """
    return openrouter_service.summarize_case(
        db=db,
        case_id=case_id,
        user=current_user,
        consent=payload.user_consent,
        focus_areas=payload.focus_areas
    )
