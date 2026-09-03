from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pymongo.database import Database

from app.database import get_db, get_mongo_db
from app.models import Employee
from app.schemas import LogIngestRequest, LogIngestResponse
from app.security import require_role

router = APIRouter()

# Strictly allowed event types per official Day 9–10 specification
ALLOWED_EVENT_TYPES = {
    "login",
    "file_download",
    "file_upload",
    "data_transfer",
    "email_activity",
    "privilege_change",
    "remote_access",
    "usb_connect",
}


@router.post("/ingest", response_model=LogIngestResponse, status_code=status.HTTP_201_CREATED)
def ingest_log(
    request: LogIngestRequest,
    db: Session = Depends(get_db),
    mongo: Database = Depends(get_mongo_db),
    current_user: dict = Depends(require_role("admin", "soc_engineer")),
):
    """
    Ingest a new employee digital activity log into MongoDB.
    Restricted to 'admin' and 'soc_engineer' roles.
    Validates event_type and verifies employee existence in PostgreSQL.
    """
    event_type = request.event_type.strip()
    employee_id = request.employee_id.strip()

    # 1. Validate event_type
    if event_type not in ALLOWED_EVENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown event_type: {request.event_type}",
        )

    # 2. Validate employee_id against PostgreSQL employees table
    employee = db.query(Employee).filter(Employee.employee_id == employee_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="employee_id does not match any known employee",
        )

    # 3. Construct and insert document into MongoDB
    log_doc = {
        "employee_id": employee_id,
        "event_type": event_type,
        "timestamp": datetime.now(timezone.utc),
        "details": request.details,
    }

    result = mongo["activity_logs"].insert_one(log_doc)

    return LogIngestResponse(
        message="Log ingested",
        log_id=str(result.inserted_id),
    )


@router.get("/", response_model=List[Dict[str, Any]])
def get_all_logs(
    event_type: Optional[str] = None,
    employee_id: Optional[str] = None,
    limit: int = Query(50, ge=1, le=1000),
    mongo: Database = Depends(get_mongo_db),
    current_user: dict = Depends(
        require_role("admin", "security_analyst", "soc_engineer", "security_manager")
    ),
):
    """
    Retrieve live stream activity logs across all employees from MongoDB.
    Accessible by admin, security_analyst, soc_engineer, security_manager.
    """
    query: Dict[str, Any] = {}
    if event_type and event_type.upper() != "ALL":
        query["event_type"] = event_type.strip()
    if employee_id:
        query["employee_id"] = employee_id.strip()

    cursor = mongo["activity_logs"].find(query).sort("timestamp", -1).limit(limit)

    logs = []
    for doc in cursor:
        doc["_id"] = str(doc["_id"])
        logs.append(doc)

    return logs


@router.get("/{employee_id}", response_model=List[Dict[str, Any]])
def get_employee_logs(
    employee_id: str,
    event_type: Optional[str] = None,
    limit: int = Query(50, ge=1, le=1000),
    mongo: Database = Depends(get_mongo_db),
    current_user: dict = Depends(
        require_role("admin", "security_analyst", "soc_engineer", "security_manager")
    ),
):
    """
    Retrieve activity logs for a specific employee from MongoDB.
    Supports optional event_type filtering, newest-first sorting, and pagination limit.
    """
    query: Dict[str, Any] = {"employee_id": employee_id.strip()}
    if event_type and event_type.upper() != "ALL":
        query["event_type"] = event_type.strip()

    # Query MongoDB activity_logs collection sorted by timestamp descending
    cursor = mongo["activity_logs"].find(query).sort("timestamp", -1).limit(limit)

    logs = []
    for doc in cursor:
        doc["_id"] = str(doc["_id"])
        logs.append(doc)

    return logs
