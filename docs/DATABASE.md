# TrustGuard AI – Database Architecture & Schema

## Entity Relationship Overview

The platform uses SQLAlchemy declarative models with foreign key constraints, indexes on lookup fields, and JSON columns for flexible telemetry payloads.

```
       ┌──────────┐                 ┌──────────────────────┐
       │  users   │◄────────────────┤     audit_logs       │
       └────┬─────┘                 └──────────────────────┘
            │ 1
            │
            │ *
       ┌────┴─────┐ 1             * ┌──────────────────────┐
       │  cases   ├────────────────┤  investigator_notes  │
       └────┬─────┘                 └──────────────────────┘
            │ 1
            │
            │ *
       ┌────┴─────┐ 1             * ┌──────────────────────┐
       │ evidence ├────────────────┤  generated_reports   │
       └────┬─────┘                 └──────────────────────┘
            │ 1
            │
            │ *
     ┌──────┴───────┐ 1           1 ┌──────────────────────┐
     │analysis_jobs ├───────────────┤   analysis_results   │
     └──────────────┘               └──────────────────────┘
```

---

## Table Schemas

### `users`
- `id` (UUID PK): Unique identifier
- `full_name` (VARCHAR): Officer full name
- `email` (VARCHAR UNIQUE, INDEXED): Login email
- `password_hash` (VARCHAR): Bcrypt salted password hash
- `role` (VARCHAR): admin, investigator, reviewer, demo_user
- `is_active` (BOOLEAN): Account status
- `created_at`, `updated_at` (TIMESTAMP WITH TIME ZONE)

### `cases`
- `id` (UUID PK)
- `case_number` (VARCHAR UNIQUE, INDEXED): e.g., `TG-2026-88102`
- `title` (VARCHAR): Case incident summary
- `description` (TEXT): Incident report facts
- `complaint_category` (VARCHAR): Attack classification
- `priority` (VARCHAR): low, medium, high, critical
- `status` (VARCHAR): open, under_investigation, awaiting_review, resolved, closed
- `assigned_investigator_id` (UUID FK -> users.id)
- `created_by` (UUID FK -> users.id)
- `created_at`, `updated_at` (TIMESTAMP WITH TIME ZONE)

### `evidence`
- `id` (UUID PK)
- `case_id` (UUID FK -> cases.id, INDEXED)
- `original_filename` (VARCHAR)
- `stored_object_key` (VARCHAR): MinIO/Storage path
- `mime_type` (VARCHAR)
- `file_size` (INTEGER): Bytes
- `sha256_hash` (VARCHAR(64), INDEXED): Cryptographic digest
- `evidence_type` (VARCHAR): audio, video, text, image, document
- `uploaded_by` (UUID FK -> users.id)
- `uploaded_at` (TIMESTAMP WITH TIME ZONE)
- `processing_status` (VARCHAR): ready, analyzing, analyzed

### `analysis_jobs` & `analysis_results`
- Track background and synchronous inference tasks, model versions, risk levels, explainable JSON findings, and statutory limitations.

### `caller_reports`
- Log suspect phone numbers, E.164 normalisation, categorization, and verification flags.

### `audit_logs`
- Immutable append-only log capturing user ID, action, affected case ID, evidence ID, outcome, and sanitized metadata (passwords and tokens permanently redacted).
