from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app.api.v1 import auth, cases, evidence, analysis, caller, reports, audit, dashboard, demo, models
from app.core.security import get_password_hash
from app.models import (
    User, UserRole, Case, Evidence, AnalysisJob, AnalysisResult,
    CallerReport, InvestigatorNote, CaseStatus, PriorityLevel, EvidenceType
)
from datetime import datetime, timezone

def init_db_and_seed():
    """Initializes tables and seeds initial investigator accounts and demo forensic cases."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # 1. Seed Accounts if absent
        seed_users = [
            ("admin@trustguard.ai", "Admin User", "Admin@TrustGuard2026", UserRole.ADMIN.value),
            ("investigator@trustguard.ai", "Insp. Rajesh Kumar", "Investigator@2026", UserRole.INVESTIGATOR.value),
            ("reviewer@trustguard.ai", "Forensic Reviewer Maya", "Reviewer@2026", UserRole.REVIEWER.value),
            ("demo@trustguard.ai", "Guest Investigator", "Demo@2026", UserRole.DEMO_USER.value),
        ]
        
        user_objs = {}
        for email, name, pwd, role in seed_users:
            u = db.query(User).filter(User.email == email).first()
            if not u:
                u = User(
                    full_name=name,
                    email=email,
                    password_hash=get_password_hash(pwd),
                    role=role,
                    is_active=True
                )
                db.add(u)
                db.commit()
                db.refresh(u)
            user_objs[role] = u

        # 2. Seed realistic cybercrime cases if none exist
        if db.query(Case).count() == 0:
            inv = user_objs[UserRole.INVESTIGATOR.value]
            
            # Case 1: Digital Arrest Impersonation
            c1 = Case(
                case_number="TG-2026-88102",
                title="CBI & Telecom Digital Arrest Extortion Scam",
                description="Victim contacted by actors impersonating Mumbai Police Cyber Cell claiming a courier containing contraband was seized. Demanded urgent RTGS transfer of Rs 4,50,000 to 'escrow verification account'.",
                complaint_category="Authority Impersonation & Digital Arrest",
                priority=PriorityLevel.CRITICAL.value,
                status=CaseStatus.UNDER_INVESTIGATION.value,
                assigned_investigator_id=inv.id,
                created_by=inv.id
            )
            db.add(c1)
            db.commit()
            db.refresh(c1)

            # Evidence for Case 1
            e1 = Evidence(
                case_id=c1.id,
                original_filename="whatsapp_cbi_threat_notice.txt",
                stored_object_key=f"cases/{c1.id}/sample_whatsapp_threat.txt",
                mime_type="text/plain",
                file_size=1240,
                sha256_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                evidence_type=EvidenceType.TEXT.value,
                uploaded_by=inv.id,
                processing_status="analyzed"
            )
            db.add(e1)
            db.commit()
            db.refresh(e1)

            # Analysis Job for e1
            j1 = AnalysisJob(
                evidence_id=e1.id,
                analysis_type="text",
                status="completed",
                model_name="TrustGuard-RuleEngine-SocialEng",
                model_version="v1.4-multilingual",
                completed_at=datetime.now(timezone.utc)
            )
            db.add(j1)
            db.commit()
            db.refresh(j1)

            r1 = AnalysisResult(
                analysis_job_id=j1.id,
                risk_level="CRITICAL",
                risk_score=92.5,
                model_confidence=0.91,
                findings_json={
                    "total_indicators_found": 3,
                    "distinct_indicator_categories": ["Authority Impersonation", "Coercive Transfer", "Credential Harvesting"],
                    "indicators": [
                        {
                            "rule_id": "IMPERSONATION_AUTHORITY",
                            "category": "Authority Impersonation",
                            "severity": "HIGH",
                            "description": "Impersonation of law enforcement, government agencies, or financial regulators.",
                            "matches": [{"matched_text": "CBI Officer Sharma", "context_snippet": "This is CBI Officer Sharma from Crime Branch"}]
                        },
                        {
                            "rule_id": "URGENT_FINANCIAL_DEMAND",
                            "category": "Coercive Transfer",
                            "severity": "HIGH",
                            "description": "Urgent demand for financial transfer under threat of immediate adverse consequences.",
                            "matches": [{"matched_text": "transfer immediately within 30 minutes", "context_snippet": "you must transfer immediately within 30 minutes or face arrest"}]
                        }
                    ]
                },
                limitations_json=[
                    "Rule-based detection identifies syntactic and semantic scam patterns, not criminal culpability.",
                    "Independent corroboration through telecom CDR and bank beneficiary audit required."
                ]
            )
            db.add(r1)

            # Case Note
            n1 = InvestigatorNote(
                case_id=c1.id,
                evidence_id=e1.id,
                user_id=inv.id,
                note="Victim received VoIP call with spoofed Telecom Department header. Freeze request sent to nodal cybercrime desk for beneficiary account."
            )
            db.add(n1)

            # Case 2: AI Voice Cloning Family Emergency
            c2 = Case(
                case_number="TG-2026-92415",
                title="AI Voice Clone Relative Distress Fraud",
                description="Elderly complainant received call from synthesized voice resembling grandson claiming hospital detention abroad after car accident. Demanded Rs 1,80,000 crypto/UPI transfer.",
                complaint_category="Voice Cloning Fraud",
                priority=PriorityLevel.HIGH.value,
                status=CaseStatus.AWAITING_REVIEW.value,
                assigned_investigator_id=inv.id,
                created_by=inv.id
            )
            db.add(c2)

            # Caller reports
            cr1 = CallerReport(
                normalised_number="+919876543210",
                report_category="Impersonation",
                description="Caller posing as Mumbai Police claiming narcotics courier seized in victim's name.",
                submitted_by=inv.id,
                verification_status="verified_suspicious"
            )
            cr2 = CallerReport(
                normalised_number="+918800112233",
                report_category="Banking Scam",
                description="Automated robocall claiming electricity bill unpaid, asking to install QuickSupport APK.",
                submitted_by=inv.id,
                verification_status="verified_suspicious"
            )
            db.add_all([cr1, cr2])
            db.commit()

    finally:
        db.close()

# Run initialization at import time so test runners and server instances are guaranteed initialized
init_db_and_seed()

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db_and_seed()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI-Powered Cybercrime Investigation Assistance and Digital Evidence Analysis Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(cases.router, prefix=settings.API_V1_STR)
app.include_router(evidence.router, prefix=settings.API_V1_STR)
app.include_router(analysis.router, prefix=settings.API_V1_STR)
app.include_router(caller.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(audit.router, prefix=settings.API_V1_STR)
app.include_router(dashboard.router, prefix=settings.API_V1_STR)
app.include_router(demo.router, prefix=settings.API_V1_STR)
app.include_router(models.router, prefix=f"{settings.API_V1_STR}/models", tags=["Model Registry"])

@app.get("/api/v1/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "demo_mode": settings.DEMO_MODE,
        "storage_type": settings.STORAGE_TYPE,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
