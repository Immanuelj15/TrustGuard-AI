import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.ai.hf.config import HFConfig
from app.ai.hf.text_classifier import HuggingFaceTextClassifier
from app.ai.hf.audio_transcriber import HuggingFaceAudioTranscriber
from app.ai.hf.model_manager import HFModelManager
from app.ai.text_analyzer import analyze_scam_text
from app.ai.audio_analyzer import analyze_audio_file

client = TestClient(app)

@pytest.fixture
def auth_headers():
    res = client.post("/api/v1/auth/login", json={"email": "investigator@trustguard.ai", "password": "Investigator@2026"})
    assert res.status_code == 200, res.text
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_hf_resource_guards():
    """Verify system resource guard returns valid disk and compute diagnostics."""
    resources = HFConfig.check_system_resources()
    assert "has_sufficient_disk" in resources
    assert "free_disk_gb" in resources
    assert "device" in resources
    assert isinstance(resources["cuda_available"], bool)

def test_hf_model_registry_endpoint(auth_headers):
    """Verify the model registry status API returns all models and safety guard diagnostics."""
    res = client.get("/api/v1/models/registry", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "global_enabled" in data
    assert "models" in data
    assert "text_classification" in data["models"]
    assert "audio_transcription" in data["models"]
    assert "video_deepfake" in data["models"]

def test_hf_text_classifier_input_validation():
    """Verify text classifier handles empty or whitespace input cleanly without crashing."""
    classifier = HuggingFaceTextClassifier()
    with patch.object(HFConfig, "ENABLED", True):
        # Empty string
        res = classifier.predict("")
        assert res is not None
        assert "error" in res

        # Whitespace only
        res2 = classifier.predict("   \n\t  ")
        assert res2 is not None
        assert "error" in res2

def test_hf_text_classifier_disabled_fallback():
    """Verify when HF_ENABLED is False, classifier returns None and allows fallback."""
    classifier = HuggingFaceTextClassifier()
    with patch.object(HFConfig, "ENABLED", False):
        res = classifier.predict("URGENT: Digital arrest warrant issued by Mumbai Police.")
        assert res is None

def test_hf_text_classifier_mocked_inference():
    """Verify output formatting and score normalization on successful transformer inference."""
    classifier = HuggingFaceTextClassifier()
    mock_pipeline = MagicMock(return_value=[{"label": "LABEL_1", "score": 0.9421}])
    
    with patch.object(HFConfig, "ENABLED", True):
        with patch.object(classifier, "_load_pipeline", return_value=mock_pipeline):
            res = classifier.predict("Urgent transfer Rs 50,000 immediately to avoid arrest.")
            assert res is not None
            assert res["is_hf_inference"] is True
            assert res["predicted_label"] == "suspicious"
            assert res["confidence"] == 0.9421
            assert res["risk_score"] == 94.2
            assert "limitations" in res
            assert len(res["limitations"]) > 0

def test_hf_text_ensemble_integration():
    """Verify text_analyzer seamlessly incorporates HF output when available."""
    mock_hf_pred = {
        "model_name": "HuggingFace-bert-tiny-test",
        "predicted_label": "suspicious",
        "confidence": 0.96,
        "risk_score": 96.0
    }
    with patch("app.ai.hf.text_classifier.HuggingFaceTextClassifier.predict", return_value=mock_hf_pred):
        analysis = analyze_scam_text("Urgent CBI arrest warrant issued against you.")
        assert analysis["analysis_type"] == "text"
        assert analysis["model_name"] == "TrustGuard-Ensemble-SocialEng"
        assert "hf_transformer_inference" in analysis["findings"]
        assert analysis["findings"]["hf_transformer_inference"]["predicted_label"] == "suspicious"

def test_hf_audio_transcriber_missing_file():
    """Verify audio transcriber returns clean error for non-existent file."""
    transcriber = HuggingFaceAudioTranscriber()
    with patch.object(HFConfig, "ENABLED", True):
        res = transcriber.transcribe("non_existent_audio_file.wav")
        assert res is not None
        assert "error" in res

def test_hf_audio_transcriber_disabled_fallback():
    """Verify audio transcriber returns None when disabled."""
    transcriber = HuggingFaceAudioTranscriber()
    with patch.object(HFConfig, "ENABLED", False):
        res = transcriber.transcribe("any_file.wav")
        assert res is None

def test_predict_hf_text_endpoint(auth_headers):
    """Test the direct POST /api/v1/models/hf/predict-text API route."""
    res = client.post(
        "/api/v1/models/hf/predict-text",
        headers=auth_headers,
        json={"text": "Hello, please find the quarterly report attached."}
    )
    assert res.status_code == 200
    data = res.json()
    assert "status" in data or "predicted_label" in data
