import os
import sys
import random
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any

# Ensure backend root is in sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from sqlalchemy import text
from app.database import engine, Base, SessionLocal, get_mongo_db
from app.models import User, Employee, Alert, Incident, InvestigationNote, RiskSnapshot
from app.security import hash_password
from app.behavioral_profiling import calculate_all_system_baselines
from app.ml_anomaly_model import train_anomaly_model, get_enriched_anomaly_report


# ==============================================================================
# Employee Profiles & Baseline Behavioral Configurations
# ==============================================================================
EMPLOYEE_PROFILES = [
    {
        "employee_id": "EMP1001",
        "name": "Rohit Sharma",
        "department": "Finance",
        "designation": "Finance Manager",
        "device_info": "Dell Latitude 7420, Hostname: FIN-LT-01",
        "access_privileges": "finance_read_write,erp_admin,payroll_read",
        "login_mean": 9.15,
        "login_std": 0.35,
        "transfer_mean": 25.0,
        "transfer_std": 8.0,
        "is_threat": False,
    },
    {
        "employee_id": "EMP1002",
        "name": "Ayesha Khan",
        "department": "Finance",
        "designation": "Financial Analyst",
        "device_info": "HP EliteBook 840, Hostname: FIN-LT-02",
        "access_privileges": "finance_read_only,quickbooks_user",
        "login_mean": 9.00,
        "login_std": 0.35,
        "transfer_mean": 20.0,
        "transfer_std": 6.0,
        "is_threat": False,
    },
    {
        "employee_id": "EMP1003",
        "name": "Daniel Lee",
        "department": "IT",
        "designation": "System Administrator",
        "device_info": "ThinkPad T14, Hostname: IT-LT-01",
        "access_privileges": "domain_admin,cloud_console,ssh_root",
        "login_mean": 8.85,
        "login_std": 0.30,
        "transfer_mean": 30.0,
        "transfer_std": 8.0,
        "is_threat": False,
    },
    {
        "employee_id": "EMP1004",
        "name": "Vikram Patel",
        "department": "IT",
        "designation": "Network Engineer",
        "device_info": "Dell Precision 5560, Hostname: IT-LT-02",
        "access_privileges": "vpn_admin,firewall_operator",
        "login_mean": 8.90,
        "login_std": 0.35,
        "transfer_mean": 30.0,
        "transfer_std": 10.0,
        "is_threat": False,
    },
    {
        "employee_id": "EMP1005",
        "name": "Sarah Connor",
        "department": "Engineering",
        "designation": "Software Architect",
        "device_info": "MacBook Pro 16, Hostname: ENG-MB-01",
        "access_privileges": "git_admin,aws_deployer,prod_db_read",
        "login_mean": 9.25,
        "login_std": 0.35,
        "transfer_mean": 35.0,
        "transfer_std": 10.0,
        "is_threat": False,
    },
    {
        "employee_id": "EMP1006",
        "name": "Rajesh Kumar",
        "department": "Finance",
        "designation": "Senior Accountant",
        "device_info": "Lenovo Yoga, Hostname: FIN-LT-03",
        "access_privileges": "finance_read_write,payroll_user",
        "login_mean": 9.10,
        "login_std": 0.30,
        "transfer_mean": 22.0,
        "transfer_std": 6.0,
        "is_threat": False,
    },
    {
        "employee_id": "EMP1007",
        "name": "John Doe",
        "department": "Engineering",
        "designation": "Lead Infrastructure Engineer",
        "device_info": "Dell Precision 5560, Hostname: ENG-LT-02",
        "access_privileges": "prod_cluster_admin,usb_allowed",
        "login_mean": 9.20,
        "login_std": 0.35,
        "transfer_mean": 35.0,
        "transfer_std": 10.0,
        "is_threat": False,
    },
    {
        "employee_id": "EMP1008",
        "name": "Alex Johnson",
        "department": "Sales",
        "designation": "Enterprise Account Exec",
        "device_info": "Lenovo Yoga X1, Hostname: SLS-LT-01",
        "access_privileges": "salesforce_admin,crm_export",
        "login_mean": 9.15,
        "login_std": 0.35,
        "transfer_mean": 25.0,
        "transfer_std": 8.0,
        "is_threat": False,
    },
    {
        "employee_id": "EMP1009",
        "name": "David Miller",
        "department": "Marketing",
        "designation": "Content Strategist",
        "device_info": "MacBook Air M2, Hostname: MKT-MB-01",
        "access_privileges": "marketing_cloud,creative_suite",
        "login_mean": 9.20,
        "login_std": 0.35,
        "transfer_mean": 28.0,
        "transfer_std": 8.0,
        "is_threat": False,
    },
    {
        "employee_id": "EMP1010",
        "name": "Emily Davis",
        "department": "Human Resources",
        "designation": "Talent Acquisition Lead",
        "device_info": "HP EliteBook 840, Hostname: HR-LT-01",
        "access_privileges": "hris_admin,workday_user",
        "login_mean": 9.05,
        "login_std": 0.30,
        "transfer_mean": 20.0,
        "transfer_std": 5.0,
        "is_threat": False,
    },
    {
        "employee_id": "EMP1011",
        "name": "Robert Jones",
        "department": "Engineering",
        "designation": "Senior Backend Engineer",
        "device_info": "ThinkPad P1, Hostname: ENG-LT-03",
        "access_privileges": "git_write,k8s_developer",
        "login_mean": 9.15,
        "login_std": 0.35,
        "transfer_mean": 32.0,
        "transfer_std": 9.0,
        "is_threat": False,
    },
    {
        "employee_id": "EMP1012",
        "name": "Maria Garcia",
        "department": "Engineering",
        "designation": "Senior DevOps Engineer",
        "device_info": "MacBook Pro 14, Hostname: ENG-MB-04",
        "access_privileges": "ci_cd_admin,docker_registry",
        "login_mean": 9.20,
        "login_std": 0.35,
        "transfer_mean": 35.0,
        "transfer_std": 10.0,
        "is_threat": False,
    },
    {
        "employee_id": "EMP1013",
        "name": "Alice Smith",
        "department": "Finance",
        "designation": "Senior Quantitative Analyst",
        "device_info": "Dell Latitude 7420, Hostname: FIN-LT-04",
        "access_privileges": "finance_read_write,payroll_read",
        "login_mean": 9.10,
        "login_std": 0.35,
        "transfer_mean": 25.0,
        "transfer_std": 7.0,
        "is_threat": False,
    },
]




def ensure_database_schema():
    """Ensure all required tables and columns exist in PostgreSQL."""
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE alerts ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'UNASSIGNED';"))
        conn.execute(text("ALTER TABLE alerts ADD COLUMN IF NOT EXISTS details TEXT;"))
        conn.execute(text("ALTER TABLE alerts ADD COLUMN IF NOT EXISTS recommended_action TEXT;"))
        conn.commit()


def seed_users():
    """Seed default administrative & role-specific test users, removing any test/ephemeral users."""
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
        print("[OK] Users verified and seeded in PostgreSQL (4 official users).")
    finally:
        db.close()


def seed_employees():
    """Ensure only official 13 employees exist in PostgreSQL, removing leftover test entities."""
    db = SessionLocal()
    try:
        valid_emp_ids = [emp["employee_id"] for emp in EMPLOYEE_PROFILES]

        # Remove ephemeral test employees that have no official profile
        db.query(Employee).filter(~Employee.employee_id.in_(valid_emp_ids)).delete(synchronize_session=False)
        db.commit()

        for emp_data in EMPLOYEE_PROFILES:
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
            else:
                existing.name = emp_data["name"]
                existing.department = emp_data["department"]
                existing.designation = emp_data["designation"]
                existing.device_info = emp_data["device_info"]
                existing.access_privileges = emp_data["access_privileges"]

        db.commit()

        # Update manager hierarchy
        rohit = db.query(Employee).filter(Employee.employee_id == "EMP1001").first()
        daniel = db.query(Employee).filter(Employee.employee_id == "EMP1003").first()

        subordinates_map = {
            "EMP1002": rohit.id if rohit else None,
            "EMP1006": rohit.id if rohit else None,
            "EMP1004": daniel.id if daniel else None,
        }

        for emp_code, mgr_id in subordinates_map.items():
            emp = db.query(Employee).filter(Employee.employee_id == emp_code).first()
            if emp and mgr_id:
                emp.manager_id = mgr_id

        db.commit()
        total_emps = db.query(Employee).count()
        print(f"[OK] Employees verified in PostgreSQL ({total_emps} total records).")
    finally:
        db.close()


def generate_10000_activity_logs() -> List[Dict[str, Any]]:
    """
    Generates exactly 10,000 realistic, rich activity logs across 60 days.
    """
    random.seed(42)  # Deterministic repeatability
    now = datetime.now(timezone.utc)
    logs = []

    # Calculate events per employee (~769 logs per employee across 13 employees = 10,000 total)
    total_target = 10000
    base_per_emp = total_target // len(EMPLOYEE_PROFILES)
    remainder = total_target % len(EMPLOYEE_PROFILES)

    file_names = {
        "Engineering": ["itbis-core-v2.tar.gz", "main.rs", "deploy_k8s.yaml", "schema.sql", "app_bundle.js", "infra_terraform.tf", "api_gateway.go"],
        "Finance": ["Q1_Financial_Report.xlsx", "tax_filing_2026.pdf", "audit_trial_balance.xlsx", "payroll_summary.csv", "vendor_invoices.pdf", "budget_forecast.xlsx"],
        "IT": ["firewall_rules.conf", "vpn_config.ovpn", "ssl_cert_chain.pem", "ad_user_sync.py", "backup_snapshot.img", "system_health.log"],
        "Sales": ["Q3_Pipeline_Forecast.xlsx", "enterprise_contracts.pdf", "client_lead_export.csv", "pricing_model_v4.xlsx", "nda_signed_corp.pdf"],
        "Marketing": ["brand_guidelines_2026.ai", "hero_banner_4k.psd", "campaign_metrics.xlsx", "press_release_launch.docx", "promo_video.mp4"],
        "Human Resources": ["employee_evaluations_q2.pdf", "offer_letter_template.docx", "compensation_benchmark.xlsx", "onboarding_checklist.pdf"]
    }

    event_type_weights = [
        ("login", 0.30),
        ("file_download", 0.18),
        ("file_upload", 0.12),
        ("data_transfer", 0.16),
        ("email_activity", 0.14),
        ("privilege_change", 0.03),
        ("remote_access", 0.05),
        ("usb_connect", 0.02)
    ]
    event_choices, weights = zip(*event_type_weights)

    for idx, emp in enumerate(EMPLOYEE_PROFILES):
        emp_id = emp["employee_id"]
        dept = emp["department"]
        device = emp["device_info"].split(",")[0].strip()
        is_threat = emp.get("is_threat", False)
        threat_type = emp.get("threat_type")

        target_logs = base_per_emp + (1 if idx < remainder else 0)

        for _ in range(target_logs):
            # Pick a random day in the past 60 days
            days_ago = random.randint(0, 59)
            base_date = now - timedelta(days=days_ago)

            event_type = random.choices(event_choices, weights=weights)[0]

            # Determine timestamp hour
            # Check if this specific log is an injected threat event
            is_anomaly_event = is_threat and (random.random() < 0.12)  # 12% of events for threat employees are anomalous

            if is_anomaly_event:
                # Injected threat logic
                if threat_type == "usb_exfiltration":
                    event_type = "usb_connect"
                    hour = random.uniform(21.0, 23.9) if random.random() < 0.4 else random.gauss(emp["login_mean"], emp["login_std"])
                    transferred_mb = round(random.uniform(2500.0, 8500.0), 1)
                    file_cnt = random.randint(120, 480)
                    details = {
                        "device_name": random.choice(["SanDisk Extreme 128GB", "Kingston DataTraveler 64GB", "Samsung BAR Plus 256GB"]),
                        "vendor_id": "0781",
                        "product_id": "5581",
                        "file_count": file_cnt,
                        "transferred_mb": transferred_mb,
                        "destination_path": "E:/Corporate_Source_Dump/",
                        "risk_flag": "critical_exfiltration"
                    }

                elif threat_type == "off_hours_payroll_db":
                    # Alice Smith off-hours sensitive query at ~03:15 AM
                    hour = random.gauss(3.25, 0.2)  # 3:15 AM
                    event_type = random.choice(["remote_access", "data_transfer", "file_download"])
                    details = {
                        "ip_address": "203.0.113.88",
                        "protocol": "SSH/Postgres",
                        "destination_table": "payroll_2026",
                        "location": "Residential Subnet / Off-Hours",
                        "transferred_mb": round(random.uniform(450.0, 1800.0), 1),
                        "risk_flag": "unauthorized_payroll_query"
                    }

                elif threat_type == "privilege_escalation":
                    # Robert Jones sudo privilege escalation
                    hour = random.gauss(emp["login_mean"], emp["login_std"])
                    event_type = "privilege_change"
                    details = {
                        "command": random.choice(["sudo -u root /bin/bash", "sudo chmod 777 /etc/shadow", "kubectl edit clusterrolebinding admin"]),
                        "target_host": "prod-k8s-master-01",
                        "status": "denied",
                        "requested_privilege": "root_cluster_admin",
                        "risk_flag": "unauthorized_sudo_escalation"
                    }

                elif threat_type == "brute_force_crm":
                    # Alex Johnson failed logins + bulk CRM dumps
                    hour = random.uniform(1.0, 4.0) if random.random() < 0.5 else random.gauss(emp["login_mean"], emp["login_std"])
                    event_type = "login" if random.random() < 0.6 else "data_transfer"
                    if event_type == "login":
                        details = {
                            "ip_address": "198.51.100.24",
                            "device": "Unknown Chrome Linux Terminal",
                            "status": "failed_mfa_bruteforce",
                            "attempt_count": random.randint(5, 12),
                            "risk_flag": "brute_force_attack"
                        }
                    else:
                        details = {
                            "destination": "MegaCloud Storage",
                            "records_exported": 5000,
                            "transferred_mb": round(random.uniform(300.0, 950.0), 1),
                            "target_db": "salesforce_enterprise_contacts",
                            "risk_flag": "unauthorized_crm_bulk_export"
                        }

                elif threat_type == "vpn_anomaly":
                    # Vikram Patel anomalous VPN duration & egress
                    hour = random.uniform(22.0, 23.5)
                    event_type = "remote_access"
                    details = {
                        "protocol": "VPN",
                        "gateway": "vpn-gw-01.itbis.corp",
                        "duration_min": random.randint(750, 1200),
                        "transferred_mb": round(random.uniform(1200.0, 4000.0), 1),
                        "risk_flag": "anomalous_vpn_session"
                    }
                else:
                    hour = random.gauss(emp["login_mean"], emp["login_std"])
                    details = {"action": "routine_activity"}

            else:
                # Normal baseline event
                hour = random.gauss(emp["login_mean"], emp["login_std"])
                hour = max(7.0, min(20.0, hour))  # Normal working hours

                dept_files = file_names.get(dept, ["report.pdf", "data.xlsx"])
                dept_file = random.choice(dept_files)

                if event_type == "login":
                    details = {
                        "ip_address": f"192.168.1.{random.randint(10, 220)}",
                        "device": device,
                        "status": "success",
                        "location": f"{dept} Corporate LAN"
                    }
                elif event_type == "file_download":
                    details = {
                        "file_name": dept_file,
                        "file_size_mb": round(max(0.5, random.gauss(emp["transfer_mean"] * 0.4, emp["transfer_std"] * 0.3)), 2),
                        "source": f"SharePoint/{dept}",
                    }
                elif event_type == "file_upload":
                    details = {
                        "file_name": dept_file,
                        "file_size_mb": round(max(0.5, random.gauss(emp["transfer_mean"] * 0.6, emp["transfer_std"] * 0.4)), 2),
                        "destination": f"Internal/{dept}_Artifacts",
                    }
                elif event_type == "data_transfer":
                    details = {
                        "destination": f"{dept.lower()}-services.internal.corp",
                        "transferred_mb": round(max(1.0, random.gauss(emp["transfer_mean"], emp["transfer_std"])), 2),
                        "protocol": "HTTPS"
                    }
                elif event_type == "email_activity":
                    details = {
                        "recipient_domain": "corp.itbis.com" if random.random() < 0.8 else "partner-client.com",
                        "attachment_count": random.randint(0, 3),
                        "total_attachment_mb": round(random.uniform(0.1, 15.0) if random.random() < 0.5 else 0.0, 2)
                    }
                elif event_type == "privilege_change":
                    allowed_p = emp["access_privileges"].split(",")[0]
                    details = {
                        "command": f"verify_role {allowed_p}",
                        "status": "authorized",
                        "target_host": f"{dept.lower()}-srv-01"
                    }
                elif event_type == "remote_access":
                    details = {
                        "protocol": "VPN",
                        "gateway": "vpn-gw-01.itbis.corp",
                        "duration_min": random.randint(30, 240)
                    }
                elif event_type == "usb_connect":
                    details = {
                        "device_name": "Corporate Encrypted Key 16GB",
                        "vendor_id": "0930",
                        "transferred_mb": round(random.uniform(1.0, 15.0), 2),
                        "file_count": random.randint(1, 3)
                    }
                else:
                    details = {"action": "standard_event"}

            # Build exact datetime
            dt_hour = int(hour) % 24
            dt_min = int((hour % 1) * 60)
            dt_sec = random.randint(0, 59)
            event_timestamp = base_date.replace(hour=dt_hour, minute=dt_min, second=dt_sec, microsecond=0)

            logs.append({
                "employee_id": emp_id,
                "event_type": event_type,
                "timestamp": event_timestamp,
                "details": details
            })

    # Sort all 10,000 logs by timestamp
    logs.sort(key=lambda x: x["timestamp"])
    return logs


def seed_clean_state_in_postgres():
    """Ensure PostgreSQL starts completely clean: 0 alerts, 0 incidents, 0 notes, 0 stale risk snapshots."""
    db = SessionLocal()
    try:
        db.query(InvestigationNote).delete()
        db.query(Alert).delete()
        db.query(Incident).delete()
        db.query(RiskSnapshot).delete()
        db.commit()
        print("[OK] PostgreSQL alerts, incidents, notes, and risk snapshots cleared (clean standby state).")
    finally:
        db.close()


def run_full_seeding_and_baseline_generation():
    """Master seeding pipeline executing full Milestone 2 data generation."""
    print("=" * 70)
    print("ITBIS MILESTONE 2: 10,000 DATA POINTS & BEHAVIORAL INTELLIGENCE SEEDING")
    print("=" * 70)

    # 1. Database Schema
    ensure_database_schema()

    # 2. Seed Users & Employees in PostgreSQL
    seed_clean_state_in_postgres()
    seed_users()
    seed_employees()

    # 3. Seed 10,000 Activity Logs in MongoDB
    mongo = get_mongo_db()
    logs_col = mongo["activity_logs"]
    baselines_col = mongo["behavioral_baselines"]
    risk_snapshots_col = mongo["risk_snapshots"]

    print("\n[->] Clearing existing activity_logs, behavioral_baselines, & risk_snapshots in MongoDB...")
    logs_col.delete_many({})
    baselines_col.delete_many({})
    risk_snapshots_col.delete_many({})

    print("[->] Synthesizing 10,000 realistic multi-indicator activity logs across 60 days...")
    logs = generate_10000_activity_logs()
    print(f"[->] Generated {len(logs)} activity logs. Inserting into MongoDB in batches...")

    # Batch insert in chunks of 1000
    batch_size = 1000
    for i in range(0, len(logs), batch_size):
        batch = logs[i:i + batch_size]
        logs_col.insert_many(batch)
        print(f"  * Inserted logs {i + 1} to {min(i + batch_size, len(logs))}")

    total_logs_in_db = logs_col.count_documents({})
    print(f"[OK] MongoDB activity_logs populated with exactly {total_logs_in_db} data points.")

    # 4. Compute all 6 Behavioral Baselines across all employees
    print("\n[->] Calculating Behavioral Baselines for all employees across the 6 indicators:")
    print("  1. Login Times (avg_login_hour, std_deviation)")
    print("  2. Resource Access Frequency (daily_resource_access, std_deviation)")
    print("  3. Device Usage (primary_device, known_devices, ratio)")
    print("  4. Application Usage (daily_app_events, std_deviation)")
    print("  5. Data Transfer Volume (avg_data_transfer_mb, std_deviation)")
    print("  6. Communication Patterns (daily_email_count, attachment_mb, std_deviation)")

    baseline_res = calculate_all_system_baselines(mongo)
    total_baselines = baselines_col.count_documents({})
    print(f"[OK] Successfully computed and upserted {total_baselines} baseline documents across {baseline_res['total_employees']} employees.")

    # 5. Train and Cache ML Isolation Forest Anomaly Model
    print("\n[->] Training scikit-learn Isolation Forest ML Anomaly Detection Model on baseline feature matrix...")
    ml_df = train_anomaly_model(force_retrain=True, mongo=mongo)
    report = get_enriched_anomaly_report(mongo=mongo)
    print(f"[OK] ML Isolation Forest trained. Analyzed {report['total_employees_analyzed']} employees, flagged {report['flagged_count']} threat outliers:")
    for flagged in report["flagged_employees"]:
        print(f"   - [Rank #{flagged.get('threat_rank', '?')}] {flagged['employee_id']} ({flagged['name']} - {flagged['department']}): Anomaly Score = {flagged['anomaly_score']:.4f} | Risk = {flagged['risk_level']}")

    # 6. Ensure clean alerts and incidents in PostgreSQL
    print("\n[->] Syncing clean PostgreSQL security alerts & incidents...")
    seed_clean_state_in_postgres()

    # 7. Generate clean initial 5-factor risk snapshots
    print("\n[->] Generating clean initial 5-factor risk snapshots for all employees...")
    from app.risk_scoring import record_all_daily_risk_snapshots
    snapshots = record_all_daily_risk_snapshots(mongo=mongo)
    print(f"[OK] Persisted {len(snapshots)} nominal risk snapshots across organization.")

    print("\n" + "=" * 70)
    print("[SUCCESS] MILESTONE 2 SEEDING & BEHAVIORAL BASELINE INITIALIZATION COMPLETE!")
    print(f"  * Total Activity Logs: {total_logs_in_db}")
    print(f"  * Total Baselines Generated: {total_baselines}")
    print(f"  * Flagged ML Threat Profiles: {report['flagged_count']}")
    print(f"  * Clean Initial Alerts: 0")
    print("=" * 70)


if __name__ == "__main__":
    run_full_seeding_and_baseline_generation()

