from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import User
from app.security import require_role

router = APIRouter()


@router.get("/users")
def get_admin_users(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    """
    List of all platform users and RBAC distribution.
    Restricted to 'admin' role only.
    """
    all_users = db.query(User).all()
    user_list = [
        {
            "id": u.id,
            "email": u.email,
            "role": u.role,
        }
        for u in all_users
    ]

    role_counts = (
        db.query(User.role, func.count(User.id)).group_by(User.role).all()
    )
    counts_map = {r: c for r, c in role_counts}

    roles_summary = [
        {
            "role": "Analysts",
            "type": "security_analyst",
            "count": counts_map.get("security_analyst", 0),
            "pending": "-",
            "icon": "monitoring",
            "bgIcon": "bg-surface-container",
        },
        {
            "role": "SOC Team",
            "type": "soc_engineer",
            "count": counts_map.get("soc_engineer", 0),
            "pending": "-",
            "icon": "policy",
            "bgIcon": "bg-surface-container",
        },
        {
            "role": "Managers",
            "type": "security_manager",
            "count": counts_map.get("security_manager", 0),
            "pending": "-",
            "icon": "manage_accounts",
            "bgIcon": "bg-surface-container",
        },
        {
            "role": "Administrators",
            "type": "admin",
            "count": counts_map.get("admin", 0),
            "pending": "-",
            "icon": "admin_panel_settings",
            "bgIcon": "bg-primary-fixed-dim text-on-primary-fixed-variant",
        },
    ]

    platform_roles = [
        {
            "role": "Security Analyst",
            "code": "security_analyst",
            "permissions": "View dashboards, alerts queue, activity logs, triage investigations",
            "count": counts_map.get("security_analyst", 0),
            "active": True,
        },
        {
            "role": "Security Manager",
            "code": "security_manager",
            "permissions": "Access executive reports, org risk posture, manage employee records & direct reports",
            "count": counts_map.get("security_manager", 0),
            "active": True,
        },
        {
            "role": "SOC Engineer",
            "code": "soc_engineer",
            "permissions": "Live event stream ingestion, ingest digital activity logs into MongoDB, anomaly monitor",
            "count": counts_map.get("soc_engineer", 0),
            "active": True,
        },
        {
            "role": "Administrator",
            "code": "admin",
            "permissions": "Full superuser privileges across all endpoints, PostgreSQL & MongoDB governance",
            "count": counts_map.get("admin", 0),
            "active": True,
        },
    ]

    return {
        "message": "List of all platform users",
        "total_users": len(all_users),
        "users": user_list,
        "roles_summary": roles_summary,
        "platform_roles": platform_roles,
    }
