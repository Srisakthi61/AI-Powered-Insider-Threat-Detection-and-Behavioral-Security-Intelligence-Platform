from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

MODEL_DIR = Path(__file__).resolve().parent.parent / "models"
MODEL_PATH = MODEL_DIR / "isolation_forest_model.joblib"
METADATA_PATH = MODEL_DIR / "isolation_forest_model_metadata.json"

DEFAULT_FEATURE_NAMES = [
    "avg_login_hour",
    "std_login_hour",
    "off_hours_logins",
    "mean_daily_access",
    "std_daily_access",
    "total_transfer_mb",
    "avg_transfer_mb",
    "max_single_transfer_mb",
    "usb_event_count",
    "usb_total_mb",
    "sudo_attempts",
    "denied_events",
    "critical_flags",
    "unique_devices",
    "email_count",
]


def ensure_model_dir() -> Path:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    return MODEL_DIR


def save_model_artifact(
    model: Any,
    feature_names: Optional[List[str]] = None,
    scaler: Optional[Any] = None,
    validation_metrics: Optional[Dict[str, Any]] = None,
    training_granularity: str = "employee_profile",
) -> Dict[str, Any]:
    """Persist a trained Isolation Forest model, scaler, and metadata."""
    ensure_model_dir()
    feats = feature_names or DEFAULT_FEATURE_NAMES
    payload = {
        "model": model,
        "scaler": scaler,
        "feature_names": feats,
        "model_type": model.__class__.__name__,
        "training_granularity": training_granularity,
        "validation_metrics": validation_metrics or {},
    }
    joblib.dump(payload, MODEL_PATH)

    metadata = {
        "model_type": payload["model_type"],
        "feature_names": feats,
        "n_features": len(feats),
        "scaler_saved": scaler is not None,
        "path": str(MODEL_PATH.resolve()),
        "validation_metrics": payload["validation_metrics"],
        "contamination": getattr(model, "contamination", 0.15),
        "n_estimators": getattr(model, "n_estimators", 200),
    }
    METADATA_PATH.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    return metadata


def load_model_artifact() -> Dict[str, Any]:
    """Load the persisted model, scaler, and feature metadata from disk."""
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model artifact not found at {MODEL_PATH}")

    artifact = joblib.load(MODEL_PATH)
    if isinstance(artifact, dict):
        model = artifact.get("model")
        scaler = artifact.get("scaler")
        feature_names = artifact.get("feature_names") or DEFAULT_FEATURE_NAMES
        model_type = artifact.get("model_type", model.__class__.__name__ if model else "IsolationForest")
        validation_metrics = artifact.get("validation_metrics", {})
        training_granularity = artifact.get("training_granularity", "employee_profile")
    else:
        model = artifact
        scaler = None
        feature_names = DEFAULT_FEATURE_NAMES
        model_type = model.__class__.__name__
        validation_metrics = {}
        training_granularity = "employee_profile"

    return {
        "model": model,
        "scaler": scaler,
        "feature_names": feature_names,
        "model_type": model_type,
        "validation_metrics": validation_metrics,
        "training_granularity": training_granularity,
        "path": str(MODEL_PATH.resolve()),
        "n_features": len(feature_names),
    }


def extract_features_from_activity_logs(logs: List[Dict[str, Any]]) -> pd.DataFrame:
    """
    Transforms raw MongoDB activity log records into a standardized 15-feature matrix
    per employee, matching the exact feature engineering pipeline of Milestone 2.
    """
    if not logs:
        return pd.DataFrame(columns=["employee_id"] + DEFAULT_FEATURE_NAMES)

    emp_groups: Dict[str, List[Dict[str, Any]]] = {}
    for doc in logs:
        emp = doc.get("employee_id")
        if not emp:
            continue
        emp_groups.setdefault(emp, []).append(doc)

    feature_rows = []
    for emp_id, docs in emp_groups.items():
        df_emp = pd.DataFrame(docs)
        df_emp["timestamp"] = pd.to_datetime(df_emp["timestamp"], errors="coerce")

        # Flatten nested details
        if "details" in df_emp.columns:
            details_df = pd.json_normalize(df_emp["details"].fillna({}))
            for col in details_df.columns:
                df_emp[col] = details_df[col]

        # Decimal hour for login time analysis
        df_emp["decimal_hour"] = df_emp["timestamp"].dt.hour + df_emp["timestamp"].dt.minute / 60.0

        # 1. Login metrics
        logins = df_emp[df_emp["event_type"] == "login"]
        login_hours = logins["decimal_hour"].dropna()
        avg_login = float(login_hours.mean()) if len(login_hours) > 0 else 9.0
        std_login = float(login_hours.std()) if len(login_hours) > 1 else 0.5
        off_hours_logins = int(((login_hours < 6.0) | (login_hours > 22.0)).sum())

        # 2. Resource access metrics
        access_events = df_emp[
            df_emp["event_type"].isin(
                ["file_download", "file_upload", "remote_access", "usb_connect", "data_transfer"]
            )
        ]
        daily_accesses = access_events.groupby(access_events["timestamp"].dt.date).size()
        mean_daily_access = float(daily_accesses.mean()) if len(daily_accesses) > 0 else 5.0
        std_daily_access = float(daily_accesses.std()) if len(daily_accesses) > 1 else 1.0

        # 3. Data Transfer & USB metrics
        transfer_vals = pd.to_numeric(
            df_emp.get("transferred_mb", pd.Series(0, index=df_emp.index)), errors="coerce"
        ).fillna(0)
        total_transfer_mb = float(transfer_vals.sum())
        avg_transfer_mb = float(transfer_vals.mean()) if len(transfer_vals) > 0 else 0.0
        max_single_transfer_mb = float(transfer_vals.max()) if len(transfer_vals) > 0 else 0.0

        usb_events = df_emp[df_emp["event_type"] == "usb_connect"]
        usb_count = len(usb_events)
        usb_trans = pd.to_numeric(
            usb_events.get("transferred_mb", pd.Series(0, index=usb_events.index)), errors="coerce"
        ).fillna(0)
        usb_total_mb = float(usb_trans.sum())

        # 4. Privilege & Security Flags
        priv_events = df_emp[df_emp["event_type"] == "privilege_change"]
        cmd_series = priv_events.get("command", pd.Series("", index=priv_events.index)).astype(str)
        # Sudo root attempts: match sudo, root, or escalation requests
        sudo_attempts = int(cmd_series.str.contains(r"\bsudo\b|\broot\b|clusterrolebinding", case=False, na=False).sum())

        status_series = df_emp.get("status", pd.Series("", index=df_emp.index)).astype(str)
        denied_events = int(status_series.str.contains("denied|failed", case=False, na=False).sum())

        risk_series = df_emp.get("risk_flag", pd.Series("", index=df_emp.index)).astype(str)
        critical_flags = int(
            risk_series.str.contains(
                "critical|exfiltration|unauthorized|brute_force|privilege_abuse", case=False, na=False
            ).sum()
        )

        # 5. Device diversity
        dev_col = df_emp.get("device", df_emp.get("device_name", pd.Series(index=df_emp.index)))
        unique_devices = int(dev_col.dropna().replace("", np.nan).nunique()) if dev_col is not None else 1

        # 6. Communication patterns
        emails = df_emp[df_emp["event_type"] == "email_activity"]
        email_count = len(emails)

        feature_rows.append({
            "employee_id": emp_id,
            "avg_login_hour": round(avg_login, 2),
            "std_login_hour": round(std_login, 2),
            "off_hours_logins": off_hours_logins,
            "mean_daily_access": round(mean_daily_access, 2),
            "std_daily_access": round(std_daily_access, 2),
            "total_transfer_mb": round(total_transfer_mb, 2),
            "avg_transfer_mb": round(avg_transfer_mb, 2),
            "max_single_transfer_mb": round(max_single_transfer_mb, 2),
            "usb_event_count": usb_count,
            "usb_total_mb": round(usb_total_mb, 2),
            "sudo_attempts": sudo_attempts,
            "denied_events": denied_events,
            "critical_flags": critical_flags,
            "unique_devices": unique_devices,
            "email_count": email_count,
        })

    return pd.DataFrame(feature_rows)


def analyze_threat_drivers(row: Dict[str, Any]) -> Dict[str, Any]:
    """
    Identifies multi-factor root causes, risk tier, recommended mitigation action,
    and target stakeholder persona for a given employee feature record.
    """
    reasons = []
    recommended_actions = []
    target_roles = []
    target_role_titles = []

    usb_mb = float(row.get("usb_total_mb", 0))
    usb_count = int(row.get("usb_event_count", 0))
    sudo_cnt = int(row.get("sudo_attempts", 0))
    off_logins = int(row.get("off_hours_logins", 0))
    denied_cnt = int(row.get("denied_events", 0))
    total_trans_mb = float(row.get("total_transfer_mb", 0))
    crit_flags = int(row.get("critical_flags", 0))
    avg_login = float(row.get("avg_login_hour", 9.0))
    anomaly_score = float(row.get("anomaly_score", 0.0))
    is_outlier = bool(row.get("is_outlier", False))

    # 1. Mass USB Data Exfiltration
    if usb_mb > 1000 or (usb_mb > 500 and is_outlier):
        reasons.append(f"Mass USB Data Exfiltration ({usb_mb:,.1f} MB across {usb_count} transfers)")
        recommended_actions.append("Immediately revoke USB endpoint storage access and isolate host.")
        target_roles.append("soc_engineer")
        target_role_titles.append("SOC Incident Response")

    # 2. Unauthorized Privilege Escalation
    if sudo_cnt > 0:
        reasons.append(f"Unauthorized Privilege Escalation ({sudo_cnt} sudo root execution attempts)")
        recommended_actions.append("Lock sudo root execution privileges and audit IAM bindings.")
        target_roles.append("admin")
        target_role_titles.append("System Administrator")

    # 3. Off-Hours Activity & Suspicious Login Shift
    if off_logins > 5 or (avg_login < 5.0 or avg_login > 22.0):
        reasons.append(f"Anomalous Off-Hours Activity ({off_logins} logins between 10PM-5AM)")
        recommended_actions.append("Verify MFA telemetry and confirm supervisor on-call approval.")
        target_roles.append("security_manager")
        target_role_titles.append("Department Manager")

    # 4. Access Failures & Brute Force
    if denied_cnt > 10:
        reasons.append(f"Repeated Access Failures / Brute-Force ({denied_cnt} denied attempts)")
        recommended_actions.append("Enforce immediate credential rotation and active session termination.")
        target_roles.append("soc_engineer")
        target_role_titles.append("SOC Incident Response")

    # 5. Critical Telemetry Security Flags
    if crit_flags > 10:
        reasons.append(f"Critical Security Telemetry Flags ({crit_flags} flagged event markers)")
        recommended_actions.append("Escalate to Tier-2 SOC Analyst for high-priority host isolation.")
        target_roles.append("soc_engineer")
        target_role_titles.append("SOC Incident Response")

    # 6. Massive Network Egress
    if total_trans_mb > 50000:
        reasons.append(f"High-Volume Data Egress ({total_trans_mb:,.1f} MB total transfer)")
        recommended_actions.append("Inspect outbound firewall sessions and restrict cloud upload endpoints.")
        target_roles.append("security_analyst")
        target_role_titles.append("Security Analyst")

    # Fallback if flagged by model but no single indicator dominated
    if not reasons:
        if is_outlier or anomaly_score < 0:
            reasons.append(f"Multi-indicator statistical deviation flagged by Isolation Forest (score: {anomaly_score})")
            recommended_actions.append("Conduct Tier-1 security analyst review on recent activity logs.")
            target_roles.append("security_analyst")
            target_role_titles.append("Security Analyst")
        else:
            reasons.append("Behavioral activity within baseline parameters.")
            recommended_actions.append("No action required - continue baseline monitoring.")
            target_roles.append("security_analyst")
            target_role_titles.append("Security Analyst")

    # Determine primary target role
    primary_target = target_roles[0] if target_roles else "security_analyst"
    primary_target_title = target_role_titles[0] if target_role_titles else "Security Analyst"

    # Determine risk tier
    if anomaly_score < -0.05 or crit_flags > 50 or usb_mb > 5000 or sudo_cnt > 50:
        risk_tier = "Critical"
    elif is_outlier or crit_flags > 10 or sudo_cnt > 0 or usb_mb > 1000:
        risk_tier = "High"
    elif anomaly_score < 0.05 or off_logins > 0 or denied_cnt > 0 or crit_flags > 0:
        risk_tier = "Medium"
    else:
        risk_tier = "Low"

    return {
        "risk_tier": risk_tier,
        "reasons": reasons,
        "primary_reason": reasons[0],
        "all_details": " | ".join(reasons),
        "recommended_action": " ".join(recommended_actions),
        "target_role": primary_target,
        "target_role_title": primary_target_title,
        "all_target_roles": list(set(target_roles)),
    }


def run_model(df: pd.DataFrame, model_artifact: Optional[Dict[str, Any]] = None) -> pd.DataFrame:
    """Run a feature DataFrame through the saved isolation forest model."""
    if df.empty:
        return pd.DataFrame(columns=["employee_id", "anomaly_score", "is_outlier", "threat_rank", "risk_tier"])

    artifact = model_artifact or load_model_artifact()
    model_obj = artifact["model"]
    scaler = artifact.get("scaler")
    feature_names = artifact.get("feature_names") or DEFAULT_FEATURE_NAMES

    features = df.copy()
    if "employee_id" in features.columns:
        employee_ids = features["employee_id"].copy()
        features = features.drop(columns=["employee_id"])
    else:
        employee_ids = pd.Series(range(len(features)), index=features.index, name="employee_id")

    for col in feature_names:
        if col not in features.columns:
            features[col] = 0
        features[col] = pd.to_numeric(features[col], errors="coerce").fillna(0)

    # Reorder features exactly matching model
    features = features[feature_names]

    if scaler is not None:
        transformed = scaler.transform(features)
    else:
        transformed = features.values

    anomaly_scores = model_obj.decision_function(transformed)
    predictions = model_obj.predict(transformed)

    result = df.copy()
    result["anomaly_score"] = [round(float(score), 4) for score in anomaly_scores]
    result["is_outlier"] = [bool(pred == -1) for pred in predictions]
    result["threat_rank"] = result["anomaly_score"].rank(ascending=True, method="min").astype(int)

    # Attach threat metadata
    threat_metas = [analyze_threat_drivers(row) for row in result.to_dict(orient="records")]
    result["risk_tier"] = [m["risk_tier"] for m in threat_metas]
    result["primary_reason"] = [m["primary_reason"] for m in threat_metas]
    result["details"] = [m["all_details"] for m in threat_metas]
    result["recommended_action"] = [m["recommended_action"] for m in threat_metas]
    result["target_role"] = [m["target_role"] for m in threat_metas]
    result["target_role_title"] = [m["target_role_title"] for m in threat_metas]

    result = result.sort_values(by="anomaly_score", ascending=True).reset_index(drop=True)
    return result
