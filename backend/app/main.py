from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base, init_db
import app.models  # Register SQLAlchemy models with Base metadata
from app.routes.auth_routes import router as auth_router
from app.routes.admin_routes import router as admin_router
from app.routes.employee_routes import router as employee_router
from app.routes.department_routes import router as department_router
from app.routes.log_routes import router as log_router
from app.routes.report_routes import router as report_router
from app.routes.alert_routes import router as alert_router
from app.routes.anomaly_routes import router as anomaly_router
from app.routes.incident_routes import router as incident_router
from app.routes.ueba_routes import router as ueba_router
from app.routes.dashboard_routes import router as dashboard_router

# Ensure database tables and columns are initialized
init_db()

app = FastAPI(
    title="ITBIS API",
    description="Insider Threat Behavioral Intelligence System API",
    version="1.0.0"
)

# Configure CORS Middleware
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(admin_router, prefix="/admin", tags=["Admin"])
app.include_router(employee_router, prefix="/employees", tags=["Employees"])
app.include_router(department_router, prefix="/departments", tags=["Departments"])
app.include_router(log_router, prefix="/logs", tags=["Logs"])
app.include_router(report_router, prefix="/reports", tags=["Reports"])
app.include_router(alert_router, prefix="/alerts", tags=["Alerts"])
app.include_router(anomaly_router, prefix="/anomalies", tags=["Behavioral Anomalies"])
app.include_router(incident_router, prefix="/incidents", tags=["Threat Incidents & Investigations"])
app.include_router(ueba_router, prefix="/ueba", tags=["UEBA & Risk Scoring"])
app.include_router(dashboard_router, prefix="/dashboard", tags=["Dashboards"])



@app.get("/")
def read_root():
    """
    Health-check endpoint returning the operational status of the backend.
    """
    return {
        "status": "ITBIS backend is running"
    }
