from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Alert, Employee, User
from app.schemas import AlertCreate, AlertUpdate, AlertResponse
from app.security import require_role

router = APIRouter()


def _format_alert(alert: Alert) -> dict:
    return {
        "id": alert.id,
        "employee_id": alert.employee_id,
        "severity": alert.severity,
        "message": alert.message,
        "status": alert.status or "UNASSIGNED",
        "details": alert.details,
        "recommended_action": alert.recommended_action,
        "assigned_to": alert.assigned_to,
        "created_at": alert.created_at,
        "employee_code": alert.employee.employee_id if alert.employee else None,
        "employee_name": alert.employee.name if alert.employee else None,
        "department": alert.employee.department if alert.employee else None,
    }


@router.get("/", response_model=List[AlertResponse])
def list_alerts(
    severity: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_role("admin", "security_analyst", "soc_engineer", "security_manager")
    ),
):
    """
    Retrieve all alerts from PostgreSQL with joined employee info.
    Supports filtering by severity and status.
    """
    query = db.query(Alert).order_by(Alert.id.desc())
    if severity and severity.upper() != "ALL":
        query = query.filter(Alert.severity.ilike(severity))
    if status and status.upper() != "ALL":
        query = query.filter(Alert.status.ilike(status))

    alerts = query.limit(limit).all()
    return [_format_alert(a) for a in alerts]


@router.get("/my")
def get_my_alerts(
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_role("admin", "security_analyst", "soc_engineer", "security_manager")
    ),
):
    """
    Alerts for the logged-in user.
    Accessible by all four roles: admin, security_analyst, soc_engineer, security_manager.
    Returns user_id, message, and list of relevant alerts.
    """
    user_id = current_user.get("sub")
    query = db.query(Alert)
    try:
        uid_int = int(user_id)
        my_alerts = query.filter((Alert.assigned_to == uid_int) | (Alert.assigned_to.is_(None))).all()
    except (ValueError, TypeError):
        my_alerts = query.all()

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
    Update alert status (e.g. UNASSIGNED, INVESTIGATING, RESOLVED) or assignment.
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(alert, field, value)

    db.commit()
    db.refresh(alert)
    return _format_alert(alert)
