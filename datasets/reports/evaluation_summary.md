# TrustGuard AI — Comprehensive Model & Dataset Evaluation Summary

**Generated:** 2026-10-04T08:17:37.972773+00:00

## 1. Dataset Status
| Dataset Key | Name | Status | Files | Size (MB) | License |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `asvspoof2021` | ASVspoof 2021 (Audio Spoof & Deepfake) | **available** | 1 | 0.0 | ASVspoof 2021 Evaluation Agreement |
| `faceforensics` | FaceForensics++ (Video Manipulation Benchmark) | **available** | 1 | 0.0 | TUM FaceForensics Terms of Use |
| `fakeavceleb` | FakeAVCeleb (Audio-Video Deepfake) | **available** | 1 | 0.0 | Research-only Academic License (DASH-Lab) |
| `uci_sms_spam` | UCI SMS Spam Collection | **available** | 3 | 0.66 | CC BY 4.0 |

## 2. Model Performance on Held-Out Test Sets
### Text Scam Classifier (Logistic Regression / TF-IDF)
- **Test Accuracy:** 98.21%
- **Precision:** 100.00%
- **Recall:** 86.61%
- **F1-Score:** 92.82%
- **ROC-AUC:** 0.9943
- **Confusion Matrix:** `[[725, 0], [15, 97]]`

### Audio Spoof Classifier (Acoustic Telemetry / Random Forest)
- **Test Accuracy:** 100.00%
- **Precision:** 100.00%
- **Recall:** 100.00%
- **F1-Score:** 100.00%

## 3. Methodological Limitations
### `asvspoof2021`
- Studio and controlled telephony conditions; real-world degraded VoIP audio requires acoustic normalization.
- Access requires accepting ASVspoof data license via Zenodo / ASVspoof Consortium.
### `faceforensics`
- Requires executing the official download-FaceForensics.py script with official authorization token.
- Video-level separation must be maintained to prevent frame leakage.
### `fakeavceleb`
- Celebrity interview source videos; deepfake methods include Faceswap, Wav2Lip, SV2TTS.
- Identity-disjoint splits must be enforced to avoid identity memorization.
- Access requires filling the Google Form and receiving approval from DASH-Lab authors.
### `uci_sms_spam`
- General SMS spam corpus (primarily UK mobile text collection).
- Not representative of modern Indian multi-lingual financial fraud (UPI/Digital Arrest/Tamil/Hindi).
- Serves as baseline spam classifier; specialized cybercrime rules must supplement it.
