---
trigger: always_on
description: Mandatory test suite updates and automated API testing with Newman after every backend modification.
---

# Project Specific Rule: Continuous API Test Maintenance & Regression Testing

For this project (ITBIS / AI-Powered-Insider-Threat-Detection-and-Behavioral-Security-Intelligence-Platform), whenever you add, modify, or refactor backend API routes, models, schemas, database logic, or security policies:

1. **Keep the Test Suite Synchronized & Updated:**
   - Whenever new endpoints, parameters, request/response models, or validation rules are added or changed in the codebase, **always update the test collection** (`tests/generate_collection.py` / `tests/itbis_api_collection.json`) so that new endpoints and updated behaviors are covered by tests.
   - Regenerate the collection if modified:
     ```bash
     .\venv\Scripts\python.exe tests/generate_collection.py
     ```

2. **Execute the Newman Test Runner:**
   - Run the automated test suite from the `backend/` directory:
     ```bash
     npm run test:api
     ```
     (or `node tests/run_api_tests.js`)

3. **Read the Generated Reports:**
   - Inspect `tests/reports/summary.md` and `tests/reports/api_test_report.json` to verify test execution statistics and ensure 100% assertions pass.
   - If any assertions fail, inspect the error details and root causes immediately.

4. **Report to the User:**
   - Always inform the user of the test execution results (total tests run, passed, and any issues/failures detected).
   - If issues are detected, resolve them or report the exact error and proposed fix before concluding the turn.
