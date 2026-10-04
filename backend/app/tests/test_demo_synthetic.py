import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

@pytest.fixture(scope="module")
def auth_headers():
    login_res = client.post("/api/v1/auth/login", json={
        "email": "investigator@trustguard.ai",
        "password": "Investigator@2026"
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_synthetic_manifest(auth_headers):
    response = client.get("/api/v1/demo/manifest", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["dataset_name"] == "TrustGuard-AI-Synthetic-Demo-Benchmark"
    assert data["synthetic_data"] is True
    assert data["counts"]["text_samples"] >= 500
    assert data["counts"]["audio_samples"] >= 21
    assert data["counts"]["video_samples"] >= 6
    assert data["counts"]["multimodal_pairs"] >= 3

def test_synthetic_samples_list(auth_headers):
    response = client.get("/api/v1/demo/samples?limit=10", headers=auth_headers)
    assert response.status_code == 200
    samples = response.json()
    assert len(samples) > 0
    first = samples[0]
    assert "sample_id" in first
    assert "modality" in first
    assert first["synthetic_data"] is True

def test_direct_analyze_synthetic_text(auth_headers):
    list_res = client.get("/api/v1/demo/samples?modality=text&limit=5", headers=auth_headers)
    assert list_res.status_code == 200
    samples = list_res.json()
    assert len(samples) > 0
    sample_id = samples[0]["sample_id"]

    response = client.post(f"/api/v1/demo/direct-analyze/{sample_id}", headers=auth_headers)
    assert response.status_code == 200
    res = response.json()
    assert res["is_synthetic_demo"] is True
    assert res["demo_banner"] == "DEMO RESULT — GENERATED SYNTHETIC DATA"
    assert "risk_score" in res
    assert "findings" in res

def test_direct_analyze_synthetic_audio(auth_headers):
    list_res = client.get("/api/v1/demo/samples?modality=audio&limit=5", headers=auth_headers)
    assert list_res.status_code == 200
    samples = list_res.json()
    assert len(samples) > 0
    sample_id = samples[0]["sample_id"]

    response = client.post(f"/api/v1/demo/direct-analyze/{sample_id}", headers=auth_headers)
    assert response.status_code == 200
    res = response.json()
    assert res["is_synthetic_demo"] is True
    assert res["demo_banner"] == "DEMO RESULT — GENERATED SYNTHETIC DATA"
    assert "acoustic_features" in res["findings"]

def test_direct_analyze_synthetic_video(auth_headers):
    list_res = client.get("/api/v1/demo/samples?modality=video&limit=5", headers=auth_headers)
    assert list_res.status_code == 200
    samples = list_res.json()
    assert len(samples) > 0
    sample_id = samples[0]["sample_id"]

    response = client.post(f"/api/v1/demo/direct-analyze/{sample_id}", headers=auth_headers)
    assert response.status_code == 200
    res = response.json()
    assert res["is_synthetic_demo"] is True
    assert res["demo_banner"] == "DEMO RESULT — GENERATED SYNTHETIC DATA"
    assert "risk_score" in res

def test_load_sample_to_case(auth_headers):
    # 1. Get an existing case
    cases_res = client.get("/api/v1/cases", headers=auth_headers)
    assert cases_res.status_code == 200
    cases = cases_res.json()
    assert len(cases) > 0
    case_id = cases[0]["id"]

    # 2. Get a text sample
    list_res = client.get("/api/v1/demo/samples?modality=text&limit=5", headers=auth_headers)
    sample_id = list_res.json()[0]["sample_id"]

    # 3. Attach synthetic sample
    load_res = client.post(
        "/api/v1/demo/load-to-case",
        json={"case_id": case_id, "sample_id": sample_id},
        headers=auth_headers
    )
    assert load_res.status_code == 200
    evidence = load_res.json()
    assert evidence["case_id"] == case_id
    assert "[SYNTHETIC-DEMO]" in evidence["original_filename"]
    assert len(evidence["sha256_hash"]) == 64
