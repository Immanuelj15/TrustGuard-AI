"""
TrustGuard AI - Security, Edge Case, Boundary & Performance Test Suite
Phases 11, 12, 13, 14, 16, 23, 24, 25, 26
"""
import io
import time
import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.ai.openrouter.redaction import redact_pii
from app.ai.text_analyzer import analyze_scam_text
from app.ai.audio_analyzer import analyze_audio_file

client = TestClient(app)

@pytest.fixture(scope="module")
def investigator_token():
    res = client.post("/api/v1/auth/login", json={
        "email": "investigator@trustguard.ai",
        "password": "Investigator@2026"
    })
    assert res.status_code == 200
    return res.json()["access_token"]

@pytest.fixture(scope="module")
def headers(investigator_token):
    return {"Authorization": f"Bearer {investigator_token}"}

# ==============================================================================
# PHASE 23: SECURITY & INJECTION TESTING
# ==============================================================================

def test_sql_injection_resistance_in_search(headers):
    """
    Ensure SQL injection payloads in case search do not break the ORM or leak unauthorized data.
    """
    payloads = [
        "' OR '1'='1",
        "'; DROP TABLE cases; --",
        "1 UNION SELECT null, null, null--",
        "admin' --",
        "\" OR \"\"=\""
    ]
    for p in payloads:
        res = client.get(f"/api/v1/cases?search={p}", headers=headers)
        assert res.status_code == 200
        # Returns normal filtered list (or empty list), never 500 internal server error
        assert isinstance(res.json(), list)

def test_path_traversal_filename_sanitization(headers):
    """
    Attempt directory traversal in uploaded filename.
    Storage object key must sanitize and strip traversal sequences.
    """
    c = client.post("/api/v1/cases", json={
        "title": "Path Traversal Test Case",
        "complaint_category": "Cyber Attack",
        "priority": "high"
    }, headers=headers).json()

    traversal_filename = "../../../../etc/passwd.txt"
    files = {"file": (traversal_filename, io.BytesIO(b"root:x:0:0:root:/root:/bin/bash"), "text/plain")}
    res = client.post(f"/api/v1/cases/{c['id']}/evidence", files=files, headers=headers)
    assert res.status_code == 201
    ev_data = res.json()
    # The filename in the system should be stored as safe basename or sanitized
    assert ".." not in ev_data["original_filename"] or os_safe_basename(ev_data["original_filename"])

def os_safe_basename(name: str) -> bool:
    return not name.startswith("/") and not name.startswith("..")

# ==============================================================================
# PHASE 11 & 26: TEXT ANALYSIS BOUNDARY & UNICODE TESTING
# ==============================================================================

def test_text_analysis_empty_and_whitespace():
    """
    Empty and whitespace inputs must be handled gracefully without unhandled exceptions.
    """
    res1 = analyze_scam_text("")
    assert res1["risk_score"] == 0.0
    assert res1["risk_level"] == "LOW"

    res2 = analyze_scam_text("   \n\t   ")
    assert res2["risk_score"] == 0.0
    assert res2["risk_level"] == "LOW"

def test_text_analysis_unicode_and_emojis():
    """
    International Unicode and emoji strings must be handled cleanly.
    """
    unicode_scam = (
        "🚨 URGENT: ⚠️ Your account has been suspended! "
        "Transfer ₹50,000 to verify escrow via UPI paytm@fraud immediately. "
        "緊急警告: パスワードを直ちに確認してください。"
    )
    res = analyze_scam_text(unicode_scam)
    assert res["risk_score"] > 30.0
    assert "findings" in res
    assert len(res["findings"]["indicators"]) >= 1

def test_text_analysis_large_payload():
    """
    50,000 characters of text should complete without memory exhaustion or infinite loops.
    """
    large_text = "This is a benign background legal brief statement. " * 1000
    start = time.time()
    res = analyze_scam_text(large_text)
    duration = time.time() - start
    assert duration < 5.0, f"Analysis took too long: {duration}s"
    assert res["risk_score"] == 0.0

# ==============================================================================
# PHASE 12: AUDIO ANALYSIS ERROR HANDLING
# ==============================================================================

def test_audio_analysis_corrupted_file_handling():
    """
    Corrupted audio bytes must return structured fallback/diagnostic output, never crashing with 500.
    """
    # Create corrupted dummy file path
    res = analyze_audio_file("corrupted_garbage_bytes.wav", is_demo_mode=True)
    assert isinstance(res, dict)
    assert "risk_score" in res
    assert "findings" in res
    assert "limitations" in res

# ==============================================================================
# PHASE 14: PII REDACTION COMPREHENSIVE COVERAGE
# ==============================================================================

def test_pii_redaction_patterns():
    """
    Test deterministic masking of phones, emails, IPs, cards, and UPI IDs.
    """
    sample = (
        "Suspect contacted victim from phone +91 98765 43210 and US line (555) 234-5678. "
        "Email sent from extortionist@dark-mail.net. "
        "Demanded transfer to UPI handle scammer@okhdfcbank. "
        "Victim credit card was 4532-1189-9023-4512 and server IP was 198.51.100.42."
    )
    redacted, count = redact_pii(sample)
    assert count >= 4
    assert "+91 98765 43210" not in redacted
    assert "extortionist@dark-mail.net" not in redacted
    assert "scammer@okhdfcbank" not in redacted
    assert "198.51.100.42" not in redacted
    assert "[REDACTED_EMAIL]" in redacted
    assert "[REDACTED_IP]" in redacted

# ==============================================================================
# PHASE 16: CASE GRAPH ISOLATION
# ==============================================================================

def test_case_graph_isolation(headers):
    """
    Ensure Case A's graph only contains Case A's evidence and IOC nodes.
    Case B's nodes must never leak into Case A's graph.
    """
    case_a = client.post("/api/v1/cases", json={
        "title": "Isolated Case Alpha",
        "complaint_category": "Phishing Scam",
        "priority": "low"
    }, headers=headers).json()

    case_b = client.post("/api/v1/cases", json={
        "title": "Isolated Case Beta",
        "complaint_category": "Ransomware",
        "priority": "critical"
    }, headers=headers).json()

    # Upload evidence into Case A
    f_a = {"file": ("alpha.txt", io.BytesIO(b"Contact alpha@private-domain-a.org"), "text/plain")}
    client.post(f"/api/v1/cases/{case_a['id']}/evidence", files=f_a, headers=headers)

    # Upload evidence into Case B
    f_b = {"file": ("beta.txt", io.BytesIO(b"Contact beta@private-domain-b.org"), "text/plain")}
    client.post(f"/api/v1/cases/{case_b['id']}/evidence", files=f_b, headers=headers)

    # Fetch Graph for Case A
    graph_a = client.get(f"/api/v1/cases/{case_a['id']}/correlation-graph", headers=headers).json()
    node_labels = [n.get("label", "") + n.get("title", "") for n in graph_a["nodes"]]

    # Verify Case B is NOT present in Case A's graph
    for label in node_labels:
        assert case_b["case_number"] not in label
        assert "private-domain-b.org" not in label

# ==============================================================================
# PHASE 24: PERFORMANCE BENCHMARKING
# ==============================================================================

def test_dashboard_summary_performance(headers):
    """
    Dashboard summary aggregation must respond within 500ms.
    """
    start = time.time()
    res = client.get("/api/v1/dashboard/summary", headers=headers)
    duration = time.time() - start
    assert res.status_code == 200
    assert duration < 0.5, f"Dashboard summary took {duration:.3f}s (> 500ms)"

def test_cases_list_pagination_performance(headers):
    """
    Paginated cases list must respond within 300ms.
    """
    start = time.time()
    res = client.get("/api/v1/cases?limit=20&skip=0", headers=headers)
    duration = time.time() - start
    assert res.status_code == 200
    assert duration < 0.3, f"Cases query took {duration:.3f}s (> 300ms)"
