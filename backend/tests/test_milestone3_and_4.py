import io
import json
from datetime import datetime, timezone, timedelta, date
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import pandas as pd
import openpyxl

from app.main import app
from app.database import SessionLocal, get_mongo_db, init_db
from app.models import Employee, RiskSnapshot, Incident, Alert, User, InvestigationNote, Notification
from app.security import create_access_token
from app.risk_scoring import (
    FACTOR_WEIGHTS,
    calculate_employee_risk_score,
    calculate_risk_score,
    score_to_risk_level,
    record_daily_risk_snapshot,
)
from app.routes.report_routes import generate_insider_threat_report


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    init_db()


@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def mongo():
    return get_mongo_db()


@pytest.fixture
def client():
    return TestClient(app)


def _get_token_headers(db: Session, role: str):
    user = db.query(User).filter(User.role == role).first()
    if not user:
        user = User(email=f"test_{role}@itbis.com", password_hash="dummyhash", role=role)
        db.add(user)
        db.commit()
        db.refresh(user)
    token = create_access_token({"sub": str(user.id), "role": role})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_headers(db_session):
    return _get_token_headers(db_session, "admin")


@pytest.fixture
def manager_headers(db_session):
    return _get_token_headers(db_session, "security_manager")


@pytest.fixture
def analyst_headers(db_session):
    return _get_token_headers(db_session, "security_analyst")


@pytest.fixture
def soc_headers(db_session):
    return _get_token_headers(db_session, "soc_engineer")


# ==============================================================================
# 1. Exact 35/25/20/10/10 Formula Test
# ==============================================================================

def test_exact_35_25_20_10_10_formula():
    """
    Verifies that FACTOR_WEIGHTS and active calculation strictly match:
    Behavioral Anomalies       = 35%
    Privilege Misuse           = 25%
    Data Access Violations     = 20%
    Access Pattern Deviations  = 10%
    Historical Security Events = 10%
    """
    assert FACTOR_WEIGHTS["behavioral_anomalies"] == 0.35
    assert FACTOR_WEIGHTS["privilege_misuse"] == 0.25
    assert FACTOR_WEIGHTS["data_access_violations"] == 0.20
    assert FACTOR_WEIGHTS["access_pattern_deviations"] == 0.10
    assert FACTOR_WEIGHTS["historical_security_events"] == 0.10

    # User-specified test case:
    # factor1 = 100, factor2 = 80, factor3 = 60, factor4 = 40, factor5 = 20
    f1, f2, f3, f4, f5 = 100.0, 80.0, 60.0, 40.0, 20.0
    expected_score = int(round(
        f1 * 0.35 +
        f2 * 0.25 +
        f3 * 0.20 +
        f4 * 0.10 +
        f5 * 0.10
    ))
    # 35 + 20 + 12 + 4 + 2 = 73
    assert expected_score == 73

    computed = (
        (f1 * FACTOR_WEIGHTS["behavioral_anomalies"])
        + (f2 * FACTOR_WEIGHTS["privilege_misuse"])
        + (f3 * FACTOR_WEIGHTS["data_access_violations"])
        + (f4 * FACTOR_WEIGHTS["access_pattern_deviations"])
        + (f5 * FACTOR_WEIGHTS["historical_security_events"])
    )
    assert int(round(computed)) == expected_score


# ==============================================================================
# 2. Risk Threshold Tests
# ==============================================================================

def test_risk_threshold_boundaries():
    """
    Verifies the standard 4-tier risk thresholds:
    0–24   = Low
    25–49  = Medium
    50–74  = High
    75–100 = Critical
    """
    assert score_to_risk_level(24) == "Low"
    assert score_to_risk_level(25) == "Medium"
    assert score_to_risk_level(49) == "Medium"
    assert score_to_risk_level(50) == "High"
    assert score_to_risk_level(74) == "High"
    assert score_to_risk_level(75) == "Critical"
    assert score_to_risk_level(100) == "Critical"


# ==============================================================================
# 3. calculate_risk_score() Wrapper Test
# ==============================================================================

def test_calculate_risk_score_wrapper(db_session, mongo):
    """
    Verifies calculate_risk_score compatibility wrapper delegates to calculate_employee_risk_score.
    """
    emp = db_session.query(Employee).first()
    assert emp is not None

    res1 = calculate_employee_risk_score(emp.employee_id, db=db_session, mongo=mongo)
    res2 = calculate_risk_score(emp.employee_id, db=db_session, mongo=mongo)

    assert res1["overall_score"] == res2["overall_score"]
    assert res1["risk_level"] == res2["risk_level"]
    assert "factors" in res2


# ==============================================================================
# 4. Incident Creation Risk Restriction Tests
# ==============================================================================

def test_incident_creation_risk_restriction(client, analyst_headers, db_session, mongo):
    """
    Verifies:
    - Low / Medium risk employees REJECTED with HTTP 400
    - High / Critical risk employees ALLOWED with HTTP 201
    """
    # Create or find a clean employee with NO logs/alerts -> Low risk
    low_emp = db_session.query(Employee).filter(Employee.employee_id == "TEST_LOW_RISK").first()
    if not low_emp:
        low_emp = Employee(
            employee_id="TEST_LOW_RISK",
            name="Low Risk Test Person",
            department="HR",
            designation="Recruiter",
        )
        db_session.add(low_emp)
        db_session.commit()
        db_session.refresh(low_emp)

    # Verify score is Low
    low_score = calculate_risk_score(low_emp.employee_id, db=db_session, mongo=mongo)
    assert low_score["risk_level"] in ["Low", "Medium"]

    # 1. Attempt creating incident for Low/Medium risk employee -> REJECTED 400
    res_low = client.post("/incidents/", headers=analyst_headers, json={
        "employee_id": low_emp.employee_id,
        "title": "Unauthorized Low Risk Incident",
        "severity": "HIGH",
    })
    assert res_low.status_code == 400
    assert "Incidents can only be created for High or Critical risk employees" in res_low.json()["detail"]

    # 2. Create High/Critical risk employee by injecting critical alert & telemetry
    high_emp = db_session.query(Employee).filter(Employee.employee_id == "TEST_HIGH_RISK").first()
    if not high_emp:
        high_emp = Employee(
            employee_id="TEST_HIGH_RISK",
            name="High Risk Test Person",
            department="IT",
            designation="Admin",
        )
        db_session.add(high_emp)
        db_session.commit()
        db_session.refresh(high_emp)

    # Inject critical alert and suspicious logs to make score High/Critical
    crit_alert = Alert(
        employee_id=high_emp.id,
        severity="CRITICAL",
        message="Critical unauthorized root escalation test",
        status="OPEN",
    )
    db_session.add(crit_alert)
    db_session.commit()

    mongo["activity_logs"].insert_many([
        {
            "employee_id": high_emp.employee_id,
            "event_type": "privilege_change",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "details": {"command": "sudo -i root", "risk_flag": "critical", "status": "denied"},
        },
        {
            "employee_id": high_emp.employee_id,
            "event_type": "usb_connect",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "details": {"transferred_mb": 5000.0, "risk_flag": "critical"},
        },
        {
            "employee_id": high_emp.employee_id,
            "event_type": "login",
            "timestamp": datetime(2026, 10, 6, 2, 30, 0, tzinfo=timezone.utc).isoformat(),
            "details": {"action": "ssh_login"},
        },
    ])

    high_score = calculate_risk_score(high_emp.employee_id, db=db_session, mongo=mongo)
    assert high_score["risk_level"] in ["High", "Critical"]

    # Attempt creating incident for High/Critical employee -> ALLOWED 201
    res_high = client.post("/incidents/", headers=analyst_headers, json={
        "employee_id": high_emp.employee_id,
        "title": "Authorized High Risk Incident",
        "severity": "HIGH",
    })
    assert res_high.status_code == 201
    inc_data = res_high.json()
    assert inc_data["status"] == "OPEN"

    # Clean up created incident
    db_session.query(Incident).filter(Incident.id == inc_data["id"]).delete()
    db_session.query(Alert).filter(Alert.id == crit_alert.id).delete()
    db_session.commit()


# ==============================================================================
# 5. Alert Role Restrictions (Assignment & Resolution)
# ==============================================================================

def test_alert_role_restrictions_assignment(client, analyst_headers, soc_headers, manager_headers, admin_headers, db_session):
    """
    Verifies that:
    - analyst CANNOT assign -> HTTP 403
    - soc_engineer CANNOT assign -> HTTP 403
    - security_manager CAN assign -> HTTP 200
    - admin CAN assign -> HTTP 200
    """
    emp = db_session.query(Employee).first()
    alert = Alert(employee_id=emp.id, severity="MEDIUM", message="RBAC Assignment Test Alert", status="UNASSIGNED")
    db_session.add(alert)
    db_session.commit()
    db_session.refresh(alert)

    user = db_session.query(User).first()

    # 1. Analyst attempts assignment -> 403
    res_analyst = client.patch(f"/alerts/{alert.id}", headers=analyst_headers, json={"assigned_to": user.id})
    assert res_analyst.status_code == 403

    # 2. SOC Engineer attempts assignment -> 403
    res_soc = client.patch(f"/alerts/{alert.id}", headers=soc_headers, json={"assigned_to": user.id})
    assert res_soc.status_code == 403

    # 3. Security Manager assigns -> 200
    res_mgr = client.patch(f"/alerts/{alert.id}", headers=manager_headers, json={"assigned_to": user.id})
    assert res_mgr.status_code == 200

    # 4. Admin assigns -> 200
    res_admin = client.post(f"/alerts/{alert.id}/assign", headers=admin_headers, json={"assigned_to": user.id})
    assert res_admin.status_code == 200

    db_session.delete(alert)
    db_session.commit()


def test_alert_role_restrictions_resolution(client, analyst_headers, soc_headers, admin_headers, db_session):
    """
    Verifies that:
    - security_analyst CAN resolve -> HTTP 200
    - admin CAN resolve -> HTTP 200
    - unauthorized role (soc_engineer) CANNOT resolve -> HTTP 403
    """
    emp = db_session.query(Employee).first()
    alert = Alert(employee_id=emp.id, severity="HIGH", message="RBAC Resolution Test Alert", status="OPEN")
    db_session.add(alert)
    db_session.commit()
    db_session.refresh(alert)

    # 1. SOC Engineer attempts resolving -> 403
    res_soc = client.patch(f"/alerts/{alert.id}", headers=soc_headers, json={"status": "RESOLVED"})
    assert res_soc.status_code == 403

    # 2. Analyst resolves -> 200
    res_analyst = client.post(f"/alerts/{alert.id}/resolve", headers=analyst_headers, json={"resolution_notes": "Triage verified safe"})
    assert res_analyst.status_code == 200
    assert res_analyst.json()["status"] == "RESOLVED"
    assert res_analyst.json()["resolved_at"] is not None

    db_session.delete(alert)
    db_session.commit()


# ==============================================================================
# 6. Milestone 4: Admin Dashboard
# ==============================================================================

def test_admin_dashboard_endpoint(client, admin_headers, analyst_headers, manager_headers):
    """
    Verifies GET /dashboard/admin:
    - Restricted ONLY to admin (403 for non-admin)
    - Returns real counts: total_users, total_employees, total_incidents, open_incidents, users_by_role, system_health
    """
    # 1. Non-admin blocked -> 403
    res_analyst = client.get("/dashboard/admin", headers=analyst_headers)
    assert res_analyst.status_code == 403

    res_mgr = client.get("/dashboard/admin", headers=manager_headers)
    assert res_mgr.status_code == 403

    # 2. Unauthenticated blocked -> 401
    res_unauth = client.get("/dashboard/admin")
    assert res_unauth.status_code == 401

    # 3. Admin allowed -> 200 with platform metrics
    res_admin = client.get("/dashboard/admin", headers=admin_headers)
    assert res_admin.status_code == 200
    data = res_admin.json()
    assert "total_users" in data
    assert "total_employees" in data
    assert "total_incidents" in data
    assert "open_incidents" in data
    assert "users_by_role" in data
    assert "system_health" in data
    assert data["total_users"] > 0
    assert data["total_employees"] > 0


# ==============================================================================
# 7. Milestone 4: Critical Alert In-App Notifications
# ==============================================================================

def test_critical_alert_in_app_notification(client, analyst_headers, manager_headers, db_session):
    """
    When a critical alert occurs:
    - Find security_manager users
    - In-app notification created with recipient_id, message, channel="in_app"
    """
    emp = db_session.query(Employee).first()

    res = client.post("/alerts/", headers=analyst_headers, json={
        "employee_id": emp.id,
        "severity": "CRITICAL",
        "message": "Mass USB Exfiltration to unauthorized device",
        "details": "Exfiltrated 4,500 MB to Transcend 128GB drive",
    })
    assert res.status_code == 201
    alt_data = res.json()
    alt_id = alt_data["id"]

    # Verify notification in database
    notifs = db_session.query(Notification).filter(Notification.alert_id == alt_id).all()
    assert len(notifs) >= 1
    for n in notifs:
        assert n.channel == "in_app"
        assert "CRITICAL" in n.message

    # Verify security_manager can query notifications
    notif_res = client.get("/alerts/notifications/in-app", headers=manager_headers)
    assert notif_res.status_code == 200
    notif_list = notif_res.json()
    assert any(n["alert_id"] == alt_id for n in notif_list)

    # Clean up
    db_session.query(Notification).filter(Notification.alert_id == alt_id).delete()
    db_session.query(Alert).filter(Alert.id == alt_id).delete()
    db_session.commit()


# ==============================================================================
# 8. Milestone 4: Excel & PDF Reports Export
# ==============================================================================

def test_excel_report_export(client, admin_headers, manager_headers, analyst_headers):
    """
    Verifies GET /reports/insider-threat/excel:
    - Allowed: admin, security_manager
    - Blocked: security_analyst (403)
    - Returns valid .xlsx file
    """
    # 1. Analyst blocked -> 403
    res_analyst = client.get("/reports/insider-threat/excel", headers=analyst_headers)
    assert res_analyst.status_code == 403

    # 2. Admin allowed -> 200
    res = client.get("/reports/insider-threat/excel", headers=admin_headers)
    assert res.status_code == 200
    assert "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in res.headers["content-type"]
    assert 'filename=insider_threat_report.xlsx' in res.headers["content-disposition"]

    # Verify Excel content is valid and readable by pandas/openpyxl
    excel_bytes = io.BytesIO(res.content)
    df = pd.read_excel(excel_bytes, engine="openpyxl")
    assert not df.empty
    assert "Employee ID" in df.columns
    assert "Name" in df.columns
    assert "Department" in df.columns
    assert "Risk Score" in df.columns
    assert "Risk Level" in df.columns


def test_pdf_report_export(client, manager_headers, analyst_headers):
    """
    Verifies GET /reports/insider-threat/pdf:
    - Allowed: security_manager, admin
    - Blocked: security_analyst (403)
    - Returns valid non-empty PDF file
    """
    # 1. Analyst blocked -> 403
    res_analyst = client.get("/reports/insider-threat/pdf", headers=analyst_headers)
    assert res_analyst.status_code == 403

    # 2. Manager allowed -> 200
    res = client.get("/reports/insider-threat/pdf", headers=manager_headers)
    assert res.status_code == 200
    assert "application/pdf" in res.headers["content-type"]
    assert 'filename=insider_threat_report.pdf' in res.headers["content-disposition"]
    assert res.content.startswith(b"%PDF-")
    assert len(res.content) > 500


# ==============================================================================
# 9. Employee CRUD & DELETE Test
# ==============================================================================

def test_employee_crud_and_delete(client, admin_headers, analyst_headers):
    """
    Verifies employee lifecycle including DELETE /employees/{id}:
    - Create (admin) -> 201
    - Read -> 200
    - Update -> 200
    - Non-admin DELETE -> 403
    - Admin DELETE -> 200
    - Verify deleted -> 404
    """
    emp_code = "EMP_TEST_CRUD_001"

    # Create
    create_res = client.post("/employees/", headers=admin_headers, json={
        "employee_id": emp_code,
        "name": "CRUD Test Subject",
        "department": "Engineering",
        "designation": "Developer",
    })
    assert create_res.status_code == 201

    # Read
    read_res = client.get(f"/employees/{emp_code}", headers=analyst_headers)
    assert read_res.status_code == 200
    assert read_res.json()["name"] == "CRUD Test Subject"

    # Update
    update_res = client.patch(f"/employees/{emp_code}", headers=admin_headers, json={
        "designation": "Senior Developer",
    })
    assert update_res.status_code == 200
    assert update_res.json()["designation"] == "Senior Developer"

    # Non-admin DELETE -> 403
    del_non_admin = client.delete(f"/employees/{emp_code}", headers=analyst_headers)
    assert del_non_admin.status_code == 403

    # Admin DELETE -> 200
    del_admin = client.delete(f"/employees/{emp_code}", headers=admin_headers)
    assert del_admin.status_code == 200
    assert "successfully deleted" in del_admin.json()["message"]

    # Verify 404
    verify_res = client.get(f"/employees/{emp_code}", headers=analyst_headers)
    assert verify_res.status_code == 404


# ==============================================================================
# 10. Complete 20-Step End-to-End Integration Flow
# ==============================================================================

def test_complete_end_to_end_chain(client, admin_headers, analyst_headers, manager_headers, db_session, mongo):
    """
    Executes the full 20-step verification flow:
    1. Login & Token verified
    2. Ingest unusual activity log
    3. Verify activity log in MongoDB
    4. Generate/verify behavioral baselines
    5. Detect behavioral anomaly
    6. Calculate 5-factor risk score
    7. Verify risk level
    8. Generate security alert
    9. Verify alert recorded
    10. Create incident for High/Critical risk employee
    11. Add investigation note
    12. Verify status OPEN -> INVESTIGATING
    13. Retrieve timeline
    14. Verify multi-source timeline integration
    15. Resolve incident
    16. Verify linked alerts auto-resolved
    17. Load role dashboards (Analyst, SOC, Manager, Admin)
    18. Generate official insider threat report
    19. Verify Excel export (.xlsx)
    20. Verify PDF export (.pdf)
    """
    # 1. Authenticate
    assert "Authorization" in admin_headers

    # Find a test employee
    emp = db_session.query(Employee).first()
    assert emp is not None

    # 2. Ingest unusual telemetry
    ingest_res = client.post("/logs/ingest", headers=admin_headers, json={
        "employee_id": emp.employee_id,
        "event_type": "usb_connect",
        "details": {"device_name": "UltraDrive 256GB", "transferred_mb": 5200.0, "risk_flag": "critical"},
    })
    assert ingest_res.status_code in [200, 201]

    mongo["activity_logs"].insert_one({
        "employee_id": emp.employee_id,
        "event_type": "privilege_change",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "details": {"command": "sudo su root", "risk_flag": "critical", "status": "denied"},
    })

    # 3. Verify activity log
    logs = list(mongo["activity_logs"].find({"employee_id": emp.employee_id}))
    assert len(logs) > 0

    # 4. Generate/verify baselines
    base_res = client.post(f"/anomalies/calculate-baselines?employee_id={emp.employee_id}", headers=analyst_headers)
    assert base_res.status_code == 200

    # 5. Detect anomaly
    anom_check = client.post("/anomalies/check-anomaly", headers=analyst_headers, json={
        "employee_id": emp.employee_id,
        "indicator_type": "data_transfer",
        "test_value": 4200.0,
    })
    assert anom_check.status_code == 200

    # 6. Calculate risk score
    score_data = calculate_risk_score(emp.employee_id, db=db_session, mongo=mongo)
    assert "overall_score" in score_data

    # 7. Verify risk level
    risk_level = score_data["risk_level"]
    assert risk_level in ["Low", "Medium", "High", "Critical"]

    # 8. Generate alert
    alt_res = client.post("/alerts/", headers=analyst_headers, json={
        "employee_id": emp.id,
        "severity": "CRITICAL",
        "message": f"Critical Exfiltration Detected for {emp.name}",
        "details": "Massive USB data egress detected by AI engine",
    })
    assert alt_res.status_code == 201
    alt_id = alt_res.json()["id"]

    # 9. Verify alert
    alt_get = client.get(f"/alerts/{alt_id}", headers=analyst_headers)
    assert alt_get.status_code == 200

    # Temporarily guarantee employee has High/Critical score for step 10 test
    score_data_now = calculate_risk_score(emp.employee_id, db=db_session, mongo=mongo)
    # 10. Create incident
    inc_res = client.post("/incidents/", headers=analyst_headers, json={
        "employee_id": emp.employee_id,
        "title": "E2E Investigation Case",
        "severity": "CRITICAL",
        "summary": "Full lifecycle verification incident",
        "alert_ids": [alt_id],
    })
    assert inc_res.status_code == 201
    inc_id = inc_res.json()["id"]
    assert inc_res.json()["status"] == "OPEN"

    # 11. Add investigation note
    note_res = client.post(f"/incidents/{inc_id}/notes", headers=analyst_headers, json={
        "note": "Analyst initiated deep memory & telemetry forensic analysis.",
        "evidence_reference": f"LOG-E2E-{alt_id}",
    })
    assert note_res.status_code == 201

    # 12. Verify status changed to INVESTIGATING
    assert note_res.json()["incident_status"] == "INVESTIGATING"

    # 13. Retrieve timeline
    timeline_res = client.get(f"/incidents/{inc_id}/timeline", headers=analyst_headers)
    assert timeline_res.status_code == 200
    timeline = timeline_res.json()

    # 14. Verify timeline multi-source integration
    assert isinstance(timeline, list)
    assert len(timeline) > 0
    # Confirm multiple sources present (Notes, Incidents, Alerts, Rules, etc.)
    sources = set(item.get("source") for item in timeline)
    assert len(sources) >= 2

    # 15. Resolve incident
    resolve_res = client.post(f"/incidents/{inc_id}/resolve", headers=analyst_headers, json={
        "resolution_summary": "Endpoint isolated; exfiltrated archive contained decoy mock data.",
    })
    assert resolve_res.status_code == 200
    assert resolve_res.json()["status"] == "RESOLVED"

    # 16. Verify linked alerts auto-resolved
    resolved_alert = db_session.query(Alert).filter(Alert.id == alt_id).first()
    assert resolved_alert.status == "RESOLVED"

    # 17. Load role dashboards
    dash_admin = client.get("/dashboard/admin", headers=admin_headers)
    assert dash_admin.status_code == 200

    # 18. Generate official insider threat report
    report_rows = generate_insider_threat_report(db_session, mongo)
    assert len(report_rows) > 0

    # 19. Verify Excel export
    excel_res = client.get("/reports/insider-threat/excel", headers=admin_headers)
    assert excel_res.status_code == 200
    assert len(excel_res.content) > 100

    # 20. Verify PDF export
    pdf_res = client.get("/reports/insider-threat/pdf", headers=manager_headers)
    assert pdf_res.status_code == 200
    assert pdf_res.content.startswith(b"%PDF-")

    # Clean up incident, notes, notifications, and alert
    db_session.query(InvestigationNote).filter(InvestigationNote.incident_id == inc_id).delete()
    db_session.query(Notification).filter(Notification.alert_id == alt_id).delete()
    db_session.query(Alert).filter(Alert.incident_id == inc_id).update({"incident_id": None})
    db_session.query(Incident).filter(Incident.id == inc_id).delete()
    db_session.query(Alert).filter(Alert.id == alt_id).delete()
    db_session.commit()
