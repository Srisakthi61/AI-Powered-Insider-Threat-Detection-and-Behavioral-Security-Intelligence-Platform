from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Employee
from app.schemas import (
    EmployeeCreate,
    EmployeeUpdate,
    EmployeeResponse,
    DirectReportsResponse,
)
from app.security import require_role

router = APIRouter()


@router.post("/", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
def create_employee(
    request: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "security_manager")),
):
    """
    Register a new monitored employee in the organization.
    Restricted to 'admin' and 'security_manager' roles.
    """
    # 1. Check whether employee_id already exists
    existing = db.query(Employee).filter(Employee.employee_id == request.employee_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee ID already exists",
        )

    # 2. Verify manager_id if provided
    if request.manager_id is not None:
        manager = db.query(Employee).filter(Employee.id == request.manager_id).first()
        if not manager:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="manager_id does not match any existing employee",
            )

    # 3. Create employee record
    new_employee = Employee(
        employee_id=request.employee_id,
        name=request.name,
        department=request.department,
        designation=request.designation,
        manager_id=request.manager_id,
        device_info=request.device_info,
        access_privileges=request.access_privileges,
    )
    db.add(new_employee)
    db.commit()
    db.refresh(new_employee)

    return new_employee


@router.get("/", response_model=List[EmployeeResponse])
def list_employees(
    department: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_role("admin", "security_analyst", "soc_engineer", "security_manager")
    ),
):
    """
    List all monitored employees, with optional department filtering.
    Accessible by: admin, security_analyst, soc_engineer, security_manager.
    """
    query = db.query(Employee)
    if department:
        query = query.filter(Employee.department == department)
    return query.all()


@router.get("/{employee_id}/reports", response_model=DirectReportsResponse)
def get_employee_direct_reports(
    employee_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "security_manager")),
):
    """
    Retrieve direct reports for a given manager.
    Restricted to 'admin' and 'security_manager' roles.
    """
    # 1. Find manager by employee_id
    manager = db.query(Employee).filter(Employee.employee_id == employee_id).first()
    if not manager:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found",
        )

    # 2. Find direct reports whose manager_id matches manager.id
    reports = db.query(Employee).filter(Employee.manager_id == manager.id).all()
    return DirectReportsResponse(
        manager=manager.name,
        direct_reports=[emp.name for emp in reports],
    )


@router.get("/{employee_id}", response_model=EmployeeResponse)
def get_employee(
    employee_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_role("admin", "security_analyst", "soc_engineer", "security_manager")
    ),
):
    """
    Retrieve an employee profile by employee_id.
    Accessible by: admin, security_analyst, soc_engineer, security_manager.
    """
    employee = db.query(Employee).filter(Employee.employee_id == employee_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found",
        )
    return employee


@router.patch("/{employee_id}", response_model=EmployeeResponse)
def update_employee(
    employee_id: str,
    request: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "security_manager")),
):
    """
    Update selected fields of an employee profile.
    Only provided fields are modified; unset fields remain unchanged.
    Restricted to 'admin' and 'security_manager' roles.
    """
    # 1. Find employee
    employee = db.query(Employee).filter(Employee.employee_id == employee_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found",
        )

    # 2. Extract only explicitly set fields
    update_data = request.model_dump(exclude_unset=True)

    # 3. Validate manager_id if included
    if "manager_id" in update_data and update_data["manager_id"] is not None:
        manager = db.query(Employee).filter(Employee.id == update_data["manager_id"]).first()
        if not manager:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="manager_id does not match any existing employee",
            )

    # 4. Apply updates
    for field, value in update_data.items():
        setattr(employee, field, value)

    db.commit()
    db.refresh(employee)
    return employee
