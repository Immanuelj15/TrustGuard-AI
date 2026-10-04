# TrustGuard AI – REST API Documentation

All API endpoints are prefixed with `/api/v1`. Authentication is performed via standard HTTP `Authorization: Bearer <token>` headers.

Interactive Swagger UI documentation is available at `/docs` and ReDoc at `/redoc`.

---

## 1. Authentication
- `POST /api/v1/auth/register` — Register a new officer account
- `POST /api/v1/auth/login` — Authenticate and receive a JWT access token
- `GET /api/v1/auth/me` — Retrieve active authenticated user profile

---

## 2. Cases
- `POST /api/v1/cases` — Create a new cybercrime case record (Generates unique `TG-YYYY-XXXXX` case number)
- `GET /api/v1/cases` — List cases with filtering by `status`, `priority`, `category`, and `search` query
- `GET /api/v1/cases/{case_id}` — Retrieve detailed case file with evidence inventory and investigator notes
- `PATCH /api/v1/cases/{case_id}` — Update case status, priority, or investigator assignment
- `POST /api/v1/cases/{case_id}/notes` — Append an investigator observation or case note

---

## 3. Evidence Management
- `POST /api/v1/cases/{case_id}/evidence` — Multipart form upload. Validates MIME, size, computes SHA-256 hash, and stores in private object storage
- `GET /api/v1/cases/{case_id}/evidence` — List evidence files attached to a case
- `GET /api/v1/evidence/{evidence_id}` — Get evidence metadata and hash
- `GET /api/v1/evidence/{evidence_id}/download` — Authorized secure streaming download of original evidence

---

## 4. Analysis Engine
- `POST /api/v1/evidence/{evidence_id}/analyze` — Trigger automated analysis job (auto-detected or specified type)
- `POST /api/v1/evidence/{evidence_id}/analyze/text` — Execute explainable scam text analysis
- `POST /api/v1/evidence/{evidence_id}/analyze/audio` — Execute acoustic telemetry & synthetic voice analysis
- `POST /api/v1/evidence/{evidence_id}/analyze/video` — Execute video deepfake & visual anomaly inspection
- `GET /api/v1/analysis/{job_id}` — Poll job status (`pending`, `processing`, `completed`, `failed`)
- `GET /api/v1/evidence/{evidence_id}/results` — List analysis results for an evidence file

---

## 5. Caller Reputation & Threat Intelligence
- `POST /api/v1/caller/check` — E.164 phone number normalisation, ITU format check, line classification, and incident lookup
- `POST /api/v1/caller/report` — Log community or investigator fraud complaint for a number
- `GET /api/v1/caller/reports` — List recent reported suspect callers

---

## 6. Investigation Reports
- `POST /api/v1/cases/{case_id}/reports` — Programmatically compile and render an official PDF investigation report
- `GET /api/v1/cases/{case_id}/reports` — List compiled reports for a case
- `GET /api/v1/reports/{report_id}/download` — Download digitally signed PDF investigation report

---

## 7. Audit Trail & Dashboard Telemetry
- `GET /api/v1/audit-logs` — Query immutable system audit logs with optional action/case filtering
- `GET /api/v1/dashboard/summary` — Retrieve high-level incident metrics
- `GET /api/v1/dashboard/charts` — Retrieve live analytics on status distributions and recent activity
- `GET /api/v1/health` — Platform service health check
