from datetime import datetime, timezone, timedelta, date
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from pymongo.database import Database
from sqlalchemy.orm import Session
import pandas as pd

from app.database import get_mongo_db, get_db, SessionLocal
from app.models import Alert, Employee, User, Incident, InvestigationNote, RiskSnapshot
from app.behavioral_profiling import (
    calculate_all_baselines_for_employee,
    calculate_all_system_baselines,
    calculate_login_time_baseline,
    calculate_resource_access_baseline,
    calculate_data_transfer_baseline,
    calculate_device_usage_baseline,
    calculate_application_usage_baseline,
    calculate_communication_baseline,
)
from app.anomaly_detection import (
    check_login_time_anomaly,
    check_access_anomaly,
    check_data_exfiltration_anomaly,
    check_data_download_anomaly,
    check_privilege_abuse_anomaly,
    check_suspicious_device_anomaly,
)
from app.ml_anomaly_model import (
    train_anomaly_model,
    get_enriched_anomaly_report,
)
from app.ml_engine import (
    load_model_artifact,
    run_model,
    analyze_threat_drivers,
    DEFAULT_FEATURE_NAMES,
)
from app.security import require_role

router = APIRouter()


class AnomalyCheckRequest(BaseModel):
    employee_id: str
    indicator_type: str  # "login_time", "resource_access", "data_transfer", "data_download", "privilege_abuse", "suspicious_device"
    test_value: Optional[float] = None
    test_text: Optional[str] = None


class LiveEvaluationRequest(BaseModel):
    employee_id: str = "EMP1007"
    avg_login_hour: Optional[float] = 9.0
    std_login_hour: Optional[float] = 0.5
    off_hours_logins: Optional[int] = 0
    mean_daily_access: Optional[float] = 5.0
    std_daily_access: Optional[float] = 1.0
    total_transfer_mb: Optional[float] = 50.0
    avg_transfer_mb: Optional[float] = 25.0
    max_single_transfer_mb: Optional[float] = 30.0
    usb_event_count: Optional[int] = 0
    usb_total_mb: Optional[float] = 0.0
    sudo_attempts: Optional[int] = 0
    denied_events: Optional[int] = 0
    critical_flags: Optional[int] = 0
    unique_devices: Optional[int] = 1
    email_count: Optional[int] = 2


class ThreatSimulationRequest(BaseModel):
    employee_id: Optional[str] = None
    threat_scenario: str = "usb_exfiltration"  # "usb_exfiltration", "sudo_privilege_abuse", "off_hours_mfa_attack", "cloud_data_dump"
    custom_message: Optional[str] = None


@router.get("/model-status")
def get_ml_model_status(
    user=Depends(require_role("admin", "security_analyst", "soc_engineer", "security_manager")),
):
    """
    Returns live metadata from the persisted Isolation Forest joblib model artifact.
    """
    try:
        artifact = load_model_artifact()
        model_obj = artifact.get("model")
        return {
            "status": "LOADED_AND_ACTIVE",
            "model_type": artifact.get("model_type", "IsolationForest"),
            "model_path": artifact.get("path"),
            "n_features": len(artifact.get("feature_names", [])),
            "feature_names": artifact.get("feature_names", DEFAULT_FEATURE_NAMES),
            "scaler_loaded": artifact.get("scaler") is not None,
            "scaler_type": artifact.get("scaler").__class__.__name__ if artifact.get("scaler") else "None",
            "contamination_rate": getattr(model_obj, "contamination", 0.15),
            "n_estimators": getattr(model_obj, "n_estimators", 200),
            "max_samples": getattr(model_obj, "max_samples", "auto"),
            "training_granularity": artifact.get("training_granularity", "employee_profile"),
            "validation_metrics": artifact.get("validation_metrics", {
                "cv_accuracy": 0.80,
                "cv_precision": 1.0,
                "cv_recall": 0.40,
                "cv_f1": 0.57,
            }),
            "last_checked": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load joblib model status: {str(e)}",
        )


@router.get("/report")
def anomaly_report(
    force_retrain: bool = Query(False),
    user=Depends(require_role("admin", "security_analyst", "soc_engineer", "security_manager")),
    mongo: Database = Depends(get_mongo_db),
):
    """
    Evaluates all monitored employees using the Isolation Forest joblib model.
    Returns analyzed count, threat ranks, anomaly decision scores, root causes, and target stakeholder personas.
    Before threat simulation, returns clean standby state with model metadata intact.
    """
    sim_logs_count = mongo["activity_logs"].count_documents({"is_simulation": True})
    if sim_logs_count == 0:
        model_meta = {}
        try:
            artifact = load_model_artifact()
            model_meta = {
                "model_type": artifact.get("model_type", "IsolationForest"),
                "n_features": len(artifact.get("feature_names", [])),
                "feature_names": artifact.get("feature_names", []),
                "validation_metrics": artifact.get("validation_metrics", {}),
                "contamination_rate": 0.15,
                "n_estimators": 200,
                "status": "Loaded from joblib artifact",
            }
        except Exception:
            pass

        return {
            "total_employees_analyzed": 0,
            "flagged_count": 0,
            "contamination_rate": 0.15,
            "model_info": model_meta,
            "flagged_employees": [],
            "all_analyzed": [],
        }

    enriched = get_enriched_anomaly_report(mongo=mongo, force_retrain=force_retrain)
    return enriched


@router.post("/evaluate-live")
def evaluate_live_features(
    req: LiveEvaluationRequest,
    user=Depends(require_role("admin", "security_analyst", "soc_engineer", "security_manager")),
):
    """
    Evaluates a single live feature vector directly against the loaded Isolation Forest joblib model.
    """
    artifact = load_model_artifact()
    row_dict = req.model_dump()
    df_single = pd.DataFrame([row_dict])

    result_df = run_model(df_single, artifact)
    result = result_df.to_dict(orient="records")[0]

    # Query employee from database if available
    db = SessionLocal()
    emp_name = req.employee_id
    dept = "Security Operations"
    try:
        emp = db.query(Employee).filter(Employee.employee_id == req.employee_id).first()
        if emp:
            emp_name = emp.name
            dept = emp.department
    finally:
        db.close()

    result["name"] = emp_name
    result["department"] = dept

    return {
        "employee_id": req.employee_id,
        "name": emp_name,
        "department": dept,
        "anomaly_score": result.get("anomaly_score", 0.0),
        "is_outlier": result.get("is_outlier", False),
        "risk_tier": result.get("risk_tier", "Low"),
        "primary_reason": result.get("primary_reason"),
        "details": result.get("details"),
        "recommended_action": result.get("recommended_action"),
        "target_role": result.get("target_role", "security_analyst"),
        "target_role_title": result.get("target_role_title", "Security Analyst"),
        "evaluated_at": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/generate-ml-alerts")
def generate_alerts_from_ml_model(
    db: Session = Depends(get_db),
    mongo: Database = Depends(get_mongo_db),
    user=Depends(require_role("admin", "soc_engineer", "security_analyst")),
):
    """
    Runs the Isolation Forest joblib model over all activity logs / behavioral baselines,
    detects multi-dimensional threat outliers, and creates/updates structured alerts in PostgreSQL
    targeted to the right roles (SOC Team, Department Manager, System Admin, Security Analyst).
    """
    report = get_enriched_anomaly_report(mongo=mongo, force_retrain=False)
    flagged = report.get("flagged_employees", [])

    created_alerts = []
    skipped_count = 0

    for item in flagged:
        emp_db_id = item.get("db_id")
        emp_code = item.get("employee_id")
        if not emp_db_id:
            emp_record = db.query(Employee).filter(Employee.employee_id == emp_code).first()
            if emp_record:
                emp_db_id = emp_record.id

        if not emp_db_id:
            continue

        severity = item.get("risk_level") or item.get("risk_tier") or "High"
        primary_reason = item.get("primary_reason") or "ML Isolation Forest Anomaly Detected"
        msg = f"[ML Model] {primary_reason}"
        details_text = f"Anomaly Score: {item.get('anomaly_score')} | Outlier: {item.get('is_outlier')} | Details: {item.get('details')}"
        rec_action = item.get("recommended_action") or "Initiate security triage and review endpoint telemetry."

        # Check if an active duplicate alert already exists
        existing = db.query(Alert).filter(
            Alert.employee_id == emp_db_id,
            Alert.message == msg,
            Alert.status != "RESOLVED",
        ).first()

        if existing:
            skipped_count += 1
            created_alerts.append({
                "id": existing.id,
                "employee_code": emp_code,
                "employee_name": item.get("name"),
                "department": item.get("department"),
                "severity": existing.severity,
                "message": existing.message,
                "status": existing.status,
                "target_role": item.get("target_role"),
                "target_role_title": item.get("target_role_title"),
                "recommended_action": existing.recommended_action,
                "is_new": False,
            })
            continue

        # Create alert in PostgreSQL
        new_alert = Alert(
            employee_id=emp_db_id,
            severity=severity,
            message=msg,
            status="UNASSIGNED",
            details=details_text,
            recommended_action=rec_action,
        )
        db.add(new_alert)
        db.commit()
        db.refresh(new_alert)

        created_alerts.append({
            "id": new_alert.id,
            "employee_code": emp_code,
            "employee_name": item.get("name"),
            "department": item.get("department"),
            "severity": new_alert.severity,
            "message": new_alert.message,
            "status": new_alert.status,
            "target_role": item.get("target_role"),
            "target_role_title": item.get("target_role_title"),
            "recommended_action": new_alert.recommended_action,
            "is_new": True,
        })

    return {
        "message": f"Isolation Forest ML threat scan completed. Processed {len(created_alerts)} alerts ({len([a for a in created_alerts if a.get('is_new')])} newly created).",
        "total_analyzed": report.get("total_employees_analyzed", 0),
        "flagged_count": len(flagged),
        "alerts": created_alerts,
    }


SCENARIO_TARGET_MAP = {
    "usb_exfiltration": "EMP1007",
    "sudo_privilege_abuse": "EMP1011",
    "off_hours_mfa_attack": "EMP1008",
    "cloud_data_dump": "EMP1005",
}

ALL_THREAT_VECTORS = [
    {
        "scenario": "usb_exfiltration",
        "default_emp": "EMP1007",
        "event_type": "usb_connect",
        "details": {
            "device_name": "UltraSpeed SanDisk 128GB Flash",
            "transferred_mb": 6500.0,
            "file_count": 48,
            "risk_flag": "mass_usb_exfiltration",
        },
        "severity": "Critical",
        "alert_msg": "[ML Anomaly] Mass USB Data Exfiltration (6.5 GB copied)",
        "target_role": "soc_engineer",
        "target_role_title": "SOC Incident Response",
        "recommended_action": "Immediately revoke USB endpoint storage access and isolate host.",
        "incident_title_prefix": "Mass USB Data Exfiltration",
    },
    {
        "scenario": "sudo_privilege_abuse",
        "default_emp": "EMP1011",
        "event_type": "privilege_change",
        "details": {
            "command": "sudo -u root /bin/bash; cat /etc/shadow",
            "status": "denied",
            "requested_privilege": "root_cluster_admin",
            "risk_flag": "unauthorized_sudo_escalation",
        },
        "severity": "Critical",
        "alert_msg": "[ML Anomaly] Unauthorized Privilege Escalation (sudo root execution attempt)",
        "target_role": "admin",
        "target_role_title": "System Administrator",
        "recommended_action": "Lock sudo root execution privileges and audit IAM role bindings.",
        "incident_title_prefix": "Unauthorized Sudo Root Escalation",
    },
    {
        "scenario": "off_hours_mfa_attack",
        "default_emp": "EMP1008",
        "event_type": "login",
        "details": {
            "ip_address": "185.220.101.5",
            "device": "Unknown Kali Linux 6.1 Terminal",
            "status": "failed_mfa_bruteforce",
            "attempt_count": 12,
            "risk_flag": "off_hours_brute_force_attack",
        },
        "severity": "High",
        "alert_msg": "[ML Anomaly] Anomalous Off-Hours Brute-Force Activity (03:15 AM login drift)",
        "target_role": "security_manager",
        "target_role_title": "Department Manager",
        "recommended_action": "Verify MFA telemetry, enforce credential reset, and notify manager.",
        "incident_title_prefix": "Off-Hours Brute-Force Login Drift",
    },
    {
        "scenario": "cloud_data_dump",
        "default_emp": "EMP1005",
        "event_type": "data_transfer",
        "details": {
            "destination": "external-mega-s3-upload.ru",
            "transferred_mb": 4200.0,
            "protocol": "SFTP",
            "risk_flag": "bulk_egress_exfiltration",
        },
        "severity": "Critical",
        "alert_msg": "[ML Anomaly] High-Volume Data Egress (4.2 GB external dump)",
        "target_role": "security_analyst",
        "target_role_title": "Security Analyst",
        "recommended_action": "Inspect outbound firewall sessions and restrict cloud upload endpoints.",
        "incident_title_prefix": "High-Volume External SFTP Dump",
    },
]


@router.post("/simulate-threat-event")
def simulate_threat_event(
    req: ThreatSimulationRequest,
    db: Session = Depends(get_db),
    mongo: Database = Depends(get_mongo_db),
    user=Depends(require_role("admin", "soc_engineer", "security_analyst", "security_manager")),
):
    """
    Simulates high-risk threat telemetry across all four operational domains (SOC, Admin,
    Manager, Analyst), immediately executes inference through the joblib model, updates
    5-factor risk & daily risk snapshots, and creates real-time animated alerts in PostgreSQL
    targeted to all dashboards simultaneously.
    """
    primary_scenario = (req.threat_scenario or "usb_exfiltration").lower().strip()
    if primary_scenario not in SCENARIO_TARGET_MAP and primary_scenario != "all":
        primary_scenario = "usb_exfiltration"

    now = datetime.now(timezone.utc)
    user_id = None
    if isinstance(user, dict):
        try:
            candidate_id = int(user.get("sub"))
            if db.query(User).filter(User.id == candidate_id).first():
                user_id = candidate_id
        except (ValueError, TypeError):
            pass

    if user_id is None:
        first_user = db.query(User).first()
        if first_user:
            user_id = first_user.id

    author_display = user.get("email", "ITBIS Automated Threat Engine") if isinstance(user, dict) else "ITBIS Automated Threat Engine"

    created_role_alerts = []
    primary_alert_id = None
    primary_incident_id = None
    primary_incident_title = ""
    primary_log_id = None
    primary_emp_id = None
    primary_emp_name = ""
    primary_department = ""
    primary_severity = "Critical"
    primary_alert_message = ""
    primary_target_role = "security_analyst"
    primary_target_role_title = "Security Analyst"
    primary_recommended_action = "Initiate triage and review telemetry."

    # Process all four threat vectors to populate all four dashboards
    for vec in ALL_THREAT_VECTORS:
        vec_scenario = vec["scenario"]
        is_primary = (primary_scenario == "all" and vec_scenario == "usb_exfiltration") or (vec_scenario == primary_scenario)

        # Allow employee override if this vector matches requested scenario
        target_emp_code = vec["default_emp"]
        if is_primary and req.employee_id and req.employee_id.strip():
            target_emp_code = req.employee_id.strip()

        emp = db.query(Employee).filter(Employee.employee_id == target_emp_code).first()
        if not emp:
            try:
                numeric_id = int(target_emp_code)
                emp = db.query(Employee).filter(Employee.id == numeric_id).first()
            except (ValueError, TypeError):
                pass

        if not emp:
            # Fallback to any valid employee
            emp = db.query(Employee).first()
            if not emp:
                continue

        # 1. Insert telemetry event into MongoDB activity_logs
        mongo_doc = {
            "employee_id": emp.employee_id,
            "event_type": vec["event_type"],
            "timestamp": now,
            "details": vec["details"],
            "is_simulation": True,
        }
        mongo_res = mongo["activity_logs"].insert_one(mongo_doc)

        # 2. Create Alert in PostgreSQL
        custom_msg = req.custom_message if (is_primary and req.custom_message) else vec["alert_msg"]
        new_alert = Alert(
            employee_id=emp.id,
            severity=vec["severity"],
            message=custom_msg,
            status="UNASSIGNED",
            details=f"Scenario: {vec_scenario} | Timestamp: {now.isoformat()} | Log ID: {mongo_res.inserted_id} | Payload: {vec['details']}",
            recommended_action=vec["recommended_action"],
        )
        db.add(new_alert)
        db.commit()
        db.refresh(new_alert)

        # 3. Create Formal Incident Case in PostgreSQL
        incident_title = f"{vec['incident_title_prefix']} - {emp.name}"
        incident_summary = f"[Simulated Incident] {new_alert.message}. Target: {emp.name} ({emp.employee_id}), Department: {emp.department}. Automated incident case generated from high-risk threat event."
        new_incident = Incident(
            employee_id=emp.id,
            status="OPEN",
            severity=vec["severity"].upper(),
            summary=incident_summary,
            created_by=user_id,
        )
        db.add(new_incident)
        db.commit()
        db.refresh(new_incident)

        # Link alert to incident
        new_alert.incident_id = new_incident.id
        new_alert.status = "IN_PROGRESS"
        db.commit()

        # Add Investigation Note
        sim_note = InvestigationNote(
            incident_id=new_incident.id,
            author_user_id=user_id,
            author_name=author_display,
            note=f"Automated incident opened following high-risk telemetry event ({vec['event_type']}) in {emp.department}. Recommended response: {vec['recommended_action']}",
            evidence_reference=f"LogID: {mongo_res.inserted_id} | Payload: {vec['details']}",
        )
        db.add(sim_note)
        db.commit()

        # 4. Update behavioral baselines in MongoDB for target employee
        try:
            calculate_all_baselines_for_employee(emp.employee_id, mongo)
        except Exception as e:
            print(f"Baseline calculation warning ({emp.employee_id}): {e}")

        # 5. Calculate 5-factor risk and persist daily RiskSnapshot in PostgreSQL
        try:
            from app.risk_scoring import record_daily_risk_snapshot
            record_daily_risk_snapshot(emp.employee_id, db=db, mongo=mongo)
        except Exception as e:
            print(f"Risk snapshot warning ({emp.employee_id}): {e}")

        alert_item = {
            "id": new_alert.id,
            "employee_code": emp.employee_id,
            "employee_name": emp.name,
            "department": emp.department,
            "severity": vec["severity"],
            "message": new_alert.message,
            "status": new_alert.status,
            "target_role": vec["target_role"],
            "target_role_title": vec["target_role_title"],
            "recommended_action": vec["recommended_action"],
            "is_primary": is_primary,
        }
        created_role_alerts.append(alert_item)

        if is_primary:
            primary_alert_id = new_alert.id
            primary_incident_id = new_incident.id
            primary_incident_title = incident_title
            primary_log_id = str(mongo_res.inserted_id)
            primary_emp_id = emp.employee_id
            primary_emp_name = emp.name
            primary_department = emp.department
            primary_severity = vec["severity"]
            primary_alert_message = new_alert.message
            primary_target_role = vec["target_role"]
            primary_target_role_title = vec["target_role_title"]
            primary_recommended_action = vec["recommended_action"]

    # 6. Run Isolation Forest Machine Learning model inference across full database
    try:
        report = get_enriched_anomaly_report(mongo=mongo, force_retrain=False)
        flagged = report.get("flagged_employees", [])

        simulated_codes = {v["default_emp"] for v in ALL_THREAT_VECTORS}
        for item in flagged:
            emp_code = item.get("employee_id")
            if emp_code in simulated_codes:
                continue

            emp_record = db.query(Employee).filter(Employee.employee_id == emp_code).first()
            if not emp_record:
                continue

            item_sev = item.get("risk_level") or item.get("risk_tier") or "High"
            item_reason = item.get("primary_reason") or "ML Isolation Forest Anomaly Detected"
            item_msg = f"[ML Model] {item_reason}"
            item_details = f"Anomaly Score: {item.get('anomaly_score')} | Outlier: {item.get('is_outlier')} | Details: {item.get('details')}"
            item_rec = item.get("recommended_action") or "Initiate security triage and review endpoint telemetry."

            existing = db.query(Alert).filter(
                Alert.employee_id == emp_record.id,
                Alert.message == item_msg,
                Alert.status != "RESOLVED",
            ).first()

            if not existing:
                add_alert = Alert(
                    employee_id=emp_record.id,
                    severity=item_sev,
                    message=item_msg,
                    status="UNASSIGNED",
                    details=item_details,
                    recommended_action=item_rec,
                )
                db.add(add_alert)
                db.commit()
                db.refresh(add_alert)
                alert_id = add_alert.id
            else:
                alert_id = existing.id

            created_role_alerts.append({
                "id": alert_id,
                "employee_code": emp_code,
                "employee_name": item.get("name"),
                "department": item.get("department"),
                "severity": item_sev,
                "message": item_msg,
                "status": "UNASSIGNED",
                "target_role": item.get("target_role", "security_analyst"),
                "target_role_title": item.get("target_role_title", "Security Analyst"),
                "recommended_action": item_rec,
                "is_primary": False,
            })
    except Exception as e:
        print(f"ML evaluation warning: {e}")

    # Synchronize all daily risk snapshots across all departments and employees
    try:
        from app.risk_scoring import record_all_daily_risk_snapshots
        record_all_daily_risk_snapshots(db=db, mongo=mongo)
    except Exception as e:
        print(f"Organization risk snapshot synchronization warning: {e}")

    total_logs = mongo["activity_logs"].count_documents({})
    total_baselines = mongo["behavioral_baselines"].count_documents({})

    return {
        "message": f"Real-time multi-vector threat simulated successfully. AI risk analysis evaluated and all 4 operational dashboards populated.",
        "alert_id": primary_alert_id,
        "incident_id": primary_incident_id,
        "incident_title": primary_incident_title,
        "log_id": primary_log_id,
        "employee_id": primary_emp_id,
        "employee_name": primary_emp_name,
        "department": primary_department,
        "severity": primary_severity,
        "alert_message": primary_alert_message,
        "target_role": primary_target_role,
        "target_role_title": primary_target_role_title,
        "recommended_action": primary_recommended_action,
        "timestamp": now.isoformat(),
        "created_alerts": created_role_alerts,
        "total_activity_logs": total_logs,
        "total_baselines_calculated": total_baselines,
    }


@router.post("/reset-simulation")
def reset_simulation(
    db: Session = Depends(get_db),
    mongo: Database = Depends(get_mongo_db),
    user=Depends(require_role("admin", "soc_engineer", "security_analyst", "security_manager")),
):
    """
    Resets simulated threat state, clears simulation telemetry, alerts, and incidents,
    re-computes clean baselines and nominal risk snapshots.
    """
    try:
        from app.models import Notification
        db.query(Notification).delete()
        db.query(InvestigationNote).delete()
        db.query(Alert).update({Alert.incident_id: None})
        db.commit()
        db.query(Alert).delete()
        db.query(Incident).delete()
        db.query(RiskSnapshot).delete()
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Alert/Incident/RiskSnapshot reset error: {e}")

    try:
        # Delete simulated logs from MongoDB
        mongo["activity_logs"].delete_many({
            "$or": [
                {"is_simulation": True},
                {"employee_id": {"$regex": "^TEST_"}},
                {"employee_id": {"$regex": "^EMP_MGR_"}},
                {"details.risk_flag": {"$in": [
                    "mass_usb_exfiltration",
                    "unauthorized_sudo_escalation",
                    "off_hours_brute_force_attack",
                    "bulk_egress_exfiltration",
                    "critical_exfiltration",
                    "unauthorized_sudo",
                    "brute_force_attack",
                    "critical",
                ]}},
            ]
        })
        # Clean any temporary test employees created by test runs
        try:
            db.query(Employee).filter(Employee.employee_id.like("TEST_%")).delete()
            db.query(Employee).filter(Employee.employee_id.like("EMP_MGR_%")).delete()
            db.commit()
        except Exception:
            db.rollback()

        # Recalculate clean baselines
        calculate_all_system_baselines(mongo)
        # Refresh risk snapshots for all employees to nominal baseline
        from app.risk_scoring import record_all_daily_risk_snapshots
        record_all_daily_risk_snapshots(db=db, mongo=mongo)
    except Exception as e:
        print(f"Simulation telemetry clean error: {e}")

    return {
        "message": "Simulation reset successfully. Dashboards returned to clean standby state.",
        "status": "RESET_COMPLETE",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }



@router.get("/live-stream")
def get_live_stream_evaluated(
    limit: int = Query(20, ge=1, le=100),
    mongo: Database = Depends(get_mongo_db),
    user=Depends(require_role("admin", "security_analyst", "soc_engineer", "security_manager")),
):
    """
    Returns latest telemetry log stream with instant ML risk evaluations for live UI animations.
    """
    cursor = mongo["activity_logs"].find({}).sort("timestamp", -1).limit(limit)
    logs = list(cursor)

    result = []
    for doc in logs:
        doc["_id"] = str(doc["_id"])
        et = doc.get("event_type", "")
        details = doc.get("details", {})
        
        # Determine real-time stream threat level
        is_threat = False
        threat_label = "NORMAL"
        target_role = "security_analyst"

        if et == "usb_connect" and float(details.get("transferred_mb", 0)) > 500:
            is_threat = True
            threat_label = "CRITICAL USB EXFILTRATION"
            target_role = "soc_engineer"
        elif et == "privilege_change" and ("sudo" in str(details) or "root" in str(details)):
            is_threat = True
            threat_label = "CRITICAL ROOT PRIVILEGE ESCALATION"
            target_role = "admin"
        elif "failed" in str(details) or "denied" in str(details):
            is_threat = True
            threat_label = "ACCESS FAILURE DRIFT"
            target_role = "soc_engineer"

        result.append({
            "id": doc["_id"],
            "employee_id": doc.get("employee_id"),
            "event_type": et,
            "timestamp": doc.get("timestamp").isoformat() if hasattr(doc.get("timestamp"), "isoformat") else str(doc.get("timestamp")),
            "details": details,
            "is_threat": is_threat,
            "threat_label": threat_label,
            "target_role": target_role,
        })

    return result


@router.get("/baselines")
def get_all_baselines(
    employee_id: Optional[str] = None,
    indicator: Optional[str] = None,
    mongo: Database = Depends(get_mongo_db),
    user=Depends(require_role("admin", "security_analyst", "soc_engineer", "security_manager")),
):
    """
    Returns computed behavioral baselines stored in MongoDB.
    """
    query: Dict[str, Any] = {}
    if employee_id and employee_id.upper() != "ALL":
        query["employee_id"] = employee_id.strip()
    if indicator and indicator.upper() != "ALL":
        query["indicator"] = indicator.strip()

    baselines = list(mongo["behavioral_baselines"].find(query))
    for b in baselines:
        b["_id"] = str(b["_id"])

    return baselines


@router.get("/baselines/{employee_id}")
def get_employee_baselines(
    employee_id: str,
    mongo: Database = Depends(get_mongo_db),
    user=Depends(require_role("admin", "security_analyst", "soc_engineer", "security_manager")),
):
    """
    Returns all 6 indicator baselines for a specific employee.
    """
    baselines = list(mongo["behavioral_baselines"].find({"employee_id": employee_id}))
    if not baselines:
        calculate_all_baselines_for_employee(employee_id, mongo)
        baselines = list(mongo["behavioral_baselines"].find({"employee_id": employee_id}))

    for b in baselines:
        b["_id"] = str(b["_id"])

    return {
        "employee_id": employee_id,
        "indicators_count": len(baselines),
        "baselines": baselines,
    }


@router.post("/calculate-baselines")
def trigger_baseline_calculation(
    employee_id: Optional[str] = None,
    mongo: Database = Depends(get_mongo_db),
    user=Depends(require_role("admin", "soc_engineer", "security_analyst")),
):
    """
    Triggers recalculation of behavioral baselines from MongoDB activity logs.
    """
    if employee_id:
        res = calculate_all_baselines_for_employee(employee_id, mongo)
        return {"message": f"Calculated baselines for {employee_id}", "result": res}
    else:
        res = calculate_all_system_baselines(mongo)
        return {"message": f"Calculated baselines for {res['total_employees']} employees", "result": res}


@router.post("/check-anomaly")
def run_anomaly_check(
    req: AnomalyCheckRequest,
    mongo: Database = Depends(get_mongo_db),
    user=Depends(require_role("admin", "security_analyst", "soc_engineer", "security_manager")),
):
    """
    Interactive test endpoint for the UI sandbox / demo:
    Evaluates a specific test value or action against employee's baseline or rules.
    """
    emp_id = req.employee_id.strip()
    ind = req.indicator_type.strip().lower()

    if ind == "login_time":
        val = req.test_value if req.test_value is not None else 9.0
        return check_login_time_anomaly(emp_id, val, mongo)

    elif ind == "resource_access":
        val = req.test_value if req.test_value is not None else 50.0
        return check_access_anomaly(emp_id, val, mongo)

    elif ind == "data_transfer":
        val = req.test_value if req.test_value is not None else 500.0
        return check_data_exfiltration_anomaly(emp_id, val, mongo)

    elif ind == "data_download":
        val = req.test_value if req.test_value is not None else 250.0
        return check_data_download_anomaly(emp_id, val, mongo)

    elif ind == "privilege_abuse":
        cmd = req.test_text or "sudo /bin/bash"
        return check_privilege_abuse_anomaly(emp_id, cmd)

    elif ind == "suspicious_device":
        dev = req.test_text or "Unknown Kali Linux Terminal"
        return check_suspicious_device_anomaly(emp_id, dev, mongo)

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown indicator_type: {req.indicator_type}",
        )


@router.get("/stats")
def get_anomaly_stats(
    mongo: Database = Depends(get_mongo_db),
    user=Depends(require_role("admin", "security_analyst", "soc_engineer", "security_manager")),
):
    """
    Returns aggregated Milestone 2 analytics statistics for dashboards.
    """
    sim_logs_count = mongo["activity_logs"].count_documents({"is_simulation": True})

    if sim_logs_count == 0:
        return {
            "total_activity_logs": 0,
            "total_baselines_calculated": 0,
            "monitored_employees": 0,
            "baselined_employees": 0,
            "ml_flagged_threats": 0,
            "indicators_tracked": DEFAULT_FEATURE_NAMES,
            "ml_model_type": "Isolation Forest (15-Indicator Ensemble)",
            "contamination_rate": 0.15,
            "z_score_threshold": 2.5,
        }

    total_logs = mongo["activity_logs"].count_documents({})
    total_baselines = mongo["behavioral_baselines"].count_documents({})
    distinct_emps_logged = len(mongo["activity_logs"].distinct("employee_id"))
    distinct_emps_baselined = len(mongo["behavioral_baselines"].distinct("employee_id"))

    ml_report = get_enriched_anomaly_report(mongo=mongo)
    flagged_threats = ml_report.get("flagged_count", 0)

    return {
        "total_activity_logs": total_logs,
        "total_baselines_calculated": total_baselines,
        "monitored_employees": distinct_emps_logged,
        "baselined_employees": distinct_emps_baselined,
        "ml_flagged_threats": flagged_threats,
        "indicators_tracked": DEFAULT_FEATURE_NAMES,
        "ml_model_type": "Isolation Forest (15-Indicator Ensemble)",
        "contamination_rate": 0.15,
        "z_score_threshold": 2.5,
    }


@router.get("/trend")
def get_anomalies_trend(
    days: int = Query(7, ge=1, le=30),
    db: Session = Depends(get_db),
    mongo: Database = Depends(get_mongo_db),
    user=Depends(require_role("admin", "security_analyst", "soc_engineer", "security_manager")),
):
    """
    Aggregates real security anomaly and telemetry activity information by calendar day.
    Queries actual stored Alerts from PostgreSQL and Activity Logs from MongoDB.
    Returns daily breakdown of total anomalies, rule anomalies, ML anomalies, severity levels,
    and total activity logs.
    """
    today = datetime.now(timezone.utc).date()
    start_date = today - timedelta(days=days - 1)
    start_dt = datetime.combine(start_date, datetime.min.time()).replace(tzinfo=timezone.utc)
    end_dt = datetime.combine(today + timedelta(days=1), datetime.min.time()).replace(tzinfo=timezone.utc)

    # 1. Fetch real alerts within the date range from PostgreSQL
    alerts = (
        db.query(Alert)
        .filter(Alert.created_at >= start_dt, Alert.created_at < end_dt)
        .all()
    )

    # Group alerts by calendar date string (YYYY-MM-DD)
    alerts_by_date: Dict[str, List[Alert]] = {}
    for a in alerts:
        if a.created_at:
            dt = a.created_at
            d_str = dt.strftime("%Y-%m-%d") if hasattr(dt, "strftime") else str(dt)[:10]
            if d_str not in alerts_by_date:
                alerts_by_date[d_str] = []
            alerts_by_date[d_str].append(a)

    # 2. Fetch activity logs count by day from MongoDB using real aggregation
    log_counts_by_date: Dict[str, int] = {}
    try:
        pipeline = [
            {
                "$match": {
                    "timestamp": {"$gte": start_dt, "$lt": end_dt}
                }
            },
            {
                "$group": {
                    "_id": {
                        "$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}
                    },
                    "count": {"$sum": 1}
                }
            }
        ]
        agg_results = list(mongo["activity_logs"].aggregate(pipeline))
        for item in agg_results:
            d_key = item.get("_id")
            if d_key:
                log_counts_by_date[d_key] = item.get("count", 0)
    except Exception as e:
        print(f"[get_anomalies_trend] Mongo aggregation warning: {e}")

    # Build chronological daily trend for the requested number of days
    trend = []
    total_anomalies_sum = 0

    for offset in range(days - 1, -1, -1):
        target_d = today - timedelta(days=offset)
        d_str = target_d.strftime("%Y-%m-%d")
        day_label = target_d.strftime("%a")

        day_alerts = alerts_by_date.get(d_str, [])
        crit = sum(1 for a in day_alerts if (a.severity or "").upper() == "CRITICAL")
        high = sum(1 for a in day_alerts if (a.severity or "").upper() == "HIGH")
        med = sum(1 for a in day_alerts if (a.severity or "").upper() == "MEDIUM")
        low = sum(1 for a in day_alerts if (a.severity or "").upper() == "LOW")

        ml_count = sum(1 for a in day_alerts if "[ML" in (a.message or "") or (a.details and "ML" in a.details))
        rule_count = len(day_alerts) - ml_count
        day_total = len(day_alerts)
        total_anomalies_sum += day_total

        day_logs = log_counts_by_date.get(d_str, 0)

        trend.append({
            "date": d_str,
            "day": day_label,
            "total_anomalies": day_total,
            "rule_anomalies": rule_count,
            "ml_anomalies": ml_count,
            "critical": crit,
            "high": high,
            "medium": med,
            "low": low,
            "total_activity_logs": day_logs,
        })

    return {
        "days": days,
        "total_anomalies": total_anomalies_sum,
        "has_data": total_anomalies_sum > 0 or any(t["total_activity_logs"] > 0 for t in trend),
        "trend": trend,
    }
