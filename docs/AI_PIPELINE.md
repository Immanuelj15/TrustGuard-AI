# TrustGuard AI – Multi-Modal AI Pipeline & Explainability Engine

## 1. Principles of Explainable Cyber Forensics

1. **No Black Boxes**: Forensic tools must provide interpretable evidence artifacts (snippets, acoustic telemetry, flagged frame timestamps).
2. **Honest Capability Attribution**: When specialized neural models (e.g., AASIST, Xception) are not configured, the system explicitly returns baseline technical metadata and labels manipulation detection as unverified. It **never** fabricates AI confidence.
3. **Probabilistic Scoring != Legal Guilt**: Risk scores represent mathematical indicator aggregations, not proof of criminal liability.

---

## 2. Text Scam & Social Engineering Pipeline (`text_analyzer.py`)

- **Methodology**: Multi-vector rule-based semantic parser evaluating 6 threat categories:
  - `OTP_CREDENTIAL_SOLICITATION`: Requests for OTP, PIN, passwords (includes Hindi/Tamil transliterations).
  - `IMPERSONATION_AUTHORITY`: Summons from Police, CBI, Enforcement Directorate, Customs, Telecom Department.
  - `URGENT_FINANCIAL_DEMAND`: Coercive deadlines ("transfer within 30 minutes or face arrest").
  - `REMOTE_ACCESS_MALWARE`: Requests to install AnyDesk, TeamViewer, RustDesk, or suspicious APK files.
  - `SUSPICIOUS_PAYMENT_CHANNELS`: Unverified UPI strings, crypto, or gift cards.
  - `PHISHING_URL_PATTERN`: Obfuscated URL shorteners (bit.ly, tinyurl), raw IP addresses, and high-risk TLDs.
- **Explainability**: Every finding returns the matched substring, surrounding context snippet, start/end character offsets, and contribution weight.

---

## 3. Audio Telemetry & Voice Clone Pipeline (`audio_analyzer.py`)

- **Telemetry Extraction**: Duration, sampling rate, channels, spectral centroid (Hz), spectral flatness, zero-crossing rate, estimated SNR.
- **Model Adapter**:
  - Production mode: Pluggable AASIST / RawNet2 deep-learning weights.
  - Baseline mode: Explicitly reports that deep-learning voice cloning weights are unconfigured, while providing acoustic telemetry and speech-to-text transcript snippets.

---

## 4. Video Forensics & Deepfake Inspection (`video_analyzer.py`)

- **Telemetry Extraction**: Stream container analysis, frame sampling, estimated FPS, face presence detection, audio-video offset synchronization.
- **Model Adapter**:
  - Production mode: Pluggable Xception / EfficientNet face manipulation classifiers.
  - Baseline mode: Clearly logs: *"Deepfake model not configured. Technical metadata and frame extraction completed; manipulation classification unavailable."*

---

## 5. Multi-Modal Risk Aggregator (`risk_engine.py`)

- Aggregates findings across all analyzed evidence files under a case.
- Applies cross-modal correlation bonuses (e.g. suspect phone call + urgent text with OTP demand increases urgency).
- Separates calibrated model confidence from calculated risk severity.
