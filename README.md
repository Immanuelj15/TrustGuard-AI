# TrustGuard AI – Digital Evidence Analysis & Cybercrime Investigation Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react)](https://reactjs.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?logo=tailwind-css)](https://tailwindcss.com)
[![Docker](https://img.shields.io/badge/Docker-Supported-2496ED?logo=docker)](https://docker.com)
[![Tests](https://img.shields.io/badge/Pytest-8%20Passed-green)](backend/app/tests)

---

## 1. Project Overview & Problem Statement

Cybercriminals increasingly execute multi-vector attacks combining **telecom caller ID spoofing**, **law enforcement impersonation (Digital Arrest)**, **AI-generated voice clones**, **deepfake video extortion**, and **social engineering phishing messages**.

Victims are frequently unable to distinguish between genuine authority summons and fraudulent coercion. Investigators face fragmented digital artifacts, non-standardized evidence ingestion, lack of cryptographic chain-of-custody verification, and opaque analytical tools.

**TrustGuard AI** is a production-minded digital forensics and investigation-assistance platform designed to:
- Ingest and preserve digital evidence with strict **SHA-256 cryptographic hashing**.
- Analyze scam text messages, voice recordings, video footage, and suspect telephone numbers.
- Provide transparent, explainable risk scoring with explicit diagnostic limitations.
- Generate professional, digitally certified PDF investigation reports.

> **CRITICAL LEGAL NOTICE:**  
> TrustGuard AI is an **investigation assistance tool**. It does **not** independently establish criminal guilt, identify suspects with legal finality, or claim AI predictions are conclusive proof in court.

---

## 2. Key Features

- **Cybercrime Case Management**: Case registration, priority triage (Low/Medium/High/Critical), status workflow tracking, and investigator notes.
- **Cryptographic Evidence Ingestion**: Automatic SHA-256 hash generation upon upload, MIME-type and file header validation, and private object storage preservation.
- **Scam Message & Social-Engineering Engine**: Rule-based explainable detection for authority impersonation (CBI, Police, Customs), coercive financial transfer, OTP solicitation, malicious APK downloads, and phishing URLs with English, Hindi, and Tamil pattern recognition.
- **Audio Telemetry & Voice Clone Analysis**: Acoustic feature extraction (spectral centroid, zero-crossing rate, spectral flatness, SNR) and transparent capability reporting for neural voice manipulation models.
- **Video Deepfake & Visual Telemetry**: Facial cue tracking, video container stream inspection, audio-video offset analysis, and honest fallback reporting.
- **Caller Reputation Threat Intelligence**: ITU E.164 phone number normalisation, line classification, VoIP detection, and community fraud registry. **Zero GPS or real-time location tracking.**
- **Explainable Multi-Modal Risk Scoring**: Factors are explicitly weighted and presented alongside model confidence scores.
- **Certified PDF Investigation Reports**: Branded multi-page forensic reports compiled via ReportLab featuring case details, cryptographic hashes, model versions, and investigator signatures.
- **Immutable Audit Trail**: Append-only audit logging with automatic credential and token sanitization.

---

## 3. Technology Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, Recharts, Axios
- **Backend**: Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic
- **Database**: PostgreSQL (Production / Docker) / SQLite (Zero-config local development)
- **Object Storage**: MinIO (S3-compatible) & Local Filesystem Adapter
- **Reports**: ReportLab PDF Engine
- **DevOps**: Docker, Docker Compose, Nginx

---

## 4. Default Demonstration Credentials

The platform auto-seeds four role-based accounts:

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Investigator** | `investigator@trustguard.ai` | `Investigator@2026` | Create cases, ingest evidence, trigger AI analysis, add notes, compile reports |
| **Admin** | `admin@trustguard.ai` | `Admin@TrustGuard2026` | Full platform control, audit trail review, user administration |
| **Reviewer** | `reviewer@trustguard.ai` | `Reviewer@2026` | Case inspection, evidence review, finding validation |
| **Demo User** | `demo@trustguard.ai` | `Demo@2026` | Seeded sample case exploration |

---

## 5. Quickstart Guide (Local Development)

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm

### 1. Backend Setup
```bash
cd backend
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Backend API interactive documentation is available at `http://localhost:8000/docs`.

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open your browser at `http://localhost:5173`. Use the quick-fill buttons on the login page to enter immediately.

---

## 6. Docker Deployment

To launch the complete containerized stack (PostgreSQL, Redis, MinIO, FastAPI Backend, and Nginx Frontend):
```bash
docker-compose up --build
```
- Frontend Application: `http://localhost:5173`
- Backend API: `http://localhost:8000/docs`
- MinIO Storage Console: `http://localhost:9001` (user: `trustguard_minio`, pass: `trustguard_secret_2026`)

---

## 7. Running Automated Tests

Run the comprehensive pytest suite:
```bash
cd backend
python -m pytest app/tests/test_platform.py -v
```
All 8 verification tests cover authentication, audit log sanitization, text scam heuristics, audio/video capability reporting, caller normalisation, evidence SHA-256 integrity, and PDF report compilation.

---

## 8. Documentation Index

- [System Architecture](docs/ARCHITECTURE.md)
- [REST API Specifications](docs/API.md)
- [Database Schema & ER Model](docs/DATABASE.md)
- [AI Pipeline & Explainability Engine](docs/AI_PIPELINE.md)
- [Security & Evidence Integrity](docs/SECURITY.md)
- [Production Deployment Guide](docs/DEPLOYMENT.md)
