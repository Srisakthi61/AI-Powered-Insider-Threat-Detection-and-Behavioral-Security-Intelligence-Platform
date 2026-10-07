from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db, get_mongo_db
from app.models import Employee
from app.schemas import EmployeeResponse, DepartmentSummary
from app.security import require_role
from app.risk_scoring import calculate_all_employee_risk_scores, score_to_risk_level

router = APIRouter()


@router.get("/", response_model=List[DepartmentSummary])
def list_departments(
    db: Session = Depends(get_db),
    mongo=Depends(get_mongo_db),
    current_user: dict = Depends(
        require_role("admin", "security_analyst", "soc_engineer", "security_manager")
    ),
):
    """
    Retrieve all departments with real employee counts and dynamically aggregated risk scores.
    """
    # 1. Fetch all employees risk scores
    all_scores = calculate_all_employee_risk_scores(db=db, mongo=mongo)

    # 2. Group by department
    dept_map = {}
    for r in all_scores:
        dept = r.get("department", "General")
        dept_map.setdefault(dept, []).append(r["overall_score"])

    # If no employees found, fallback to distinct DB query
    if not dept_map:
        dept_counts = (
            db.query(Employee.department, func.count(Employee.id))
            .group_by(Employee.department)
            .all()
        )
        for dept_name, count in dept_counts:
            dept_map[dept_name] = [20] * count

    summaries = []
    for dept_name, scores in dept_map.items():
        avg_score = int(round(sum(scores) / len(scores))) if scores else 0
        risk_lvl = score_to_risk_level(avg_score)

        if risk_lvl == "Critical":
            color = "bg-error"
            text_color = "text-error"
        elif risk_lvl == "High":
            color = "bg-tertiary"
            text_color = "text-tertiary"
        elif risk_lvl == "Medium":
            color = "bg-primary"
            text_color = "text-primary"
        else:
            color = "bg-secondary"
            text_color = "text-secondary"

        summaries.append(
            DepartmentSummary(
                name=dept_name,
                employee_count=len(scores),
                avg_score=avg_score,
                risk_level=risk_lvl,
                color=color,
                textColor=text_color,
            )
        )

    # Sort by risk score descending
    summaries.sort(key=lambda x: x.avg_score, reverse=True)
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
