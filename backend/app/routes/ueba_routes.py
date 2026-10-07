from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pymongo.database import Database

from app.database import get_db, get_mongo_db
from app.models import Employee
from app.security import require_role
from app.risk_scoring import (
    calculate_employee_risk_score,
    calculate_all_employee_risk_scores,
    record_daily_risk_snapshot,
    record_all_daily_risk_snapshots,
)
from app.ueba_engine import (
    get_peer_comparison,
    get_14_day_risk_trend,
    get_combined_ueba_profile,
)
from app.investigation_timeline import build_investigation_timeline

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


@router.post("/snapshot/{employee_id}", status_code=status.HTTP_201_CREATED)
def create_employee_risk_snapshot(
    employee_id: str,
    db: Session = Depends(get_db),
    mongo: Database = Depends(get_mongo_db),
    current_user: dict = Depends(
        require_role("admin", "security_analyst", "soc_engineer", "security_manager")
    ),
):
    """
    Computes current 5-factor risk score and persists / updates a daily risk snapshot.
    Prevents duplicate entries for the same employee and calendar date.
    """
    emp = _find_employee(db, employee_id)
    if not emp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    snap = record_daily_risk_snapshot(emp.employee_id, db=db, mongo=mongo)
    if not snap:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create snapshot")

    return {
        "message": f"Daily risk snapshot recorded for {emp.name} ({emp.employee_id})",
        "id": snap.id,
        "employee_id": snap.employee_id,
        "employee_code": emp.employee_id,
        "snapshot_date": str(snap.snapshot_date),
        "risk_score": snap.risk_score,
        "risk_level": snap.risk_level,
        "factors": {
            "behavioral_anomalies_score": snap.behavioral_anomalies_score,
            "privilege_misuse_score": snap.privilege_misuse_score,
            "data_access_violations_score": snap.data_access_violations_score,
            "access_pattern_deviations_score": snap.access_pattern_deviations_score,
            "historical_security_events_score": snap.historical_security_events_score,
        },
        "calculated_at": snap.calculated_at.isoformat() if snap.calculated_at else None,
    }


@router.post("/snapshots", status_code=status.HTTP_201_CREATED)
def create_all_risk_snapshots(
    db: Session = Depends(get_db),
    mongo: Database = Depends(get_mongo_db),
    current_user: dict = Depends(
        require_role("admin", "security_analyst", "soc_engineer", "security_manager")
    ),
):
    """
    Computes and persists daily risk snapshots for all monitored employees.
    """
    snapshots = record_all_daily_risk_snapshots(db=db, mongo=mongo)
    return {
        "message": f"Persisted {len(snapshots)} daily risk snapshots across organization.",
        "count": len(snapshots),
    }


@router.get("/risk-score/{employee_id}")
def get_employee_5factor_risk_score(
    employee_id: str,
    db: Session = Depends(get_db),
    mongo: Database = Depends(get_mongo_db),
    current_user: dict = Depends(
        require_role("admin", "security_analyst", "soc_engineer", "security_manager")
    ),
):
    """
    Returns the exact 5-factor weighted risk score for an employee:
    - Behavioral Anomalies (35%)
    - Privilege Misuse (25%)
    - Data Access Violations (20%)
    - Access Pattern Deviations (10%)
    - Historical Security Events (10%)
    """
    emp = _find_employee(db, employee_id)
    if not emp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    return calculate_employee_risk_score(emp.employee_id, db=db, mongo=mongo)


@router.get("/risk-scores")
def list_all_risk_scores(
    db: Session = Depends(get_db),
    mongo: Database = Depends(get_mongo_db),
    current_user: dict = Depends(
        require_role("admin", "security_analyst", "soc_engineer", "security_manager")
    ),
):
    """
    Returns all monitored employees ranked by 5-factor risk score.
    """
    return calculate_all_employee_risk_scores(db=db, mongo=mongo)


@router.get("/peer-comparison/{employee_id}")
def get_employee_peer_comparison(
    employee_id: str,
    db: Session = Depends(get_db),
    mongo: Database = Depends(get_mongo_db),
    current_user: dict = Depends(
        require_role("admin", "security_analyst", "soc_engineer", "security_manager")
    ),
):
    """
    Returns department peer-group comparison metrics for an employee.
    """
    emp = _find_employee(db, employee_id)
    if not emp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    return get_peer_comparison(emp.employee_id, db=db, mongo=mongo)


@router.get("/trend/{employee_id}")
def get_employee_14day_trend(
    employee_id: str,
    db: Session = Depends(get_db),
    mongo: Database = Depends(get_mongo_db),
    current_user: dict = Depends(
        require_role("admin", "security_analyst", "soc_engineer", "security_manager")
    ),
):
    """
    Returns 14-day historical daily risk snapshots and calculated trend direction.
    """
    emp = _find_employee(db, employee_id)
    if not emp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    return get_14_day_risk_trend(emp.employee_id, db=db, mongo=mongo)


@router.get("/profile/{employee_id}")
def get_employee_full_ueba_profile(
    employee_id: str,
    db: Session = Depends(get_db),
    mongo: Database = Depends(get_mongo_db),
    current_user: dict = Depends(
        require_role("admin", "security_analyst", "soc_engineer", "security_manager")
    ),
):
    """
    Returns the comprehensive full UEBA investigation dossier for an employee:
    5-factor risk score, peer comparison, 14-day trend, baselines, anomalies, alerts, and incidents.
    """
    emp = _find_employee(db, employee_id)
    if not emp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    profile = get_combined_ueba_profile(emp.employee_id, db=db, mongo=mongo)
    if "error" in profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=profile["error"])
    return profile


@router.get("/timeline/{employee_id}")
def get_employee_investigation_timeline(
    employee_id: str,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    mongo: Database = Depends(get_mongo_db),
    current_user: dict = Depends(
        require_role("admin", "security_analyst", "soc_engineer", "security_manager")
    ),
):
    """
    Returns unified chronological investigation timeline for an employee.
    """
    emp = _find_employee(db, employee_id)
    if not emp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    return build_investigation_timeline(
        employee_id=emp.employee_id,
        incident_id=None,
        db=db,
        mongo=mongo,
        limit=limit,
    )
