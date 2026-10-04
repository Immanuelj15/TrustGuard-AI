# TrustGuard AI – Security, Integrity & Access Control

## 1. Digital Evidence Integrity & Chain of Custody

- **SHA-256 Checksums**: Ingested files are streamed chunk-by-chunk through a SHA-256 cryptographic digest before being written to private storage. The hash is immutably linked to the database record.
- **Private Storage Isolation**: Files are never stored under public web-accessible URLs. All access and streaming downloads are mediated through authenticated backend endpoints.
- **Derived Artifact Lineage**: Generated reports and analysis logs point back to the source evidence ID and preserve parent hashes.

---

## 2. Authentication & Authorization (RBAC)

- **Password Hashing**: Salted bcrypt hashing.
- **Session Tokens**: HS256 signed JWTs with configurable expiration (default 24h).
- **Role Permissions**:
  - `admin`: User administration, platform settings, full audit log access.
  - `investigator`: Full case lifecycle, evidence ingestion, analysis execution, report generation, annotations.
  - `reviewer`: Read cases, examine findings, validate analysis notes.
  - `demo_user`: Sandboxed exploration of pre-seeded demonstration data.

---

## 3. Audit Trail Sanitization

- All API access, logins, uploads, analysis runs, and report exports trigger immutable records in the `audit_logs` table.
- A mandatory redaction filter strips passwords, tokens, API keys, and authorization headers before logging.

---

## 4. Privacy & Telecom Regulatory Compliance

- Phone number checks use the ITU E.164 standard.
- The system **never** tracks or claims to retrieve real-time GPS locations, cellular towers, or unverified personal addresses.
