"""
TrustGuard AI - Deep Comprehensive QA & Security Audit Suite
Testing Phases 4 to 27 systematically.
"""
import io
import os
import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models import User, Case, Evidence, InvestigatorNote, IOC, TimelineEvent, AnalysisResult, AuditLog
from app.core.storage import storage_client

client = TestClient(app)

@pytest.fixture(scope="module")
def admin_token():
    res = client.post("/api/v1/auth/login", json={
        "email": "admin@trustguard.ai",
        "password": "Admin@TrustGuard2026"
    })
    assert res.status_code == 200, f"Admin login failed: {res.text}"
    return res.json()["access_token"]

@pytest.fixture(scope="module")
def investigator_token():
    res = client.post("/api/v1/auth/login", json={
        "email": "investigator@trustguard.ai",
        "password": "Investigator@2026"
    })
    assert res.status_code == 200, f"Investigator login failed: {res.text}"
    return res.json()["access_token"]

@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}

@pytest.fixture(scope="module")
def investigator_headers(investigator_token):
    return {"Authorization": f"Bearer {investigator_token}"}

# ==============================================================================
# PHASE 4 & 5: AUTHENTICATION & REGISTRATION TESTING
# ==============================================================================

def test_auth_registration_valid():
    unique_email = f"audit_user_{uuid.uuid4().hex[:8]}@trustguard.ai"
    res = client.post("/api/v1/auth/register", json={
        "full_name": "Audit Investigator",
        "email": unique_email,
        "password": "SecurePassword123!",
        "role": "investigator"
    })
    assert res.status_code == 201
    data = res.json()
    assert data["email"] == unique_email
    assert data["is_active"] is True

def test_auth_registration_duplicate_rejected():
    unique_email = f"duplicate_{uuid.uuid4().hex[:8]}@trustguard.ai"
    payload = {
        "full_name": "Duplicate Tester",
        "email": unique_email,
        "password": "SecurePassword123!",
        "role": "investigator"
    }
    res1 = client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = client.post("/api/v1/auth/register", json=payload)
    assert res2.status_code == 400
    assert "already exists" in res2.json()["detail"].lower()

def test_auth_registration_invalid_email():
    res = client.post("/api/v1/auth/register", json={
        "full_name": "Invalid Email",
        "email": "not-an-email",
        "password": "SecurePassword123!",
        "role": "investigator"
    })
    assert res.status_code == 422  # Pydantic validation error

def test_auth_registration_short_password():
    res = client.post("/api/v1/auth/register", json={
        "full_name": "Short Pass",
        "email": f"short_{uuid.uuid4().hex[:8]}@trustguard.ai",
        "password": "123",
        "role": "investigator"
    })
    assert res.status_code == 422

def test_auth_login_invalid_credentials():
    res = client.post("/api/v1/auth/login", json={
        "email": "investigator@trustguard.ai",
        "password": "WrongPassword!999"
    })
    assert res.status_code == 401
    assert "incorrect email or password" in res.json()["detail"].lower()

def test_auth_login_nonexistent_user():
    res = client.post("/api/v1/auth/login", json={
        "email": "ghost_user_does_not_exist@trustguard.ai",
        "password": "AnyPassword123!"
    })
    assert res.status_code == 401

def test_protected_routes_reject_unauthenticated():
    routes = [
        ("GET", "/api/v1/cases"),
        ("POST", "/api/v1/cases"),
        ("GET", "/api/v1/dashboard/summary"),
        ("GET", "/api/v1/models/evaluation"),
    ]
    for method, route in routes:
        if method == "GET":
            res = client.get(route)
        else:
            res = client.post(route, json={})
        assert res.status_code == 401, f"Route {route} allowed unauthenticated access!"

def test_protected_routes_reject_invalid_token():
    headers = {"Authorization": "Bearer invalid.token.payload"}
    res = client.get("/api/v1/cases", headers=headers)
    assert res.status_code == 401

# ==============================================================================
# PHASE 6: ROLE-BASED ACCESS CONTROL & AUTHORIZATION
# ==============================================================================

def test_role_based_access_viewer_cannot_create_case():
    viewer_email = f"viewer_{uuid.uuid4().hex[:8]}@trustguard.ai"
    reg = client.post("/api/v1/auth/register", json={
        "full_name": "Read Only Viewer",
        "email": viewer_email,
        "password": "ViewerPassword123!",
        "role": "viewer"
    })
    assert reg.status_code == 201

    login = client.post("/api/v1/auth/login", json={
        "email": viewer_email,
        "password": "ViewerPassword123!"
    })
    viewer_token = login.json()["access_token"]
    viewer_headers = {"Authorization": f"Bearer {viewer_token}"}

    # Viewer attempts to create a case -> Should be rejected 403 Forbidden
    create_res = client.post("/api/v1/cases", json={
        "title": "Unauthorized Case By Viewer",
        "complaint_category": "Phishing Scam",
        "priority": "low"
    }, headers=viewer_headers)
    assert create_res.status_code == 403, f"Expected 403 Forbidden for viewer, got {create_res.status_code}"

def test_admin_users_endpoint_authorization(admin_headers, investigator_headers):
    # Admin can list users
    admin_res = client.get("/api/v1/users", headers=admin_headers)
    assert admin_res.status_code == 200
    users = admin_res.json()
    assert len(users) >= 4
    emails = [u["email"] for u in users]
    assert "admin@trustguard.ai" in emails

    # Investigator is forbidden (403)
    inv_res = client.get("/api/v1/users", headers=investigator_headers)
    assert inv_res.status_code == 403

    # Demo User is forbidden (403)
    demo_login = client.post("/api/v1/auth/login", json={
        "email": "demo@trustguard.ai",
        "password": "Demo@2026"
    }).json()
    demo_headers = {"Authorization": f"Bearer {demo_login['access_token']}"}
    demo_res = client.get("/api/v1/users", headers=demo_headers)
    assert demo_res.status_code == 403

# ==============================================================================
# PHASE 7 & 8: CASE MANAGEMENT & EVIDENCE UPLOAD VALIDATION
# ==============================================================================

def test_empty_evidence_file_rejected(investigator_headers):
    # Create test case
    c = client.post("/api/v1/cases", json={
        "title": "Audit Empty File Case",
        "complaint_category": "Phishing Scam",
        "priority": "medium"
    }, headers=investigator_headers).json()

    empty_file = {"file": ("empty.txt", io.BytesIO(b""), "text/plain")}
    res = client.post(f"/api/v1/cases/{c['id']}/evidence", files=empty_file, headers=investigator_headers)
    assert res.status_code == 400, f"Expected 400 Bad Request for 0-byte file, got {res.status_code}: {res.text}"
    assert "empty" in res.json()["detail"].lower()

def test_disallowed_extension_rejected(investigator_headers):
    c = client.post("/api/v1/cases", json={
        "title": "Audit Malware File Case",
        "complaint_category": "Malware Attack",
        "priority": "high"
    }, headers=investigator_headers).json()

    bad_file = {"file": ("malware.exe", io.BytesIO(b"MZ\x90\x00executable bytes"), "application/octet-stream")}
    res = client.post(f"/api/v1/cases/{c['id']}/evidence", files=bad_file, headers=investigator_headers)
    assert res.status_code == 400
    assert "unsupported file format" in res.json()["detail"].lower()

def test_nonexistent_case_evidence_upload(investigator_headers):
    fake_case_id = str(uuid.uuid4())
    good_file = {"file": ("sample.txt", io.BytesIO(b"some content"), "text/plain")}
    res = client.post(f"/api/v1/cases/{fake_case_id}/evidence", files=good_file, headers=investigator_headers)
    assert res.status_code == 404

# ==============================================================================
# PHASE 9: SHA-256 INTEGRITY & TAMPER DETECTION
# ==============================================================================

def test_sha256_verification_and_tamper_detection(investigator_headers):
    c = client.post("/api/v1/cases", json={
        "title": "Audit Tamper Test Case",
        "complaint_category": "Financial Fraud",
        "priority": "high"
    }, headers=investigator_headers).json()

    original_bytes = b"Official ledger transaction #94821: Transfer INR 10,000 to merchant."
    files = {"file": ("ledger.txt", io.BytesIO(original_bytes), "text/plain")}
    upload = client.post(f"/api/v1/cases/{c['id']}/evidence", files=files, headers=investigator_headers)
    assert upload.status_code == 201
    ev_data = upload.json()
    ev_id = ev_data["id"]

    # 1. Verify integrity before tampering
    check1 = client.post(f"/api/v1/evidence/{ev_id}/verify-integrity", headers=investigator_headers)
    assert check1.status_code == 200
    assert check1.json()["integrity_status"] == "VERIFIED"

    # 2. Simulate storage tampering (alter 1 byte)
    db = SessionLocal()
    ev_record = db.query(Evidence).filter(Evidence.id == ev_id).first()
    tampered_bytes = b"Official ledger transaction #94821: Transfer INR 99,000 to fraudster."
    storage_client.save_bytes(ev_record.stored_object_key, tampered_bytes)
    db.close()

    # 3. Verify integrity after tampering -> MUST detect HASH_MISMATCH
    check2 = client.post(f"/api/v1/evidence/{ev_id}/verify-integrity", headers=investigator_headers)
    assert check2.status_code == 200
    assert check2.json()["integrity_status"] == "HASH_MISMATCH"
    assert "alert" in check2.json()["detail"].lower()

# ==============================================================================
# PHASE 10 to 12: INVESTIGATION ENDPOINTS 404 ON NON-EXISTENT CASE
# ==============================================================================

def test_investigation_endpoints_404_on_missing_case(investigator_headers):
    fake_id = str(uuid.uuid4())
    assert client.get(f"/api/v1/cases/{fake_id}/timeline", headers=investigator_headers).status_code == 404
    assert client.get(f"/api/v1/cases/{fake_id}/iocs", headers=investigator_headers).status_code == 404
    assert client.get(f"/api/v1/cases/{fake_id}/correlations", headers=investigator_headers).status_code == 404
    assert client.get(f"/api/v1/cases/{fake_id}/correlation-graph", headers=investigator_headers).status_code == 404
    assert client.get(f"/api/v1/cases/{fake_id}/similar-evidence", headers=investigator_headers).status_code == 404
    assert client.get(f"/api/v1/cases/{fake_id}/risk-profile", headers=investigator_headers).status_code == 404
    assert client.post(f"/api/v1/cases/{fake_id}/copilot", json={"question": "What is this?"}, headers=investigator_headers).status_code == 404

# ==============================================================================
# PHASE 15 to 17: IOC EXTRACTION, CORRELATION & SIMILARITY
# ==============================================================================

def test_ioc_extraction_and_correlation(investigator_headers):
    c1 = client.post("/api/v1/cases", json={
        "title": "Case 1 with Shared IOC",
        "complaint_category": "Phishing Scam",
        "priority": "medium"
    }, headers=investigator_headers).json()

    c2 = client.post("/api/v1/cases", json={
        "title": "Case 2 with Shared IOC",
        "complaint_category": "Phishing Scam",
        "priority": "high"
    }, headers=investigator_headers).json()

    shared_text = b"Contact cybercrime agent at support@secure-bank-kyc.com or visit http://scam-verify-kyc.top/login."
    f1 = {"file": ("msg1.txt", io.BytesIO(shared_text), "text/plain")}
    ev1 = client.post(f"/api/v1/cases/{c1['id']}/evidence", files=f1, headers=investigator_headers).json()

    f2 = {"file": ("msg2.txt", io.BytesIO(shared_text), "text/plain")}
    ev2 = client.post(f"/api/v1/cases/{c2['id']}/evidence", files=f2, headers=investigator_headers).json()

    # Analyze both to trigger IOC extraction
    client.post(f"/api/v1/evidence/{ev1['id']}/analyze", json={"analysis_type": "text"}, headers=investigator_headers)
    client.post(f"/api/v1/evidence/{ev2['id']}/analyze", json={"analysis_type": "text"}, headers=investigator_headers)

    # Add a second evidence item to c1 that shares the same IOC
    f1_b = {"file": ("msg1_b.txt", io.BytesIO(b"Second demand received from support@secure-bank-kyc.com immediately."), "text/plain")}
    ev1_b = client.post(f"/api/v1/cases/{c1['id']}/evidence", files=f1_b, headers=investigator_headers).json()
    client.post(f"/api/v1/evidence/{ev1_b['id']}/analyze", json={"analysis_type": "text"}, headers=investigator_headers)

    # Check IOC extraction on c1
    iocs_c1 = client.get(f"/api/v1/cases/{c1['id']}/iocs", headers=investigator_headers).json()
    extracted_vals = [i["normalized_value"] for i in iocs_c1]
    assert "support@secure-bank-kyc.com" in extracted_vals

    # Check correlations on c1 (should find intra-case evidence correlation)
    correlations = client.get(f"/api/v1/cases/{c1['id']}/correlations", headers=investigator_headers).json()
    assert correlations["total_unique_iocs"] >= 1
    assert correlations["shared_iocs_count"] >= 1
    shared_values = [item["normalized_value"] for item in correlations["shared_iocs"]]
    assert "support@secure-bank-kyc.com" in shared_values

    # Check graph on c1
    graph = client.get(f"/api/v1/cases/{c1['id']}/correlation-graph", headers=investigator_headers).json()
    assert len(graph["nodes"]) >= 2
    assert len(graph["edges"]) >= 1

# ==============================================================================
# PHASE 19: INVESTIGATOR NOTES & MALICIOUS INPUT (XSS)
# ==============================================================================

def test_investigator_notes_xss_safety(investigator_headers):
    c = client.post("/api/v1/cases", json={
        "title": "Case for XSS testing",
        "complaint_category": "Phishing Scam",
        "priority": "low"
    }, headers=investigator_headers).json()

    xss_payload = "<script>alert('pwned')</script><img src=x onerror=alert(1)>"
    res = client.post(f"/api/v1/cases/{c['id']}/notes", json={"note": xss_payload}, headers=investigator_headers)
    assert res.status_code == 200
    note_id = res.json()["id"]

    # Verify note persisted as text without breaking JSON response
    get_case = client.get(f"/api/v1/cases/{c['id']}", headers=investigator_headers)
    assert get_case.status_code == 200
    saved_notes = [n["note"] for n in get_case.json()["notes"]]
    assert xss_payload in saved_notes

# ==============================================================================
# PHASE 20: PDF REPORT TESTING
# ==============================================================================

def test_pdf_generation_empty_case_and_with_evidence(investigator_headers):
    # 1. Empty case PDF
    c_empty = client.post("/api/v1/cases", json={
        "title": "Empty Case For PDF",
        "complaint_category": "Identity Theft",
        "priority": "low"
    }, headers=investigator_headers).json()

    rep_res = client.post(f"/api/v1/cases/{c_empty['id']}/reports", headers=investigator_headers)
    assert rep_res.status_code == 201
    rep_id = rep_res.json()["id"]

    download = client.get(f"/api/v1/reports/{rep_id}/download", headers=investigator_headers)
    assert download.status_code == 200
    assert download.content.startswith(b"%PDF-")
    assert len(download.content) > 1000
