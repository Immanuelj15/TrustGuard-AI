import io
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.ai.text_analyzer import analyze_scam_text
from app.ai.audio_analyzer import analyze_audio_file
from app.ai.video_analyzer import analyze_video_file
from app.services.caller_service import normalize_phone_number
from app.services.audit_service import sanitize_metadata

client = TestClient(app)

def test_health_check():
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "TrustGuard AI" in data["service"]

def test_audit_sanitization():
    meta = {
        "user_email": "officer@test.gov",
        "password": "SuperSecretPassword123!",
        "access_token": "bearer.xyz.123",
        "case_id": "test-case-uuid"
    }
    cleaned = sanitize_metadata(meta)
    assert cleaned["user_email"] == "officer@test.gov"
    assert cleaned["case_id"] == "test-case-uuid"
    assert cleaned["password"] == "[REDACTED]"
    assert cleaned["access_token"] == "[REDACTED]"

def test_text_analyzer_scam_indicators():
    suspicious_text = (
        "URGENT: This is CBI Crime Branch Officer Sharma. Your account will be frozen immediately. "
        "Transfer Rs 50,000 to verify escrow and share your OTP now."
    )
    result = analyze_scam_text(suspicious_text)
    assert result["risk_score"] > 60.0
    assert result["risk_level"] in ["HIGH", "CRITICAL"]
    assert len(result["findings"]["indicators"]) >= 2
    assert "limitations" in result
    assert result["model_name"] == "TrustGuard-RuleEngine-SocialEng"

def test_text_analyzer_benign():
    benign_text = "Hi, attached is the minutes of meeting for today's cybersecurity research seminar."
    result = analyze_scam_text(benign_text)
    assert result["risk_score"] == 0.0
    assert result["risk_level"] == "LOW"

def test_audio_analyzer_honesty():
    res = analyze_audio_file("non_existent_demo.wav", is_demo_mode=True)
    assert "findings" in res
    assert "synthetic_speech_indicators" in res["findings"]
    assert "limitations" in res
    # Ensure honest diagnostic disclaimer is provided
    assert "AASIST" in res["findings"]["model_status_note"] or "telemetry" in res["findings"]["model_status_note"]

def test_video_analyzer_honesty():
    res = analyze_video_file("non_existent_demo.mp4", is_demo_mode=True)
    assert "technical_metadata" in res["findings"]
    assert "Deepfake model not configured" in res["findings"]["model_status_note"] or "active" in res["findings"]["model_status_note"]

def test_caller_normalization():
    norm = normalize_phone_number("+91 98765 43210")
    assert norm["normalised"] == "+919876543210"
    assert norm["is_valid"] is True
    assert norm["country_code"] == "+91"

def test_auth_and_case_lifecycle():
    # 1. Login with seeded investigator
    login_res = client.post("/api/v1/auth/login", json={
        "email": "investigator@trustguard.ai",
        "password": "Investigator@2026"
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get profile
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "investigator@trustguard.ai"

    # 3. Create Case
    case_payload = {
        "title": "Phishing Attack on Corporate Finance Desk",
        "description": "CFO impersonation asking for vendor bank account switch.",
        "complaint_category": "Phishing Scam",
        "priority": "high"
    }
    create_res = client.post("/api/v1/cases", json=case_payload, headers=headers)
    assert create_res.status_code == 201
    case_data = create_res.json()
    case_id = case_data["id"]
    assert case_data["case_number"].startswith("TG-")

    # 4. Upload Text Evidence
    text_content = b"URGENT: CBI officer demands money transfer within 10 mins. Share OTP."
    files = {"file": ("threat_note.txt", io.BytesIO(text_content), "text/plain")}
    upload_res = client.post(f"/api/v1/cases/{case_id}/evidence", files=files, headers=headers)
    assert upload_res.status_code == 201
    evidence_data = upload_res.json()
    evidence_id = evidence_data["id"]
    assert len(evidence_data["sha256_hash"]) == 64

    # 5. Run Analysis
    analyze_res = client.post(f"/api/v1/evidence/{evidence_id}/analyze/text", headers=headers)
    assert analyze_res.status_code == 200
    job_data = analyze_res.json()
    assert job_data["status"] == "completed"
    assert job_data["result"]["risk_level"] in ["HIGH", "CRITICAL"]

    # 6. Add Investigator Note
    note_res = client.post(f"/api/v1/cases/{case_id}/notes", json={"note": "Verified sender email domain was spoofed."}, headers=headers)
    assert note_res.status_code == 200

    # 7. Generate PDF Report
    report_res = client.post(f"/api/v1/cases/{case_id}/reports", headers=headers)
    assert report_res.status_code == 201
    report_data = report_res.json()
    report_id = report_data["id"]

    # 8. Download PDF Report and check header
    download_res = client.get(f"/api/v1/reports/{report_id}/download", headers=headers)
    assert download_res.status_code == 200
    assert download_res.content.startswith(b"%PDF-")

    # 9. Caller Reputation Check
    caller_res = client.post("/api/v1/caller/check", json={"phone_number": "+919876543210"}, headers=headers)
    assert caller_res.status_code == 200
    assert caller_res.json()["normalised_number"] == "+919876543210"
    assert "disclaimer" in caller_res.json()

    # 10. Dashboard API Verification
    summary_res = client.get("/api/v1/dashboard/summary", headers=headers)
    assert summary_res.status_code == 200
    assert summary_res.json()["total_cases"] >= 1

    charts_res = client.get("/api/v1/dashboard/charts", headers=headers)
    assert charts_res.status_code == 200
    assert len(charts_res.json()["recent_activity"]) >= 1
