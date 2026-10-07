from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
import numpy as np
import pandas as pd
from sqlalchemy.orm import Session

from app.database import get_mongo_db, SessionLocal
from app.models import Employee, Alert, Incident, RiskSnapshot
from app.risk_scoring import (
    calculate_employee_risk_score,
    calculate_all_employee_risk_scores,
    score_to_risk_level,
)
from app.behavioral_profiling import calculate_all_baselines_for_employee
from app.anomaly_detection import evaluate_event_anomalies
from app.ml_engine import load_model_artifact, run_model, extract_features_from_activity_logs


def get_peer_comparison(
    employee_id: str,
    db: Optional[Session] = None,
    mongo=None,
) -> Dict[str, Any]:
    """
    Computes department peer group comparison for an employee:
    - Finds other employees in the same department
    - Calculates peer count and department average risk score
    - Calculates deviation (employee_score - department_average)
    - Gracefully handles the zero-peer case.
    """
    session = db if db is not None else SessionLocal()
    mongo_db = mongo if mongo is not None else get_mongo_db()

    try:
        emp = session.query(Employee).filter(Employee.employee_id == employee_id).first()
        if not emp:
            return {
                "employee_id": employee_id,
                "department": "Unknown",
                "employee_risk_score": 0,
                "peer_count": 0,
                "department_average": 0.0,
                "deviation": 0.0,
                "is_above_peer_average": False,
                "peer_employees": [],
            }

        dept = emp.department
        all_scores = calculate_all_employee_risk_scores(db=session, mongo=mongo_db)

        target_record = next((r for r in all_scores if r["employee_id"] == employee_id), None)
        emp_score = target_record["overall_score"] if target_record else 0

        # Peers in same department excluding target employee
        peers = [r for r in all_scores if r["department"] == dept and r["employee_id"] != employee_id]
        peer_count = len(peers)

        if peer_count > 0:
            dept_avg = round(float(np.mean([p["overall_score"] for p in peers])), 1)
            deviation = round(emp_score - dept_avg, 1)
            is_above = deviation > 0
        else:
            # Zero-peer edge case
            dept_avg = float(emp_score)
            deviation = 0.0
            is_above = False

        peer_summary = [
            {
                "employee_id": p["employee_id"],
                "name": p["employee_name"],
                "designation": p["designation"],
                "risk_score": p["overall_score"],
                "risk_level": p["risk_level"],
            }
            for p in peers[:5]
        ]

        return {
            "employee_id": employee_id,
            "employee_name": emp.name,
            "department": dept,
            "employee_risk_score": emp_score,
            "peer_count": peer_count,
            "department_average": dept_avg,
            "department_avg_score": dept_avg,
            "deviation": deviation,
            "is_above_peer_average": is_above,
            "peer_summary": peer_summary,
        }
    finally:
        if db is None:
            session.close()


def get_14_day_risk_trend(
    employee_id: str,
    db: Optional[Session] = None,
    mongo=None,
) -> Dict[str, Any]:
    """
    Queries actual persisted risk snapshots for an employee (up to latest 14 available daily snapshots).
    DOES NOT generate synthetic historical values.
    Calculates trend direction (Increasing, Decreasing, Stable) from actual stored chronological snapshots.
    If fewer than 14 real snapshots exist, returns only the available snapshots and indicates available count.
    """
    session = db if db is not None else SessionLocal()
    mongo_db = mongo if mongo is not None else get_mongo_db()

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
            return {
                "employee_id": employee_id,
                "employee_code": str(employee_id),
                "employee_name": "Unknown",
                "current_score": 0,
                "trend_direction": "Stable",
                "direction": "Stable",
                "snapshots_count": 0,
                "trend": [],
                "daily_scores": [],
                "has_historical_data": False,
                "message": "Employee not found",
            }

        base_risk = calculate_employee_risk_score(emp.employee_id, db=session, mongo=mongo_db)
        curr_score = base_risk["overall_score"]

        # Query actual persisted risk snapshots from PostgreSQL
        raw_snapshots = (
            session.query(RiskSnapshot)
            .filter(RiskSnapshot.employee_id == emp.id)
            .order_by(RiskSnapshot.snapshot_date.desc())
            .limit(14)
            .all()
        )

        # Sort chronologically (oldest to newest)
        raw_snapshots.reverse()

        daily_snapshots = []
        for s in raw_snapshots:
            d_date = s.snapshot_date
            d_str = d_date.strftime("%Y-%m-%d") if hasattr(d_date, "strftime") else str(d_date)
            day_label = d_date.strftime("%b %d") if hasattr(d_date, "strftime") else d_str
            daily_snapshots.append({
                "date": d_str,
                "day_label": day_label,
                "risk_score": int(s.risk_score),
                "risk_level": s.risk_level,
                "factors": {
                    "behavioral_anomalies_score": s.behavioral_anomalies_score,
                    "privilege_misuse_score": s.privilege_misuse_score,
                    "data_access_violations_score": s.data_access_violations_score,
                    "access_pattern_deviations_score": s.access_pattern_deviations_score,
                    "historical_security_events_score": s.historical_security_events_score,
                },
                "behavioral_anomalies_score": s.behavioral_anomalies_score,
                "privilege_misuse_score": s.privilege_misuse_score,
                "data_access_violations_score": s.data_access_violations_score,
                "access_pattern_deviations_score": s.access_pattern_deviations_score,
                "historical_security_events_score": s.historical_security_events_score,
            })

        # Calculate dynamic trend direction strictly from actual chronological stored snapshots
        if len(daily_snapshots) < 2:
            trend_direction = "Stable"
        elif len(daily_snapshots) >= 4:
            mid = len(daily_snapshots) // 2
            first_half_avg = float(np.mean([s["risk_score"] for s in daily_snapshots[:mid]]))
            second_half_avg = float(np.mean([s["risk_score"] for s in daily_snapshots[mid:]]))
            delta = second_half_avg - first_half_avg
            if delta > 3.0:
                trend_direction = "Increasing"
            elif delta < -3.0:
                trend_direction = "Decreasing"
            else:
                trend_direction = "Stable"
        else:
            delta = daily_snapshots[-1]["risk_score"] - daily_snapshots[0]["risk_score"]
            if delta > 3.0:
                trend_direction = "Increasing"
            elif delta < -3.0:
                trend_direction = "Decreasing"
            else:
                trend_direction = "Stable"

        return {
            "employee_id": emp.employee_id,
            "employee_code": emp.employee_id,
            "employee_name": emp.name,
            "current_score": curr_score,
            "trend_direction": trend_direction,
            "direction": trend_direction,
            "snapshots_count": len(daily_snapshots),
            "trend": daily_snapshots,
            "daily_scores": daily_snapshots,
            "has_historical_data": len(daily_snapshots) > 0,
            "message": None if len(daily_snapshots) > 0 else "Insufficient historical risk data",
        }
    finally:
        if db is None:
            session.close()


def get_combined_ueba_profile(
    employee_id: str,
    db: Optional[Session] = None,
    mongo=None,
) -> Dict[str, Any]:
    """
    Assembles the complete UEBA profile for an employee:
    - 5-factor risk scoring
    - 6-indicator behavioral baselines
    - Rule-based anomalies
    - ML / Isolation Forest decision predictions
    - Peer comparison
    - 14-day risk trend & direction
    - Linked alerts & incidents
    """
    session = db if db is not None else SessionLocal()
    mongo_db = mongo if mongo is not None else get_mongo_db()

    try:
        emp = session.query(Employee).filter(Employee.employee_id == employee_id).first()
        if not emp:
            return {"error": f"Employee {employee_id} not found"}

        # 1. 5-Factor Risk Score
        risk_data = calculate_employee_risk_score(employee_id, db=session, mongo=mongo_db)

        # 2. Peer comparison
        peer_data = get_peer_comparison(employee_id, db=session, mongo=mongo_db)

        # 3. 14-Day Trend
        trend_data = get_14_day_risk_trend(employee_id, db=session, mongo=mongo_db)

        # 4. Behavioral Baselines (6 indicators)
        baselines_obj = calculate_all_baselines_for_employee(employee_id, mongo_db)
        baselines_list = []
        indicators_meta = [
            ("avg_login_hour", "Login Times", "Typical decimal login hour"),
            ("resource_access_freq", "Resource Access Frequency", "Average daily resource and system accesses"),
            ("device_usage", "Device Usage", "Primary endpoint consistency ratio"),
            ("app_usage_freq", "Application Usage", "Daily workflow and app executions frequency"),
            ("avg_data_transfer_mb", "Data Transfer Volume", "Typical data transfer volume per event (MB)"),
            ("communication_patterns", "Communication Patterns", "Daily email and communication frequency"),
        ]

        for ind_key, ind_title, ind_desc in indicators_meta:
            b_val = baselines_obj.get("baselines", {}).get(ind_key)
            if b_val:
                typ = b_val.get("typical_value", 0.0)
                std = b_val.get("std_deviation", 0.5)
                baselines_list.append({
                    "indicator": ind_key,
                    "title": ind_title,
                    "description": ind_desc,
                    "typical_value": typ,
                    "std_deviation": std,
                    "spread_range": f"{max(0, typ - (2 * std)):.1f} – {typ + (2 * std):.1f}",
                    "sample_size": b_val.get("sample_size", 0),
                    "status": "Baselined",
                    "metadata": b_val.get("metadata", {}),
                })
            else:
                baselines_list.append({
                    "indicator": ind_key,
                    "title": ind_title,
                    "description": ind_desc,
                    "typical_value": None,
                    "std_deviation": None,
                    "spread_range": "Establishing...",
                    "sample_size": 0,
                    "status": "Insufficient Telemetry",
                    "metadata": {},
                })

        # 5. Rule-Based Anomalies
        logs = list(mongo_db["activity_logs"].find({"employee_id": employee_id}).sort("timestamp", -1).limit(50))
        rule_anomalies = []
        for log in logs:
            flags = evaluate_event_anomalies(log, db=session, mongo=mongo_db)
            for f in flags:
                f["timestamp"] = log.get("timestamp").isoformat() if hasattr(log.get("timestamp"), "isoformat") else str(log.get("timestamp"))
                rule_anomalies.append(f)

        # 6. ML / Isolation Forest Results
        ml_anomalies = []
        try:
            artifact = load_model_artifact()
            df_feat = extract_features_from_activity_logs(logs) if logs else pd.DataFrame()
            if not df_feat.empty:
                ml_res = run_model(df_feat, artifact).to_dict(orient="records")[0]
                if ml_res.get("is_outlier") or ml_res.get("anomaly_score", 0) < 0:
                    ml_anomalies.append({
                        "anomaly_score": ml_res.get("anomaly_score"),
                        "is_outlier": ml_res.get("is_outlier"),
                        "risk_tier": ml_res.get("risk_tier"),
                        "primary_reason": ml_res.get("primary_reason"),
                        "details": ml_res.get("details"),
                        "recommended_action": ml_res.get("recommended_action"),
                    })
        except Exception:
            pass

        # 7. Alerts
        emp_alerts = session.query(Alert).filter(Alert.employee_id == emp.id).order_by(Alert.id.desc()).all()
        formatted_alerts = [
            {
                "id": a.id,
                "severity": a.severity,
                "message": a.message,
                "status": a.status,
                "incident_id": a.incident_id,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in emp_alerts
        ]

        # 8. Incidents
        emp_incidents = session.query(Incident).filter(Incident.employee_id == emp.id).order_by(Incident.id.desc()).all()
        formatted_incidents = [
            {
                "id": inc.id,
                "severity": inc.severity,
                "status": inc.status,
                "summary": inc.summary or f"Security Investigation for {emp.name}",
                "created_at": inc.created_at.isoformat() if inc.created_at else None,
                "resolved_at": inc.resolved_at.isoformat() if inc.resolved_at else None,
                "notes_count": len(inc.notes) if inc.notes else 0,
            }
            for inc in emp_incidents
        ]

        return {
            "employee_id": emp.employee_id,
            "employee_name": emp.name,
            "department": emp.department,
            "designation": emp.designation,
            "device_info": emp.device_info,
            "access_privileges": emp.access_privileges,
            "risk_score": risk_data["overall_score"],
            "risk_level": risk_data["risk_level"],
            "risk_breakdown": risk_data,
            "peer_comparison": peer_data,
            "trend_14_days": trend_data["trend"],
            "trend_direction": trend_data["trend_direction"],
            "baselines": baselines_list,
            "rule_anomalies": rule_anomalies[:10],
            "ml_anomalies": ml_anomalies,
            "alerts": formatted_alerts,
            "incidents": formatted_incidents,
            "recent_activity": [
                {
                    "id": str(l["_id"]),
                    "event_type": l.get("event_type"),
                    "timestamp": l.get("timestamp").isoformat() if hasattr(l.get("timestamp"), "isoformat") else str(l.get("timestamp")),
                    "details": l.get("details", {}),
                }
                for l in logs[:15]
            ],
        }
    finally:
        if db is None:
            session.close()
