import pytest
import uuid
import hashlib
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.core.database import SessionLocal
from app.models import (
    User, UserRole, Case, Evidence, AnalysisJob, AnalysisResult,
    TimelineEvent, IOC, InvestigatorNote
)
from app.core.security import get_password_hash, create_access_token
from app.services.integrity_service import verify_evidence_integrity
from app.services.ioc_service import extract_iocs_from_text, extract_and_store_iocs, get_case_iocs
from app.services.correlation_service import get_case_correlations, build_correlation_graph
from app.services.similarity_service import calculate_evidence_similarity
from app.services.copilot_service import query_case_copilot, answer_case_question_locally
from app.services.risk_engine import compute_case_aggregated_risk
from app.core.storage import storage_client

client = TestClient(app)

@pytest.fixture
def test_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def auth_headers(test_db):
    user = test_db.query(User).filter(User.role == UserRole.INVESTIGATOR.value).first()
    if not user:
        user = User(
            id=str(uuid.uuid4()),
            full_name="Test Investigator",
            email=f"test_inv_{uuid.uuid4().hex[:4]}@trustguard.ai",
            password_hash=get_password_hash("TestPass@2026"),
            role=UserRole.INVESTIGATOR.value,
            is_active=True
        )
        test_db.add(user)
        test_db.commit()
        test_db.refresh(user)
    token = create_access_token(subject=user.id, role=user.role)
    return {"Authorization": f"Bearer {token}"}

def test_evidence_timeline_lifecycle(test_db, auth_headers):
    # 1. Create a test case
    case = Case(
        id=str(uuid.uuid4()),
        case_number=f"TG-TEST-{uuid.uuid4().hex[:6].upper()}",
        title="Timeline Test Case",
        complaint_category="Phishing Scam",
        priority="high",
        status="open",
        created_by="system"
    )
    test_db.add(case)
    test_db.commit()

    # 2. Add an evidence item
    content = b"Simulated extortion message text content for timeline testing."
    sha256 = hashlib.sha256(content).hexdigest()
    ev = Evidence(
        id=str(uuid.uuid4()),
        case_id=case.id,
        original_filename="timeline_sample.txt",
        stored_object_key=f"cases/{case.id}/timeline_sample.txt",
        mime_type="text/plain",
        file_size=len(content),
        sha256_hash=sha256,
        evidence_type="text",
        uploaded_by="system",
        processing_status="ready"
    )
    test_db.add(ev)
    test_db.commit()
    storage_client.save_bytes(ev.stored_object_key, content, "text/plain")

    # 3. Verify timeline endpoint
    res = client.get(f"/api/v1/cases/{case.id}/timeline", headers=auth_headers)
    assert res.status_code == 200
    timeline = res.json()
    assert isinstance(timeline, list)

def test_evidence_integrity_sha256_verification(test_db, auth_headers):
    # 1. Setup valid file
    content = b"Cryptographic integrity test payload 2026."
    sha256 = hashlib.sha256(content).hexdigest()
    case_id = str(uuid.uuid4())
    ev_id = str(uuid.uuid4())
    obj_key = f"cases/{case_id}/{ev_id}_integrity_test.txt"

    c = Case(id=case_id, case_number=f"TG-INT-{uuid.uuid4().hex[:6]}", title="Integrity Check Case", complaint_category="Identity Theft", priority="medium", status="open", created_by="system")
    test_db.add(c)
    e = Evidence(id=ev_id, case_id=case_id, original_filename="integrity_test.txt", stored_object_key=obj_key, mime_type="text/plain", file_size=len(content), sha256_hash=sha256, evidence_type="text", uploaded_by="system", processing_status="ready")
    test_db.add(e)
    test_db.commit()
    storage_client.save_bytes(obj_key, content, "text/plain")

    # 2. Test verified status
    res = client.post(f"/api/v1/evidence/{ev_id}/verify-integrity", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["integrity_status"] == "VERIFIED"
    assert data["algorithm"] == "SHA-256"
    assert data["computed_hash"] == sha256

    # 3. Simulate file tampering
    storage_client.save_bytes(obj_key, b"Tampered and altered content!", "text/plain")
    res_tampered = client.post(f"/api/v1/evidence/{ev_id}/verify-integrity", headers=auth_headers)
    assert res_tampered.status_code == 200
    data_tampered = res_tampered.json()
    assert data_tampered["integrity_status"] == "HASH_MISMATCH"
    assert data_tampered["computed_hash"] != sha256

def test_deterministic_ioc_extraction():
    sample_text = (
        "Urgent: Contact officer Sharma at +91 9876543210 or +919876543210. "
        "Email official verification to cybercell.support@cbi-gov.in. "
        "Visit our secure verification portal https://police-verification.xyz/notice?id=9928 "
        "or secondary site cybercrime-report.org. Connect from server 198.51.100.44 and transfer fee to fraudster@oksbi."
    )
    iocs = extract_iocs_from_text(sample_text)
    types_found = {i["ioc_type"] for i in iocs}

    assert "phone" in types_found
    assert "email" in types_found
    assert "url" in types_found
    assert "domain" in types_found
    assert "ipv4" in types_found
    assert "upi" in types_found

    # Verify phone normalization
    phone_iocs = [i for i in iocs if i["ioc_type"] == "phone"]
    assert any("+919876543210" in p["normalized_value"] for p in phone_iocs)

    # Verify domain extraction from URL
    domain_iocs = [i for i in iocs if i["ioc_type"] == "domain"]
    domain_values = [d["normalized_value"] for d in domain_iocs]
    assert "police-verification.xyz" in domain_values or "cybercrime-report.org" in domain_values

def test_ioc_correlation_and_graph(test_db):
    case_id = str(uuid.uuid4())
    c = Case(id=case_id, case_number=f"TG-CORR-{uuid.uuid4().hex[:6]}", title="Correlation Case", complaint_category="Extortion", priority="critical", status="open", created_by="system")
    test_db.add(c)

    ev1 = Evidence(id=str(uuid.uuid4()), case_id=case_id, original_filename="threat1.txt", stored_object_key="k1", mime_type="text/plain", file_size=100, sha256_hash="h1", evidence_type="text", uploaded_by="system")
    ev2 = Evidence(id=str(uuid.uuid4()), case_id=case_id, original_filename="threat2.txt", stored_object_key="k2", mime_type="text/plain", file_size=120, sha256_hash="h2", evidence_type="text", uploaded_by="system")
    test_db.add_all([ev1, ev2])
    test_db.commit()

    # Add shared IOC (same domain in both evidence items)
    ioc1 = IOC(id=str(uuid.uuid4()), case_id=case_id, evidence_id=ev1.id, ioc_type="domain", value="malicious-portal.xyz", normalized_value="malicious-portal.xyz")
    ioc2 = IOC(id=str(uuid.uuid4()), case_id=case_id, evidence_id=ev2.id, ioc_type="domain", value="malicious-portal.xyz", normalized_value="malicious-portal.xyz")
    test_db.add_all([ioc1, ioc2])
    test_db.commit()

    correlations = get_case_correlations(test_db, case_id)
    assert correlations["shared_iocs_count"] == 1
    assert correlations["shared_iocs"][0]["normalized_value"] == "malicious-portal.xyz"
    assert len(correlations["correlation_pairs"]) == 1

    graph = build_correlation_graph(test_db, case_id)
    assert len(graph["nodes"]) >= 3 # Case, 2 Evidences, 1 IOC
    assert len(graph["edges"]) >= 3

def test_evidence_similarity_and_duplicates(test_db):
    case_id = str(uuid.uuid4())
    c = Case(id=case_id, case_number=f"TG-SIM-{uuid.uuid4().hex[:6]}", title="Similarity Case", complaint_category="Phishing", priority="medium", status="open", created_by="system")
    test_db.add(c)

    text_a = b"Urgent summons: Your bank account has been frozen by Mumbai Police. Pay penalty immediately."
    text_b = b"Urgent notice: Your bank account has been frozen by Delhi Police. Pay penalty immediately."
    
    sha_a = hashlib.sha256(text_a).hexdigest()
    sha_b = hashlib.sha256(text_b).hexdigest()

    ev1 = Evidence(id=str(uuid.uuid4()), case_id=case_id, original_filename="notice_a.txt", stored_object_key=f"cases/{case_id}/a.txt", mime_type="text/plain", file_size=len(text_a), sha256_hash=sha_a, evidence_type="text", uploaded_by="system")
    ev2 = Evidence(id=str(uuid.uuid4()), case_id=case_id, original_filename="notice_b.txt", stored_object_key=f"cases/{case_id}/b.txt", mime_type="text/plain", file_size=len(text_b), sha256_hash=sha_b, evidence_type="text", uploaded_by="system")
    test_db.add_all([ev1, ev2])
    test_db.commit()

    storage_client.save_bytes(ev1.stored_object_key, text_a, "text/plain")
    storage_client.save_bytes(ev2.stored_object_key, text_b, "text/plain")

    sim_res = calculate_evidence_similarity(test_db, case_id)
    assert len(sim_res["comparisons"]) == 1
    # Similar templates should have >60% similarity and categorized level
    assert sim_res["comparisons"][0]["similarity_score"] >= 60.0
    assert sim_res["comparisons"][0]["similarity_level"] in ("Related", "Possibly Related")

def test_explainable_risk_score_breakdown(test_db):
    case_id = str(uuid.uuid4())
    c = Case(id=case_id, case_number=f"TG-RISK-{uuid.uuid4().hex[:6]}", title="Risk Case", complaint_category="Digital Arrest", priority="critical", status="open", created_by="system")
    test_db.add(c)
    ev = Evidence(id=str(uuid.uuid4()), case_id=case_id, original_filename="threat.txt", stored_object_key="k", mime_type="text/plain", file_size=100, sha256_hash="h", evidence_type="text", uploaded_by="system")
    test_db.add(ev)
    test_db.commit()

    job = AnalysisJob(id=str(uuid.uuid4()), evidence_id=ev.id, analysis_type="text", status="completed", model_name="TrustGuard-RuleEngine", model_version="1.0")
    test_db.add(job)
    test_db.commit()

    res = AnalysisResult(
        analysis_job_id=job.id,
        risk_level="HIGH",
        risk_score=75.0,
        findings_json={
            "indicators": [
                {
                    "category": "Authority Impersonation",
                    "description": "Impersonation of Police and CBI officials",
                    "weight_contribution": 30.0,
                    "severity": "HIGH",
                    "matches": [{"matched_text": "CBI Officer", "context_snippet": "I am a CBI Officer"}]
                },
                {
                    "category": "Credential Harvesting",
                    "description": "Solicitation of OTP",
                    "weight_contribution": 35.0,
                    "severity": "CRITICAL",
                    "matches": [{"matched_text": "enter OTP", "context_snippet": "enter OTP now"}]
                }
            ]
        },
        limitations_json=[]
    )
    test_db.add(res)
    test_db.commit()

    profile = compute_case_aggregated_risk(test_db, case_id)
    assert profile["overall_risk_score"] >= 60.0
    assert len(profile["granular_breakdown"]) >= 2
    assert "assessment_label" in profile

def test_pii_redaction_preview(auth_headers):
    sample = "Call me at +91 9876543210 or email test@example.com with OTP 889922 and card 4111222233334444."
    res = client.post("/api/v1/tools/redact-preview", json={"text": sample}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "[REDACTED_PHONE]" in data["redacted_text"]
    assert "[REDACTED_EMAIL]" in data["redacted_text"]
    assert "[REDACTED_AUTH_CODE]" in data["redacted_text"]
    assert "[REDACTED_ACCOUNT_NO]" in data["redacted_text"]
    assert data["redacted_count"] >= 4

def test_copilot_case_qa_local(test_db):
    case_id = str(uuid.uuid4())
    c = Case(id=case_id, case_number=f"TG-COPILOT-{uuid.uuid4().hex[:6]}", title="Copilot Test Case", complaint_category="Impersonation", priority="high", status="open", created_by="system")
    test_db.add(c)
    test_db.commit()

    # Query without OpenRouter (deterministic local engine)
    res = query_case_copilot(test_db, case_id=case_id, question="Summarize the investigation so far.", investigator_consent=False)
    assert "Summary" in res["answer"]
    assert res["provider"] == "LOCAL_RULE_BASED"

def test_model_evaluation_endpoint(auth_headers):
    res = client.get("/api/v1/models/evaluation", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "models" in data
    assert len(data["models"]) >= 2
    assert any(m["status"] == "LIVE MODEL" for m in data["models"])
