from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field, ConfigDict

# --- Auth & User Schemas ---
class UserBase(BaseModel):
    full_name: str
    email: EmailStr
    role: str = "investigator"

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(UserBase):
    id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    exp: Optional[int] = None

# --- Case Schemas ---
class CaseBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: Optional[str] = None
    complaint_category: str
    priority: str = "medium"  # low, medium, high, critical
    assigned_investigator_id: Optional[str] = None

class CaseCreate(CaseBase):
    pass

class CaseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    complaint_category: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    assigned_investigator_id: Optional[str] = None

class CaseOut(CaseBase):
    id: str
    case_number: str
    status: str
    created_by: str
    created_at: datetime
    updated_at: datetime
    evidence_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)

# --- Evidence Schemas ---
class EvidenceOut(BaseModel):
    id: str
    case_id: str
    original_filename: str
    mime_type: str
    file_size: int
    sha256_hash: str
    evidence_type: str
    uploaded_by: str
    uploaded_at: datetime
    processing_status: str

    model_config = ConfigDict(from_attributes=True)

# --- Analysis Schemas ---
class AnalysisResultOut(BaseModel):
    id: str
    analysis_job_id: str
    risk_level: str
    risk_score: float
    model_confidence: Optional[float] = None
    findings_json: Dict[str, Any]
    limitations_json: List[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

class AnalysisJobOut(BaseModel):
    id: str
    evidence_id: str
    analysis_type: str
    status: str
    model_name: str
    model_version: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    result: Optional[AnalysisResultOut] = None

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

class AnalysisTriggerRequest(BaseModel):
    analysis_type: Optional[str] = None  # audio, video, text, auto

# --- Caller Reputation Schemas ---
class CallerCheckRequest(BaseModel):
    phone_number: str
    country_code: Optional[str] = None

class CallerReportCreate(BaseModel):
    phone_number: str
    report_category: str  # e.g., Impersonation, Banking Scam, Robocall
    description: str

class CallerReportOut(BaseModel):
    id: str
    normalised_number: str
    report_category: str
    description: str
    verification_status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CallerCheckResponse(BaseModel):
    normalised_number: str
    is_valid_format: bool
    country_code: Optional[str] = None
    carrier: Optional[str] = None
    number_type: Optional[str] = None
    risk_level: str  # low, medium, high
    risk_score: float  # 0 to 100
    report_count: int
    reports: List[CallerReportOut]
    disclaimer: str
    checked_at: datetime
    data_sources: List[str]

# --- Investigator Note Schemas ---
class InvestigatorNoteCreate(BaseModel):
    note: str = Field(..., min_length=2)
    evidence_id: Optional[str] = None

class InvestigatorNoteOut(BaseModel):
    id: str
    case_id: str
    evidence_id: Optional[str] = None
    user_id: str
    author_name: Optional[str] = None
    note: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Case Detail with Nested Items ---
class CaseDetailOut(CaseOut):
    assigned_investigator_name: Optional[str] = None
    creator_name: Optional[str] = None
    evidence_items: List[EvidenceOut] = []
    notes: List[InvestigatorNoteOut] = []

    model_config = ConfigDict(from_attributes=True)

# --- Report Schemas ---
class ReportGenerateRequest(BaseModel):
    investigator_notes_summary: Optional[str] = None
    include_raw_findings: bool = True

class ReportOut(BaseModel):
    id: str
    case_id: str
    generated_by: str
    file_name: str
    created_at: datetime
    report_metadata_json: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)

# --- Audit Log Schemas ---
class AuditLogOut(BaseModel):
    id: str
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    action: str
    case_id: Optional[str] = None
    evidence_id: Optional[str] = None
    metadata_json: Optional[Dict[str, Any]] = None
    outcome: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Dashboard Schemas ---
class DashboardSummary(BaseModel):
    total_cases: int
    open_cases: int
    cases_awaiting_review: int
    evidence_analyzed: int
    high_risk_findings: int
    active_investigators: int

class DashboardCharts(BaseModel):
    cases_by_status: Dict[str, int]
    cases_by_priority: Dict[str, int]
    evidence_by_type: Dict[str, int]
    risk_distribution: Dict[str, int]
    recent_activity: List[AuditLogOut]
