import sys
import os
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal, get_mongo_db
from app.models import Employee, User, Alert, Incident

client = TestClient(app)

def test_simulate_populates_all_four_dashboards():
    # 1. Login as Analyst (or any role)
    login_res = client.post("/auth/login", json={"email": "analyst@itbis.com", "password": "AnalystPass123!"})
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Trigger threat simulation
    sim_res = client.post("/anomalies/simulate-threat-event", json={"threat_scenario": "usb_exfiltration"}, headers=headers)
    assert sim_res.status_code == 200, f"Simulation failed: {sim_res.text}"
    sim_data = sim_res.json()

    created_alerts = sim_data.get("created_alerts", [])
    assert len(created_alerts) >= 4, f"Expected at least 4 alerts for the 4 domains, got {len(created_alerts)}"

    target_roles = {a.get("target_role") for a in created_alerts}
    assert "soc_engineer" in target_roles, "SOC Engineer target role missing"
    assert "admin" in target_roles, "Admin target role missing"
    assert "security_manager" in target_roles, "Security Manager target role missing"
    assert "security_analyst" in target_roles, "Security Analyst target role missing"

    # 3. Verify Analyst Dashboard Data: Priority Alerts & UEBA risk scores
    alerts_res = client.get("/alerts/", headers=headers)
    assert alerts_res.status_code == 200
    assert len(alerts_res.json()) > 0, "Analyst Dashboard: alerts empty"

    risk_res = client.get("/ueba/risk-scores", headers=headers)
    assert risk_res.status_code == 200
    assert len(risk_res.json()) > 0, "Analyst Dashboard: risk scores empty"

    # 4. Verify SOC Dashboard Data: Live logs & Telemetry
    logs_res = client.get("/logs/?limit=20", headers=headers)
    assert logs_res.status_code == 200
    assert len(logs_res.json()) > 0, "SOC Dashboard: logs empty"

    # 5. Verify Manager Dashboard Data: Risk posture & Department benchmarks
    mgr_login = client.post("/auth/login", json={"email": "manager@itbis.com", "password": "MgrPass123!"})
    assert mgr_login.status_code == 200
    mgr_headers = {"Authorization": f"Bearer {mgr_login.json()['access_token']}"}

    posture_res = client.get("/reports/risk-posture", headers=mgr_headers)
    assert posture_res.status_code == 200
    assert posture_res.json()["org_risk_score"] > 0, "Manager Dashboard: org risk score is 0"

    dept_res = client.get("/departments/", headers=mgr_headers)
    assert dept_res.status_code == 200
    assert len(dept_res.json()) > 0, "Manager Dashboard: department benchmarks empty"

    # 6. Verify Admin Dashboard Data: Users summary & System health & Incident cases
    admin_login = client.post("/auth/login", json={"email": "admin@itbis.com", "password": "AdminPass123!"})
    assert admin_login.status_code == 200
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

    users_res = client.get("/admin/users", headers=admin_headers)
    assert users_res.status_code == 200, f"Admin users failed: {users_res.text}"
    assert users_res.json()["total_users"] > 0, "Admin Dashboard: users count is 0"

    inc_res = client.get("/incidents/", headers=admin_headers)
    assert inc_res.status_code == 200
    assert len(inc_res.json()) >= 4, "Admin Dashboard: incidents count < 4"

    print("SUCCESS: All 4 operational dashboards successfully populated and verified with correct predicted data!")

if __name__ == "__main__":
    test_simulate_populates_all_four_dashboards()
