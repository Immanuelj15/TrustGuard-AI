import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_complete_role_permission_matrix():
    # 1. Admin login & capabilities
    admin_login = client.post("/api/v1/auth/login", json={
        "email": "admin@trustguard.ai",
        "password": "Admin@TrustGuard2026"
    })
    assert admin_login.status_code == 200, f"Admin login failed: {admin_login.text}"
    admin_token = admin_login.json()["access_token"]
    admin_user = admin_login.json()["user"]
    assert admin_user["role"] == "admin"
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Admin: view users (allowed)
    r = client.get("/api/v1/auth/users", headers=admin_headers)
    assert r.status_code == 200
    assert len(r.json()) >= 4

    # Admin: view audit logs (allowed)
    r = client.get("/api/v1/audit-logs", headers=admin_headers)
    assert r.status_code == 200

    # 2. Investigator login & capabilities
    inv_login = client.post("/api/v1/auth/login", json={
        "email": "investigator@trustguard.ai",
        "password": "Investigator@2026"
    })
    assert inv_login.status_code == 200, f"Investigator login failed: {inv_login.text}"
    inv_token = inv_login.json()["access_token"]
    inv_user = inv_login.json()["user"]
    assert inv_user["role"] == "investigator"
    inv_headers = {"Authorization": f"Bearer {inv_token}"}

    # Investigator: view users (FORBIDDEN - 403)
    r = client.get("/api/v1/auth/users", headers=inv_headers)
    assert r.status_code == 403

    # Investigator: view audit logs (allowed)
    r = client.get("/api/v1/audit-logs", headers=inv_headers)
    assert r.status_code == 200

    # 3. Reviewer login & capabilities
    rev_login = client.post("/api/v1/auth/login", json={
        "email": "reviewer@trustguard.ai",
        "password": "Reviewer@2026"
    })
    assert rev_login.status_code == 200, f"Reviewer login failed: {rev_login.text}"
    rev_token = rev_login.json()["access_token"]
    rev_user = rev_login.json()["user"]
    assert rev_user["role"] == "reviewer"
    rev_headers = {"Authorization": f"Bearer {rev_token}"}

    # Reviewer: view users (FORBIDDEN - 403)
    r = client.get("/api/v1/auth/users", headers=rev_headers)
    assert r.status_code == 403

    # Reviewer: create case (FORBIDDEN - 403)
    r = client.post("/api/v1/cases", json={
        "title": "Unauthorized Case",
        "complaint_category": "Phishing",
        "priority": "medium"
    }, headers=rev_headers)
    assert r.status_code == 403

    # Reviewer: view audit logs (allowed)
    r = client.get("/api/v1/audit-logs", headers=rev_headers)
    assert r.status_code == 200

    # 4. Demo User login & capabilities
    demo_login = client.post("/api/v1/auth/login", json={
        "email": "demo@trustguard.ai",
        "password": "Demo@2026"
    })
    assert demo_login.status_code == 200, f"Demo login failed: {demo_login.text}"
    demo_token = demo_login.json()["access_token"]
    demo_user = demo_login.json()["user"]
    assert demo_user["role"] == "demo_user"
    demo_headers = {"Authorization": f"Bearer {demo_token}"}

    # Demo User: view users (FORBIDDEN - 403)
    r = client.get("/api/v1/auth/users", headers=demo_headers)
    assert r.status_code == 403

    # Demo User: create case (FORBIDDEN - 403)
    r = client.post("/api/v1/cases", json={
        "title": "Unauthorized Case",
        "complaint_category": "Phishing",
        "priority": "medium"
    }, headers=demo_headers)
    assert r.status_code == 403

    # Demo User: view audit logs (FORBIDDEN - 403)
    r = client.get("/api/v1/audit-logs", headers=demo_headers)
    assert r.status_code == 403
