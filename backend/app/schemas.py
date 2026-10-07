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
    risk_score: Optional[float] = None
    risk_level: Optional[str] = None

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
    incident_id: Optional[int] = None
    severity: str
    message: str
    status: str = "OPEN"
    details: Optional[str] = None
    recommended_action: Optional[str] = None
    assigned_to: Optional[int] = None
    escalated: Optional[str] = "false"


class AlertCreate(AlertBase):
    pass


class AlertUpdate(BaseModel):
    incident_id: Optional[int] = None
    severity: Optional[str] = None
    message: Optional[str] = None
    status: Optional[str] = None
    details: Optional[str] = None
    recommended_action: Optional[str] = None
    assigned_to: Optional[int] = None
    escalated: Optional[str] = None


class AlertResponse(AlertBase):
    id: int
    created_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    employee_code: Optional[str] = None
    employee_name: Optional[str] = None
    department: Optional[str] = None
    target_role: Optional[str] = None
    target_role_title: Optional[str] = None
    assigned_to_email: Optional[str] = None
    risk_level: Optional[str] = None
    ml_anomaly_score: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# Incident Schemas
# ==============================================================================

class IncidentBase(BaseModel):
    employee_id: int
    severity: str = "HIGH"
    status: str = "OPEN"
    summary: Optional[str] = None


class IncidentCreateSchema(BaseModel):
    employee_id: str
    severity: str = "HIGH"
    summary: str
    alert_ids: Optional[List[int]] = Field(default_factory=list)


class IncidentUpdateSchema(BaseModel):
    status: Optional[str] = None
    severity: Optional[str] = None
    summary: Optional[str] = None


class IncidentResponseSchema(IncidentBase):
    id: int
    created_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    created_by: Optional[int] = None
    resolution_summary: Optional[str] = None
    employee_code: Optional[str] = None
    employee_name: Optional[str] = None
    department: Optional[str] = None
    notes_count: Optional[int] = 0
    alerts_count: Optional[int] = 0

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


# ==============================================================================
# UEBA Risk Snapshot & Anomaly Trend Schemas
# ==============================================================================

class RiskSnapshotResponse(BaseModel):
    id: int
    employee_id: int
    risk_score: int
    risk_level: str
    behavioral_anomalies_score: float
    privilege_misuse_score: float
    data_access_violations_score: float
    access_pattern_deviations_score: float
    historical_security_events_score: float
    calculated_at: Optional[datetime] = None
    snapshot_date: Any

    model_config = ConfigDict(from_attributes=True)


class AnomalyTrendDay(BaseModel):
    date: str
    day: str
    total_anomalies: int
    rule_anomalies: int
    ml_anomalies: int
    critical: int
    high: int
    medium: int
    low: int
    total_activity_logs: int


class AnomalyTrendResponse(BaseModel):
    days: int
    total_anomalies: int
    trend: List[AnomalyTrendDay]
