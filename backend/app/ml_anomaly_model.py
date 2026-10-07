import time
from typing import Dict, Any, List, Optional
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from app.database import get_mongo_db, SessionLocal
from app.ml_engine import (
    load_model_artifact,
    save_model_artifact,
    run_model,
    extract_features_from_activity_logs,
    analyze_threat_drivers,
    DEFAULT_FEATURE_NAMES,
)
from app.models import Employee

# In-memory model cache
_MODEL_CACHE = {
    "last_trained": 0,
    "cache_ttl_seconds": 30,  # 30 seconds cache for responsive real-time updates
    "results_df": None,
    "artifact": None,
}


def build_feature_table(mongo=None) -> pd.DataFrame:
    """
    Build 15-feature matrix per employee from MongoDB activity_logs collection.
    Falls back to behavioral_baselines if activity_logs is empty.
    """
    db = mongo if mongo is not None else get_mongo_db()
    logs = list(db["activity_logs"].find({}))

    if logs:
        return extract_features_from_activity_logs(logs)

    # Fallback to behavioral_baselines collection
    baselines = list(db["behavioral_baselines"].find())
    rows = {}
    for b in baselines:
        emp = b.get("employee_id")
        if not emp:
            continue
        rows.setdefault(emp, {"employee_id": emp})
        indicator = b.get("indicator")
        if indicator:
            rows[emp][indicator] = float(b.get("typical_value", 0))
            if "std_deviation" in b:
                rows[emp][f"{indicator}_std"] = float(b.get("std_deviation", 0))

    if not rows:
        return pd.DataFrame(columns=["employee_id"] + DEFAULT_FEATURE_NAMES)

    df = pd.DataFrame(list(rows.values())).fillna(0)
    for col in DEFAULT_FEATURE_NAMES:
        if col not in df.columns:
            df[col] = 0.0
    return df


def train_anomaly_model(force_retrain: bool = False, mongo=None) -> pd.DataFrame:
    """
    Evaluates / retrains Isolation Forest on 15 behavioral telemetry features.
    Returns DataFrame with employee_id, anomaly_score, is_outlier, threat_rank, risk_tier, target_role.
    Reuses in-memory model artifact for inference when force_retrain=False.
    """
    df = build_feature_table(mongo)

    if df.empty or len(df) == 0:
        return pd.DataFrame(
            columns=["employee_id", "anomaly_score", "is_outlier", "threat_rank", "risk_tier", "target_role"]
        )

    if force_retrain:
        # Fit new Isolation Forest & Scaler on features
        feature_cols = [c for c in DEFAULT_FEATURE_NAMES if c in df.columns]
        X = df[feature_cols].copy()
        for col in feature_cols:
            X[col] = pd.to_numeric(X[col], errors="coerce").fillna(0)

        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        contamination = min(0.2, max(0.05, 2.0 / max(len(df), 1)))
        model = IsolationForest(
            n_estimators=200,
            contamination=contamination,
            random_state=42,
        )
        model.fit(X_scaled)

        save_model_artifact(
            model=model,
            feature_names=feature_cols,
            scaler=scaler,
            validation_metrics={
                "employee_count": len(df),
                "contamination": contamination,
                "n_estimators": 200,
            },
        )

        artifact = {
            "model": model,
            "scaler": scaler,
            "feature_names": feature_cols,
            "model_type": "IsolationForest",
        }
    else:
        try:
            artifact = load_model_artifact()
        except FileNotFoundError:
            return train_anomaly_model(force_retrain=True, mongo=mongo)

    return run_model(df, artifact)


def get_enriched_anomaly_report(mongo=None, force_retrain: bool = False) -> Dict[str, Any]:
    """
    Generates full enriched report joining ML Isolation Forest predictions
    with PostgreSQL employee directory and MongoDB behavioral telemetry.
    """
    results_df = train_anomaly_model(force_retrain=force_retrain, mongo=mongo)

    if results_df.empty:
        return {
            "total_employees_analyzed": 0,
            "flagged_count": 0,
            "flagged_employees": [],
            "all_analyzed": [],
            "model_info": {},
        }

    # Query employee directory from PostgreSQL
    session = SessionLocal()
    emp_map = {}
    try:
        employees = session.query(Employee).all()
        for e in employees:
            emp_map[e.employee_id] = {
                "id": e.id,
                "name": e.name,
                "department": e.department,
                "designation": e.designation,
                "access_privileges": e.access_privileges,
                "device_info": e.device_info,
            }
    finally:
        session.close()

    enriched_records = []
    for record in results_df.to_dict(orient="records"):
        emp_id = record.get("employee_id")
        emp_info = emp_map.get(emp_id, {})
        record["db_id"] = emp_info.get("id")
        record["name"] = emp_info.get("name", emp_id)
        record["department"] = emp_info.get("department", "Unknown")
        record["designation"] = emp_info.get("designation", "Staff")
        record["device_info"] = emp_info.get("device_info", "Authorized Workstation")
        record["access_privileges"] = emp_info.get("access_privileges", "")
        record["risk_level"] = record.get("risk_tier", "Normal")
        enriched_records.append(record)

    flagged = [r for r in enriched_records if r.get("risk_level") in ["Critical", "High"] or r.get("is_outlier") is True or r.get("threat_rank", 999) <= 2]


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
        "total_employees_analyzed": len(enriched_records),
        "flagged_count": len(flagged),
        "contamination_rate": 0.15,
        "model_info": model_meta,
        "flagged_employees": flagged,
        "all_analyzed": enriched_records,
    }
