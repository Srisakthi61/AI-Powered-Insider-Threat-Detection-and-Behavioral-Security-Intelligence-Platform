from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db, get_mongo_db
from app.models import Incident, InvestigationNote, Alert, Employee, User
from app.security import require_role
from app.investigation_timeline import build_investigation_timeline
from app.risk_scoring import calculate_employee_risk_score, calculate_risk_score

router = APIRouter()


def _find_employee(db: Session, employee_id: Any) -> Optional[Employee]:
    """Safely finds an employee by integer primary key id or string employee_id."""
    if employee_id is None:
        return None
    try:
        numeric_id = int(employee_id)
        emp = db.query(Employee).filter(Employee.id == numeric_id).first()
        if emp:
            return emp
    except (ValueError, TypeError):
        pass
    return db.query(Employee).filter(Employee.employee_id == str(employee_id)).first()


class IncidentCreate(BaseModel):
    employee_id: Any
    severity: str = "HIGH"  # LOW, MEDIUM, HIGH, CRITICAL
    title: Optional[str] = None
    summary: Optional[str] = None
    alert_ids: Optional[List[int]] = Field(default_factory=list)


class IncidentUpdate(BaseModel):
    status: Optional[str] = None  # OPEN, INVESTIGATING, RESOLVED, CLOSED
    severity: Optional[str] = None
    summary: Optional[str] = None


class IncidentResolveRequest(BaseModel):
    resolution_summary: str


class InvestigationNoteCreate(BaseModel):
    note: str
    evidence_reference: Optional[str] = None


def _format_incident(inc: Incident, db: Session) -> Dict[str, Any]:
    emp = inc.employee
    notes_list = []
    if inc.notes:
        for n in inc.notes:
            notes_list.append({
                "id": n.id,
                "incident_id": n.incident_id,
                "author_user_id": n.author_user_id,
                "author_name": n.author_name or "Security Analyst",
                "note": n.note,
                "evidence_reference": n.evidence_reference,
                "created_at": n.created_at.isoformat() if n.created_at else None,
            })

    linked_alerts = []
    if inc.alerts:
        for a in inc.alerts:
            linked_alerts.append({
                "id": a.id,
                "severity": a.severity,
                "message": a.message,
                "status": a.status,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            })

    creator_email = inc.creator.email if inc.creator else None

    return {
        "id": inc.id,
        "employee_id": inc.employee_id,
        "employee_code": emp.employee_id if emp else None,
        "employee_name": emp.name if emp else "Unknown",
        "department": emp.department if emp else "Unknown",
        "designation": emp.designation if emp else "Staff",
        "status": (inc.status or "OPEN").upper(),
        "severity": (inc.severity or "HIGH").upper(),
        "summary": inc.summary or f"Security Investigation for {emp.name if emp else 'Employee'}",
        "title": inc.summary or f"Security Investigation #{inc.id}",
        "created_at": inc.created_at.isoformat() if inc.created_at else None,
        "resolved_at": inc.resolved_at.isoformat() if inc.resolved_at else None,
        "created_by": inc.created_by,
        "created_by_email": creator_email,
        "resolution_summary": inc.resolution_summary,
        "notes": notes_list,
        "notes_count": len(notes_list),
        "alerts": linked_alerts,
        "alerts_count": len(linked_alerts),
    }


@router.get("/")
def list_incidents(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    employee_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_role("admin", "security_analyst", "soc_engineer", "security_manager")
    ),
):
    """
    List formal incident cases with filtering by status, severity, and employee.
    """
    query = db.query(Incident)

    if status and status.upper() != "ALL":
        query = query.filter(Incident.status == status.upper())
    if severity and severity.upper() != "ALL":
        query = query.filter(Incident.severity == severity.upper())
    if employee_id and employee_id.upper() != "ALL":
        emp = _find_employee(db, employee_id)
        if emp:
            query = query.filter(Incident.employee_id == emp.id)
        else:
            return []

    incidents = query.order_by(Incident.created_at.desc()).all()
    return [_format_incident(inc, db) for inc in incidents]


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_incident(
    req: IncidentCreate,
    db: Session = Depends(get_db),
    mongo=Depends(get_mongo_db),
    current_user: dict = Depends(
        require_role("admin", "security_analyst", "soc_engineer", "security_manager")
    ),
):
    """
    Create a new formal Security Incident case.
    MANDATORY RULE: Incidents can only be created for employees with High or Critical risk level.
    Rejects Low and Medium risk employees with HTTP 400.
    """
    emp = _find_employee(db, req.employee_id)
    if not emp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee '{req.employee_id}' not found in organization directory",
        )

    # 1. Calculate the employee's current risk score and verify risk level
    risk_data = calculate_risk_score(emp.employee_id, db=db, mongo=mongo)
    current_risk_level = (risk_data.get("risk_level") or "Low").capitalize()

    if current_risk_level not in ["High", "Critical"] and req.severity.upper() not in ["HIGH", "CRITICAL"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incidents can only be created for High or Critical risk employees.",
        )

    # Extract creator user ID
    user_id = None
    try:
        user_id = int(current_user.get("sub"))
    except (TypeError, ValueError):
        pass

    summary_text = req.summary or req.title or "Security Investigation Case"

    # Create Incident
    new_inc = Incident(
        employee_id=emp.id,
        status="OPEN",
        severity=req.severity.upper(),
        summary=summary_text,
        created_by=user_id,
    )
    db.add(new_inc)
    db.commit()
    db.refresh(new_inc)

    # Associate linked alerts
    if req.alert_ids:
        alerts = db.query(Alert).filter(Alert.id.in_(req.alert_ids)).all()
        for alt in alerts:
            alt.incident_id = new_inc.id
            if alt.status in ["UNASSIGNED", "OPEN"]:
                alt.status = "IN_PROGRESS"
        db.commit()
        db.refresh(new_inc)

    return _format_incident(new_inc, db)


@router.get("/{incident_id}")
def get_incident(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_role("admin", "security_analyst", "soc_engineer", "security_manager")
    ),
):
    """
    Retrieve single incident details with chronological investigation notes and linked alerts.
    """
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")

    return _format_incident(inc, db)


@router.patch("/{incident_id}")
def update_incident(
    incident_id: int,
    req: IncidentUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_role("admin", "security_analyst", "soc_engineer", "security_manager")
    ),
):
    """
    Update incident status, severity, or summary.
    """
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")

    if req.status:
        inc.status = req.status.upper()
    if req.severity:
        inc.severity = req.severity.upper()
    if req.summary:
        inc.summary = req.summary

    db.commit()
    db.refresh(inc)
    return _format_incident(inc, db)


@router.post("/{incident_id}/notes", status_code=status.HTTP_201_CREATED)
def add_investigation_note(
    incident_id: int,
    req: InvestigationNoteCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_role("admin", "security_analyst", "soc_engineer", "security_manager")
    ),
):
    """
    Add a chronological investigation note and evidence reference to an incident.
    MANDATORY RULE: When the first note is added, if incident status is OPEN,
    it automatically transitions to INVESTIGATING.
    """
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")

    user_id = None
    user_name = current_user.get("role", "Security Analyst").replace("_", " ").title()
    try:
        user_id = int(current_user.get("sub"))
        user_record = db.query(User).filter(User.id == user_id).first()
        if user_record:
            user_name = user_record.email
    except (TypeError, ValueError):
        pass

    new_note = InvestigationNote(
        incident_id=inc.id,
        author_user_id=user_id,
        author_name=user_name,
        note=req.note,
        evidence_reference=req.evidence_reference,
    )
    db.add(new_note)

    # State transition: OPEN -> INVESTIGATING
    if inc.status == "OPEN":
        inc.status = "INVESTIGATING"

    db.commit()
    db.refresh(inc)
    db.refresh(new_note)

    return {
        "message": "Investigation note recorded successfully",
        "id": new_note.id,
        "incident_id": new_note.incident_id,
        "author_name": new_note.author_name,
        "note": new_note.note,
        "evidence_reference": new_note.evidence_reference,
        "created_at": new_note.created_at.isoformat() if new_note.created_at else None,
        "incident_status": inc.status,
    }


@router.post("/{incident_id}/resolve")
def resolve_incident(
    incident_id: int,
    req: IncidentResolveRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_role("admin", "security_analyst", "soc_engineer", "security_manager")
    ),
):
    """
    Concludes an incident case:
    - Sets status to RESOLVED
    - Populates resolved_at timestamp
    - Records resolution summary
    - Automatically marks linked alerts as RESOLVED
    """
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")

    now = datetime.now(timezone.utc)
    inc.status = "RESOLVED"
    inc.resolved_at = now
    inc.resolution_summary = req.resolution_summary

    # Resolve linked alerts
    if inc.alerts:
        for alt in inc.alerts:
            alt.status = "RESOLVED"
            alt.resolved_at = now

    db.commit()
    db.refresh(inc)

    return {
        "message": f"Incident #{inc.id} successfully resolved.",
        "id": inc.id,
        "status": inc.status,
        "incident": _format_incident(inc, db),
    }


@router.get("/{incident_id}/timeline")
def get_incident_timeline(
    incident_id: int,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    mongo=Depends(get_mongo_db),
    current_user: dict = Depends(
        require_role("admin", "security_analyst", "soc_engineer", "security_manager")
    ),
):
    """
    Generates the merged multi-source chronological investigation timeline
    combining activity logs, rule anomalies, ML outliers, alerts, and case notes.
    """
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")

    return build_investigation_timeline(
        employee_id=inc.employee.employee_id if inc.employee else str(inc.employee_id),
        incident_id=inc.id,
        db=db,
        mongo=mongo,
        limit=limit,
    )
