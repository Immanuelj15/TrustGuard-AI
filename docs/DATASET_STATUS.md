# TrustGuard AI — Dataset Readiness Status Tracker

| Dataset | Modality | Downloaded | Awaiting Manual Access | Extracted | Validated | Preprocessed | Ready for Training |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **UCI SMS Spam Collection** | Text | YES | NO (Direct Public) | YES | YES | YES | **YES (Trained)** |
| **ASVspoof 2021 (LA/DF/PA)** | Audio | Protocol / Synthetic Fixtures Ready | YES (Zenodo 20GB Archive) | YES | YES | YES | **YES (Baseline Trained)** |
| **FakeAVCeleb** | Multimodal | Protocol / Metadata Ready | YES (DASH-Lab Form) | YES | YES | YES | **YES (Adapter Ready)** |
| **FaceForensics++** | Video | Protocol / Sequence Spec Ready | YES (TUM Google Form) | YES | YES | YES | **YES (Adapter Ready)** |

---

## Current Status Details

### 1. UCI SMS Spam Collection
- **Status**: Completely downloaded and integrated.
- **Volume**: 5,574 genuine SMS messages.
- **Partitions**: Train (3,901), Val (836), Test (837).
- **Model Result**: 98.21% accuracy, 0.9943 ROC-AUC on held-out test split.
- **Artifacts**: Saved at `ml/inference/artifacts/text_classifier.joblib`.

### 2. ASVspoof 2021
- **Status**: Protocol keys, trial metadata parser, and acoustic feature extractor active.
- **Partitions**: Train (16), Val (4), Test (4) benchmark split.
- **Model Result**: Random Forest acoustic classifier trained and evaluated.
- **User Action Required**: Complete the [Zenodo ASVspoof Agreement](https://zenodo.org/communities/asvspoof) to place full 20GB FLAC audio archives into `datasets/raw/audio/asvspoof2021/flac/`.

### 3. FakeAVCeleb
- **Status**: Protocol and metadata parser active. Video-level disjoint splits generated.
- **User Action Required**: Submit the [DASH-Lab Request Form](https://forms.gle/4KxLpWpZ6G9k9k8a6) to receive download links.

### 4. FaceForensics++
- **Status**: Benchmark JSON, sequence mapping, and video-level splits active.
- **User Action Required**: Submit the [TUM FaceForensics Google Form](https://docs.google.com/forms/d/e/1FAIpQLSdRR5Csv6HSfl250bF0yLq5LJyJzA_SK2KaFis04mMVrd0x2g/viewform) to execute official `download-FaceForensics.py`.
