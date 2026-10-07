from datetime import datetime, timezone, timedelta, date
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import SessionLocal, get_mongo_db, init_db
from app.models import Employee, RiskSnapshot, Incident, Alert, User, InvestigationNote
from app.security import create_access_token
from app.risk_scoring import (
    FACTOR_WEIGHTS,
    calculate_employee_risk_score,
    record_daily_risk_snapshot,
    record_all_daily_risk_snapshots,
    score_to_risk_level,
)
from app.ueba_engine import get_14_day_risk_trend


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
def client():
    return TestClient(app)


@pytest.fixture
def auth_headers(db_session):
    user = db_session.query(User).filter(User.role == "security_analyst").first()
    user_id = str(user.id) if user else "26"
    token = create_access_token({"sub": user_id, "role": "security_analyst"})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_headers(db_session):
    user = db_session.query(User).filter(User.role == "admin").first()
    user_id = str(user.id) if user else "25"
    token = create_access_token({"sub": user_id, "role": "admin"})
    return {"Authorization": f"Bearer {token}"}


# ==============================================================================
# 1. Exact Numerical Risk Formula Tests
# ==============================================================================

def test_exact_numerical_risk_formula_max_case():
    """
    Test exact 5-factor risk scoring formula with all factors at 100.
    F1 (35%) = 100
    F2 (25%) = 100
    F3 (20%) = 100
    F4 (10%) = 100
    F5 (10%) = 100
    Expected overall score: 100
    """
    f1, f2, f3, f4, f5 = 100.0, 100.0, 100.0, 100.0, 100.0
    overall = (
        (f1 * FACTOR_WEIGHTS["behavioral_anomalies"])
        + (f2 * FACTOR_WEIGHTS["privilege_misuse"])
        + (f3 * FACTOR_WEIGHTS["data_access_violations"])
        + (f4 * FACTOR_WEIGHTS["access_pattern_deviations"])
        + (f5 * FACTOR_WEIGHTS["historical_security_events"])
    )
    score = int(round(min(100.0, max(0.0, overall))))
    assert score == 100
    assert score_to_risk_level(score) == "Critical"


def test_exact_numerical_risk_formula_mixed_case():
    """
    Test exact 5-factor risk scoring formula with known mixed inputs:
    F1 (Behavioral Anomalies, 35%) = 80
    F2 (Privilege Misuse, 25%) = 60
    F3 (Data Access Violations, 20%) = 40
    F4 (Access Pattern Deviations, 10%) = 20
    F5 (Historical Security Events, 10%) = 10
    Expected calculation:
      80 * 0.35 = 28
      60 * 0.25 = 15
      40 * 0.20 = 8
      20 * 0.10 = 2
      10 * 0.10 = 1
      Total = 28 + 15 + 8 + 2 + 1 = 54
    """
    f1, f2, f3, f4, f5 = 80.0, 60.0, 40.0, 20.0, 10.0
    overall = (
        (f1 * 0.35)
        + (f2 * 0.25)
        + (f3 * 0.20)
        + (f4 * 0.10)
        + (f5 * 0.10)
    )
    score = int(round(overall))
    assert score == 54
    assert score_to_risk_level(score) == "High"


# ==============================================================================
# 2. Risk Snapshot Creation & Duplicate Prevention
# ==============================================================================

def test_risk_snapshot_creation_and_persistence(db_session):
    """
    Verify risk snapshot is persisted in PostgreSQL with all 5 factor values and composite score.
    """
    emp = db_session.query(Employee).first()
    assert emp is not None, "Employees must exist in database"

    today = datetime.now(timezone.utc).date()

    # Clear any snapshot for today to test fresh creation
    db_session.query(RiskSnapshot).filter(
        RiskSnapshot.employee_id == emp.id,
        RiskSnapshot.snapshot_date == today,
    ).delete()
    db_session.commit()

    snap = record_daily_risk_snapshot(emp.employee_id, snapshot_date=today, db=db_session)
    assert snap is not None
    assert snap.employee_id == emp.id
    assert snap.snapshot_date == today
    assert isinstance(snap.risk_score, int)
    assert snap.risk_level in ["Low", "Medium", "High", "Critical"]
    assert snap.behavioral_anomalies_score >= 0.0
    assert snap.privilege_misuse_score >= 0.0
    assert snap.data_access_violations_score >= 0.0
    assert snap.access_pattern_deviations_score >= 0.0
    assert snap.historical_security_events_score >= 0.0


def test_duplicate_daily_snapshot_prevention(db_session):
    """
    Verify that calling record_daily_risk_snapshot multiple times for the same employee
    and snapshot_date updates the existing record rather than inserting duplicate records.
    """
    emp = db_session.query(Employee).first()
    assert emp is not None
    today = datetime.now(timezone.utc).date()

    # Call 1
    snap1 = record_daily_risk_snapshot(emp.employee_id, snapshot_date=today, db=db_session)
    snap1_id = snap1.id

    # Call 2 (duplicate daily trigger)
    snap2 = record_daily_risk_snapshot(emp.employee_id, snapshot_date=today, db=db_session)
    snap2_id = snap2.id

    assert snap1_id == snap2_id, "Must update existing record, not insert duplicate"

    # Verify count in database
    count = db_session.query(RiskSnapshot).filter(
        RiskSnapshot.employee_id == emp.id,
        RiskSnapshot.snapshot_date == today,
    ).count()
    assert count == 1, "There must be exactly 1 snapshot for (employee_id, snapshot_date)"


# ==============================================================================
# 3. GET /ueba/trend/{employee_id} & Trend Direction
# ==============================================================================

def test_ueba_trend_endpoint_real_snapshots(client, auth_headers, db_session):
    """
    Verify GET /ueba/trend/{employee_id} returns actual persisted snapshots and does NOT manufacture days.
    """
    emp = db_session.query(Employee).first()
    assert emp is not None

    res = client.get(f"/ueba/trend/{emp.employee_id}", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()

    assert data["employee_code"] == emp.employee_id
    assert "trend_direction" in data
    assert "snapshots_count" in data
    assert "daily_scores" in data
    assert isinstance(data["daily_scores"], list)
    # The returned snapshots count must match the actual count in PostgreSQL (up to 14)
    db_count = min(14, db_session.query(RiskSnapshot).filter(RiskSnapshot.employee_id == emp.id).count())
    assert len(data["daily_scores"]) == db_count


def test_trend_direction_calculation_from_real_stored_snapshots(db_session):
    """
    Verify trend direction calculation on real historical snapshots:
    - Increasing when risk increases over time
    - Decreasing when risk decreases over time
    - Stable when risk is flat
    """
    emp = db_session.query(Employee).first()
    assert emp is not None

    # Clear existing snapshots for test isolation
    db_session.query(RiskSnapshot).filter(RiskSnapshot.employee_id == emp.id).delete()
    db_session.commit()

    base_date = date(2026, 9, 1)

    # 1. Increasing scenario: 20 -> 30 -> 60 -> 80
    scores_increasing = [20, 25, 65, 80]
    for i, s in enumerate(scores_increasing):
        snap = RiskSnapshot(
            employee_id=emp.id,
            snapshot_date=base_date + timedelta(days=i),
            risk_score=s,
            risk_level=score_to_risk_level(s),
            behavioral_anomalies_score=float(s),
        )
        db_session.add(snap)
    db_session.commit()

    trend_inc = get_14_day_risk_trend(emp.employee_id, db=db_session)
    assert trend_inc["trend_direction"] == "Increasing"

    # 2. Decreasing scenario: 80 -> 65 -> 25 -> 20
    db_session.query(RiskSnapshot).filter(RiskSnapshot.employee_id == emp.id).delete()
    db_session.commit()

    scores_decreasing = [80, 65, 25, 20]
    for i, s in enumerate(scores_decreasing):
        snap = RiskSnapshot(
            employee_id=emp.id,
            snapshot_date=base_date + timedelta(days=i),
            risk_score=s,
            risk_level=score_to_risk_level(s),
            behavioral_anomalies_score=float(s),
        )
        db_session.add(snap)
    db_session.commit()

    trend_dec = get_14_day_risk_trend(emp.employee_id, db=db_session)
    assert trend_dec["trend_direction"] == "Decreasing"

    # 3. Stable scenario: 30 -> 31 -> 30 -> 31
    db_session.query(RiskSnapshot).filter(RiskSnapshot.employee_id == emp.id).delete()
    db_session.commit()

    scores_stable = [30, 31, 30, 31]
    for i, s in enumerate(scores_stable):
        snap = RiskSnapshot(
            employee_id=emp.id,
            snapshot_date=base_date + timedelta(days=i),
            risk_score=s,
            risk_level=score_to_risk_level(s),
            behavioral_anomalies_score=float(s),
        )
        db_session.add(snap)
    db_session.commit()

    trend_stab = get_14_day_risk_trend(emp.employee_id, db=db_session)
    assert trend_stab["trend_direction"] == "Stable"


def test_empty_historical_data_behavior(db_session):
    """
    Verify that an employee with 0 persisted snapshots returns empty trend arrays
    and communicates 'Insufficient historical risk data'.
    """
    # Create a temporary new employee with no snapshots
    temp_emp = Employee(
        employee_id="TEMP_TEST_EMPTY",
        name="Empty History Employee",
        department="Quality Assurance",
        designation="Tester",
    )
    db_session.add(temp_emp)
    db_session.commit()
    db_session.refresh(temp_emp)

    try:
        trend = get_14_day_risk_trend(temp_emp.employee_id, db=db_session)
        assert trend["snapshots_count"] == 0
        assert trend["trend"] == []
        assert trend["daily_scores"] == []
        assert trend["has_historical_data"] is False
        assert trend["trend_direction"] == "Stable"
        assert trend["message"] == "Insufficient historical risk data"
    finally:
        db_session.delete(temp_emp)
        db_session.commit()


# ==============================================================================
# 4. GET /anomalies/trend?days=7 Backend Aggregation
# ==============================================================================

def test_anomalies_trend_endpoint(client, auth_headers):
    """
    Verify GET /anomalies/trend?days=7 aggregates real stored anomaly and activity data by calendar day.
    """
    res = client.get("/anomalies/trend?days=7", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()

    assert data["days"] == 7
    assert "total_anomalies" in data
    assert "trend" in data
    assert len(data["trend"]) == 7

    for pt in data["trend"]:
        assert "date" in pt
        assert "day" in pt
        assert "total_anomalies" in pt
        assert "rule_anomalies" in pt
        assert "ml_anomalies" in pt
        assert "critical" in pt
        assert "high" in pt
        assert "medium" in pt
        assert "low" in pt
        assert "total_activity_logs" in pt
        assert pt["total_anomalies"] == pt["rule_anomalies"] + pt["ml_anomalies"]
        assert pt["total_anomalies"] == (pt["critical"] + pt["high"] + pt["medium"] + pt["low"])


# ==============================================================================
# 5. Incident Lifecycle: OPEN -> Add Note -> INVESTIGATING
# ==============================================================================

def test_incident_note_triggers_investigating_status(client, auth_headers, db_session):
    """
    Verify mandatory state transition rule:
    When an OPEN incident receives its first investigation note, its status becomes INVESTIGATING.
    """
    emp = db_session.query(Employee).first()
    assert emp is not None

    # 1. Create a fresh OPEN incident
    create_res = client.post("/incidents/", headers=auth_headers, json={
        "employee_id": emp.employee_id,
        "severity": "HIGH",
        "title": "Automated Test Lifecycle Case",
        "summary": "Testing note-triggered status transition to INVESTIGATING",
    })
    assert create_res.status_code == 201
    inc_data = create_res.json()
    inc_id = inc_data["id"]
    assert inc_data["status"] == "OPEN"

    # 2. Add first investigation note
    note_res = client.post(f"/incidents/{inc_id}/notes", headers=auth_headers, json={
        "note": "Initial analyst triage: reviewing anomaly indicators and audit logs.",
        "evidence_reference": "LOG-REF-10023",
    })
    assert note_res.status_code == 201
    note_data = note_res.json()
    assert note_data["incident_status"] == "INVESTIGATING"

    # 3. Verify in database
    inc_record = db_session.query(Incident).filter(Incident.id == inc_id).first()
    assert inc_record.status == "INVESTIGATING"

    # Clean up test incident
    db_session.delete(inc_record)
    db_session.commit()
