from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

class OpenRouterStatusOut(BaseModel):
    enabled: bool
    configured: bool
    model: Optional[str] = None
    base_url: str
    site_url: Optional[str] = None
    app_name: str
    disclaimer: str = "AI-generated explanation is an investigative aid, not proof or a legal conclusion."

    model_config = ConfigDict(protected_namespaces=())

class ExplainEvidenceRequest(BaseModel):
    user_consent: bool = Field(..., description="Explicit user confirmation for processing redacted excerpt with external AI")
    additional_context: Optional[str] = Field(None, max_length=1000, description="Optional investigative context")

class CaseSummaryRequest(BaseModel):
    user_consent: bool = Field(..., description="Explicit user confirmation for external AI summary processing")
    focus_areas: Optional[List[str]] = Field(None, description="Optional focus areas (e.g. money trail, impersonation)")

class SuspiciousIndicator(BaseModel):
    indicator: str
    reason: str
    supporting_text: Optional[str] = ""

class EvidenceExplanationResponse(BaseModel):
    summary: str
    suspicious_indicators: List[SuspiciousIndicator] = []
    possible_social_engineering_tactics: List[str] = []
    recommended_investigation_steps: List[str] = []
    limitations: List[str] = []
    overall_assessment: str = "INCONCLUSIVE"  # LOW, MEDIUM, HIGH, INCONCLUSIVE
    
    # Metadata & Provenance
    provider: str = "OpenRouter"
    model_id: Optional[str] = None
    generated_at: str
    is_live_inference: bool
    was_redacted: bool = False
    redaction_notice: Optional[str] = None
    evidence_id: Optional[str] = None
    case_id: Optional[str] = None

    model_config = ConfigDict(protected_namespaces=())

class CaseSummaryResponse(BaseModel):
    case_id: str
    case_number: str
    summary: str
    key_findings: List[str] = []
    threat_actor_tactics: List[str] = []
    recommended_next_steps: List[str] = []
    limitations: List[str] = []
    
    # Metadata & Provenance
    provider: str = "OpenRouter"
    model_id: Optional[str] = None
    generated_at: str
    is_live_inference: bool
    was_redacted: bool = False
    redaction_notice: Optional[str] = None

    model_config = ConfigDict(protected_namespaces=())
