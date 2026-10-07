from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, date
import numpy as np
import pandas as pd
from sqlalchemy.orm import Session

from app.database import get_mongo_db, SessionLocal
from app.models import Employee, Alert, Incident, RiskSnapshot
from app.ml_engine import (
    load_model_artifact,
    extract_features_from_activity_logs,
    DEFAULT_FEATURE_NAMES,
)

FACTOR_WEIGHTS = {
    "behavioral_anomalies": 0.35,
    "privilege_misuse": 0.25,
    "data_access_violations": 0.20,
    "access_pattern_deviations": 0.10,
    "historical_security_events": 0.10,
}


def score_to_risk_level(score: float) -> str:
    """Map numeric risk score (0-100) to standard 4-tier risk levels."""
    if score >= 75:
        return "Critical"
    elif score >= 50:
        return "High"
    elif score >= 25:
        return "Medium"
    else:
        return "Low"


def _compute_risk_score_factors(
    emp: Employee,
    features: Dict[str, Any],
    emp_alerts: List[Alert],
    emp_incidents: List[Incident],
    artifact: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Computes the standardized 5-factor weighted insider risk score for an employee
    given pre-fetched features, alerts, incidents, and cached model artifact.
    """
    # 1. Factor 1: Behavioral Anomalies (35%)
    behavioral_score = 0.0
    b_reasons = []

    try:
        art = artifact or load_model_artifact()
        model = art["model"]
        scaler = art.get("scaler")
        feature_names = art.get("feature_names") or DEFAULT_FEATURE_NAMES

        row_features = [float(features.get(f, 0.0)) for f in feature_names]
        df_X = pd.DataFrame([row_features], columns=feature_names)
        if scaler is not None:
            X = scaler.transform(df_X)
        else:
            X = df_X.values

        # Decision function: negative values indicate outliers
        dec_score = float(model.decision_function(X)[0])
        crit_flags = int(features.get("critical_flags", 0))
        sudo_attempts = int(features.get("sudo_attempts", 0))
        usb_mb = float(features.get("usb_total_mb", 0.0))
        off_hours = int(features.get("off_hours_logins", 0))
        has_threat = crit_flags > 0 or sudo_attempts > 0 or usb_mb > 1500.0 or off_hours > 0

        if has_threat:
            # Active threat indicators present
            base_threat_score = min(95.0, max(75.0, abs(min(0.0, dec_score)) * 250.0))
            behavioral_score = min(100.0, base_threat_score + (crit_flags * 15.0))
            if crit_flags > 0:
                b_reasons.append(f"{crit_flags} critical telemetry markers detected")
            if dec_score < 0:
                b_reasons.append(f"Statistical outlier flagged by Isolation Forest (score: {dec_score:.4f})")
        elif dec_score < -0.06:
            # Multi-dimensional deviation without explicit risk flags
            behavioral_score = min(20.0, abs(dec_score) * 100.0)
        else:
            behavioral_score = 0.0
    except Exception:
        behavioral_score = 0.0

    # 2. Factor 2: Privilege Misuse (20%)
    priv_score = 0.0
    p_reasons = []
    sudo_attempts = int(features.get("sudo_attempts", 0))
    denied_events = int(features.get("denied_events", 0))

    if sudo_attempts > 0:
        priv_score += min(90.0, max(60.0, sudo_attempts * 45.0))
        p_reasons.append(f"{sudo_attempts} unauthorized sudo/root privilege escalation attempts")

    if denied_events > 0:
        priv_score += min(25.0, denied_events * 5.0)
        p_reasons.append(f"{denied_events} access denial security events")

    priv_score = min(100.0, max(0.0, priv_score))

    # 3. Factor 3: Data Access Violations (25%)
    data_score = 0.0
    d_reasons = []
    usb_mb = float(features.get("usb_total_mb", 0.0))
    usb_events = int(features.get("usb_event_count", 0))
    max_transfer = float(features.get("max_single_transfer_mb", 0.0))

    if usb_mb > 1500.0 or (usb_mb > 500.0 and crit_flags > 0):
        data_score += min(100.0, 50.0 + (usb_mb / 100.0) * 8.0)
        d_reasons.append(f"Mass USB data transfer: {usb_mb:,.1f} MB across {usb_events} events")
    elif max_transfer > 500.0:
        data_score += min(100.0, max(60.0, (max_transfer / 500.0) * 45.0))
        d_reasons.append(f"High-volume single data transfer: {max_transfer:,.1f} MB")

    data_score = min(100.0, max(0.0, data_score))

    # 4. Factor 4: Access Pattern Deviations (15%)
    access_score = 0.0
    a_reasons = []
    off_hours = int(features.get("off_hours_logins", 0))
    avg_login = float(features.get("avg_login_hour", 9.0))
    unique_devices = int(features.get("unique_devices", 1))

    if off_hours > 0 or avg_login < 6.0 or avg_login > 21.0:
        access_score += min(85.0, max(50.0, off_hours * 25.0))
        a_reasons.append(f"Off-hours login anomalies: {off_hours} events outside normal working envelope")

    if unique_devices > 2:
        access_score += min(30.0, (unique_devices - 2) * 15.0)
        a_reasons.append(f"Multiple endpoint devices detected ({unique_devices} distinct devices)")

    access_score = min(100.0, max(0.0, access_score))

    # 5. Factor 5: Historical Security Events (15%)
    hist_score = 0.0
    h_reasons = []

    crit_alerts = sum(
        1 for a in emp_alerts
        if (a.severity or "").upper() == "CRITICAL" and (a.status or "").upper() != "RESOLVED"
    )
    high_alerts = sum(
        1 for a in emp_alerts
        if (a.severity or "").upper() == "HIGH" and (a.status or "").upper() != "RESOLVED"
    )
    open_incidents = sum(
        1 for i in emp_incidents
        if (i.status or "").upper() in ["OPEN", "INVESTIGATING"]
    )

    if crit_alerts > 0:
        hist_score += min(80.0, crit_alerts * 40.0)
        h_reasons.append(f"{crit_alerts} active Critical security alerts")
    if high_alerts > 0:
        hist_score += min(50.0, high_alerts * 25.0)
        h_reasons.append(f"{high_alerts} active High security alerts")
    if open_incidents > 0:
        hist_score += min(50.0, open_incidents * 25.0)
        h_reasons.append(f"{open_incidents} active formal security investigations")

    if not h_reasons and len(emp_alerts) == 0:
        hist_score = 0.0

    hist_score = min(100.0, max(0.0, hist_score))

    # 6. Compute Weighted Overall Score
    overall = (
        (behavioral_score * FACTOR_WEIGHTS["behavioral_anomalies"])
        + (priv_score * FACTOR_WEIGHTS["privilege_misuse"])
        + (data_score * FACTOR_WEIGHTS["data_access_violations"])
        + (access_score * FACTOR_WEIGHTS["access_pattern_deviations"])
        + (hist_score * FACTOR_WEIGHTS["historical_security_events"])
    )

    overall_score = int(round(min(100.0, max(0.0, overall))))
    risk_level = score_to_risk_level(overall_score)

    weighted_contributions = {
        "behavioral_anomalies": round(behavioral_score * FACTOR_WEIGHTS["behavioral_anomalies"], 1),
        "privilege_misuse": round(priv_score * FACTOR_WEIGHTS["privilege_misuse"], 1),
        "data_access_violations": round(data_score * FACTOR_WEIGHTS["data_access_violations"], 1),
        "access_pattern_deviations": round(access_score * FACTOR_WEIGHTS["access_pattern_deviations"], 1),
        "historical_security_events": round(hist_score * FACTOR_WEIGHTS["historical_security_events"], 1),
    }

    contributing_factors = [
        {
            "factor": "Behavioral Anomalies",
            "key": "behavioral_anomalies",
            "weight_pct": 35,
            "score": round(behavioral_score, 1),
            "contribution": weighted_contributions["behavioral_anomalies"],
            "reasons": b_reasons or ["Baseline activity tracking within standard envelope"],
        },
        {
            "factor": "Privilege Misuse",
            "key": "privilege_misuse",
            "weight_pct": 25,
            "score": round(priv_score, 1),
            "contribution": weighted_contributions["privilege_misuse"],
            "reasons": p_reasons or ["Authorized privilege execution bounds maintained"],
        },
        {
            "factor": "Data Access Violations",
            "key": "data_access_violations",
            "weight_pct": 20,
            "score": round(data_score, 1),
            "contribution": weighted_contributions["data_access_violations"],
            "reasons": d_reasons or ["Standard file access and transmission volumes"],
        },
        {
            "factor": "Access Pattern Deviations",
            "key": "access_pattern_deviations",
            "weight_pct": 10,
            "score": round(access_score, 1),
            "contribution": weighted_contributions["access_pattern_deviations"],
            "reasons": a_reasons or ["Regular business-hours logins from authorized hardware"],
        },
        {
            "factor": "Historical Security Events",
            "key": "historical_security_events",
            "weight_pct": 10,
            "score": round(hist_score, 1),
            "contribution": weighted_contributions["historical_security_events"],
            "reasons": h_reasons or ["Clean historical security record with no active alerts"],
        },
    ]

    all_reasons = b_reasons + p_reasons + d_reasons + a_reasons + h_reasons
    if not all_reasons:
        all_reasons = ["Employee digital telemetry complies with baseline organizational patterns."]

    return {
        "employee_id": emp.id if emp else None,
        "employee_code": emp.employee_id if emp else "",
        "employee_name": emp.name if emp else "",
        "department": emp.department if emp else "Unknown",
        "designation": emp.designation if emp else "Unknown",
        "overall_score": overall_score,
        "risk_level": risk_level,
        "factors": {
            "behavioral_anomalies_score": round(behavioral_score, 1),
            "privilege_misuse_score": round(priv_score, 1),
            "data_access_violations_score": round(data_score, 1),
            "access_pattern_deviations_score": round(access_score, 1),
            "historical_security_events_score": round(hist_score, 1),
        },
        "behavioral_anomalies_score": round(behavioral_score, 1),
        "privilege_misuse_score": round(priv_score, 1),
        "data_access_violations_score": round(data_score, 1),
        "access_pattern_deviations_score": round(access_score, 1),
        "historical_security_events_score": round(hist_score, 1),
        "factor_weights": FACTOR_WEIGHTS,
        "weighted_contributions": weighted_contributions,
        "contributing_factors": contributing_factors,
        "reasons": contributing_factors,
        "all_reasons": all_reasons,
        "calculated_at": datetime.now(timezone.utc).isoformat(),
    }


def calculate_employee_risk_score(
    employee_id: str,
    db: Optional[Session] = None,
    mongo=None,
) -> Dict[str, Any]:
    """
    Computes the standardized 5-factor weighted insider risk score for an employee.

    Formula:
        Overall Score = (Behavioral Anomalies * 0.35)
                      + (Privilege Misuse * 0.25)
                      + (Data Access Violations * 0.20)
                      + (Access Pattern Deviations * 0.10)
                      + (Historical Security Events * 0.10)

    Risk Levels:
        0–24   = Low
        25–49  = Medium
        50–74  = High
        75–100 = Critical
    """
    session = db if db is not None else SessionLocal()
    mongo_db = mongo if mongo is not None else get_mongo_db()

    try:
        emp = None
        # Try finding employee by numeric id
        try:
            numeric_id = int(employee_id)
            emp = session.query(Employee).filter(Employee.id == numeric_id).first()
        except (ValueError, TypeError):
            pass

        # Try finding employee by employee_id string
        if not emp:
            emp = session.query(Employee).filter(Employee.employee_id == str(employee_id)).first()

        if not emp:
            return {
                "employee_id": employee_id,
                "employee_name": f"Employee #{employee_id}",
                "department": "Unknown",
                "designation": "Unknown",
                "overall_score": 0,
                "risk_level": "Low",
                "factors": {
                    "behavioral_anomalies_score": 0.0,
                    "privilege_misuse_score": 0.0,
                    "data_access_violations_score": 0.0,
                    "access_pattern_deviations_score": 0.0,
                    "historical_security_events_score": 0.0,
                },
                "behavioral_anomalies_score": 0.0,
                "privilege_misuse_score": 0.0,
                "data_access_violations_score": 0.0,
                "access_pattern_deviations_score": 0.0,
                "historical_security_events_score": 0.0,
                "factor_weights": FACTOR_WEIGHTS,
                "weighted_contributions": {k: 0.0 for k in FACTOR_WEIGHTS},
                "contributing_factors": [],
                "reasons": [{"factor": "Baseline", "reasons": ["No employee record found"]}],
                "calculated_at": datetime.now(timezone.utc).isoformat(),
            }

        # 1. Fetch employee's activity logs from MongoDB
        query_ids = [employee_id, emp.id, emp.employee_id, str(emp.id)]
        logs = list(mongo_db["activity_logs"].find({"employee_id": {"$in": query_ids}}))

        # Extract features
        if logs:
            df_feat = extract_features_from_activity_logs(logs)
            features = df_feat.to_dict(orient="records")[0] if not df_feat.empty else {}
        else:
            features = {}

        # 2. Fetch employee alerts & incidents from PostgreSQL
        emp_alerts = session.query(Alert).filter(Alert.employee_id == emp.id).all()
        emp_incidents = session.query(Incident).filter(Incident.employee_id == emp.id).all()

        artifact = load_model_artifact()
        return _compute_risk_score_factors(emp, features, emp_alerts, emp_incidents, artifact)
    finally:
        if db is None:
            session.close()


def calculate_risk_score(
    employee_id: str,
    db: Optional[Session] = None,
    mongo=None,
) -> Dict[str, Any]:
    """
    Compatibility wrapper delegating to calculate_employee_risk_score.
    Calculates the 5-factor insider threat risk score for an employee.
    """
    return calculate_employee_risk_score(employee_id, db=db, mongo=mongo)


def calculate_all_employee_risk_scores(
    db: Optional[Session] = None,
    mongo=None,
) -> List[Dict[str, Any]]:
    """
    Calculates risk scores for all monitored employees in PostgreSQL using optimized batch queries.
    Fetches all employees, alerts, incidents, and activity logs in batched queries.
    """
    session = db if db is not None else SessionLocal()
    mongo_db = mongo if mongo is not None else get_mongo_db()

    try:
        employees = session.query(Employee).all()
        if not employees:
            return []

        emp_ids = [e.id for e in employees]

        # 1. Batched PostgreSQL query for all alerts
        all_alerts = session.query(Alert).filter(Alert.employee_id.in_(emp_ids)).all()
        alerts_by_emp: Dict[int, List[Alert]] = {e.id: [] for e in employees}
        for a in all_alerts:
            alerts_by_emp.setdefault(a.employee_id, []).append(a)

        # 2. Batched PostgreSQL query for all incidents
        all_incidents = session.query(Incident).filter(Incident.employee_id.in_(emp_ids)).all()
        incidents_by_emp: Dict[int, List[Incident]] = {e.id: [] for e in employees}
        for inc in all_incidents:
            incidents_by_emp.setdefault(inc.employee_id, []).append(inc)

        # 3. Batched MongoDB query for all activity logs
        all_logs = list(mongo_db["activity_logs"].find({}))

        # Map log entries to employee IDs
        variant_to_id: Dict[Any, int] = {}
        for e in employees:
            variant_to_id[e.employee_id] = e.id
            variant_to_id[str(e.employee_id)] = e.id
            variant_to_id[e.id] = e.id
            variant_to_id[str(e.id)] = e.id

        emp_logs_map: Dict[int, List[Dict[str, Any]]] = {e.id: [] for e in employees}
        canonical_logs: List[Dict[str, Any]] = []
        for doc in all_logs:
            raw_eid = doc.get("employee_id")
            matched_eid = variant_to_id.get(raw_eid)
            if matched_eid is not None:
                emp_logs_map[matched_eid].append(doc)
                doc_copy = dict(doc)
                doc_copy["employee_id"] = str(matched_eid)
                canonical_logs.append(doc_copy)

        # 4. Batch feature extraction
        emp_features_map: Dict[int, Dict[str, Any]] = {}
        if canonical_logs:
            df_features = extract_features_from_activity_logs(canonical_logs)
            if not df_features.empty:
                for row in df_features.to_dict(orient="records"):
                    try:
                        eid_int = int(row["employee_id"])
                        emp_features_map[eid_int] = row
                    except (ValueError, TypeError):
                        pass

        # 5. Load model artifact once from in-memory cache
        artifact = load_model_artifact()

        # 6. Evaluate all employees
        results = []
        for emp in employees:
            features = emp_features_map.get(emp.id, {})
            score_data = _compute_risk_score_factors(
                emp=emp,
                features=features,
                emp_alerts=alerts_by_emp.get(emp.id, []),
                emp_incidents=incidents_by_emp.get(emp.id, []),
                artifact=artifact,
            )
            results.append(score_data)

        results.sort(key=lambda r: r["overall_score"], reverse=True)
        return results
    finally:
        if db is None:
            session.close()


def record_daily_risk_snapshot(
    employee_id: Any,
    snapshot_date: Optional[date] = None,
    db: Optional[Session] = None,
    mongo=None,
) -> Optional[RiskSnapshot]:
    """
    Computes employee's current 5-factor risk score using existing calculate_employee_risk_score
    and persists / updates the daily snapshot for the specified date (defaulting to today UTC).
    Avoids duplicate daily records by updating or reusing existing record for (employee_id, snapshot_date).
    """
    session = db if db is not None else SessionLocal()
    mongo_db = mongo if mongo is not None else get_mongo_db()

    target_date = snapshot_date if snapshot_date is not None else datetime.now(timezone.utc).date()

    try:
        # Find employee by integer id or string employee_id
        emp = None
        try:
            numeric_id = int(employee_id)
            emp = session.query(Employee).filter(Employee.id == numeric_id).first()
        except (ValueError, TypeError):
            pass

        if not emp:
            emp = session.query(Employee).filter(Employee.employee_id == str(employee_id)).first()

        if not emp:
            return None

        # 1. Calculates the employee's current 5-factor risk score
        score_data = calculate_employee_risk_score(emp.employee_id, db=session, mongo=mongo_db)

        # 2. Check for existing snapshot on the given date (employee_id, snapshot_date)
        existing = session.query(RiskSnapshot).filter(
            RiskSnapshot.employee_id == emp.id,
            RiskSnapshot.snapshot_date == target_date,
        ).first()

        factors = score_data.get("factors", {})
        f_b = float(factors.get("behavioral_anomalies_score", 0.0))
        f_p = float(factors.get("privilege_misuse_score", 0.0))
        f_d = float(factors.get("data_access_violations_score", 0.0))
        f_a = float(factors.get("access_pattern_deviations_score", 0.0))
        f_h = float(factors.get("historical_security_events_score", 0.0))
        overall_score = int(score_data.get("overall_score", 0))
        risk_level = str(score_data.get("risk_level", "Low"))

        if existing:
            # Update existing snapshot avoiding duplicate daily records
            existing.risk_score = overall_score
            existing.risk_level = risk_level
            existing.behavioral_anomalies_score = f_b
            existing.privilege_misuse_score = f_p
            existing.data_access_violations_score = f_d
            existing.access_pattern_deviations_score = f_a
            existing.historical_security_events_score = f_h
            existing.calculated_at = datetime.now(timezone.utc)
            snapshot = existing
        else:
            snapshot = RiskSnapshot(
                employee_id=emp.id,
                snapshot_date=target_date,
                risk_score=overall_score,
                risk_level=risk_level,
                behavioral_anomalies_score=f_b,
                privilege_misuse_score=f_p,
                data_access_violations_score=f_d,
                access_pattern_deviations_score=f_a,
                historical_security_events_score=f_h,
            )
            session.add(snapshot)

        session.commit()
        session.refresh(snapshot)
        return snapshot
    except Exception as e:
        session.rollback()
        print(f"[record_daily_risk_snapshot] Error: {e}")
        raise
    finally:
        if db is None:
            session.close()


def record_all_daily_risk_snapshots(
    snapshot_date: Optional[date] = None,
    db: Optional[Session] = None,
    mongo=None,
) -> List[RiskSnapshot]:
    """
    Generates and persists daily risk snapshots for all monitored employees in batch.
    Uses calculate_all_employee_risk_scores for high-performance batch processing.
    """
    session = db if db is not None else SessionLocal()
    mongo_db = mongo if mongo is not None else get_mongo_db()
    target_date = snapshot_date if snapshot_date is not None else datetime.now(timezone.utc).date()

    try:
        # Calculate all risk scores in a single batched operation
        all_scores = calculate_all_employee_risk_scores(db=session, mongo=mongo_db)
        if not all_scores:
            return []

        emp_ids = [s["employee_id"] for s in all_scores if s.get("employee_id") is not None]

        # Fetch existing snapshots for the target date in one batched query
        existing_snaps = session.query(RiskSnapshot).filter(
            RiskSnapshot.employee_id.in_(emp_ids),
            RiskSnapshot.snapshot_date == target_date,
        ).all()
        existing_map = {s.employee_id: s for s in existing_snaps}

        snapshots = []
        for score_data in all_scores:
            emp_id = score_data.get("employee_id")
            if emp_id is None:
                continue

            factors = score_data.get("factors", {})
            f_b = float(factors.get("behavioral_anomalies_score", 0.0))
            f_p = float(factors.get("privilege_misuse_score", 0.0))
            f_d = float(factors.get("data_access_violations_score", 0.0))
            f_a = float(factors.get("access_pattern_deviations_score", 0.0))
            f_h = float(factors.get("historical_security_events_score", 0.0))
            overall_score = int(score_data.get("overall_score", 0))
            risk_level = str(score_data.get("risk_level", "Low"))

            existing = existing_map.get(emp_id)
            if existing:
                existing.risk_score = overall_score
                existing.risk_level = risk_level
                existing.behavioral_anomalies_score = f_b
                existing.privilege_misuse_score = f_p
                existing.data_access_violations_score = f_d
                existing.access_pattern_deviations_score = f_a
                existing.historical_security_events_score = f_h
                existing.calculated_at = datetime.now(timezone.utc)
                snapshots.append(existing)
            else:
                snap = RiskSnapshot(
                    employee_id=emp_id,
                    snapshot_date=target_date,
                    risk_score=overall_score,
                    risk_level=risk_level,
                    behavioral_anomalies_score=f_b,
                    privilege_misuse_score=f_p,
                    data_access_violations_score=f_d,
                    access_pattern_deviations_score=f_a,
                    historical_security_events_score=f_h,
                )
                session.add(snap)
                snapshots.append(snap)

        session.commit()
        for snap in snapshots:
            session.refresh(snap)
        return snapshots
    except Exception as e:
        session.rollback()
        print(f"[record_all_daily_risk_snapshots] Error: {e}")
        raise
    finally:
        if db is None:
            session.close()
