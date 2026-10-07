from datetime import datetime, timezone
from app.database import SessionLocal, get_mongo_db
from app.models import Employee, Alert, Incident
from app.routes.anomaly_routes import simulate_threat_event, reset_simulation, ThreatSimulationRequest
from app.ml_anomaly_model import get_enriched_anomaly_report
from app.risk_scoring import calculate_all_employee_risk_scores

def run_test():
    db = SessionLocal()
    mongo = get_mongo_db()

    print("=== 1. INITIAL CLEAN STATE ===")
    print("Alerts:", db.query(Alert).count())
    print("Incidents:", db.query(Incident).count())
    report_clean = get_enriched_anomaly_report(mongo, db)
    print("ML Flagged Outliers:", report_clean.get("flagged_count"))

    print("\n=== 2. TRIGGERING THREAT SIMULATION (usb_exfiltration) ===")
    req = ThreatSimulationRequest(scenario="usb_exfiltration")
    sim_res = simulate_threat_event(req, db=db, mongo=mongo, user={"role": "admin"})
    print("Simulation Message:", sim_res.get("message"))
    print("Primary Alert ID:", sim_res.get("alert_id"))

    print("\n=== 3. STATE AFTER THREAT DETECTED ===")
    print("Alerts in DB:", db.query(Alert).count())
    for a in db.query(Alert).all():
        print(f"  Alert: [{a.severity}] {a.message} (Emp ID: {a.employee_id})")

    report_threat = get_enriched_anomaly_report(mongo, db)
    print("ML Flagged Outliers:", report_threat.get("flagged_count"))
    for f in report_threat.get("flagged_employees", []):
        print(f"  Flagged: {f.get('employee_id')} - {f.get('name')} (Anomaly Score: {f.get('anomaly_score')})")

    scores = calculate_all_employee_risk_scores(db, mongo)
    for s in scores:
        if s["overall_score"] > 0:
            print(f"  Elevated Risk: {s['employee_code']} ({s['employee_name']}) - Score: {s['overall_score']} ({s['risk_level']}) - Factors: {s['factors']}")

    print("\n=== 4. TRIGGERING RESET SIMULATION ===")
    reset_res = reset_simulation(db=db, mongo=mongo, user={"role": "admin"})
    print("Reset Message:", reset_res.get("message"))

    print("\n=== 5. STATE AFTER RESET ===")
    print("Alerts in DB:", db.query(Alert).count())
    print("Incidents in DB:", db.query(Incident).count())
    report_reset = get_enriched_anomaly_report(mongo, db)
    print("ML Flagged Outliers:", report_reset.get("flagged_count"))
    scores_reset = calculate_all_employee_risk_scores(db, mongo)
    elevated = [s for s in scores_reset if s["overall_score"] > 0]
    print("Elevated risk employees after reset:", len(elevated))
    print("Total logs in MongoDB:", mongo.activity_logs.count_documents({}))
    print("Total baselines in MongoDB:", mongo.behavioral_baselines.count_documents({}))

if __name__ == "__main__":
    run_test()
