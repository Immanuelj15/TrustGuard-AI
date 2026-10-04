import os
import io
import pytest
from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app
from app.ai.hf.config import HFConfig

client = TestClient(app)

@pytest.fixture
def auth_headers():
    res = client.post("/api/v1/auth/login", json={"email": "investigator@trustguard.ai", "password": "Investigator@2026"})
    assert res.status_code == 200, res.text
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_e2e_text_analysis_with_hf(auth_headers, monkeypatch):
    """
    End-to-End Test: Case creation -> Text Evidence Upload -> Full Analysis -> BERT Inference Validation
    """
    monkeypatch.setattr(HFConfig, "ENABLED", True)

    # 1. Create Case
    case_res = client.post("/api/v1/cases", json={
        "title": "E2E Digital Arrest Investigation",
        "description": "Extortion call threatening digital arrest with immediate wire transfer demands.",
        "complaint_category": "Authority Impersonation",
        "priority": "critical"
    }, headers=auth_headers)
    assert case_res.status_code == 201
    case_id = case_res.json()["id"]

    # 2. Upload Text Evidence
    text_content = (
        b"URGENT: This is CBI Crime Branch Officer Sharma. Your bank account will be suspended immediately. "
        b"You must transfer Rs 50,000 to verify escrow and share your OTP now, or click http://bit.ly/bank-security-verify to avoid arrest."
    )
    files = {"file": ("cbi_extortion_sms.txt", io.BytesIO(text_content), "text/plain")}
    upload_res = client.post(f"/api/v1/cases/{case_id}/evidence", files=files, headers=auth_headers)
    assert upload_res.status_code == 201
    evidence_id = upload_res.json()["id"]

    # 3. Trigger Analysis
    analyze_res = client.post(f"/api/v1/evidence/{evidence_id}/analyze/text", headers=auth_headers)
    assert analyze_res.status_code == 200
    job = analyze_res.json()
    assert job["status"] == "completed"

    # 4. Fetch Evidence Results
    results_res = client.get(f"/api/v1/evidence/{evidence_id}/results", headers=auth_headers)
    assert results_res.status_code == 200
    results_list = results_res.json()
    assert len(results_list) > 0
    res = results_list[0]["result"]

    assert res["risk_level"] in ("HIGH", "CRITICAL")
    assert res["risk_score"] > 60.0
    findings = res["findings_json"]
    assert "indicators" in findings
    assert len(findings["indicators"]) > 0

    # Verify Hugging Face BERT Transformer output
    if "hf_transformer_inference" in findings:
        hf_pred = findings["hf_transformer_inference"]
        assert "predicted_label" in hf_pred
        assert "confidence" in hf_pred
        assert hf_pred["predicted_label"] == "suspicious"

def test_e2e_audio_analysis_with_whisper(auth_headers, monkeypatch):
    """
    End-to-End Test: Case creation -> Audio Evidence Upload -> Telemetry & Whisper ASR Validation
    """
    monkeypatch.setattr(HFConfig, "ENABLED", True)

    # 1. Create Case
    case_res = client.post("/api/v1/cases", json={
        "title": "E2E Audio Forensic Voice Analysis",
        "description": "Recorded call verifying account security settings.",
        "complaint_category": "Vishing & Voice Fraud",
        "priority": "medium"
    }, headers=auth_headers)
    assert case_res.status_code == 201
    case_id = case_res.json()["id"]

    # 2. Upload Audio Sample (using verified synthetic clean audio)
    repo_root = Path(__file__).resolve().parent.parent.parent.parent
    audio_path = repo_root / "datasets" / "synthetic" / "audio" / "bona_fide" / "SYNTH_AUD_CLEAN_001.wav"
    assert audio_path.exists(), f"Synthetic audio not found: {audio_path}"
    with open(audio_path, "rb") as f:
        audio_bytes = f.read()

    files = {"file": ("audio_evidence_001.wav", io.BytesIO(audio_bytes), "audio/wav")}
    upload_res = client.post(f"/api/v1/cases/{case_id}/evidence", files=files, headers=auth_headers)
    assert upload_res.status_code == 201
    evidence_id = upload_res.json()["id"]

    # 3. Trigger Analysis
    analyze_res = client.post(f"/api/v1/evidence/{evidence_id}/analyze/audio", headers=auth_headers)
    assert analyze_res.status_code == 200
    job = analyze_res.json()
    assert job["status"] == "completed"

    # 4. Fetch Evidence Results
    results_res = client.get(f"/api/v1/evidence/{evidence_id}/results", headers=auth_headers)
    assert results_res.status_code == 200
    res = results_res.json()[0]["result"]

    assert "risk_score" in res
    findings = res["findings_json"]
    assert "acoustic_features" in findings
    assert "spectral_centroid" in findings["acoustic_features"] or "spectral_centroid_hz" in findings["acoustic_features"]
    assert "transcription" in findings
    assert findings["transcription"] is not None
    assert len(findings["transcription"]) > 0

def test_e2e_demo_direct_analysis(auth_headers):
    """
    End-to-End Test: Direct analyze synthetic demo sample and check watermark guarantees
    """
    manifest_res = client.get("/api/v1/demo/manifest", headers=auth_headers)
    assert manifest_res.status_code == 200
    manifest = manifest_res.json()
    total_samples = manifest.get("total_samples") or sum(manifest.get("counts", {}).values())
    assert total_samples == 530

    samples_res = client.get("/api/v1/demo/samples?modality=text&limit=1", headers=auth_headers)
    assert samples_res.status_code == 200
    sample_id = samples_res.json()[0]["sample_id"]

    direct_res = client.post(f"/api/v1/demo/direct-analyze/{sample_id}", headers=auth_headers)
    assert direct_res.status_code == 200
    demo_output = direct_res.json()
    assert demo_output["is_synthetic_demo"] is True
    assert "DEMO RESULT — GENERATED SYNTHETIC DATA" in demo_output["demo_banner"]
    assert "provenance_notice" in demo_output
