# ITBIS Project — Agent Guide & Repository Instructions

Welcome to the **Insider Threat Behavioral Intelligence System (ITBIS)** codebase. This document outlines the project architecture, operational commands, coding conventions, and mandatory testing rules for all AI agents and developers.

---

## 1. Repository Architecture & Layout

The project is structured as a full-stack monorepo:

```
AI-Powered-Insider-Threat-Detection-and-Behavioral-Security-Intelligence-Platform/
├── AGENTS.md                  # Project-wide AI agent instructions (this file)
├── .env.example               # Root environment variable template
├── docs/                      # Architectural designs & specifications
│   └── architecture-and-database.md
├── backend/                   # FastAPI Backend Service
│   ├── app/
│   │   ├── database.py        # PostgreSQL (SQLAlchemy) & MongoDB (PyMongo) connections
│   │   ├── main.py            # FastAPI app initialization, CORS, and route registration
│   │   ├── models.py          # SQLAlchemy ORM models (users, employees, incidents, alerts)
│   │   ├── schemas.py         # Pydantic request & response validation schemas
│   │   ├── security.py        # JWT authentication, bcrypt hashing, and RBAC dependencies
│   │   ├── seed_data.py       # Realistic employee and activity log seed script
│   │   └── routes/            # Route modules (auth, admin, employee, department, log, report, alert)
│   ├── tests/                 # Newman test suite, collection generator, and reports
│   │   ├── generate_collection.py
│   │   ├── run_api_tests.js
│   │   └── reports/
│   ├── requirements.txt       # Python backend dependencies
│   └── package.json           # Newman testing runner dependencies
└── frontend/                  # Next.js Frontend Application
    ├── app/                   # Next.js App Router (pages, layouts, styles)
    ├── package.json           # Frontend dependencies & scripts
    └── next.config.mjs
```

---

## 2. Core Architecture & Dual-Database Strategy

ITBIS employs a **4-layer architecture** with a **dual-database persistence layer**:

1. **PostgreSQL (Relational Store / ACID):**
   - Stores structured, relational business entities: `users`, `employees`, `incidents`, `alerts`.
   - Governs identity, org hierarchy (manager-subordinate relations), and investigation incident tracking.

2. **MongoDB (Document / Time-Series Store):**
   - Stores high-throughput, flexible-schema security events: `activity_logs`, `behavioral_baselines`.
   - **Cross-Database Integrity Rule:** Activity log ingestion into MongoDB must always validate that the `employee_id` exists in the PostgreSQL `employees` table before writing.

3. **Role-Based Access Control (RBAC):**
   - Defined roles: `admin`, `security_manager`, `soc_engineer`, `security_analyst`.
   - Enforced across endpoints via FastAPI dependency `require_role(...)`.
   - Authenticated using signed JWT Bearer tokens carrying `sub` (User ID) and `role` claims.

---

## 3. Development Commands & Service Execution

### Backend
- **Activate Virtual Environment:**
  ```powershell
  .\backend\venv\Scripts\Activate.ps1
  ```
- **Run FastAPI Server (Port 8000):**
  ```powershell
  .\backend\venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
  ```
- **Seed Initial Data:**
  ```powershell
  .\backend\venv\Scripts\python.exe backend/app/seed_data.py
  ```

### Frontend
- **Run Next.js Development Server (Port 3000):**
  ```powershell
  npm run dev --prefix "frontend"
  ```
- **Build Frontend:**
  ```powershell
  npm run build --prefix "frontend"
  ```

---

## 4. Mandatory Testing Protocol & Rules for Agents

Whenever modifying backend routes, models, schemas, database queries, or security logic:

1. **Synchronize the Test Suite:**
   - Update `backend/tests/generate_collection.py` whenever endpoints, parameters, or behaviors change.
   - Regenerate the collection:
     ```powershell
     .\backend\venv\Scripts\python.exe backend/tests/generate_collection.py
     ```
2. **Execute Newman API Tests:**
   ```powershell
   npm run test:api --prefix "backend"
   ```
3. **Verify Zero Regressions:**
   - Check `backend/tests/reports/summary.md` and ensure 100% assertions pass.
   - If any assertion fails, diagnose and resolve the issue immediately.

---

## 5. Coding Standards & Conventions

- **Python (Backend):**
  - Use Python type annotations throughout functions and methods.
  - Rely on Pydantic v2 schemas (`model_config = ConfigDict(from_attributes=True)`).
  - Use explicit HTTP status codes (`fastapi.status`).
  - Do not hardcode secrets or connection strings; load from environment variables (`.env`).
- **JavaScript / Next.js (Frontend):**
  - Use Next.js App Router conventions.
  - Use Tailwind CSS for modular, responsive UI styling.
  - Maintain clean separation between client components (`'use client'`) and server components.
