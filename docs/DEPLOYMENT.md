# TrustGuard AI – Deployment Guide

## 1. Containerized Docker Deployment

### Prerequisites
- Docker Engine 24+
- Docker Compose v2+

### Quick Start
```bash
# Clone and enter directory
cd TrustGuard

# Create environment file
cp .env.example .env

# Build and start all services
docker-compose up --build -d
```

### Services Started
| Service | Internal Port | Host Port | Purpose |
| :--- | :--- | :--- | :--- |
| `frontend` | 80 | 5173 | Nginx React SPA & Reverse Proxy |
| `backend` | 8000 | 8000 | FastAPI REST Server |
| `postgres` | 5432 | 5432 | Relational DB |
| `redis` | 6379 | 6379 | Task queue & cache |
| `minio` | 9000 / 9001 | 9000 / 9001 | S3-compatible Object Storage |

---

## 2. Production Considerations

1. **Secrets**: Update `SECRET_KEY`, `POSTGRES_PASSWORD`, and `MINIO_SECRET_KEY` in `.env` to cryptographically secure random values.
2. **TLS / SSL**: Deploy an edge reverse proxy (Cloudflare, AWS ALB, or Let's Encrypt Nginx) to enforce HTTPS for all client traffic.
3. **Database Backups**: Schedule automated `pg_dump` snapshots of the `postgres_data` volume.
4. **Storage Replication**: For enterprise deployment, configure MinIO bucket replication across dual availability zones.
