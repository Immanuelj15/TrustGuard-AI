import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.ai.openrouter.config import OpenRouterConfig
from app.ai.openrouter.redaction import sanitize_and_redact_evidence
from app.ai.openrouter.client import OpenRouterClient, OpenRouterError
from app.models import Evidence, AnalysisJob, AnalysisResult

client = TestClient(app)

@pytest.fixture
def auth_headers():
    res = client.post("/api/v1/auth/login", json={"email": "investigator@trustguard.ai", "password": "Investigator@2026"})
    assert res.status_code == 200, res.text
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_openrouter_status_endpoint_security(auth_headers):
    """
    Security check: GET /api/v1/llm/status must NEVER return secrets or API keys.
    """
    res = client.get("/api/v1/llm/status", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "enabled" in data
    assert "configured" in data
    assert "model" in data
    assert "base_url" in data
    assert "disclaimer" in data
    
    # Assert absolutely NO api key or credential in response
    assert "api_key" not in data
    assert "OPENROUTER_API_KEY" not in data
    for v in data.values():
        if isinstance(v, str):
            assert not v.startswith("sk-or-v1-")

def test_pii_redaction_engine():
    """
    Unit test: Sensitive personal identifiers (emails, phones, accounts, OTPs) are masked.
    """
    sample = (
        "Send Rs 50,000 to fraudster@suspicious-bank.com. "
        "Call officer at +91 9876543210 or (555) 234-5678. "
        "Your OTP is 492018. Connect to server 198.51.100.42. "
        "Beneficiary account 4829103948572910."
    )
    redacted, was_redacted, notes = sanitize_and_redact_evidence(sample)
    
    assert was_redacted is True
    assert len(notes) >= 4
    assert "fraudster@suspicious-bank.com" not in redacted
    assert "[REDACTED_EMAIL]" in redacted
    assert "9876543210" not in redacted
    assert "[REDACTED_PHONE]" in redacted
    assert "492018" not in redacted
    assert "198.51.100.42" not in redacted
    assert "[REDACTED_IP]" in redacted
    assert "4829103948572910" not in redacted
    assert "[REDACTED_ACCOUNT_NO]" in redacted

def test_pii_redaction_clean_text():
    """
    Clean text without identifiers should not be modified.
    """
    clean = "This is a generic security notification about suspicious account access."
    redacted, was_redacted, notes = sanitize_and_redact_evidence(clean)
    assert was_redacted is False
    assert len(notes) == 0
    assert redacted == clean

def _get_or_create_test_evidence(auth_headers):
    cases = client.get("/api/v1/cases", headers=auth_headers).json()
    for c in cases:
        evs = client.get(f"/api/v1/cases/{c['id']}/evidence", headers=auth_headers).json()
        for ev in evs:
            results = client.get(f"/api/v1/evidence/{ev['id']}/results", headers=auth_headers).json()
            if results:
                return c['id'], ev['id']
    # If none found with results, find any evidence or create one
    for c in cases:
        evs = client.get(f"/api/v1/cases/{c['id']}/evidence", headers=auth_headers).json()
        if evs:
            client.post(f"/api/v1/evidence/{evs[0]['id']}/analyze", json={"analysis_type": "text"}, headers=auth_headers)
            return c['id'], evs[0]['id']
    # Create new case and evidence
    case_res = client.post("/api/v1/cases", json={
        "title": "OpenRouter Test Case",
        "complaint_category": "Phishing Scam",
        "priority": "high"
    }, headers=auth_headers).json()
    case_id = case_res["id"]
    ev_res = client.post(
        f"/api/v1/cases/{case_id}/evidence",
        files={"file": ("urgent_fraud.txt", b"URGENT: CBI Officer Sharma demands immediate fine transfer of Rs 50,000 or account blocked.", "text/plain")},
        headers=auth_headers
    ).json()
    ev_id = ev_res["id"]
    client.post(f"/api/v1/evidence/{ev_id}/analyze", json={"analysis_type": "text"}, headers=auth_headers)
    return case_id, ev_id

def test_explain_without_consent_rejected(auth_headers):
    """
    Privacy guard: Requests without explicit user consent must be rejected with HTTP 400.
    """
    case_id, evidence_id = _get_or_create_test_evidence(auth_headers)

    res = client.post(
        f"/api/v1/evidence/{evidence_id}/explain",
        json={"user_consent": False},
        headers=auth_headers
    )
    assert res.status_code == 400
    assert "Explicit user consent is required" in res.json()["detail"]

def test_explain_disabled_provider_behavior(auth_headers, monkeypatch):
    """
    When OpenRouter is disabled, the explain endpoint returns clear 503 without crashing.
    """
    monkeypatch.setattr(OpenRouterConfig, "is_enabled", lambda: False)
    case_id, evidence_id = _get_or_create_test_evidence(auth_headers)

    res = client.post(
        f"/api/v1/evidence/{evidence_id}/explain",
        json={"user_consent": True},
        headers=auth_headers
    )
    assert res.status_code == 503
    assert "disabled" in res.json()["detail"].lower()

def test_explain_missing_key_behavior(auth_headers, monkeypatch):
    """
    When API key is missing, returns clear 503 error.
    """
    monkeypatch.setattr(OpenRouterConfig, "is_enabled", lambda: True)
    monkeypatch.setattr(OpenRouterConfig, "get_api_key", lambda: None)

    case_id, evidence_id = _get_or_create_test_evidence(auth_headers)

    res = client.post(
        f"/api/v1/evidence/{evidence_id}/explain",
        json={"user_consent": True},
        headers=auth_headers
    )
    assert res.status_code == 503
    assert "key is missing" in res.json()["detail"].lower()

def test_mocked_openrouter_explanation_flow(auth_headers, monkeypatch):
    """
    Verify complete structured explanation flow with mocked client response:
    - Retains original BERT & rule-based findings without overwriting.
    - Accurately builds explanation schema.
    """
    mock_llm_json = {
        "summary": "The message exhibits urgent extortion pressure impersonating law enforcement.",
        "suspicious_indicators": [
            {
                "indicator": "Law Enforcement Coercion",
                "reason": "Official agencies do not demand fund transfers via messaging platforms.",
                "supporting_text": "CBI Officer Sharma"
            },
            {
                "indicator": "Artificial Urgency",
                "reason": "A 30-minute deadline prevents the victim from independently verifying claims.",
                "supporting_text": "transfer immediately within 30 minutes"
            }
        ],
        "possible_social_engineering_tactics": [
            "Authority Impersonation",
            "Fear and Urgency Inducement",
            "Escrow Account Fraud"
        ],
        "recommended_investigation_steps": [
            "Verify sender number against official police dispatch registers",
            "Trace beneficiary account routing and request precautionary freeze"
        ],
        "limitations": [
            "This is an AI-assisted reasoning summary and not definitive legal evidence."
        ],
        "overall_assessment": "HIGH"
    }

    monkeypatch.setattr(OpenRouterConfig, "is_enabled", lambda: True)
    monkeypatch.setattr(OpenRouterConfig, "is_configured", lambda: True)
    monkeypatch.setattr(OpenRouterConfig, "get_api_key", lambda: "mock_key")
    monkeypatch.setattr(OpenRouterConfig, "get_model", lambda: "meta-llama/llama-3.3-70b-instruct")
    monkeypatch.setattr(OpenRouterClient, "complete_chat", lambda self, sys, usr, **kw: mock_llm_json)

    case_id, evidence_id = _get_or_create_test_evidence(auth_headers)

    # Record original analysis result BEFORE explanation call
    ev_results_before = client.get(f"/api/v1/evidence/{evidence_id}/results", headers=auth_headers).json()
    assert len(ev_results_before) > 0
    before_risk_level = ev_results_before[0]["result"]["risk_level"]
    before_risk_score = ev_results_before[0]["result"]["risk_score"]

    res = client.post(
        f"/api/v1/evidence/{evidence_id}/explain",
        json={"user_consent": True, "additional_context": "Victim reported caller sounded formal and authoritative."},
        headers=auth_headers
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["summary"] == mock_llm_json["summary"]
    assert len(data["suspicious_indicators"]) == 2
    assert data["suspicious_indicators"][0]["indicator"] == "Law Enforcement Coercion"
    assert data["overall_assessment"] == "HIGH"
    assert data["provider"] == "OpenRouter"
    assert data["model_id"] == "meta-llama/llama-3.3-70b-instruct"
    assert data["is_live_inference"] is True

    # Confirm original evidence results in DB are NOT mutated by the LLM
    ev_results_after = client.get(f"/api/v1/evidence/{evidence_id}/results", headers=auth_headers).json()
    assert len(ev_results_after) > 0
    assert ev_results_after[0]["result"]["risk_level"] == before_risk_level
    assert ev_results_after[0]["result"]["risk_score"] == before_risk_score

def test_live_openrouter_smoke_test(auth_headers):
    """
    Live smoke test against real OpenRouter API if enabled and configured.
    Skips cleanly if disabled or key is absent.
    """
    if not OpenRouterConfig.is_enabled() or not OpenRouterConfig.is_configured():
        pytest.skip("OpenRouter is not configured or disabled in environment; skipping live test.")

    case_id, evidence_id = _get_or_create_test_evidence(auth_headers)

    res = client.post(
        f"/api/v1/evidence/{evidence_id}/explain",
        json={"user_consent": True},
        headers=auth_headers
    )
    if res.status_code == 502 and "network connection" in res.text:
        pytest.skip(f"Live OpenRouter unreachable due to temporary network outage: {res.text}")
    assert res.status_code == 200, res.text
    data = res.json()
    assert "summary" in data and len(data["summary"]) > 0
    assert "overall_assessment" in data
    assert data["provider"] == "OpenRouter"
    assert data["model_id"] == OpenRouterConfig.get_model()
    assert data["is_live_inference"] is True
