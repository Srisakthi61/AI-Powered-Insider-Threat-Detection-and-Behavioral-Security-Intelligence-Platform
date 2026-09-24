from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class EmployeeBase(BaseModel):
    employee_id: str
    name: str
    department: str
    designation: str
    manager_id: Optional[int] = None
    device_info: Optional[str] = None
    access_privileges: Optional[str] = None


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    manager_id: Optional[int] = None
    device_info: Optional[str] = None
    access_privileges: Optional[str] = None


class EmployeeResponse(EmployeeBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class DirectReportsResponse(BaseModel):
    manager: str
    direct_reports: List[str]


# ==============================================================================
# Activity Log Schemas (Day 9–10)
# ==============================================================================

class LogIngestRequest(BaseModel):
    employee_id: str
    event_type: str
    details: Dict[str, Any] = Field(default_factory=dict)


class LogIngestResponse(BaseModel):
    message: str
    log_id: str


# ==============================================================================
# Alert Schemas
# ==============================================================================

class AlertBase(BaseModel):
    employee_id: int
    severity: str
    message: str
    status: str = "UNASSIGNED"
    details: Optional[str] = None
    recommended_action: Optional[str] = None
    assigned_to: Optional[int] = None


class AlertCreate(AlertBase):
    pass


class AlertUpdate(BaseModel):
    severity: Optional[str] = None
    message: Optional[str] = None
    status: Optional[str] = None
    details: Optional[str] = None
    recommended_action: Optional[str] = None
    assigned_to: Optional[int] = None


class AlertResponse(AlertBase):
    id: int
    created_at: Optional[datetime] = None
    employee_code: Optional[str] = None
    employee_name: Optional[str] = None
    department: Optional[str] = None
    target_role: Optional[str] = None
    target_role_title: Optional[str] = None
    risk_level: Optional[str] = None
    ml_anomaly_score: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# Department & Report Schemas
# ==============================================================================

class DepartmentSummary(BaseModel):
    name: str
    employee_count: int
    avg_score: int
    risk_level: str
    color: str
    textColor: str


class RiskPostureResponse(BaseModel):
    message: str
    total_assets: int
    org_risk_score: int
    high_risk_profiles: int
    critical_alerts: int
    open_incidents: int
    asset_tiering: Dict[str, Any]
    department_scores: List[DepartmentSummary]
    compliance_sections: List[Dict[str, Any]]
