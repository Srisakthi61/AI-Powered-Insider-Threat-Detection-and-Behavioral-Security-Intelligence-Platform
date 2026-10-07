from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.database import get_mongo_db, SessionLocal
from app.models import Employee, Incident, InvestigationNote, Alert
from app.anomaly_detection import evaluate_event_anomalies
from app.ml_engine import load_model_artifact, run_model, extract_features_from_activity_logs


def build_investigation_timeline(
    employee_id: str,
    incident_id: Optional[int] = None,
    db: Optional[Session] = None,
    mongo=None,
    limit: int = 100,
) -> List[Dict[str, Any]]:
    """
    Builds a unified chronological investigation timeline merging:
    1. Raw MongoDB activity logs
    2. Rule-based anomaly events
    3. ML Isolation Forest anomalies
    4. Relevant Alert events
    5. Investigation Notes
    6. Incident lifecycle milestones

    Sorted: NEWEST -> OLDEST
    """
    session = db if db is not None else SessionLocal()
    mongo_db = mongo if mongo is not None else get_mongo_db()

    timeline_items: List[Dict[str, Any]] = []

    try:
        emp = session.query(Employee).filter(Employee.employee_id == employee_id).first()
        if not emp:
            return []

        # 1. Investigation Notes (if incident_id provided or all employee incidents)
        notes_query = session.query(InvestigationNote).join(Incident).filter(Incident.employee_id == emp.id)
        if incident_id is not None:
            notes_query = notes_query.filter(InvestigationNote.incident_id == incident_id)

        for note in notes_query.all():
            ts = note.created_at or datetime.now(timezone.utc)
            timeline_items.append({
                "id": f"note-{note.id}",
                "source": "Investigation Note",
                "source_badge": "bg-primary-container text-white",
                "icon": "note_alt",
                "title": f"Investigation Note added by {note.author_name or 'Security Investigator'}",
                "description": note.note,
                "evidence_reference": note.evidence_reference,
                "timestamp": ts.isoformat() if hasattr(ts, "isoformat") else str(ts),
                "severity": "Info",
                "incident_id": note.incident_id,
                "meta": {
                    "author": note.author_name,
                    "evidence_reference": note.evidence_reference,
                },
            })

        # 2. Incident Status & Milestones
        incidents = session.query(Incident).filter(Incident.employee_id == emp.id).all()
        if incident_id is not None:
            incidents = [i for i in incidents if i.id == incident_id]

        for inc in incidents:
            if inc.created_at:
                timeline_items.append({
                    "id": f"incident-created-{inc.id}",
                    "source": "Incident",
                    "source_badge": "bg-tertiary text-white",
                    "icon": "gavel",
                    "title": f"Incident #{inc.id} Created ({inc.severity} Severity)",
                    "description": inc.summary or f"Formal security investigation opened for {emp.name}",
                    "timestamp": inc.created_at.isoformat() if hasattr(inc.created_at, "isoformat") else str(inc.created_at),
                    "severity": inc.severity,
                    "incident_id": inc.id,
                    "meta": {"status": inc.status},
                })
            if inc.resolved_at:
                timeline_items.append({
                    "id": f"incident-resolved-{inc.id}",
                    "source": "Incident",
                    "source_badge": "bg-emerald-600 text-white",
                    "icon": "verified",
                    "title": f"Incident #{inc.id} Resolved ({inc.status})",
                    "description": inc.resolution_summary or "Investigation concluded and verified.",
                    "timestamp": inc.resolved_at.isoformat() if hasattr(inc.resolved_at, "isoformat") else str(inc.resolved_at),
                    "severity": "Low",
                    "incident_id": inc.id,
                    "meta": {"resolution": inc.resolution_summary},
                })

        # 3. Security Alerts
        alerts = session.query(Alert).filter(Alert.employee_id == emp.id).all()
        for alt in alerts:
            ts = alt.created_at or datetime.now(timezone.utc)
            timeline_items.append({
                "id": f"alert-{alt.id}",
                "source": "Alert",
                "source_badge": "bg-error-container text-error",
                "icon": "warning",
                "title": f"Alert: {alt.message}",
                "description": alt.details or alt.recommended_action or "Security alert generated",
                "timestamp": ts.isoformat() if hasattr(ts, "isoformat") else str(ts),
                "severity": alt.severity,
                "incident_id": alt.incident_id,
                "meta": {
                    "alert_id": alt.id,
                    "status": alt.status,
                    "recommended_action": alt.recommended_action,
                },
            })

        # 4. Raw MongoDB Logs & Rule Anomalies
        logs = list(mongo_db["activity_logs"].find({"employee_id": employee_id}).sort("timestamp", -1).limit(limit))

        for log in logs:
            ts = log.get("timestamp") or datetime.now(timezone.utc)
            ts_iso = ts.isoformat() if hasattr(ts, "isoformat") else str(ts)
            event_type = log.get("event_type", "activity")
            details = log.get("details", {})

            # Check rule anomalies for this event
            rule_flags = evaluate_event_anomalies(log, db=session, mongo=mongo_db)

            if rule_flags:
                for rf in rule_flags:
                    timeline_items.append({
                        "id": f"rule-{str(log.get('_id'))}-{rf.get('category', 'anomaly')}",
                        "source": "Rule Anomaly",
                        "source_badge": "bg-amber-600 text-white",
                        "icon": "psychology_alt",
                        "title": f"Rule Anomaly: {rf.get('category', 'Telemetry Deviation')}",
                        "description": rf.get("description") or rf.get("reason") or "Statistical baseline threshold exceeded",
                        "timestamp": ts_iso,
                        "severity": rf.get("severity", "High"),
                        "incident_id": incident_id,
                        "meta": rf,
                    })
            else:
                # Normal Activity Entry
                timeline_items.append({
                    "id": f"log-{str(log.get('_id'))}",
                    "source": "Activity",
                    "source_badge": "bg-surface-container-high text-on-surface",
                    "icon": "terminal" if "privilege" in event_type else "login" if "login" in event_type else "dataset",
                    "title": f"Activity: {event_type.replace('_', ' ').title()}",
                    "description": f"Details: {str(details)[:180]}",
                    "timestamp": ts_iso,
                    "severity": "Low",
                    "incident_id": incident_id,
                    "meta": details,
                })

        # 5. ML Anomalies (if flagged)
        try:
            artifact = load_model_artifact()
            df_feat = extract_features_from_activity_logs(logs) if logs else None
            if df_feat is not None and not df_feat.empty:
                ml_res = run_model(df_feat, artifact).to_dict(orient="records")[0]
                if ml_res.get("is_outlier") or ml_res.get("anomaly_score", 0) < 0:
                    latest_ts = logs[0].get("timestamp") if logs else datetime.now(timezone.utc)
                    latest_ts_iso = latest_ts.isoformat() if hasattr(latest_ts, "isoformat") else str(latest_ts)
                    timeline_items.append({
                        "id": f"ml-{employee_id}",
                        "source": "ML Anomaly",
                        "source_badge": "bg-purple-700 text-white",
                        "icon": "troubleshoot",
                        "title": f"Isolation Forest Anomaly Detected (Score: {ml_res.get('anomaly_score')})",
                        "description": f"{ml_res.get('primary_reason')}. Details: {ml_res.get('details')}",
                        "timestamp": latest_ts_iso,
                        "severity": ml_res.get("risk_tier", "Critical"),
                        "incident_id": incident_id,
                        "meta": {
                            "anomaly_score": ml_res.get("anomaly_score"),
                            "recommended_action": ml_res.get("recommended_action"),
                        },
                    })
        except Exception:
            pass

        # Sort all timeline items: NEWEST -> OLDEST
        timeline_items.sort(key=lambda x: str(x.get("timestamp", "")), reverse=True)
        return timeline_items

    finally:
        if db is None:
            session.close()
