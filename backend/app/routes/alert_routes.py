from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Alert, Employee, User, Notification
from app.schemas import AlertCreate, AlertUpdate, AlertResponse
from app.security import require_role
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel

router = APIRouter()


class AlertAssignRequest(BaseModel):
    assigned_to: int


class AlertResolveRequest(BaseModel):
    resolution_notes: Optional[str] = None


def notify_security_managers_of_critical_alert(alert: Alert, db: Session) -> List[Dict[str, Any]]:
    """
    When a critical alert occurs:
    Find security_manager users.
    Create and persist structured in-app notification information:
    recipient_id, message, channel = "in_app".
    NOTE: External messaging integrations (Email, SMS, Slack) are out of project scope.
    """
    managers = db.query(User).filter(User.role == "security_manager").all()
    notifications = []
    emp_code = alert.employee.employee_id if alert.employee else f"EMP-{alert.employee_id}"
    msg = f"CRITICAL SECURITY ALERT [{emp_code}]: {alert.message}"
    for mgr in managers:
        notif = Notification(
            recipient_id=mgr.id,
            message=msg,
            channel="in_app",
            alert_id=alert.id,
        )
        db.add(notif)
        notifications.append({
            "recipient_id": mgr.id,
            "recipient_email": mgr.email,
            "message": msg,
            "channel": "in_app",
            "alert_id": alert.id,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    db.commit()
    return notifications

def _format_alert(alert: Alert) -> dict:
    msg_lower = (alert.message or "").lower()
    details_lower = (alert.details or "").lower()

    # Determine stakeholder target role
    if "sudo" in msg_lower or "privilege" in msg_lower or "root" in msg_lower or "admin" in msg_lower or "cluster" in msg_lower:
        target_role = "admin"
        target_role_title = "System Administrator"
    elif "usb" in msg_lower or "exfiltration" in msg_lower or "brute" in msg_lower or "device" in msg_lower or "mfa" in msg_lower or "failed" in msg_lower:
        target_role = "soc_engineer"
        target_role_title = "SOC Incident Response"
    elif "off-hours" in msg_lower or "login" in msg_lower or "hours" in msg_lower or "download" in msg_lower or "payroll" in msg_lower:
        target_role = "security_manager"
        target_role_title = "Department Manager"
    else:
        target_role = "security_analyst"
        target_role_title = "Security Analyst"

    # Extract ML anomaly score if present in details
    ml_score = None
    if "Anomaly Score:" in (alert.details or ""):
        try:
            score_part = alert.details.split("Anomaly Score:")[1].split("|")[0].strip()
            ml_score = float(score_part)
        except Exception:
            ml_score = None

    # Check SLA Escalation rules
    is_escalated = (alert.escalated or "false").lower() == "true"
    now = datetime.now(timezone.utc)
    if alert.status != "RESOLVED" and alert.created_at:
        age_hours = (now - alert.created_at).total_seconds() / 3600.0
        sev_upper = (alert.severity or "").upper()
        if (sev_upper == "CRITICAL" and age_hours > 2.0) or \
           (sev_upper == "HIGH" and age_hours > 8.0) or \
           (sev_upper == "MEDIUM" and age_hours > 24.0):
            is_escalated = True

    return {
        "id": alert.id,
        "employee_id": alert.employee_id,
        "incident_id": alert.incident_id,
        "severity": "CRITICAL" if is_escalated and (alert.severity or "").upper() == "HIGH" else alert.severity,
        "message": alert.message,
        "status": alert.status or "OPEN",
        "details": alert.details,
        "recommended_action": alert.recommended_action,
        "assigned_to": alert.assigned_to,
        "assigned_to_email": alert.assignee.email if alert.assignee else None,
        "escalated": "true" if is_escalated else "false",
        "created_at": alert.created_at,
        "resolved_at": alert.resolved_at,
        "employee_code": alert.employee.employee_id if alert.employee else None,
        "employee_name": alert.employee.name if alert.employee else None,
        "department": alert.employee.department if alert.employee else None,
        "target_role": target_role,
        "target_role_title": target_role_title,
        "risk_level": alert.severity,
        "ml_anomaly_score": ml_score,
    }



@router.get("/", response_model=List[AlertResponse])
def list_alerts(
    severity: Optional[str] = None,
    status: Optional[str] = None,
    target_role: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_role("admin", "security_analyst", "soc_engineer", "security_manager")
    ),
):
    """
    Retrieve all alerts from PostgreSQL with joined employee and stakeholder targeting info.
    Supports filtering by severity, status, and target role.
    """
    query = db.query(Alert).order_by(Alert.id.desc())
    if severity and severity.upper() != "ALL":
        query = query.filter(Alert.severity.ilike(severity))
    if status and status.upper() != "ALL":
        query = query.filter(Alert.status.ilike(status))

    alerts = query.limit(limit).all()
    formatted = [_format_alert(a) for a in alerts]

    if target_role and target_role.upper() != "ALL":
        formatted = [a for a in formatted if a["target_role"] == target_role.lower()]

    return formatted


@router.get("/role-targeted")
def get_role_targeted_alerts(
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_role("admin", "security_analyst", "soc_engineer", "security_manager")
    ),
):
    """
    Returns alerts intelligently prioritized and categorized for the logged-in user's role.
    """
    role = current_user.get("role", "security_analyst")
    all_alerts = db.query(Alert).order_by(Alert.id.desc()).limit(100).all()
    formatted = [_format_alert(a) for a in all_alerts]

    if role in ["admin", "security_analyst"]:
        my_role_alerts = formatted
    else:
        role_matched = [a for a in formatted if a["target_role"] == role]
        my_role_alerts = role_matched if role_matched else formatted

    return {
        "user_role": role,
        "targeted_alerts_count": len(my_role_alerts),
        "targeted_alerts": my_role_alerts,
        "all_alerts_count": len(formatted),
        "all_alerts": formatted,
    }


@router.get("/my")
def get_my_alerts(
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_role("admin", "security_analyst", "soc_engineer", "security_manager")
    ),
):
    """
    Alerts assigned to or relevant for the logged-in user.
    """
    user_id = current_user.get("sub")
    query = db.query(Alert)
    try:
        uid_int = int(user_id)
        my_alerts = query.filter((Alert.assigned_to == uid_int) | (Alert.assigned_to.is_(None))).order_by(Alert.id.desc()).all()
    except (ValueError, TypeError):
        my_alerts = query.order_by(Alert.id.desc()).all()

    return {
        "message": f"Alerts for user ID {user_id}",
        "user_id": str(user_id),
        "alerts": [_format_alert(a) for a in my_alerts],
    }


@router.get("/{alert_id}", response_model=AlertResponse)
def get_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_role("admin", "security_analyst", "soc_engineer", "security_manager")
    ),
):
    """
    Retrieve single alert details by ID.
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    return _format_alert(alert)


@router.post("/", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
def create_alert(
    request: AlertCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "soc_engineer", "security_analyst")),
):
    """
    Create a new security alert in PostgreSQL.
    If severity is CRITICAL, automatically generates and dispatches in-app notifications
    to all security_manager users.
    """
    employee = db.query(Employee).filter(Employee.id == request.employee_id).first()
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    new_alert = Alert(
        employee_id=request.employee_id,
        severity=request.severity,
        message=request.message,
        status=request.status or "UNASSIGNED",
        details=request.details,
        recommended_action=request.recommended_action,
        assigned_to=request.assigned_to,
    )
    db.add(new_alert)
    db.commit()
    db.refresh(new_alert)

    # Dispatch in-app notifications to security_manager users if alert is CRITICAL
    if (new_alert.severity or "").upper() == "CRITICAL":
        notify_security_managers_of_critical_alert(new_alert, db)

    return _format_alert(new_alert)


@router.patch("/{alert_id}", response_model=AlertResponse)
def update_alert(
    alert_id: int,
    request: AlertUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_role("admin", "security_analyst", "soc_engineer", "security_manager")
    ),
):
    """
    Update alert status or assignment with strict RBAC segregation:
    - ALERT ASSIGNMENT: Only 'admin' and 'security_manager' can assign/reassign alerts.
    - ALERT RESOLUTION: 'security_analyst', 'admin', and 'security_manager' can resolve alerts.
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

    user_role = current_user.get("role", "")
    update_data = request.model_dump(exclude_unset=True)

    # Check assignment permission
    if "assigned_to" in update_data and update_data["assigned_to"] != alert.assigned_to:
        if user_role not in ["admin", "security_manager"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission denied: Only admin and security_manager can assign or reassign alerts.",
            )

    # Check resolution permission
    if "status" in update_data and update_data["status"] is not None:
        if update_data["status"].upper() == "RESOLVED":
            if user_role not in ["security_analyst", "admin", "security_manager"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Permission denied: Only security_analyst, admin, or security_manager can resolve alerts.",
                )
            alert.resolved_at = datetime.now(timezone.utc)

    for field, value in update_data.items():
        setattr(alert, field, value)

    db.commit()
    db.refresh(alert)
    return _format_alert(alert)


@router.post("/{alert_id}/assign", response_model=AlertResponse)
def assign_alert(
    alert_id: int,
    request: AlertAssignRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "security_manager")),
):
    """
    Assign an alert to a platform user.
    RESTRICTED TO: admin, security_manager.
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

    assignee = db.query(User).filter(User.id == request.assigned_to).first()
    if not assignee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignee user not found")

    alert.assigned_to = request.assigned_to
    if alert.status in ["UNASSIGNED", "OPEN"]:
        alert.status = "ASSIGNED"

    db.commit()
    db.refresh(alert)
    return _format_alert(alert)


@router.post("/{alert_id}/resolve", response_model=AlertResponse)
def resolve_alert(
    alert_id: int,
    request: Optional[AlertResolveRequest] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("security_analyst", "admin", "security_manager")),
):
    """
    Resolve an active security alert.
    PERMITTED FOR: security_analyst, admin, security_manager.
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

    alert.status = "RESOLVED"
    alert.resolved_at = datetime.now(timezone.utc)
    if request and request.resolution_notes:
        existing_details = alert.details or ""
        alert.details = f"{existing_details}\nResolution Notes: {request.resolution_notes}".strip()

    db.commit()
    db.refresh(alert)
    return _format_alert(alert)


@router.get("/notifications/in-app")
def get_in_app_notifications(
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "security_manager", "security_analyst")),
):
    """
    Fetch in-app critical alert notifications for the authenticated user / security managers.
    NOTE: External messaging integrations (Email, SMS, Slack) are outside project scope.
    """
    user_id = current_user.get("sub")
    query = db.query(Notification).order_by(Notification.created_at.desc())
    try:
        uid_int = int(user_id)
        # Security managers and admins see relevant notifications
        if current_user.get("role") in ["security_manager", "admin"]:
            notifs = query.limit(limit).all()
        else:
            notifs = query.filter(Notification.recipient_id == uid_int).limit(limit).all()
    except (ValueError, TypeError):
        notifs = query.limit(limit).all()

    return [
        {
            "id": n.id,
            "recipient_id": n.recipient_id,
            "message": n.message,
            "channel": n.channel,
            "alert_id": n.alert_id,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in notifs
    ]
