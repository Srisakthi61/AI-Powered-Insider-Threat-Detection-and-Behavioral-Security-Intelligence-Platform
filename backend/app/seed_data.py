import os
import sys
from datetime import datetime, timezone, timedelta

# Ensure backend root is in sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from sqlalchemy import text
from app.database import engine, Base, SessionLocal, get_mongo_db
from app.models import User, Employee, Alert, Incident, InvestigationNote, RiskSnapshot
from app.security import hash_password


def ensure_schema():
    """Ensure all required tables and columns exist in PostgreSQL."""
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE alerts ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'UNASSIGNED';"))
        conn.execute(text("ALTER TABLE alerts ADD COLUMN IF NOT EXISTS details TEXT;"))
        conn.execute(text("ALTER TABLE alerts ADD COLUMN IF NOT EXISTS recommended_action TEXT;"))
        conn.commit()


def seed_users():
    """Seed default administrative & role-specific test users into PostgreSQL."""
    db = SessionLocal()
    try:
        default_users = [
            ("admin@itbis.com", "AdminPass123!", "admin"),
            ("analyst@itbis.com", "AnalystPass123!", "security_analyst"),
            ("soc@itbis.com", "SocPass123!", "soc_engineer"),
            ("manager@itbis.com", "MgrPass123!", "security_manager"),
        ]
        default_emails = [u[0] for u in default_users]

        # Clean up ephemeral test accounts
        db.query(User).filter(~User.email.in_(default_emails)).delete(synchronize_session=False)

        for email, pwd, role in default_users:
            existing = db.query(User).filter(User.email == email).first()
            if not existing:
                user = User(
                    email=email,
                    password_hash=hash_password(pwd),
                    role=role,
                )
                db.add(user)
            else:
                existing.role = role
                existing.password_hash = hash_password(pwd)
        db.commit()
        print("Successfully seeded platform users (4 official users).")
    finally:
        db.close()


def seed_employees():
    """Seed comprehensive realistic employee directory records."""
    db = SessionLocal()
    try:
        employee_records = [
            # Leads / Managers (manager_id = None initially)
            {
                "employee_id": "EMP1001",
                "name": "Rohit Sharma",
                "department": "Finance",
                "designation": "Finance Manager",
                "device_info": "Dell Latitude 7420, Hostname: FIN-LT-01",
                "access_privileges": "finance_read_write,erp_admin",
            },
            {
                "employee_id": "EMP1003",
                "name": "Daniel Lee",
                "department": "IT",
                "designation": "System Administrator",
                "device_info": "ThinkPad T14, Hostname: IT-LT-01",
                "access_privileges": "domain_admin,cloud_console,ssh_root",
            },
            {
                "employee_id": "EMP1005",
                "name": "Sarah Connor",
                "department": "Engineering",
                "designation": "Software Architect",
                "device_info": "MacBook Pro 16, Hostname: ENG-MB-01",
                "access_privileges": "git_admin,aws_deployer,prod_db_read",
            },
            {
                "employee_id": "EMP1007",
                "name": "John Doe",
                "department": "Engineering",
                "designation": "Lead Infrastructure Engineer",
                "device_info": "Dell Precision 5560, Hostname: ENG-LT-02",
                "access_privileges": "prod_cluster_admin,usb_allowed",
            },
            {
                "employee_id": "EMP1008",
                "name": "Alex Johnson",
                "department": "Sales",
                "designation": "Enterprise Account Exec",
                "device_info": "Lenovo Yoga X1, Hostname: SLS-LT-01",
                "access_privileges": "salesforce_admin,crm_export",
            },
            {
                "employee_id": "EMP1009",
                "name": "David Miller",
                "department": "Marketing",
                "designation": "Content Strategist",
                "device_info": "MacBook Air M2, Hostname: MKT-MB-01",
                "access_privileges": "marketing_cloud,creative_suite",
            },
            {
                "employee_id": "EMP1010",
                "name": "Emily Davis",
                "department": "Human Resources",
                "designation": "Talent Acquisition Lead",
                "device_info": "HP EliteBook 840, Hostname: HR-LT-01",
                "access_privileges": "hris_admin,workday_user",
            },
            {
                "employee_id": "EMP1011",
                "name": "Robert Jones",
                "department": "Engineering",
                "designation": "Senior Backend Engineer",
                "device_info": "ThinkPad P1, Hostname: ENG-LT-03",
                "access_privileges": "git_write,k8s_developer",
            },
            {
                "employee_id": "EMP1012",
                "name": "Maria Garcia",
                "department": "Engineering",
                "designation": "Senior DevOps Engineer",
                "device_info": "MacBook Pro 14, Hostname: ENG-MB-04",
                "access_privileges": "ci_cd_admin,docker_registry",
            },
            {
                "employee_id": "EMP1013",
                "name": "Alice Smith",
                "department": "Finance",
                "designation": "Senior Quantitative Analyst",
                "device_info": "Dell Latitude 7420, Hostname: FIN-LT-04",
                "access_privileges": "finance_read_write,payroll_read",
            },
        ]

        for emp_data in employee_records:
            existing = db.query(Employee).filter(Employee.employee_id == emp_data["employee_id"]).first()
            if not existing:
                emp = Employee(
                    employee_id=emp_data["employee_id"],
                    name=emp_data["name"],
                    department=emp_data["department"],
                    designation=emp_data["designation"],
                    device_info=emp_data["device_info"],
                    access_privileges=emp_data["access_privileges"],
                )
                db.add(emp)
        db.commit()

        # Add subordinates with manager links
        rohit = db.query(Employee).filter(Employee.employee_id == "EMP1001").first()
        daniel = db.query(Employee).filter(Employee.employee_id == "EMP1003").first()

        subordinates = [
            {
                "employee_id": "EMP1002",
                "name": "Ayesha Khan",
                "department": "Finance",
                "designation": "Financial Analyst",
                "manager_id": rohit.id if rohit else None,
                "device_info": "HP EliteBook 840, Hostname: FIN-LT-02",
                "access_privileges": "finance_read_only,quickbooks_user",
            },
            {
                "employee_id": "EMP1004",
                "name": "Vikram Patel",
                "department": "IT",
                "designation": "Network Engineer",
                "manager_id": daniel.id if daniel else None,
                "device_info": "Dell Precision 5560, Hostname: IT-LT-02",
                "access_privileges": "vpn_admin,firewall_operator",
            },
            {
                "employee_id": "EMP1006",
                "name": "Rajesh Kumar",
                "department": "Finance",
                "designation": "Senior Accountant",
                "manager_id": rohit.id if rohit else None,
                "device_info": "Lenovo Yoga, Hostname: FIN-LT-03",
                "access_privileges": "finance_read_write,payroll_user",
            },
        ]

        for sub in subordinates:
            existing = db.query(Employee).filter(Employee.employee_id == sub["employee_id"]).first()
            if not existing:
                emp = Employee(
                    employee_id=sub["employee_id"],
                    name=sub["name"],
                    department=sub["department"],
                    designation=sub["designation"],
                    manager_id=sub["manager_id"],
                    device_info=sub["device_info"],
                    access_privileges=sub["access_privileges"],
                )
                db.add(emp)
            elif existing and existing.manager_id is None and sub["manager_id"] is not None:
                existing.manager_id = sub["manager_id"]

        db.commit()
        all_emps = db.query(Employee).all()
        print(f"Successfully ensured {len(all_emps)} employee records.")
        return all_emps
    finally:
        db.close()


def seed_alerts():
    """Ensure PostgreSQL starts in clean standby state: 0 alerts, 0 incidents, 0 notes."""
    db = SessionLocal()
    try:
        db.query(InvestigationNote).delete()
        db.query(Alert).delete()
        db.query(Incident).delete()
        db.commit()
        print("[OK] PostgreSQL alerts, incidents, and notes initialized to clean standby state.")
    finally:
        db.close()


def seed_activity_logs():
    """Seed comprehensive realistic activity logs in MongoDB."""
    try:
        mongo = get_mongo_db()
        collection = mongo["activity_logs"]

        existing_count = collection.count_documents({})
        if existing_count >= 10:
            print(f"Sample activity logs already present ({existing_count} documents).")
            return

        now = datetime.now(timezone.utc)
        sample_logs = [
            {
                "employee_id": "EMP1007",
                "event_type": "usb_connect",
                "timestamp": now - timedelta(minutes=10),
                "details": {
                    "device_name": "Corporate Encrypted Key 16GB",
                    "vendor_id": "0930",
                    "product_id": "1400",
                    "file_count": 2,
                    "transferred_mb": 15.0,
                },
            },
            {
                "employee_id": "EMP1011",
                "event_type": "privilege_change",
                "timestamp": now - timedelta(minutes=45),
                "details": {
                    "command": "verify_role k8s_developer",
                    "target_host": "eng-srv-01",
                    "status": "authorized",
                },
            },
            {
                "employee_id": "EMP1013",
                "event_type": "remote_access",
                "timestamp": now - timedelta(hours=2),
                "details": {
                    "ip_address": "192.168.1.115",
                    "protocol": "SSH",
                    "destination_table": "general_ledger_q1",
                    "location": "Finance Department",
                },
            },
            {
                "employee_id": "EMP1008",
                "event_type": "login",
                "timestamp": now - timedelta(hours=3),
                "details": {
                    "ip_address": "192.168.1.88",
                    "device": "Lenovo Yoga X1",
                    "status": "success",
                    "attempt_count": 1,
                },
            },
            {
                "employee_id": "EMP1002",
                "event_type": "file_download",
                "timestamp": now - timedelta(hours=4),
                "details": {
                    "file_name": "Q2_Financial_Statements.xlsx",
                    "file_size_mb": 4.2,
                    "source": "SharePoint/Finance",
                },
            },
            {
                "employee_id": "EMP1003",
                "event_type": "login",
                "timestamp": now - timedelta(hours=5),
                "details": {
                    "ip_address": "192.168.1.10",
                    "device": "ThinkPad T14",
                    "status": "success",
                    "location": "IT Operations Center",
                },
            },
            {
                "employee_id": "EMP1005",
                "event_type": "data_transfer",
                "timestamp": now - timedelta(hours=6),
                "details": {
                    "destination": "AWS ECR Registry",
                    "image_tag": "itbis-core:v2.4",
                    "size_mb": 28.5,
                },
            },
            {
                "employee_id": "EMP1009",
                "event_type": "email_activity",
                "timestamp": now - timedelta(hours=7),
                "details": {
                    "recipient_domain": "corp.itbis.com",
                    "attachment_count": 2,
                    "total_attachment_mb": 4.5,
                },
            },
            {
                "employee_id": "EMP1001",
                "event_type": "login",
                "timestamp": now - timedelta(hours=8),
                "details": {
                    "ip_address": "192.168.1.45",
                    "device": "Dell Latitude 7420",
                    "status": "success",
                    "location": "Finance Department",
                },
            },
            {
                "employee_id": "EMP1004",
                "event_type": "remote_access",
                "timestamp": now - timedelta(hours=9),
                "details": {
                    "protocol": "VPN",
                    "gateway": "vpn-gw-01.itbis.corp",
                    "duration_min": 60,
                },
            },
        ]

        result = collection.insert_many(sample_logs)
        print(f"Successfully inserted {len(result.inserted_ids)} activity logs into MongoDB.")
    except Exception as e:
        print(f"Note: MongoDB activity log seeding error: {e}")



if __name__ == "__main__":
    from app.seed_10k_data import run_full_seeding_and_baseline_generation
    run_full_seeding_and_baseline_generation()
