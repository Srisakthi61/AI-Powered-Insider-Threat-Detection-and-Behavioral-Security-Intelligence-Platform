from typing import Dict, Any, Optional, List
from app.database import get_mongo_db, SessionLocal
from app.models import Employee

def check_login_time_anomaly(employee_id: str, login_hour: float, mongo=None) -> Dict[str, Any]:
    """
    Z-Score based anomaly check for login times.
    Flags when z_score > 2.5 (> 2.5 standard deviations from employee's typical hour).
    """
    db = mongo if mongo is not None else get_mongo_db()
    baseline = db["behavioral_baselines"].find_one({
        "employee_id": employee_id,
        "indicator": "avg_login_hour"
    })
    
    if not baseline:
        return {
            "anomaly": False,
            "reason": "No baseline yet",
            "indicator": "avg_login_hour",
            "employee_id": employee_id,
            "actual_login_hour": login_hour
        }
        
    typical = baseline["typical_value"]
    deviation = baseline.get("std_deviation") or 0.5  # avoid dividing by zero
    z_score = abs(login_hour - typical) / deviation
    is_anomaly = z_score > 2.5  # more than 2.5 standard deviations from normal
    
    return {
        "anomaly": bool(is_anomaly),
        "indicator": "avg_login_hour",
        "employee_id": employee_id,
        "z_score": round(float(z_score), 2),
        "threshold": 2.5,
        "typical_login_hour": typical,
        "actual_login_hour": login_hour,
        "deviation": deviation,
        "category": "Unusual Login Time" if is_anomaly else None,
        "severity": "High" if z_score > 4.0 else ("Medium" if is_anomaly else "Low"),
        "description": f"Login hour {login_hour:.2f} deviates by {z_score:.2f} standard deviations from typical {typical:.2f}." if is_anomaly else "Login hour is within normal baseline parameters."
    }


def check_access_anomaly(employee_id: str, access_count: float, mongo=None) -> Dict[str, Any]:
    """
    Z-Score based anomaly check for resource access frequency.
    Flags when daily resource/file accesses significantly exceed typical frequency.
    """
    db = mongo if mongo is not None else get_mongo_db()
    baseline = db["behavioral_baselines"].find_one({
        "employee_id": employee_id,
        "indicator": "resource_access_freq"
    })
    
    if not baseline:
        return {
            "anomaly": False,
            "reason": "No baseline yet",
            "indicator": "resource_access_freq",
            "employee_id": employee_id,
            "actual_access_count": access_count
        }

    typical = baseline["typical_value"]
    deviation = baseline.get("std_deviation") or 1.0
    z_score = (access_count - typical) / deviation  # one-tailed (excess access)
    is_anomaly = z_score > 2.5

    return {
        "anomaly": bool(is_anomaly),
        "indicator": "resource_access_freq",
        "employee_id": employee_id,
        "z_score": round(float(max(z_score, 0)), 2),
        "threshold": 2.5,
        "typical_daily_accesses": typical,
        "actual_access_count": access_count,
        "deviation": deviation,
        "category": "Abnormal Resource Access Spike" if is_anomaly else None,
        "severity": "Critical" if z_score > 5.0 else ("High" if is_anomaly else "Low"),
        "description": f"Access count {access_count} is {z_score:.2f} std above typical daily access rate ({typical:.1f})." if is_anomaly else "Access frequency is normal."
    }


def check_data_exfiltration_anomaly(employee_id: str, transfer_mb: float, mongo=None) -> Dict[str, Any]:
    """
    Z-Score & volume check for mass data exfiltration / egress volume.
    """
    db = mongo if mongo is not None else get_mongo_db()
    baseline = db["behavioral_baselines"].find_one({
        "employee_id": employee_id,
        "indicator": "avg_data_transfer_mb"
    })

    typical = baseline["typical_value"] if baseline else 35.0
    deviation = (baseline.get("std_deviation") if baseline else None) or 15.0
    z_score = (transfer_mb - typical) / deviation
    is_anomaly = (z_score > 2.5 and transfer_mb > 100.0) or (transfer_mb > 1000.0)

    return {
        "anomaly": bool(is_anomaly),
        "indicator": "avg_data_transfer_mb",
        "employee_id": employee_id,
        "z_score": round(float(max(z_score, 0)), 2),
        "threshold": 2.5,
        "typical_transfer_mb": typical,
        "actual_transfer_mb": transfer_mb,
        "deviation": deviation,
        "category": "Data Exfiltration Detection" if is_anomaly else None,
        "severity": "Critical" if transfer_mb > 2000.0 or z_score > 5.0 else ("High" if is_anomaly else "Low"),
        "description": f"Data transfer volume {transfer_mb:.1f} MB exceeds baseline ({typical:.1f} MB) by {z_score:.2f} sigma." if is_anomaly else "Data transfer volume is within normal limits."
    }


def check_data_download_anomaly(employee_id: str, download_mb: float, mongo=None) -> Dict[str, Any]:
    """
    Check for abnormal data download volume.
    """
    db = mongo if mongo is not None else get_mongo_db()
    baseline = db["behavioral_baselines"].find_one({
        "employee_id": employee_id,
        "indicator": "avg_data_transfer_mb"
    })

    typical = baseline["typical_value"] if baseline else 20.0
    deviation = (baseline.get("std_deviation") if baseline else None) or 10.0
    z_score = (download_mb - typical) / deviation
    is_anomaly = z_score > 2.5 and download_mb > 150.0

    return {
        "anomaly": bool(is_anomaly),
        "indicator": "data_download_volume",
        "employee_id": employee_id,
        "z_score": round(float(max(z_score, 0)), 2),
        "threshold": 2.5,
        "typical_download_mb": typical,
        "actual_download_mb": download_mb,
        "category": "Abnormal Data Download" if is_anomaly else None,
        "severity": "High" if z_score > 4.0 else ("Medium" if is_anomaly else "Low"),
        "description": f"Download volume {download_mb:.1f} MB significantly exceeds baseline by {z_score:.2f} standard deviations." if is_anomaly else "Download volume is normal."
    }


def check_privilege_abuse_anomaly(employee_id: str, requested_privilege_or_command: str, db=None) -> Dict[str, Any]:
    """
    Rule-based check: Compares requested privilege / command execution against employee's
    assigned access_privileges in PostgreSQL.
    """
    session = db if db is not None else SessionLocal()
    try:
        emp = session.query(Employee).filter(Employee.employee_id == employee_id).first()
        if not emp:
            return {
                "anomaly": True,
                "reason": "Unknown employee attempting privileged action",
                "category": "Privilege Abuse Detection",
                "severity": "High"
            }

        allowed_privileges = [p.strip().lower() for p in (emp.access_privileges or "").split(",") if p.strip()]
        
        # High risk commands and tokens
        command_lower = requested_privilege_or_command.lower()
        is_root_attempt = "sudo" in command_lower or "root" in command_lower or "domain_admin" in command_lower
        is_unauthorized_token = not any(p in command_lower for p in allowed_privileges)

        is_anomaly = False
        reason = "Privilege execution authorized"

        if "sudo" in command_lower and "ssh_root" not in allowed_privileges and "domain_admin" not in allowed_privileges:
            is_anomaly = True
            reason = f"Unauthorized superuser (sudo/root) execution attempt by {emp.name} ({emp.designation})"
        elif "erp_admin" in command_lower and "erp_admin" not in allowed_privileges:
            is_anomaly = True
            reason = f"Attempted ERP Admin configuration outside permitted privileges"
        elif "payroll" in command_lower and "payroll_read" not in allowed_privileges and "payroll_user" not in allowed_privileges:
            is_anomaly = True
            reason = f"Unauthorized access attempt to sensitive Payroll database table"
        elif "prod_cluster_admin" in command_lower and "prod_cluster_admin" not in allowed_privileges:
            is_anomaly = True
            reason = f"Unauthorized production Kubernetes cluster administrator modification"
        elif is_root_attempt and is_unauthorized_token:
            is_anomaly = True
            reason = f"Privilege escalation attempt outside allowed scope: {allowed_privileges}"

        return {
            "anomaly": is_anomaly,
            "category": "Privilege Abuse Detection" if is_anomaly else None,
            "employee_id": employee_id,
            "employee_name": emp.name,
            "department": emp.department,
            "assigned_privileges": allowed_privileges,
            "action_attempted": requested_privilege_or_command,
            "severity": "Critical" if is_anomaly else "Low",
            "reason": reason
        }
    finally:
        if db is None:
            session.close()


def check_suspicious_device_anomaly(employee_id: str, device_name: str, mongo=None, db=None) -> Dict[str, Any]:
    """
    Rule-based check: Validates device against employee's PostgreSQL device_info and MongoDB known_devices baseline.
    """
    mongo_db = mongo if mongo is not None else get_mongo_db()
    session = db if db is not None else SessionLocal()
    try:
        emp = session.query(Employee).filter(Employee.employee_id == employee_id).first()
        baseline = mongo_db["behavioral_baselines"].find_one({
            "employee_id": employee_id,
            "indicator": "device_usage"
        })

        known_devices = []
        if baseline and "metadata" in baseline and "known_devices" in baseline["metadata"]:
            known_devices.extend(baseline["metadata"]["known_devices"])
        if emp and emp.device_info:
            known_devices.append(emp.device_info)

        # Normalize strings
        device_lower = device_name.lower().strip()
        matches_known = any(
            k.lower().strip() in device_lower or device_lower in k.lower().strip()
            for k in known_devices
        )

        is_suspicious = not matches_known

        return {
            "anomaly": is_suspicious,
            "category": "Suspicious Device Usage" if is_suspicious else None,
            "employee_id": employee_id,
            "employee_name": emp.name if emp else "Unknown",
            "device_used": device_name,
            "known_devices": known_devices,
            "severity": "High" if is_suspicious else "Low",
            "reason": f"Login/action from unrecognized device '{device_name}' not in verified inventory." if is_suspicious else "Device recognized in authorized asset inventory."
        }
    finally:
        if db is None:
            session.close()


def evaluate_event_anomalies(event_doc: Dict[str, Any], db=None, mongo=None) -> List[Dict[str, Any]]:
    """
    Comprehensive pipeline evaluator: runs all matching statistical and rule-based
    anomaly checks on a raw activity log event document.
    """
    emp_id = event_doc.get("employee_id")
    event_type = event_doc.get("event_type")
    details = event_doc.get("details", {})
    ts = event_doc.get("timestamp")

    if not emp_id or not event_type:
        return []

    flags = []

    # 1. Login Time Check
    if event_type == "login" and ts:
        hour = ts.hour + ts.minute / 60.0 if hasattr(ts, "hour") else 9.0
        res = check_login_time_anomaly(emp_id, hour, mongo)
        if res.get("anomaly"):
            flags.append(res)

    # 2. Device Check
    device_name = details.get("device") or details.get("device_name")
    if device_name:
        res = check_suspicious_device_anomaly(emp_id, str(device_name), mongo, db)
        if res.get("anomaly"):
            flags.append(res)

    # 3. Data Exfiltration / Transfer
    size_mb = details.get("transferred_mb") or details.get("size_mb")
    if size_mb is not None:
        res = check_data_exfiltration_anomaly(emp_id, float(size_mb), mongo)
        if res.get("anomaly"):
            flags.append(res)

    # 4. Privilege Abuse
    if event_type == "privilege_change" or "command" in details or "requested_privilege" in details:
        cmd = details.get("command") or details.get("requested_privilege") or str(details)
        res = check_privilege_abuse_anomaly(emp_id, str(cmd), db)
        if res.get("anomaly"):
            flags.append(res)

    # 5. USB exfiltration check
    if event_type == "usb_connect":
        trans_mb = details.get("transferred_mb", 0)
        if float(trans_mb) > 500.0:
            flags.append({
                "anomaly": True,
                "category": "Mass USB Data Exfiltration",
                "employee_id": emp_id,
                "severity": "Critical",
                "description": f"Mass USB data copy detected: {trans_mb} MB copied to external USB device ({details.get('device_name', 'Unknown')})."
            })

    return flags
