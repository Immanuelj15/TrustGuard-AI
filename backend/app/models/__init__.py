import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum
from sqlalchemy import Column, String, Integer, Float, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class UserRole(str, PyEnum):
    ADMIN = "admin"
    INVESTIGATOR = "investigator"
    REVIEWER = "reviewer"
    DEMO_USER = "demo_user"

class PriorityLevel(str, PyEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class CaseStatus(str, PyEnum):
    OPEN = "open"
    UNDER_INVESTIGATION = "under_investigation"
    AWAITING_REVIEW = "awaiting_review"
    RESOLVED = "resolved"
    CLOSED = "closed"

class EvidenceType(str, PyEnum):
    AUDIO = "audio"
    VIDEO = "video"
    TEXT = "text"
    IMAGE = "image"
    DOCUMENT = "document"

class AnalysisStatus(str, PyEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class RiskLevel(str, PyEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"
    NEEDS_REVIEW = "needs_review"

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    full_name = Column(String(150), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default=UserRole.INVESTIGATOR.value, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    assigned_cases = relationship("Case", back_populates="assigned_investigator", foreign_keys="Case.assigned_investigator_id")
    created_cases = relationship("Case", back_populates="creator", foreign_keys="Case.created_by")
    notes = relationship("InvestigatorNote", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="user")

class Case(Base):
    __tablename__ = "cases"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_number = Column(String(64), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    complaint_category = Column(String(100), nullable=False)  # e.g. "Identity Theft", "Voice Cloning Fraud", "Deepfake Extortion", "Phishing Scam"
    priority = Column(String(20), default=PriorityLevel.MEDIUM.value, nullable=False)
    status = Column(String(30), default=CaseStatus.OPEN.value, nullable=False)
    assigned_investigator_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    assigned_investigator = relationship("User", back_populates="assigned_cases", foreign_keys=[assigned_investigator_id])
    creator = relationship("User", back_populates="created_cases", foreign_keys=[created_by])
    evidence_items = relationship("Evidence", back_populates="case", cascade="all, delete-orphan")
    notes = relationship("InvestigatorNote", back_populates="case", cascade="all, delete-orphan")
    reports = relationship("GeneratedReport", back_populates="case", cascade="all, delete-orphan")

class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id"), nullable=False, index=True)
    original_filename = Column(String(255), nullable=False)
    stored_object_key = Column(String(512), nullable=False)
    mime_type = Column(String(120), nullable=False)
    file_size = Column(Integer, nullable=False)
    sha256_hash = Column(String(64), nullable=False, index=True)
    evidence_type = Column(String(50), nullable=False)
    uploaded_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    uploaded_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    processing_status = Column(String(30), default="ready", nullable=False)

    case = relationship("Case", back_populates="evidence_items")
    uploader = relationship("User")
    analysis_jobs = relationship("AnalysisJob", back_populates="evidence", cascade="all, delete-orphan")
    notes = relationship("InvestigatorNote", back_populates="evidence")

class AnalysisJob(Base):
    __tablename__ = "analysis_jobs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    evidence_id = Column(String(36), ForeignKey("evidence.id"), nullable=False, index=True)
    analysis_type = Column(String(50), nullable=False)  # audio, video, text, image
    status = Column(String(30), default=AnalysisStatus.PENDING.value, nullable=False)
    model_name = Column(String(100), nullable=False)
    model_version = Column(String(50), nullable=False)
    started_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)

    evidence = relationship("Evidence", back_populates="analysis_jobs")
    result = relationship("AnalysisResult", back_populates="job", uselist=False, cascade="all, delete-orphan")

class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    analysis_job_id = Column(String(36), ForeignKey("analysis_jobs.id"), nullable=False, unique=True)
    risk_level = Column(String(30), nullable=False)
    risk_score = Column(Float, nullable=False)  # 0.0 to 100.0 scale
    model_confidence = Column(Float, nullable=True)  # 0.0 to 1.0 calibrated if available
    findings_json = Column(JSON, nullable=False, default=dict)
    limitations_json = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    job = relationship("AnalysisJob", back_populates="result")

class InvestigatorNote(Base):
    __tablename__ = "investigator_notes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id"), nullable=False, index=True)
    evidence_id = Column(String(36), ForeignKey("evidence.id"), nullable=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    note = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    case = relationship("Case", back_populates="notes")
    evidence = relationship("Evidence", back_populates="notes")
    user = relationship("User", back_populates="notes")

class CallerReport(Base):
    __tablename__ = "caller_reports"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    normalised_number = Column(String(32), index=True, nullable=False)
    report_category = Column(String(80), nullable=False)  # e.g., "Impersonation", "Bank Fraud", "Robocall", "Threat"
    description = Column(Text, nullable=False)
    submitted_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    verification_status = Column(String(30), default="unverified", nullable=False)  # "unverified", "verified_suspicious", "flagged"
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    submitter = relationship("User")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String(100), nullable=False, index=True)
    case_id = Column(String(36), nullable=True, index=True)
    evidence_id = Column(String(36), nullable=True, index=True)
    metadata_json = Column(JSON, nullable=True, default=dict)
    outcome = Column(String(20), default="success", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)

    user = relationship("User", back_populates="audit_logs")

class GeneratedReport(Base):
    __tablename__ = "generated_reports"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id"), nullable=False, index=True)
    generated_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    report_object_key = Column(String(512), nullable=False)
    file_name = Column(String(255), nullable=False)
    report_metadata_json = Column(JSON, nullable=True, default=dict)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    case = relationship("Case", back_populates="reports")
    generator = relationship("User")
