# Insider Threat Behavioral Intelligence System (ITBIS)

[![CI/CD Pipeline](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110.0-009688.svg?logo=fastapi)]()
[![Next.js](https://img.shields.io/badge/Next.js-16.3.3-black.svg?logo=next.js)]()
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791.svg?logo=postgresql)]()
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0-47A248.svg?logo=mongodb)]()
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.4.1-F7931E.svg?logo=scikitlearn)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE.md)

---

## 1. Executive Summary & Overview

The **Insider Threat Behavioral Intelligence System (ITBIS)** is an enterprise-grade cybersecurity platform architected to detect, investigate, and mitigate malicious and negligent insider threats across corporate networks. 

By unifying **User and Entity Behavior Analytics (UEBA)**, statistical baseline profiling, unsupervised machine learning (**Isolation Forest**), dynamic **5-factor risk scoring**, and multi-source investigative timelines, ITBIS transforms raw system telemetry into actionable cyber defense intelligence.

ITBIS employs a **dual-database persistence strategy** combining **PostgreSQL** (for ACID transactional integrity, organizational hierarchy, alerts, and incident cases) and **MongoDB** (for high-throughput ingestion of 10,000+ security activity events and statistical behavioral baselines).

---

## 2. Key Features Across Milestones

### Milestone 1: Core Foundation, Identity & Data Ingestion
- **Role-Based Access Control (RBAC):** JWT authentication (bcrypt password hashing) across 4 dedicated security roles (`admin`, `security_manager`, `soc_engineer`, `security_analyst`).
- **Monitored Employee Directory:** Full CRUD management with manager-subordinate relationships and department affiliations. Includes safe employee deletion with foreign key cascading.
- **High-Throughput Telemetry Ingestion:** Validated MongoDB event logging for login anomalies, file transfers, USB mounts, privilege escalations, email transmissions, and web requests.

### Milestone 2: Machine Learning & Behavioral Analytics
- **6-Indicator Baseline Profiling:** Pre-computed statistical benchmarks (mean, standard deviation, percentiles) for every monitored identity.
- **Dual Anomaly Detection:** Rule-based heuristics and Z-score statistical outlier flagging.
- **15-Indicator Isolation Forest ML Engine:** Serialized Scikit-learn model generating anomaly decision scores, outlier flags, explainable root causes, and target persona routing.

### Milestone 3: 5-Factor UEBA & Case Management
- **Exact 35/25/20/10/10 Dynamic Risk Formula:** Mathematically weighted risk computation combining behavioral deviations, privilege abuse, data access violations, access pattern anomalies, and historical security events.
- **Mandatory Incident Risk Restriction:** Strict backend enforcement permitting incident creation only for employees evaluated as **High** or **Critical** risk (HTTP 400 rejection for Low/Medium).
- **Separated Alert Permissions:** Alert assignment restricted to `admin` and `security_manager`; alert resolution permitted for `security_analyst`.
- **UEBA Peer Group Analysis & 14-Day Trends:** Dynamic baseline comparisons against departmental peers with historical daily snapshot persistence.

### Milestone 4: Platform Governance, Exports & Production Readiness
- **Platform-Level Admin Dashboard:** Dedicated `GET /dashboard/admin` returning system telemetry, user counts, incident statistics, and database connectivity.
- **Critical Alert In-App Notifications:** Real-time in-app notification routing dispatched automatically to Security Managers upon critical threat emergence.
- **Multi-Format Report Exports:** Unified `generate_insider_threat_report()` with real streaming downloads for Excel (`.xlsx` via openpyxl) and PDF (via ReportLab).
- **Interactive Threat Simulation Pipeline:** 4 live attack presets (Mass USB Exfiltration, Root Privilege Escalation, Off-Hours MFA Drift, Cloud Data Dump).
- **Containerization & Cloud Architecture:** Production Dockerfiles, Docker Compose multi-container orchestration, and deployment blueprints for AWS & Azure.

---

## 3. Architecture Overview & Persistence Strategy

```mermaid
flowchart TD
    subgraph PresentationLayer["Presentation Layer (Next.js 16 + React 19 + Tailwind CSS)"]
        Landing["Landing & Auth (/login, /signup)"]
        Dashboards["Role Hubs (Analyst, SOC, Manager, Admin)"]
        Workspaces["Workspaces (Incidents, Employees, Anomalies, Logs, Reports)"]
        SimEngine["Interactive Simulation Engine (4 Attack Scenarios)"]
    end

    subgraph APILayer["API Gateway & Security (FastAPI)"]
        AuthModule["JWT Auth & RBAC (require_role)"]
        Routers["API Routers (Auth, Employees, Logs, Alerts, Incidents, Reports, Dashboard, UEBA)"]
    end

    subgraph IntelligenceLayer["Machine Learning & UEBA Intelligence"]
        IFModel["Isolation Forest Model (15 Indicators)"]
        BaselineEngine["Statistical Baseline Profiler (6 Indicators)"]
        RiskEngine["5-Factor Dynamic Risk Scoring Engine (35/25/20/10/10)"]
        TimelineEngine["Multi-Source Timeline Synthesizer"]
    end

    subgraph PersistenceLayer["Dual-Database Persistence Strategy"]
        PG[("PostgreSQL (ACID Store)\n• users\n• employees\n• alerts\n• incidents\n• investigation_notes\n• risk_snapshots\n• notifications")]
        Mongo[("MongoDB (Time-Series & Document Store)\n• activity_logs (10,000+ events)\n• behavioral_baselines")]
    end

    PresentationLayer --> APILayer
    APILayer --> IntelligenceLayer
    APILayer --> PersistenceLayer
    IntelligenceLayer --> PersistenceLayer
```

### Persistence Comparison Matrix

| Dimension | PostgreSQL (Relational) | MongoDB (Document / Time-Series) |
| :--- | :--- | :--- |
| **Primary Scope** | User identities, RBAC, organizational hierarchy, alerts, formal incident cases, timeline notes, daily risk snapshots. | High-throughput telemetry events (logins, USB, sudo, file transfers, web browsing) and statistical behavioral baselines. |
| **Data Integrity** | Strict ACID transactional consistency with foreign key constraints. | Schema-flexible document storage designed for high write throughput. |
| **Cascade Policy** | Deleting an employee safely cascades or unlinks alerts, incidents, notes, and snapshots. | MongoDB logs and baseline documents for that employee are purged concurrently. |

---

## 4. Monorepo Directory Structure

```
AI-Powered-Insider-Threat-Detection-and-Behavioral-Security-Intelligence-Platform/
├── AGENTS.md                                   # Comprehensive agent operational guide & standards
├── DESIGN.md                                   # UI/UX design tokens & Tailwind specifications
├── LICENSE.md                                  # Official MIT License
├── README.md                                   # Master architectural & user manual
├── docker-compose.yml                          # Multi-container orchestration (4 services)
├── run_puppeteer_tests.js                      # Root E2E Puppeteer test runner
├── docs/
│   ├── architecture-and-database.md            # Detailed schema & entity-relationship diagrams
│   └── cloud-deployment.md                     # AWS & Azure production deployment runbook
├── backend/
│   ├── Dockerfile                              # Backend container definition
│   ├── requirements.txt                        # Python dependencies (FastAPI, ML, ReportLab, openpyxl)
│   ├── package.json                            # Newman CLI test runner dependencies
│   ├── models/                                 # Serialized Machine Learning artifacts
│   │   ├── isolation_forest_model.joblib       # Trained 15-indicator Isolation Forest model
│   │   └── isolation_forest_model_metadata.json# Model hyperparameters & feature list
│   ├── data/                                   # Baseline CSV files & 10,000 synthetic activity logs
│   ├── app/
│   │   ├── database.py                         # PostgreSQL & MongoDB database engines
│   │   ├── main.py                             # FastAPI initialization, CORS & router registrations
│   │   ├── models.py                           # SQLAlchemy models (User, Employee, Incident, Alert, etc.)
│   │   ├── schemas.py                          # Pydantic request & response validation schemas
│   │   ├── security.py                         # JWT token creation & RBAC role enforcement
│   │   ├── risk_scoring.py                     # Exact 35/25/20/10/10 5-factor risk scoring formula
│   │   ├── behavioral_profiling.py             # 6-indicator statistical baseline calculations
│   │   ├── anomaly_detection.py                # Z-score & rule-based anomaly detection heuristics
│   │   ├── ml_engine.py                        # Isolation Forest feature extraction & inference
│   │   ├── investigation_timeline.py           # Multi-source timeline synthesizer
│   │   ├── seed_data.py                        # Initial employee & user database seeder
│   │   ├── seed_10k_data.py                    # 10,000 high-throughput activity log seeder
│   │   └── routes/                             # Modular REST API route handlers
│   │       ├── auth_routes.py                  # Register, login, JWT token issuance
│   │       ├── admin_routes.py                 # User management & RBAC administration
│   │       ├── employee_routes.py              # Employee CRUD & profile inspection (includes DELETE)
│   │       ├── log_routes.py                   # High-throughput MongoDB event ingestion & query
│   │       ├── alert_routes.py                 # Alert triage, assignment, resolution & in-app notifications
│   │       ├── incident_routes.py              # Incident lifecycle, risk restrictions, timeline & notes
│   │       ├── dashboard_routes.py             # Dedicated GET /dashboard/admin platform telemetry
│   │       ├── report_routes.py                # Insider threat reports & Excel/PDF/CSV exports
│   │       └── ueba_routes.py                  # Peer comparisons & 14-day UEBA trends
│   └── tests/                                  # Automated backend test suites
│       ├── test_milestone2.py                  # Unit tests for ML & baseline mathematics
│       ├── test_milestone3_and_4.py            # Comprehensive 12-test suite for M3/M4 & 20-step E2E flow
│       ├── generate_collection.py              # Dynamic Newman collection builder
│       └── run_api_tests.js                    # Newman runner script
└── frontend/
    ├── Dockerfile                              # Next.js multi-stage container definition
    ├── package.json                            # Frontend dependencies (React 19, Tailwind, Puppeteer)
    ├── next.config.mjs                         # Next.js build configuration
    ├── app/                                    # Next.js App Router (19 optimized routes)
    │   ├── layout.js                           # Root application layout
    │   ├── page.js                             # Public landing page
    │   ├── login/page.js                       # Login with 1-click demo persona selector
    │   ├── signup/page.js                      # New user account registration
    │   ├── dashboard/                          # Role-based dashboard hub
    │   │   ├── analyst/page.js                 # Security Analyst Tier-2 investigation workspace
    │   │   ├── soc/page.js                     # SOC Incident Response live telemetry stream
    │   │   ├── manager/page.js                 # Department Manager risk posture overview
    │   │   └── admin/page.js                   # Platform Administrator governance view
    │   ├── employees/page.js                   # Employee directory with search & department filters
    │   ├── employees/[id]/page.js              # Detailed 360-degree risk dossier
    │   ├── incidents/page.js                   # Incident management queue
    │   ├── incidents/[id]/page.js              # Deep incident workspace with timeline & notes
    │   ├── alerts/page.js                      # Alert triage queue
    │   ├── anomalies/page.js                   # Isolation Forest diagnostics & interactive sandbox
    │   ├── logs/page.js                        # Raw MongoDB activity log explorer
    │   ├── reports/page.js                     # Compliance checklist & Excel/PDF export downloads
    │   ├── admin/page.js                       # Admin user RBAC administration
    │   ├── support/page.js                     # Architecture documentation & system FAQ
    │   ├── components/                         # Reusable UI components
    │   │   ├── AppLayout.js                    # Main navigation shell
    │   │   ├── Header.js                       # Role notification dropdown & simulation modal
    │   │   ├── Sidebar.js                      # Role-aware navigation menu
    │   │   └── RoleGuard.js                    # Client-side RBAC protection wrapper
    │   ├── context/
    │   │   ├── AuthContext.js                  # Authentication token & current user role state
    │   │   └── SimulationContext.js            # Real-time threat simulation state & dispatch
    │   └── lib/
    │       └── api.js                          # Axios HTTP client with JWT interceptor
    └── tests/
        └── puppeteer_test_all.js               # Comprehensive Puppeteer visual E2E test suite
```

---

## 5. Technology Stack & Dependencies

- **Backend Runtime:** Python 3.12+
- **API Framework:** FastAPI 0.110.0 (ASGI, Pydantic v2 schemas)
- **Relational ORM:** SQLAlchemy 2.0 with Psycopg2-binary
- **Relational Database:** PostgreSQL 15
- **Document Store:** MongoDB 6.0 with PyMongo 4.6
- **Machine Learning & Data Science:** Scikit-learn 1.4.1, Joblib, Pandas, NumPy
- **Export Engines:** Openpyxl 3.1 (Excel `.xlsx`), ReportLab 4.0 (Vector PDF)
- **Frontend Framework:** Next.js 16.3.3 (App Router, Turbopack, React 19)
- **Styling & UI:** Tailwind CSS 3.4 with Material Symbols icons
- **Testing & Quality Assurance:** Pytest, Newman (Postman CLI), Puppeteer (Headless Chrome E2E)

---

## 6. Prerequisites & Environment Setup

Ensure the following runtimes and databases are installed:
- **Node.js** >= 18.0.0
- **Python** >= 3.10
- **PostgreSQL Server** running on `localhost:5432` with database `itbis`
- **MongoDB Server** running on `localhost:27017` with database `itbis`

Create a `.env` file in the root or `backend/` directory:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/itbis
MONGO_URL=mongodb://localhost:27017/itbis
SECRET_KEY=itbis-secure-secret-key-3520-2026-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

And in `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 7. Backend Setup & Running Runbook

```powershell
# 1. Activate Python Virtual Environment
.\backend\venv\Scripts\Activate.ps1

# 2. Install Python Dependencies
pip install -r backend/requirements.txt

# 3. Seed Relational Entities & 10,000 High-Throughput Logs
python backend/app/seed_data.py
python backend/app/seed_10k_data.py

# 4. Start FastAPI ASGI Server on Port 8000
.\backend\venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

---

## 8. Frontend Setup & Running Runbook

```powershell
# 1. Install Node Dependencies
npm install --prefix "frontend"

# 2. Run Next.js Development Server (Port 3000)
npm run dev --prefix "frontend"

# 3. Compile Production Next.js Build
npm run build --prefix "frontend"
```

---

## 9. Database Setup, Migrations & Seeding

The backend automatically creates all relational tables upon application startup via SQLAlchemy's `Base.metadata.create_all(bind=engine)`.

### Seeding Scripts:
- `backend/app/seed_data.py`: Creates demo user accounts for all 4 roles, initializes monitored employees, baseline profiles, initial alerts, and sample incidents.
- `backend/app/seed_10k_data.py`: Ingests 10,000+ realistic enterprise telemetry events into MongoDB across all registered employee IDs.

---

## 10. Authentication & Role-Based Access Control (RBAC)

ITBIS strictly enforces least privilege across four operational personas:

| Operational Role | Title | Access Scope & Permissions | Key Dashboard & Routes |
| :--- | :--- | :--- | :--- |
| `admin` | **System Administrator** | Complete platform governance, user administration, employee registration & deletion, alert assignment, report exports. | `/dashboard/admin`, `/admin`, full CRUD |
| `security_manager` | **Department Manager** | Organizational risk posture oversight, alert assignment, compliance checklist, report exports (Excel/PDF). | `/dashboard/manager`, `/reports` |
| `soc_engineer` | **SOC Incident Response** | Live security log stream, real-time telemetry pause/resume, raw log ingestion, host isolation. | `/dashboard/soc`, `/logs`, `/alerts` |
| `security_analyst` | **Security Analyst (Tier 2)** | Deep incident investigation, timeline analysis, evidence notes, alert resolution, ML sandbox. | `/dashboard/analyst`, `/incidents/[id]`, `/anomalies` |

---

## 11. Machine Learning Engine (Isolation Forest)

- **Model Artifact:** `backend/models/isolation_forest_model.joblib`
- **Algorithm:** Isolation Forest (`n_estimators=100`, `contamination=0.08`, `random_state=42`)
- **15 Behavioral Indicators:**
  1. `avg_login_hour` & `std_login_hour`
  2. `off_hours_logins`
  3. `mean_daily_access` & `std_daily_access`
  4. `total_transfer_mb`, `avg_transfer_mb`, & `max_single_transfer_mb`
  5. `usb_event_count` & `usb_total_mb`
  6. `sudo_attempts` & `denied_events`
  7. `critical_flags`
  8. `unique_devices`
  9. `email_count`
- **Output:** Anomaly Decision Score, Outlier Flag (`is_outlier`), Risk Tier (`Low`, `Medium`, `High`, `Critical`), Explainable Root Causes (`primary_reason`), and Target Persona dispatching.

---

## 12. Statistical Baselines & Anomaly Detection

Calculates 6 empirical indicators per monitored employee from historical telemetry:
1. `avg_login_hour`: Mean login timestamp
2. `off_hours_logins`: Off-shift login count
3. `mean_daily_access`: Daily resource access mean
4. `total_transfer_mb`: Aggregate data egress volume
5. `usb_event_count`: Frequency of USB device insertions
6. `sudo_attempts`: Volume of elevated privilege executions

**Detection Heuristics:**
- **Z-Score Anomaly:** Flagged when $|z| > 2.5$ standard deviations from the employee's personal baseline.
- **Rule-Based Anomaly:** Flagged upon immediate critical threshold breach (e.g., mass USB exfiltration > 2,000 MB, unauthorized root bash execution).

---

## 13. 5-Factor Dynamic Risk Scoring Formula

The active risk calculation engine implements the official Milestone 3 formula:

$$\text{Overall Risk Score} = (S_{\text{behavioral}} \times 0.35) + (S_{\text{privilege}} \times 0.25) + (S_{\text{data\_access}} \times 0.20) + (S_{\text{access\_pattern}} \times 0.10) + (S_{\text{historical}} \times 0.10)$$

```python
FACTOR_WEIGHTS = {
    "behavioral_anomalies": 0.35,
    "privilege_misuse": 0.25,
    "data_access_violations": 0.20,
    "access_pattern_deviations": 0.10,
    "historical_security_events": 0.10,
}
```

### Risk Level Boundaries

| Score Range | Risk Level | Operational Severity | Response SLA |
| :--- | :--- | :--- | :--- |
| **0 – 24** | **Low** | Routine behavioral variance | Automated logging |
| **25 – 49** | **Medium** | Minor anomaly drift | Routine review |
| **50 – 74** | **High** | Significant security risk | **Incident Eligible (Tier 2 Analysis)** |
| **75 – 100** | **Critical** | Severe active threat | **Incident Eligible (Immediate SOC Isolation)** |

---

## 14. UEBA Engine & Peer Analysis

- **Peer Group Comparisons:** Dynamically computes mean and standard deviation across department peers to highlight anomalous departmental outliers.
- **14-Day UEBA Trend:** Evaluates historical risk velocity using persisted daily `RiskSnapshot` records to compute trend direction (`INCREASING`, `DECREASING`, `STABLE`).

---

## 15. Incident Management & Deep Investigation Workspace

- **Incident Creation Restriction:** Backend strictly enforces that incidents can only be created for employees with **High** or **Critical** risk levels. Attempts to create incidents for Low or Medium risk employees are rejected with `HTTP 400 Bad Request`.
- **Evidence Notes:** Security analysts add structured forensic notes linked to specific activity logs. Adding an initial note automatically transitions incident status from `OPEN` to `INVESTIGATING`.
- **Multi-Source Timeline Synthesizer:** Aggregates activity logs, security alerts, investigation notes, and status transitions into a unified chronological investigation timeline.

---

## 16. Security Alert Lifecycle & In-App Notifications

- **Separated Alert Permissions:**
  - `POST /alerts/{id}/assign`: Restricted to `admin` and `security_manager`.
  - `POST /alerts/{id}/resolve`: Permitted for `security_analyst`, `admin`, and `security_manager`.
- **In-App Notifications:** When a `CRITICAL` alert is ingested, the backend automatically generates in-app notification records for all `security_manager` users, accessible via `GET /alerts/notifications/in-app`.

---

## 17. Role-Based Dashboards

- **Security Analyst (`/dashboard/analyst`):** Time-range filter (24h, 7d, 30d), radar scanner, active alerts triage, and one-click incident creation.
- **SOC Incident Response (`/dashboard/soc`):** Live MongoDB telemetry stream, pause/resume toggle, event filtering, and manual telemetry ingestion.
- **Department Manager (`/dashboard/manager`):** Organizational risk posture, department risk comparison, high-risk employee ranking, and compliance metrics.
- **Platform Administrator (`/dashboard/admin`):** Platform-level metrics (`total_users`, `total_employees`, `total_incidents`, `open_incidents`, `users_by_role`, dual-database health).

---

## 18. Report Generation & Multi-Format Exports

Unified through `generate_insider_threat_report()`, ensuring identical risk scoring across all formats:
- **Excel Export (`GET /reports/insider-threat/excel`):** Streams real `.xlsx` workbooks with styled header palettes using `openpyxl`.
- **PDF Export (`GET /reports/insider-threat/pdf`):** Generates real formatted vector PDFs with risk summary tables using `ReportLab`.
- **CSV Export (`GET /reports/export?format=csv`):** Exports structured CSV tabular risk records.

---

## 19. Real-Time Threat Simulation Pipeline

Security teams can instantly demonstrate live threat detection across 4 attack scenarios:
1. **Mass USB Data Exfiltration:** Ingests bulk USB file transfer telemetry (alerts SOC).
2. **Sudo Root Privilege Escalation:** Ingests unauthorized root execution attempts (alerts Admin).
3. **Off-Hours MFA Brute-Force:** Ingests anomalous 3:00 AM login drift (alerts Manager).
4. **Cloud SFTP Data Egress:** Ingests external bulk transfer telemetry (alerts Analyst).

---

## 20. Key API Endpoints Reference

| Method | Endpoint | Description | Permitted Roles |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | Authenticate & obtain JWT Bearer token | Public |
| `GET` | `/dashboard/admin` | Platform-level telemetry and database health | `admin` |
| `GET` | `/employees/` | List monitored employees with filter & search | All Roles |
| `DELETE`| `/employees/{id}` | Delete employee and safely cascade records | `admin` |
| `POST` | `/incidents/` | Create incident (High/Critical risk only) | All Roles |
| `POST` | `/incidents/{id}/notes` | Add evidence note (sets status to INVESTIGATING) | All Roles |
| `GET` | `/incidents/{id}/timeline` | Retrieve synthesized multi-source timeline | All Roles |
| `POST` | `/alerts/{id}/assign` | Assign security alert | `admin`, `security_manager` |
| `POST` | `/alerts/{id}/resolve` | Resolve security alert | `security_analyst`, `admin`, `security_manager` |
| `GET` | `/reports/insider-threat/excel` | Download official Excel risk report | `admin`, `security_manager` |
| `GET` | `/reports/insider-threat/pdf` | Download official PDF risk report | `admin`, `security_manager` |

---

## 21. Automated Testing Protocols

### 1. Pytest Backend Suite (28 Tests)
```powershell
.\backend\venv\Scripts\pytest.exe -v backend/tests/
```
Validates ML inference, statistical baseline math, exact 35/25/20/10/10 risk calculations, threshold boundaries (24, 25, 49, 50, 74, 75, 100), incident risk rejections, alert RBAC, Excel/PDF downloads, and a full 20-step end-to-end integration flow.

### 2. Newman Postman API Test Suite (51 Requests, 80 Assertions)
```powershell
npm run test:api --prefix "backend"
```
Executes complete automated HTTP regression testing against the running FastAPI backend with 100% assertion pass rate.

### 3. Puppeteer Visual E2E Suite (40+ Screenshots)
```powershell
node run_puppeteer_tests.js
```
Automates browser testing across all 19 frontend screens, capturing visual screenshots in `frontend/test-results/screenshots/`.

---

## 22. Docker & Multi-Container Deployment

Run all 4 services via Docker Compose:
```bash
docker-compose up --build -d
```
Services initialized:
- `itbis-postgres` (Port 5432)
- `itbis-mongo` (Port 27017)
- `itbis-backend` (Port 8000)
- `itbis-frontend` (Port 3000)

---

## 23. Cloud Deployment Runbook

See complete cloud provisioning steps for AWS (ECS Fargate + RDS PostgreSQL + Atlas MongoDB) and Azure (Azure App Service + Flexible Server) in [`docs/cloud-deployment.md`](docs/cloud-deployment.md).

---

## 24. Security Architecture & Threat Modeling

- **Zero Hardcoded Secrets:** All secrets, database URLs, and cryptographic keys loaded strictly via environment variables.
- **SQL Injection Prevention:** 100% parameterization via SQLAlchemy ORM.
- **XSS & CSRF Defense:** Clean React JSX escaping and strict CORS origin whitelisting.
- **Stateless Authentication:** Signed JWT Bearer tokens carrying subject and role claims with expiry enforcement.

---

## 25. Troubleshooting & FAQ

**Q: Why does incident creation return HTTP 400?**
> A: By security design (Milestone 3 requirement), formal incidents can only be created for employees evaluated as High (score 50–74) or Critical (score 75–100) risk. Employees with Low or Medium risk are rejected.

**Q: How do I reseed the database?**
> A: Run `python backend/app/seed_data.py` followed by `python backend/app/seed_10k_data.py`.

---

## 26. License Information

This project is licensed under the terms of the **MIT License**. See [`LICENSE.md`](LICENSE.md) for complete legal terms.

---

## 27. Verification & Compliance Matrix

| Requirement / Milestone Area | Implementation Status | Evidence / Verification Method |
| :--- | :--- | :--- |
| **M1: Auth, JWT, Bcrypt & RBAC (4 Roles)** | ✅ FULLY SATISFIED | Pytest + Newman collection test suite |
| **M1: Monitored Employee CRUD & DELETE** | ✅ FULLY SATISFIED | `test_employee_crud_and_delete` + Newman |
| **M1: MongoDB Log Ingestion & Queries** | ✅ FULLY SATISFIED | 10k synthetic logs verified in PyMongo |
| **M2: 6-Indicator Baseline Profiling** | ✅ FULLY SATISFIED | `test_baselines_calculation` PASSED |
| **M2: Z-Score & Rule Anomaly Detection** | ✅ FULLY SATISFIED | `test_z_score_login_anomaly` PASSED |
| **M2: 15-Indicator Isolation Forest ML** | ✅ FULLY SATISFIED | `test_ml_isolation_forest_model` PASSED |
| **M3: Exact 35/25/20/10/10 Risk Formula** | ✅ FULLY SATISFIED | `test_exact_35_25_20_10_10_formula` PASSED |
| **M3: calculate_risk_score() Wrapper** | ✅ FULLY SATISFIED | `test_calculate_risk_score_wrapper` PASSED |
| **M3: Incident Creation Risk Restriction** | ✅ FULLY SATISFIED | `test_incident_creation_risk_restriction` PASSED |
| **M3: Separated Alert RBAC Permissions** | ✅ FULLY SATISFIED | `test_alert_role_restrictions_*` PASSED |
| **M3: Real Backend Data on Dashboards** | ✅ FULLY SATISFIED | Un-gated dashboards in normal mode |
| **M4: GET /dashboard/admin (Admin Only)** | ✅ FULLY SATISFIED | `test_admin_dashboard_endpoint` PASSED |
| **M4: Critical Alert In-App Notifications** | ✅ FULLY SATISFIED | `test_critical_alert_in_app_notification` PASSED |
| **M4: generate_insider_threat_report()** | ✅ FULLY SATISFIED | Pytest report rows verification |
| **M4: Excel Report Export (.xlsx)** | ✅ FULLY SATISFIED | `test_excel_report_export` (openpyxl) PASSED |
| **M4: PDF Report Export (.pdf)** | ✅ FULLY SATISFIED | `test_pdf_report_export` (ReportLab) PASSED |
| **M4: Multi-Container Dockerfile & Compose**| ✅ FULLY SATISFIED | Dockerfile & docker-compose.yml present |
| **Docker Engine Build on Host** | ❓ NOT VERIFIED | Docker CLI is not installed on this Windows host |
| **Full 20-Step End-to-End Chain** | ✅ FULLY SATISFIED | `test_complete_end_to_end_chain` PASSED |
