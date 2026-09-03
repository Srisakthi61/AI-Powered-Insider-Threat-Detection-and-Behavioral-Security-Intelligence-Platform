from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import Employee
from app.schemas import EmployeeResponse, DepartmentSummary
from app.security import require_role

router = APIRouter()


@router.get("/", response_model=List[DepartmentSummary])
def list_departments(
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_role("admin", "security_analyst", "soc_engineer", "security_manager")
    ),
):
    """
    Retrieve all departments with employee counts and risk indicators from database.
    """
    dept_score_map = {
        "Engineering": {"score": 84, "color": "bg-error", "textColor": "text-error", "risk_level": "Critical"},
        "Finance": {"score": 76, "color": "bg-tertiary", "textColor": "text-tertiary", "risk_level": "High"},
        "Sales": {"score": 62, "color": "bg-primary", "textColor": "text-primary", "risk_level": "Medium"},
        "IT": {"score": 68, "color": "bg-primary", "textColor": "text-primary", "risk_level": "Medium"},
        "Human Resources": {"score": 45, "color": "bg-secondary", "textColor": "text-secondary", "risk_level": "Low"},
        "Marketing": {"score": 38, "color": "bg-secondary", "textColor": "text-secondary", "risk_level": "Low"},
    }

    dept_counts = (
        db.query(Employee.department, func.count(Employee.id))
        .group_by(Employee.department)
        .all()
    )

    summaries = []
    for dept_name, count in dept_counts:
        meta = dept_score_map.get(
            dept_name,
            {"score": 50, "color": "bg-secondary", "textColor": "text-secondary", "risk_level": "Low"},
        )
        summaries.append(
            DepartmentSummary(
                name=dept_name,
                employee_count=count,
                avg_score=meta["score"],
                risk_level=meta["risk_level"],
                color=meta["color"],
                textColor=meta["textColor"],
            )
        )
    return summaries


@router.get("/{department}/employees", response_model=List[EmployeeResponse])
def get_department_employees(
    department: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_role("admin", "security_analyst", "soc_engineer", "security_manager")
    ),
):
    """
    Retrieve all employees belonging to a specific department.
    Accessible by: admin, security_analyst, soc_engineer, security_manager.
    """
    employees = db.query(Employee).filter(Employee.department == department).all()
    return employees
