---
trigger: always_on
description: Mandatory automated frontend testing with Puppeteer after UI/page modifications and invocation of frontend_tester subagent.
---

# Project Specific Rule: Continuous Frontend UI & Interactive Testing with Puppeteer

For this project (**ITBIS / AI-Powered-Insider-Threat-Detection-and-Behavioral-Security-Intelligence-Platform**), whenever you add, modify, or refactor frontend pages, UI components, interactive modals, API hooks, or design system styling:

## 1. Role of the `frontend_tester` Subagent
- A dedicated subagent named **`frontend_tester`** is configured to execute full-scale browser automation testing via Puppeteer.
- You can invoke the subagent using `invoke_subagent` with `TypeName: "frontend_tester"`, or run the Puppeteer suite directly.

## 2. Execute the Puppeteer End-to-End Test Suite
- Ensure both the FastAPI backend (`http://localhost:8000`) and Next.js frontend (`http://localhost:3000`) are running.
- Execute the full test runner from the root or `frontend/` directory:
  ```powershell
  # Run from repository root:
  node run_puppeteer_tests.js

  # Or run from frontend directory:
  npm run test:e2e --prefix "frontend"
  ```

## 3. Verify Full Feature & Screen Coverage
The test suite must validate all requirements and screens:
- **Public & Authentication**: `/` (Landing & status pill), `/login` (Demo logins & validation error states), `/signup` (Registration form).
- **Role-Based Dashboards**:
  - `/dashboard/analyst`: Time-range filters (24h, 7d, 30d), radar scanner, alert triage ("Investigate", "Resolve").
  - `/dashboard/soc`: Real-time telemetry stream, Pause/Resume toggle, event filter, manual log ingestion modal to MongoDB.
  - `/dashboard/manager`: Department comparison matrix, high-risk rankings, risk report links.
  - `/dashboard/admin`: PostgreSQL & MongoDB health indicators, RBAC links.
- **Global Header Controls**: Audio Alarm toggle, Role-Targeted Notifications dropdown, User Profile menu.
- **Threat Simulation Pipeline**: 4 Attack presets (USB Exfiltration, Sudo Privilege Abuse, Off-Hours MFA Attack, Cloud Data Dump), active real-time toast alert, and baseline simulation reset.
- **Core Workspaces**:
  - `/employees`: Department filter buttons, search, risk bars, employee detail drawer, "Register Employee" modal.
  - `/employees/[id]`: 360-degree risk dossier with UEBA radar, baseline comparisons, and activity timeline.
  - `/incidents`: Filter tabs (Status & Severity), "Open Investigation Case" modal creation.
  - `/incidents/[id]`: Deep investigation workspace, Timeline tab, Evidence Notes tab, adding notes, resolving incident.
  - `/logs`: MongoDB 10k+ log table, event filter, pagination (Next/Prev), refresh button.
  - `/alerts`: Severity tabs, status transitions, executing ML Threat Scan across 10k logs.
  - `/anomalies`: Isolation Forest ML model diagnostics, radar scanner, per-employee baseline table, live interactive prediction sandbox.
  - `/reports`: Department risk matrix, compliance checklist (ISO/IEC 27001, SOC 2 Type II), CSV export.
  - `/admin`: User directory, RBAC role assignment dropdown, audit trail export.
  - `/support`: Dual-database architecture reference, RESTful API documentation, FAQs.
  - **Sidebar & Session**: Navigation across authorized views and secure logout flow.

## 4. Inspect Generated Reports & Screenshots
- **HTML Report**: `frontend/test-results/reports/puppeteer-test-report.html`
- **Markdown Summary**: `frontend/test-results/reports/summary.md`
- **Structured JSON**: `frontend/test-results/reports/test-summary.json`
- **Screenshots Gallery**: `frontend/test-results/screenshots/` (over 40+ high-resolution full-page screenshots).

## 5. Zero Regression Requirement
- 100% of test assertions and screen renders must pass.
- If any UI step fails, diagnose the root cause immediately, update component logic or selector, and re-run tests until 100% pass rate is achieved.
