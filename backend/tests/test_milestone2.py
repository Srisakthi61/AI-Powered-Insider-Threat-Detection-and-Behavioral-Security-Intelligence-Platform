import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import get_mongo_db, SessionLocal
from app.security import create_access_token
from app.behavioral_profiling import (
    calculate_login_time_baseline,
    calculate_resource_access_baseline,
    calculate_data_transfer_baseline,
    calculate_device_usage_baseline,
    calculate_application_usage_baseline,
    calculate_communication_baseline,
    calculate_all_baselines_for_employee,
)
from app.anomaly_detection import (
    check_login_time_anomaly,
    check_access_anomaly,
    check_data_exfiltration_anomaly,
    check_privilege_abuse_anomaly,
    check_suspicious_device_anomaly,
)
from app.ml_anomaly_model import train_anomaly_model, get_enriched_anomaly_report
from app.ml_engine import load_model_artifact, run_model


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def auth_headers():
    token = create_access_token({"sub": "analyst@itbis.com", "role": "security_analyst"})
    return {"Authorization": f"Bearer {token}"}


def test_baselines_calculation():
    """Verify all 6 indicator baselines are calculated with valid mean & std dev."""
    mongo = get_mongo_db()
    emp_id = "EMP1001"
    
    res = calculate_all_baselines_for_employee(emp_id, mongo)
    assert res["employee_id"] == emp_id
    assert len(res["baselines_calculated"]) == 6
    
    login_b = res["baselines"]["avg_login_hour"]
    assert login_b is not None
    assert login_b["typical_value"] > 0
    assert login_b["std_deviation"] > 0
    assert login_b["sample_size"] >= 5


def test_z_score_login_anomaly():
    """Verify z-score correctly identifies normal vs anomalous login hours."""
    # Normal login at 9:15 AM
    normal_res = check_login_time_anomaly("EMP1001", 9.25)
    assert normal_res["anomaly"] is False
    assert normal_res["z_score"] < 2.5

    # Extreme off-hours anomaly at 3:30 AM
    anom_res = check_login_time_anomaly("EMP1001", 3.5)
    assert anom_res["anomaly"] is True
    assert anom_res["z_score"] > 2.5
    assert anom_res["category"] == "Unusual Login Time"


def test_z_score_data_exfiltration():
    """Verify volumetric exfiltration is flagged."""
    normal_res = check_data_exfiltration_anomaly("EMP1001", 20.0)
    assert normal_res["anomaly"] is False

    huge_egress_res = check_data_exfiltration_anomaly("EMP1001", 5500.0)
    assert huge_egress_res["anomaly"] is True
    assert huge_egress_res["severity"] == "Critical"


def test_rule_based_privilege_abuse():
    """Verify privilege abuse rule check flags unauthorized superuser/sudo."""
    # EMP1002 (Ayesha Khan) only has finance_read_only
    abuse_res = check_privilege_abuse_anomaly("EMP1002", "sudo -u root /bin/bash")
    assert abuse_res["anomaly"] is True
    assert abuse_res["severity"] == "Critical"

    # EMP1003 (Daniel Lee - System Administrator) has ssh_root / domain_admin
    admin_res = check_privilege_abuse_anomaly("EMP1003", "ssh_root access host")
    assert admin_res["anomaly"] is False


def test_ml_isolation_forest_model():
    """Verify scikit-learn Isolation Forest trains without error and produces ranks."""
    df = train_anomaly_model(force_retrain=True)
    assert not df.empty
    assert "employee_id" in df.columns
    assert "anomaly_score" in df.columns
    assert "is_outlier" in df.columns
    assert "threat_rank" in df.columns

    report = get_enriched_anomaly_report()
    assert report["total_employees_analyzed"] > 0
    assert report["flagged_count"] > 0

    artifact = load_model_artifact()
    assert artifact["model"] is not None
    assert "feature_names" in artifact

    scored = run_model(df.drop(columns=["anomaly_score", "is_outlier", "threat_rank"]))
    assert "anomaly_score" in scored.columns
    assert "is_outlier" in scored.columns


def test_api_anomaly_endpoints(client, auth_headers):
    """Verify all Milestone 2 FastAPI endpoints return 200 with structured JSON."""
    # 1. Stats endpoint (nominal clean state before simulation)
    stats_res = client.get("/anomalies/stats", headers=auth_headers)
    assert stats_res.status_code == 200
    assert "total_activity_logs" in stats_res.json()

    # 2. Report endpoint (clean state before simulation)
    report_res = client.get("/anomalies/report", headers=auth_headers)
    assert report_res.status_code == 200
    assert "flagged_employees" in report_res.json()

    # 3. Employee baselines endpoint
    emp_base_res = client.get("/anomalies/baselines/EMP1001", headers=auth_headers)
    assert emp_base_res.status_code == 200
    assert emp_base_res.json()["indicators_count"] == 6

    # 4. Check anomaly POST endpoint
    check_res = client.post("/anomalies/check-anomaly", headers=auth_headers, json={
        "employee_id": "EMP1001",
        "indicator_type": "login_time",
        "test_value": 3.5
    })
    assert check_res.status_code == 200
    assert check_res.json()["anomaly"] is True
