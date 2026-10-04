# TrustGuard AI — Synthetic Demonstration Benchmark Dataset

> **ACADEMIC DEMONSTRATION NOTICE & ETHICAL DISCLAIMER**  
> **This dataset contains programmatically generated synthetic demonstration data.**  
> It was created solely to develop, test, and demonstrate the TrustGuard AI investigative platform while awaiting access to restricted research datasets (such as FakeAVCeleb).  
> **Never represent this synthetic data as genuine victim evidence, nor use it to substantiate real-world model accuracy claims in forensic or legal proceedings.**  
> No real human identities, biometric records, private phone numbers, or active malicious URLs are contained in this repository.

---

## 1. Overview & Purpose

TrustGuard AI is an academic and investigative decision-support platform designed to assist cybercrime analysts in processing multimodal digital evidence (scam text, voice clone indicators, and deepfake video manipulation cues).

Because authentic forensic datasets often carry strict institutional distribution agreements, this **Synthetic Demonstration Dataset** provides a safe, reproducible, offline benchmark suite that verifies:
- Case management evidence attachment pipelines.
- Media decoding, metadata extraction, and frame/audio preprocessing.
- Multi-modal pairing and cross-channel consistency checks.
- Baseline model inference and explainable indicator attribution.
- Transparent reporting with mandatory synthetic provenance watermarks.

---

## 2. Dataset Structure

```text
datasets/synthetic/
├── audio/
│   ├── bona_fide/                    # 15 Clean TTS speech files (WAV, 22.05kHz, 16-bit mono)
│   ├── synthetic_or_transformed/     # 6 Transformed speech files (pitch, speed, noise)
│   ├── metadata/
│   │   ├── audio_manifest.json       # Structured JSON manifest with technical audio metadata
│   │   └── audio_manifest.csv        # Tabular CSV manifest
│
├── video/
│   ├── original/                     # 3 Programmatic presentation avatar MP4 files (OpenCV)
│   ├── synthetic_or_transformed/     # 3 Transformed video files (boundary blur, color warp, jitter)
│   ├── metadata/
│   │   ├── video_manifest.json       # Detailed video stream metadata
│   │   └── video_manifest.csv        # Tabular CSV manifest
│
├── multimodal/
│   ├── paired_samples/               # Paired AV references (Synchronized vs Intentionally Mismatched)
│   ├── metadata/
│   │   ├── multimodal_manifest.json  # Pairing matrix and sync status
│   │   └── multimodal_manifest.csv   # Tabular CSV manifest
│
├── text/
│   ├── legitimate/                   # 250 Legitimate messages (Delivery, KYC alerts, Support, Orders)
│   ├── suspicious/                   # 250 Suspicious messages (Digital Arrest, Extortion, Phishing, Courier)
│   ├── metadata/
│   │   ├── text_manifest.json        # 500 Structured records with categories and risk indicators
│   │   └── text_manifest.csv         # Tabular CSV manifest
│
├── manifests/
│   └── synthetic_dataset_manifest.json # Master composite manifest of all 530 assets
│
├── splits/
│   ├── text_train.json               # 350 samples (70%) stratified train split
│   ├── text_val.json                 # 75 samples (15%) stratified validation split
│   └── text_test.json                # 75 samples (15%) test holdout split
│
├── reports/
│   ├── validation_report.json        # Integrity, schema, file presence & PII audit report
│   └── synthetic_training_summary.json # Baseline model metrics & pipeline verification results
│
└── README.md                         # This documentation file
```

---

## 3. Sample Counts by Modality

| Modality | Sub-Category | Sample Count | Format | Primary Tool / Technique |
| :--- | :--- | :--- | :--- | :--- |
| **Audio** | Clean Speech (`synthetic_clean_demo`) | 15 | WAV (22050 Hz) | Local TTS (`pyttsx3`) |
| **Audio** | Transformed Speech (`synthetic_transformed_demo`) | 6 | WAV (22050 Hz) | Pitch shift, Speed, Gaussian noise |
| **Video** | Clean Presentation (`synthetic_original_demo`) | 3 | MP4 (640x360, 24 FPS) | OpenCV geometric avatar generator |
| **Video** | Transformed Video (`synthetic_transformed_demo`) | 3 | MP4 (640x360, 24 FPS) | Gaussian blur, compression, boundary jitter |
| **Multimodal** | Synchronized Pairs | 2 | Paired AV | Exact duration matching & alignment |
| **Multimodal** | Mismatched Pairs | 1 | Paired AV | Intentional 4-second temporal mismatch |
| **Text** | Legitimate Notifications (`legitimate_demo`) | 250 | UTF-8 JSON/CSV | Fictional utility & customer service templates |
| **Text** | Social Engineering Scams (`suspicious_demo`) | 250 | UTF-8 JSON/CSV | Digital Arrest, KYC, Courier, Job scam patterns |
| **Total** | **All Modalities** | **530** | — | **Zero real personal data or genuine evidence** |

---

## 4. Privacy, Safety & Fictional Data Policy

To ensure complete compliance with privacy regulations (GDPR, DPDP Act 2023):
1. **No Real PII:** All phone numbers use dummy reserved prefixes (`+91 99999 XXXXX` / `+91 91234 XXXXX`).
2. **No Real Domains:** All URLs utilize RFC 2606 reserved domains (e.g., `*.example.com`, `police-verify.example.org`).
3. **No Biometric Cloning:** Audio was generated using standard system TTS synthesizers, not neural voice cloning of real human subjects.
4. **No Deepfake Faces:** Video avatars are synthetic geometric drawings with programmatic eye blinks and lip movements.

---

## 5. Baseline Models & Performance Summary

Baseline models were trained solely on the synthetic dataset splits to validate pipeline execution.

### Text Scam Classifier
- **Architecture:** TF-IDF (1,2-grams, 3000 max features) + Regularized Logistic Regression.
- **Data Splits:** Train: 350 | Validation: 75 | Test: 75.
- **Holdout Test Accuracy:** 98.67%
- **Holdout F1-Score:** 0.9868 (Precision: 1.00, Recall: 0.974)
- **Artifacts Saved:** `ml/inference/artifacts/synthetic_text_classifier.joblib` and `synthetic_text_vectorizer.joblib`.

### Audio Acoustic Baseline
- **Architecture:** 5-feature Acoustic Telemetry Extractor (Spectral Centroid, Flatness, Rolloff, ZCR, SNR) + Random Forest Classifier (100 estimators).
- **Holdout Test Accuracy:** 100.0% (on synthetic transformation cues).
- **Artifact Saved:** `ml/inference/artifacts/synthetic_audio_classifier.joblib`.
- *Caution: High accuracy reflects synthetic perturbation detection, NOT generalizability to real-world voice clones.*

---

## 6. How to Reproduce & Validate

### Regenerate the Entire Dataset
```bash
python ml/data_ingestion/generate_synthetic_datasets.py
```

### Validate Dataset Integrity & Privacy
```bash
python ml/data_ingestion/validate_synthetic_dataset.py
```

### Re-train Baseline Models & Run Pipeline Tests
```bash
python ml/training/train_synthetic_demo_models.py
```

---

## 7. How to Use Demo Mode in TrustGuard AI

1. **Backend Integration:**
   - Launch the FastAPI server: `uvicorn app.main:app --reload`
   - Access synthetic endpoints:
     - `GET /api/v1/demo/manifest` — View summary and modality counts.
     - `GET /api/v1/demo/samples?modality=audio` — Filter assets.
     - `POST /api/v1/demo/load-to-case` — Attach a demo sample to a case.
     - `POST /api/v1/demo/direct-analyze/{sample_id}` — Run direct forensic analysis with mandatory banner.
2. **Frontend UI:**
   - Launch the frontend: `npm run dev`
   - In **Case Details**: Click **"Load Demo Sample"** to attach safe benchmark files.
   - In **Analysis Workspace**: Click **"Synthetic Benchmark Assets (530)"** to inspect and analyze any demo asset directly.
   - All results display the prominent banner:  
     `DEMO RESULT — GENERATED SYNTHETIC DATA`
