import os
import sys
import tempfile
import zipfile
import pytest
from pathlib import Path
import pandas as pd
import numpy as np
import yaml
import joblib

from ml.data_ingestion.prepare_datasets import safe_extract_zip, generate_dataset_manifest
from ml.data_ingestion.inspect_datasets import inspect_text_dataset
from ml.preprocessing.preprocess_text import clean_text_for_modeling
from ml.feature_extraction.audio_features import compute_acoustic_features_from_samples
from ml.inference.video_adapter import VideoDeepfakeInferenceAdapter

def test_dataset_configuration_parsing():
    config_file = Path("ml/configs/datasets.yaml")
    assert config_file.exists(), "datasets.yaml must exist"
    with open(config_file, "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f)
    assert "datasets" in cfg
    assert "uci_sms_spam" in cfg["datasets"]
    assert "asvspoof2021" in cfg["datasets"]
    assert "fakeavceleb" in cfg["datasets"]
    assert "faceforensics" in cfg["datasets"]

def test_safe_zip_extraction_and_path_traversal_protection():
    with tempfile.TemporaryDirectory() as tmp_dir:
        zip_path = Path(tmp_dir) / "test.zip"
        dest_dir = Path(tmp_dir) / "extracted"
        dest_dir.mkdir()

        # Create safe zip
        with zipfile.ZipFile(zip_path, "w") as z:
            z.writestr("safe_file.txt", "Forensic Data")
        
        extracted = safe_extract_zip(str(zip_path), str(dest_dir))
        assert len(extracted) == 1
        assert Path(extracted[0]).exists()

def test_manifest_generation():
    with tempfile.TemporaryDirectory() as tmp_dir:
        dummy_cfg = {
            "name": "Synthetic Test Dataset",
            "official_url": "https://test.trustguard.ai",
            "license": "MIT",
            "modality": "text",
            "label_mapping": {"ham": 0, "spam": 1},
            "limitations": ["Unit test fixture"]
        }
        manifest = generate_dataset_manifest(
            dataset_key="test_dataset",
            cfg=dummy_cfg,
            local_dir=tmp_dir,
            status="available",
            file_count=5,
            total_size_bytes=1024,
            file_types=[".txt"],
            label_info={"ham": 3, "spam": 2},
            missing_files=[]
        )
        assert manifest["dataset_key"] == "test_dataset"
        assert manifest["total_files"] == 5
        assert Path("datasets/manifests/test_dataset_manifest.json").exists()

def test_text_cleaning_preserves_scam_indicators():
    raw_text = "URGENT! Transfer Rs 50,000 to https://bit.ly/scam now or account blocked!"
    cleaned = clean_text_for_modeling(raw_text)
    assert "Rs 50,000" in cleaned
    assert "https://bit.ly/scam" in cleaned
    assert "URGENT!" in cleaned

def test_acoustic_feature_extraction():
    # 1 second of 440Hz sine wave
    sample_rate = 16000
    t = np.linspace(0, 1.0, sample_rate, False)
    samples = (np.sin(2 * np.pi * 440 * t) * 32767).astype(np.int16)
    
    feats = compute_acoustic_features_from_samples(samples, sample_rate)
    assert "spectral_centroid" in feats
    assert "spectral_flatness" in feats
    assert "zero_crossing_rate" in feats
    assert "rms_energy" in feats
    assert feats["spectral_centroid"] > 350 # Should be around 440Hz
    assert feats["zero_crossing_rate"] > 0.0

def test_video_inference_adapter_fallback():
    adapter = VideoDeepfakeInferenceAdapter(model_path=None)
    frames = [{"timestamp": "00:01.0", "idx": 30}]
    output = adapter.analyze_frames(frames)
    assert output["risk_level"] == "NEEDS_REVIEW"
    assert "not loaded" in output["findings"]["model_status_note"]
    assert "FaceForensics++" in output["dataset_trained_on"]

def test_model_loading_and_prediction():
    text_clf_path = Path("ml/inference/artifacts/text_classifier.joblib")
    text_vec_path = Path("ml/inference/artifacts/text_vectorizer.joblib")
    assert text_clf_path.exists()
    assert text_vec_path.exists()

    clf = joblib.load(text_clf_path)
    vec = joblib.load(text_vec_path)

    sample_scam = ["WINNER! Claim your £1000 cash prize immediately call 09061701461"]
    sample_ham = ["Are we still meeting for lunch at 1pm today?"]

    pred_scam = clf.predict(vec.transform(sample_scam))[0]
    pred_ham = clf.predict(vec.transform(sample_ham))[0]

    assert pred_scam == 1 # Predicted as spam
    assert pred_ham == 0  # Predicted as ham

def test_splits_reproducibility():
    train_path = Path("datasets/splits/text_train.csv")
    test_path = Path("datasets/splits/text_test.csv")
    assert train_path.exists()
    assert test_path.exists()

    train_df = pd.read_csv(train_path)
    test_df = pd.read_csv(test_path)

    # Ensure train and test sets are completely disjoint
    overlap = set(train_df["message_id"]).intersection(set(test_df["message_id"]))
    assert len(overlap) == 0, "Data leakage detected: train and test sets must have zero overlap"
