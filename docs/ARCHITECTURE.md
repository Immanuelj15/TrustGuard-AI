# TrustGuard AI – System Architecture

## 1. High-Level Architecture Overview

TrustGuard AI follows a modern, decoupled layered micro-service architecture:

```
[ Frontend Client (React 18 + Vite + Tailwind CSS) ]
                        │
                        ▼ (REST / JWT Bearer)
[ Nginx Reverse Proxy / API Gateway ]
                        │
                        ▼
[ FastAPI Backend Application Core ]
  ├── Auth & RBAC Service
  ├── Case Management Service
  ├── Evidence Preservation Engine (SHA-256 Hasher)
  ├── Multi-Modal AI Analysis Coordinator
  │     ├── Text Scam & Social-Engineering Rule Engine
  │     ├── Audio Telemetry & Voice Clone Adapter
  │     └── Video Deepfake & Visual Telemetry Adapter
  ├── Caller Reputation & Threat Intelligence Service
  ├── Multi-Modal Risk Aggregation Engine
  ├── ReportLab PDF Generation Service
  └── Immutable Audit Trail Logger
            │                         │
            ▼                         ▼
   [ PostgreSQL / SQLite ]    [ MinIO Object Storage ]
   (Relational Metadata)       (Original Evidence Files)
```

---

## 2. Core Subsystems

### A. Authentication & Role-Based Access Control (RBAC)
- Employs stateless JWT (JSON Web Tokens) with HMAC-SHA256 signatures.
- Strictly validates authorization on the backend for all state-changing endpoints.
- Enforces four distinct roles: `admin`, `investigator`, `reviewer`, `demo_user`.

### B. Digital Evidence Vault & Chain of Custody
- Files are streamed through a cryptographic pipeline that calculates the SHA-256 digest before storing.
- Stored files are written to private object storage with unguessable, structured keys:
  `cases/{case_id}/{evidence_id}_{safe_filename}`.
- Original files are preserved immutably. Derived files (analysis copies, PDF reports) reference the parent evidence record.

### C. Multi-Modal AI Inference Adapters
- Decoupled interfaces permit swapping rule-based baselines with full neural network models (AASIST for audio, Xception/EfficientNet for video) without altering API contracts.
- In baseline or demo mode, models return explicit diagnostic status strings, ensuring zero deceptive "black-box" outputs.

### D. Automated PDF Report Generator
- Leverages ReportLab to programmatically build multi-page vector PDF investigation reports.
- Includes dynamic tables, cryptographic hashes, model version information, risk summaries, investigator notes, and statutory legal disclaimers.
