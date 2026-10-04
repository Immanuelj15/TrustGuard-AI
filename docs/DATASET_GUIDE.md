# TrustGuard AI — Research Dataset Guide

This guide describes the official acquisition, organization, preprocessing, and training workflows for TrustGuard AI's multi-modal cybercrime investigation models.

---

## 1. Dataset Directory Architecture

All datasets are isolated in the root `datasets/` tree, strictly untracked by Git:

```
datasets/
├── raw/                      # Unmodified source archives & media
│   ├── text/uci_sms_spam/
│   ├── audio/asvspoof2021/
│   ├── multimodal/fakeavceleb/
│   └── video/faceforensics/
├── processed/                # Normalized CSVs, acoustic features, extracted frames
│   ├── text/
│   ├── audio/
│   ├── multimodal/
│   └── video/
├── manifests/                # Machine-readable JSON specifications
├── splits/                   # Reproducible Train (70%), Val (15%), Test (15%) partitions
└── reports/                  # Quality inspection & test set evaluation reports
```

---

## 2. Dataset Specifications & Acquisition

### Dataset A: ASVspoof 2021 (Audio Spoof Detection)
- **Official Source**: [https://www.asvspoof.org/index2021.html](https://www.asvspoof.org/index2021.html)
- **Access Protocol**: Manual registration required via [Zenodo ASVspoof Community](https://zenodo.org/communities/asvspoof).
- **Subsets**:
  - `LA` (Logical Access): Synthetic TTS and voice cloning conversion attacks.
  - `DF` (Deepfake): Audio tracks extracted from manipulated video media.
  - `PA` (Physical Access): Replay attacks in acoustic environments.
- **Labels**: `bonafide` (0), `spoof` (1).
- **Manual Installation**:
  1. Complete the ASVspoof 2021 data agreement on Zenodo.
  2. Download `LA.zip` or `DF.zip`.
  3. Extract into `datasets/raw/audio/asvspoof2021/`.

### Dataset B: FakeAVCeleb (Audio-Video Deepfake)
- **Official Source**: [https://github.com/DASH-Lab/FakeAVCeleb](https://github.com/DASH-Lab/FakeAVCeleb)
- **Access Protocol**: Requires filling the [DASH-Lab Google Request Form](https://forms.gle/4KxLpWpZ6G9k9k8a6) and obtaining approval from authors.
- **Categories**:
  - `RealVideo-RealAudio` (0: Real)
  - `RealVideo-FakeAudio` (1: Spoofed Audio)
  - `FakeVideo-RealAudio` (1: Face Swap / Wav2Lip)
  - `FakeVideo-FakeAudio` (1: Synthetic Face + Cloned Audio)
- **Manual Installation**:
  1. Receive download link from DASH-Lab.
  2. Extract video folders and `meta_data.csv` into `datasets/raw/multimodal/fakeavceleb/`.

### Dataset C: FaceForensics++ (Video Manipulation Benchmark)
- **Official Source**: [https://github.com/ondyari/FaceForensics](https://github.com/ondyari/FaceForensics)
- **Access Protocol**: Requires submitting the [TUM FaceForensics Terms of Use Form](https://docs.google.com/forms/d/e/1FAIpQLSdRR5Csv6HSfl250bF0yLq5LJyJzA_SK2KaFis04mMVrd0x2g/viewform).
- **Techniques**: Deepfakes, Face2Face, FaceSwap, NeuralTextures, FaceShifter.
- **Manual Installation**:
  1. Execute the author's authorized script:
     ```bash
     python download-FaceForensics.py datasets/raw/video/faceforensics -d "Deepfakes Face2Face FaceSwap NeuralTextures original" -c c23 -t videos
     ```

### Dataset D: UCI SMS Spam Collection (Scam Baseline)
- **Official Source**: [https://archive.ics.uci.edu/dataset/228/sms+spam+collection](https://archive.ics.uci.edu/dataset/228/sms+spam+collection)
- **Access Protocol**: Fully automated direct download (`CC BY 4.0`).
- **Volume**: 5,574 genuine SMS messages (4,827 ham, 747 spam).
- **Labels**: `ham` (0), `spam` (1).

---

## 3. Operational CLI Commands

### 1. Ingestion & Download Check
```bash
python -m ml.data_ingestion.prepare_datasets --config ml/configs/datasets.yaml
```
- Downloads open datasets (UCI SMS Spam) safely.
- Verifies folder structure and outputs registration instructions for restricted datasets.

### 2. Dataset Quality Inspection & Validation
```bash
python -m ml.data_ingestion.inspect_datasets
```
- Inspects label balances, duplicate entries, file integrity, and emits `datasets/reports/inspection_report.json`.

### 3. Preprocessing & Partition Generation
```bash
python -m ml.preprocessing.preprocess_text
python -m ml.preprocessing.preprocess_audio
python -m ml.preprocessing.preprocess_video
```
- Creates processed features and seed-reproducible Train/Val/Test splits (70/15/15) in `datasets/splits/`.

### 4. Baseline Model Training
```bash
python -m ml.training.train_text_baseline
python -m ml.training.train_audio_baseline
```
- Trains text and audio baseline models on held-out test splits.
- Saves model artifacts to `ml/inference/artifacts/`.

### 5. Comprehensive Multi-Modal Evaluation
```bash
python -m ml.evaluation.evaluate_all
```
- Emits `datasets/reports/comprehensive_evaluation_report.json` and `evaluation_summary.md`.

---

## 4. Known Methodological Limitations

1. **General Spam vs. Cyber Fraud**: UCI SMS Spam represents historical British SMS texts; TrustGuard AI reinforces this with specialized Indian cybercrime indicators (Digital Arrest, UPI escrow, Tamil/Hindi transliterations).
2. **Audio Degradation**: Real-world voice cloning scams occur over lossy GSM/VoIP codecs which distort high-frequency spectral flatness.
3. **Face Presence != Manipulation**: Face presence detection merely detects humans, and must never be conflated with deepfake classification without verified facial boundary anomaly cues.
