import statistics
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from app.database import get_mongo_db

def calculate_login_time_baseline(employee_id: str, mongo=None) -> Optional[Dict[str, Any]]:
    """
    Indicator 1: Login Times
    Calculates typical login decimal hour, spread (std_deviation), and sample size.
    """
    db = mongo if mongo is not None else get_mongo_db()
    logs = list(db["activity_logs"].find({
        "employee_id": employee_id,
        "event_type": "login"
    }))
    
    if len(logs) < 5:
        return None  # not enough data yet for a meaningful baseline
        
    login_hours = [log["timestamp"].hour + log["timestamp"].minute / 60.0 for log in logs if "timestamp" in log and log["timestamp"]]
    if len(login_hours) < 5:
        return None
        
    baseline = {
        "employee_id": employee_id,
        "indicator": "avg_login_hour",
        "typical_value": round(float(statistics.mean(login_hours)), 2),
        "std_deviation": round(float(statistics.stdev(login_hours)), 2) if len(login_hours) > 1 else 0.5,
        "sample_size": len(login_hours),
        "metadata": {
            "min_hour": round(min(login_hours), 2),
            "max_hour": round(max(login_hours), 2),
            "readable_time": f"{int(statistics.mean(login_hours)):02d}:{int((statistics.mean(login_hours) % 1) * 60):02d}"
        },
        "last_updated": datetime.now(timezone.utc)
    }
    
    db["behavioral_baselines"].update_one(
        {"employee_id": employee_id, "indicator": "avg_login_hour"},
        {"$set": baseline},
        upsert=True
    )
    return baseline


def calculate_resource_access_baseline(employee_id: str, mongo=None) -> Optional[Dict[str, Any]]:
    """
    Indicator 2: Resource Access Frequency
    Calculates average daily accesses across files, remote sessions, and systems.
    """
    db = mongo if mongo is not None else get_mongo_db()
    logs = list(db["activity_logs"].find({
        "employee_id": employee_id,
        "event_type": {"$in": ["file_download", "file_upload", "remote_access", "usb_connect", "data_transfer"]}
    }))
    
    if len(logs) < 5:
        return None

    daily_counts = {}
    for log in logs:
        ts = log.get("timestamp")
        if ts:
            day_str = ts.strftime("%Y-%m-%d") if hasattr(ts, "strftime") else str(ts)[:10]
            daily_counts[day_str] = daily_counts.get(day_str, 0) + 1

    counts = list(daily_counts.values())
    if len(counts) == 0:
        return None

    mean_val = statistics.mean(counts)
    std_val = statistics.stdev(counts) if len(counts) > 1 else 1.0

    baseline = {
        "employee_id": employee_id,
        "indicator": "resource_access_freq",
        "typical_value": round(float(mean_val), 2),
        "std_deviation": round(float(std_val), 2),
        "sample_size": len(logs),
        "metadata": {
            "total_access_events": len(logs),
            "active_days_tracked": len(counts),
            "max_daily_accesses": max(counts)
        },
        "last_updated": datetime.now(timezone.utc)
    }

    db["behavioral_baselines"].update_one(
        {"employee_id": employee_id, "indicator": "resource_access_freq"},
        {"$set": baseline},
        upsert=True
    )
    return baseline


def calculate_data_transfer_baseline(employee_id: str, mongo=None) -> Optional[Dict[str, Any]]:
    """
    Indicator 5: Data Transfer Volume
    Calculates typical data transfer / download / upload volume per event in MB.
    """
    db = mongo if mongo is not None else get_mongo_db()
    logs = list(db["activity_logs"].find({
        "employee_id": employee_id,
        "event_type": {"$in": ["data_transfer", "file_download", "file_upload", "usb_connect"]}
    }))

    transfer_volumes = []
    for log in logs:
        details = log.get("details", {})
        if isinstance(details, dict):
            size = details.get("transferred_mb") or details.get("file_size_mb") or details.get("size_mb")
            if size is not None and isinstance(size, (int, float)):
                transfer_volumes.append(float(size))

    if len(transfer_volumes) < 5:
        return None

    mean_val = statistics.mean(transfer_volumes)
    std_val = statistics.stdev(transfer_volumes) if len(transfer_volumes) > 1 else 10.0

    baseline = {
        "employee_id": employee_id,
        "indicator": "avg_data_transfer_mb",
        "typical_value": round(float(mean_val), 2),
        "std_deviation": round(float(std_val), 2),
        "sample_size": len(transfer_volumes),
        "metadata": {
            "max_single_transfer_mb": round(max(transfer_volumes), 2),
            "min_single_transfer_mb": round(min(transfer_volumes), 2),
            "total_transferred_mb": round(sum(transfer_volumes), 2)
        },
        "last_updated": datetime.now(timezone.utc)
    }

    db["behavioral_baselines"].update_one(
        {"employee_id": employee_id, "indicator": "avg_data_transfer_mb"},
        {"$set": baseline},
        upsert=True
    )
    return baseline


def calculate_device_usage_baseline(employee_id: str, mongo=None) -> Optional[Dict[str, Any]]:
    """
    Indicator 3: Device Usage
    Calculates known device inventory, primary device, and device consistency score.
    """
    db = mongo if mongo is not None else get_mongo_db()
    logs = list(db["activity_logs"].find({
        "employee_id": employee_id
    }))

    if len(logs) < 5:
        return None

    device_counts = {}
    for log in logs:
        details = log.get("details", {})
        if isinstance(details, dict):
            dev = details.get("device") or details.get("device_name")
            if dev:
                device_counts[dev] = device_counts.get(dev, 0) + 1

    if not device_counts:
        device_counts = {"Primary Corporate Workstation": len(logs)}

    sorted_devs = sorted(device_counts.items(), key=lambda x: x[1], reverse=True)
    primary_device = sorted_devs[0][0]
    total_dev_events = sum(device_counts.values())
    primary_ratio = round(sorted_devs[0][1] / total_dev_events, 2)

    baseline = {
        "employee_id": employee_id,
        "indicator": "device_usage",
        "typical_value": primary_ratio,
        "std_deviation": round(1.0 - primary_ratio, 2),
        "sample_size": total_dev_events,
        "metadata": {
            "primary_device": primary_device,
            "known_devices": list(device_counts.keys()),
            "device_distribution": device_counts
        },
        "last_updated": datetime.now(timezone.utc)
    }

    db["behavioral_baselines"].update_one(
        {"employee_id": employee_id, "indicator": "device_usage"},
        {"$set": baseline},
        upsert=True
    )
    return baseline


def calculate_application_usage_baseline(employee_id: str, mongo=None) -> Optional[Dict[str, Any]]:
    """
    Indicator 4: Application Usage
    Calculates daily application, commands, and workflow events typical frequency.
    """
    db = mongo if mongo is not None else get_mongo_db()
    logs = list(db["activity_logs"].find({
        "employee_id": employee_id,
        "event_type": {"$in": ["privilege_change", "remote_access", "file_download", "file_upload"]}
    }))

    if len(logs) < 5:
        return None

    daily_app_events = {}
    for log in logs:
        ts = log.get("timestamp")
        if ts:
            day_str = ts.strftime("%Y-%m-%d") if hasattr(ts, "strftime") else str(ts)[:10]
            daily_app_events[day_str] = daily_app_events.get(day_str, 0) + 1

    counts = list(daily_app_events.values())
    mean_val = statistics.mean(counts) if counts else 0
    std_val = statistics.stdev(counts) if len(counts) > 1 else 1.0

    baseline = {
        "employee_id": employee_id,
        "indicator": "app_usage_freq",
        "typical_value": round(float(mean_val), 2),
        "std_deviation": round(float(std_val), 2),
        "sample_size": len(logs),
        "metadata": {
            "active_days": len(counts),
            "total_app_events": len(logs)
        },
        "last_updated": datetime.now(timezone.utc)
    }

    db["behavioral_baselines"].update_one(
        {"employee_id": employee_id, "indicator": "app_usage_freq"},
        {"$set": baseline},
        upsert=True
    )
    return baseline


def calculate_communication_baseline(employee_id: str, mongo=None) -> Optional[Dict[str, Any]]:
    """
    Indicator 6: Communication Patterns
    Calculates typical daily email volume and average attachment size.
    """
    db = mongo if mongo is not None else get_mongo_db()
    logs = list(db["activity_logs"].find({
        "employee_id": employee_id,
        "event_type": "email_activity"
    }))

    if len(logs) < 5:
        return None

    attachment_sizes = []
    daily_emails = {}
    for log in logs:
        ts = log.get("timestamp")
        if ts:
            day_str = ts.strftime("%Y-%m-%d") if hasattr(ts, "strftime") else str(ts)[:10]
            daily_emails[day_str] = daily_emails.get(day_str, 0) + 1
        details = log.get("details", {})
        if isinstance(details, dict):
            att_mb = details.get("total_attachment_mb") or details.get("attachment_mb")
            if att_mb is not None and isinstance(att_mb, (int, float)):
                attachment_sizes.append(float(att_mb))

    counts = list(daily_emails.values()) if daily_emails else [1]
    mean_daily = statistics.mean(counts)
    std_daily = statistics.stdev(counts) if len(counts) > 1 else 1.0
    mean_att = statistics.mean(attachment_sizes) if attachment_sizes else 0.0

    baseline = {
        "employee_id": employee_id,
        "indicator": "communication_patterns",
        "typical_value": round(float(mean_daily), 2),
        "std_deviation": round(float(std_daily), 2),
        "sample_size": len(logs),
        "metadata": {
            "avg_attachment_mb": round(float(mean_att), 2),
            "total_emails_sent": len(logs)
        },
        "last_updated": datetime.now(timezone.utc)
    }

    db["behavioral_baselines"].update_one(
        {"employee_id": employee_id, "indicator": "communication_patterns"},
        {"$set": baseline},
        upsert=True
    )
    return baseline


def calculate_all_baselines_for_employee(employee_id: str, mongo=None) -> Dict[str, Any]:
    """
    Calculates all 6 indicator baselines for a single employee and returns a summary dict.
    """
    b1 = calculate_login_time_baseline(employee_id, mongo)
    b2 = calculate_resource_access_baseline(employee_id, mongo)
    b3 = calculate_device_usage_baseline(employee_id, mongo)
    b4 = calculate_application_usage_baseline(employee_id, mongo)
    b5 = calculate_data_transfer_baseline(employee_id, mongo)
    b6 = calculate_communication_baseline(employee_id, mongo)

    return {
        "employee_id": employee_id,
        "baselines_calculated": [b["indicator"] for b in [b1, b2, b3, b4, b5, b6] if b is not None],
        "baselines": {
            "avg_login_hour": b1,
            "resource_access_freq": b2,
            "device_usage": b3,
            "app_usage_freq": b4,
            "avg_data_transfer_mb": b5,
            "communication_patterns": b6
        }
    }


def calculate_all_system_baselines(mongo=None) -> Dict[str, Any]:
    """
    Discovers all unique employees in activity_logs and calculates all 6 baselines for each.
    """
    db = mongo if mongo is not None else get_mongo_db()
    emp_ids = db["activity_logs"].distinct("employee_id")
    results = []
    for emp_id in emp_ids:
        res = calculate_all_baselines_for_employee(emp_id, db)
        results.append(res)

    return {
        "total_employees": len(emp_ids),
        "results": results
    }
