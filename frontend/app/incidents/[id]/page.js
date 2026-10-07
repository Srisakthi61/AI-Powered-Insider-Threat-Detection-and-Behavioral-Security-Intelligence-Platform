"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import RiskBadge from "../../components/RiskBadge";
import MetricCard from "../../components/MetricCard";
import { incidentApi, uebaApi, alertApi } from "../../lib/api";

export default function IncidentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const incidentId = params.id;

  const [incident, setIncident] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [riskProfile, setRiskProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("TIMELINE"); // TIMELINE, NOTES, ALERTS, OVERVIEW

  // Note form state
  const [newNote, setNewNote] = useState("");
  const [evidenceRef, setEvidenceRef] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);

  // Status update & resolve modal state
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionSummary, setResolutionSummary] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchIncidentData = async () => {
    setLoading(true);
    try {
      const data = await incidentApi.get(incidentId);
      setIncident(data);

      if (data && data.employee_id) {
        // Fetch risk profile
        try {
          const riskData = await uebaApi.getRiskScore(data.employee_id);
          setRiskProfile(riskData);
        } catch (e) {
          console.error("Failed to load risk score:", e);
        }
      }
    } catch (err) {
      console.error("Failed to load incident:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimelineData = async () => {
    setTimelineLoading(true);
    try {
      const tl = await incidentApi.getTimeline(incidentId, 100);
      setTimeline(tl);
    } catch (err) {
      console.error("Failed to fetch timeline:", err);
    } finally {
      setTimelineLoading(false);
    }
  };

  useEffect(() => {
    if (incidentId) {
      fetchIncidentData();
      fetchTimelineData();

      const handleThreatSimulated = () => {
        fetchIncidentData();
        fetchTimelineData();
      };
      const handleReset = () => {
        fetchIncidentData();
        fetchTimelineData();
      };

      window.addEventListener("threat-simulated", handleThreatSimulated);
      window.addEventListener("simulation-reset", handleReset);

      return () => {
        window.removeEventListener("threat-simulated", handleThreatSimulated);
        window.removeEventListener("simulation-reset", handleReset);
      };
    }
  }, [incidentId]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setSubmittingNote(true);
    try {
      await incidentApi.addNote(incidentId, {
        note: newNote,
        evidence_reference: evidenceRef.trim() || null,
      });
      setNewNote("");
      setEvidenceRef("");
      // Refresh both incident (with new notes) and timeline
      await fetchIncidentData();
      await fetchTimelineData();
    } catch (err) {
      console.error("Failed to add note:", err);
      alert("Failed to submit investigation note.");
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (newStatus === "RESOLVED" || newStatus === "CLOSED") {
      setShowResolveModal(true);
      return;
    }
    setUpdatingStatus(true);
    try {
      await incidentApi.update(incidentId, { status: newStatus });
      await fetchIncidentData();
      await fetchTimelineData();
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleResolveIncident = async (e) => {
    e.preventDefault();
    if (!resolutionSummary.trim()) return;
    setUpdatingStatus(true);
    try {
      await incidentApi.resolve(incidentId, resolutionSummary);
      setShowResolveModal(false);
      setResolutionSummary("");
      await fetchIncidentData();
      await fetchTimelineData();
    } catch (err) {
      console.error("Failed to resolve incident:", err);
      alert("Failed to resolve incident.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getTimelineIcon = (type) => {
    switch ((type || "").toUpperCase()) {
      case "LOG":
        return { icon: "terminal", color: "text-blue-500", bg: "bg-blue-500/10" };
      case "RULE_ANOMALY":
        return { icon: "rule", color: "text-amber-500", bg: "bg-amber-500/10" };
      case "ML_ANOMALY":
        return { icon: "psychology", color: "text-purple-500", bg: "bg-purple-500/10" };
      case "ALERT":
        return { icon: "notifications_active", color: "text-orange-500", bg: "bg-orange-500/10" };
      case "INVESTIGATION_NOTE":
        return { icon: "rate_review", color: "text-emerald-500", bg: "bg-emerald-500/10" };
      case "INCIDENT":
        return { icon: "shield", color: "text-rose-500", bg: "bg-rose-500/10" };
      default:
        return { icon: "schedule", color: "text-slate-400", bg: "bg-slate-500/10" };
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center p-20">
          <div className="flex items-center gap-3 text-secondary font-mono text-sm">
            <span className="material-symbols-outlined animate-spin text-primary text-2xl">
              progress_activity
            </span>
            Loading Incident Case Workspace...
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!incident) {
    return (
      <AppLayout>
        <div className="p-12 text-center text-secondary">
          <span className="material-symbols-outlined text-[48px] text-error mb-2">error</span>
          <h2 className="font-bold text-lg text-on-surface">Incident Case Not Found</h2>
          <p className="text-xs text-secondary mt-1">
            The requested incident ID does not exist or has been removed.
          </p>
          <button
            onClick={() => router.push("/incidents")}
            className="mt-4 px-4 py-2 bg-primary text-white text-xs rounded-lg font-semibold"
          >
            Return to Cases
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-gutter">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-secondary">
          <Link href="/incidents" className="hover:text-primary transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Incidents
          </Link>
          <span>/</span>
          <span className="font-mono text-on-surface font-bold">
            INC-{String(incident.id).padStart(4, "0")}
          </span>
        </div>

        {/* Case Workspace Header */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                <span className="font-mono font-bold text-xs bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded">
                  INC-{String(incident.id).padStart(4, "0")}
                </span>
                <RiskBadge level={incident.severity} />
                <RiskBadge status={incident.status} />
                <span className="text-xs text-secondary">
                  Opened {new Date(incident.created_at).toLocaleString()}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-on-surface">
                {incident.title}
              </h1>
              {incident.summary && (
                <p className="text-secondary text-xs sm:text-sm mt-1 max-w-3xl leading-relaxed">
                  {incident.summary}
                </p>
              )}
            </div>

            {/* Quick Status / Resolve Actions */}
            <div className="flex flex-wrap items-center gap-2 bg-surface-container-low p-2 rounded-xl border border-outline-variant">
              <span className="text-[11px] font-bold text-secondary px-2">Status:</span>
              <button
                disabled={updatingStatus || incident.status === "OPEN"}
                onClick={() => handleStatusChange("OPEN")}
                className={`px-3 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                  incident.status === "OPEN"
                    ? "bg-amber-500 text-white shadow-sm"
                    : "bg-surface-container text-secondary hover:text-on-surface"
                }`}
              >
                Open
              </button>
              <button
                disabled={updatingStatus || incident.status === "INVESTIGATING"}
                onClick={() => handleStatusChange("INVESTIGATING")}
                className={`px-3 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                  incident.status === "INVESTIGATING"
                    ? "bg-sky-600 text-white shadow-sm"
                    : "bg-surface-container text-secondary hover:text-on-surface"
                }`}
              >
                Investigating
              </button>
              <button
                disabled={updatingStatus || incident.status === "RESOLVED" || incident.status === "CLOSED"}
                onClick={() => setShowResolveModal(true)}
                className={`px-3 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                  incident.status === "RESOLVED" || incident.status === "CLOSED"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-emerald-700/80 text-white hover:bg-emerald-600"
                }`}
              >
                {incident.status === "RESOLVED" || incident.status === "CLOSED" ? "Resolved" : "Resolve Case"}
              </button>
            </div>
          </div>

          {/* Resolution Banner if Resolved */}
          {incident.resolution_summary && (
            <div className="mt-4 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-3">
              <span className="material-symbols-outlined text-emerald-500 text-xl mt-0.5">
                verified
              </span>
              <div>
                <div className="text-xs font-bold text-emerald-500">
                  Case Resolved {incident.resolved_at ? `on ${new Date(incident.resolved_at).toLocaleString()}` : ""}
                </div>
                <div className="text-xs text-on-surface mt-0.5 leading-relaxed">
                  {incident.resolution_summary}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Top Context Cards: Subject Employee & Risk Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-md">
          {/* Subject Employee */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">
                  Subject Employee
                </span>
                <h3 className="font-bold text-base text-on-surface mt-0.5">
                  {incident.employee_name || `Employee #${incident.employee_id}`}
                </h3>
                <div className="text-xs font-mono text-secondary mt-0.5">
                  Code: {incident.employee_code || `EMP-${incident.employee_id}`} • Dept: {incident.department || "General"}
                </div>
              </div>
              <span className="material-symbols-outlined text-primary text-2xl bg-primary/10 p-2 rounded-lg">
                person_pin
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-outline-variant flex items-center justify-between">
              <span className="text-xs text-secondary">Behavioral Dossier:</span>
              <Link
                href={`/employees/${incident.employee_id}`}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                View Full Profile
                <span className="material-symbols-outlined text-sm">open_in_new</span>
              </Link>
            </div>
          </div>

          {/* 5-Factor Risk Level */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">
                  5-Factor Risk Score
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-bold font-mono text-on-surface">
                    {riskProfile ? riskProfile.overall_score : "—"}
                  </span>
                  <span className="text-xs text-secondary">/ 100</span>
                  {riskProfile && <RiskBadge level={riskProfile.risk_level} />}
                </div>
              </div>
              <span className="material-symbols-outlined text-amber-500 text-2xl bg-amber-500/10 p-2 rounded-lg">
                speed
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-outline-variant text-xs text-secondary flex items-center justify-between">
              <span>Primary Anomaly:</span>
              <span className="font-semibold text-on-surface">
                {riskProfile?.reasons?.[0]?.factor || "Behavioral Deviations"}
              </span>
            </div>
          </div>

          {/* Evidence & Case Notes Count */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">
                  Investigation Audit Trail
                </span>
                <div className="text-2xl font-bold font-mono text-on-surface mt-1">
                  {incident.notes ? incident.notes.length : 0}{" "}
                  <span className="text-xs font-normal text-secondary">Evidence Notes</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-emerald-500 text-2xl bg-emerald-500/10 p-2 rounded-lg">
                verified_user
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-outline-variant text-xs text-secondary flex items-center justify-between">
              <span>Timeline Events:</span>
              <span className="font-mono font-bold text-on-surface">{timeline.length} items</span>
            </div>
          </div>
        </div>

        {/* Main Investigation Workspace (2 Columns) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          {/* Left Column: Timeline & Evidence Feed (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-4">
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">
                    history_edu
                  </span>
                  <h2 className="font-bold text-sm text-on-surface">
                    Investigation Timeline
                  </h2>
                  <span className="text-[11px] text-secondary font-mono bg-surface-container px-2 py-0.5 rounded">
                    {timeline.length} Events
                  </span>
                </div>

                <button
                  onClick={fetchTimelineData}
                  disabled={timelineLoading}
                  className="text-xs text-secondary hover:text-primary flex items-center gap-1 cursor-pointer"
                >
                  <span
                    className={`material-symbols-outlined text-sm ${
                      timelineLoading ? "animate-spin" : ""
                    }`}
                  >
                    refresh
                  </span>
                  Refresh
                </button>
              </div>

              {/* Timeline Container */}
              <div className="mt-4 relative pl-4 border-l-2 border-outline-variant space-y-4">
                {timelineLoading ? (
                  <div className="py-8 text-center text-secondary text-xs flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined animate-spin text-primary">
                      progress_activity
                    </span>
                    Loading timeline...
                  </div>
                ) : timeline.length === 0 ? (
                  <div className="py-8 text-center text-secondary text-xs">
                    No timeline events recorded yet.
                  </div>
                ) : (
                  timeline.map((item, idx) => {
                    const style = getTimelineIcon(item.event_type);
                    return (
                      <div key={idx} className="relative group">
                        {/* Timeline node icon */}
                        <div
                          className={`absolute -left-[25px] top-1 w-5 h-5 rounded-full flex items-center justify-center border border-outline-variant ${style.bg} ${style.color}`}
                        >
                          <span className="material-symbols-outlined text-[13px]">
                            {style.icon}
                          </span>
                        </div>

                        {/* Timeline Event Card */}
                        <div className="bg-surface-container-low rounded-lg border border-outline-variant p-3 transition-colors hover:border-primary/40">
                          <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${style.bg} ${style.color}`}
                              >
                                {item.event_type}
                              </span>
                              <span className="font-bold text-xs text-on-surface">
                                {item.title}
                              </span>
                            </div>
                            <span className="text-[10px] text-secondary font-mono">
                              {item.timestamp
                                ? new Date(item.timestamp).toLocaleString()
                                : "N/A"}
                            </span>
                          </div>

                          <p className="text-xs text-on-surface-variant leading-relaxed">
                            {item.description}
                          </p>

                          {/* Extra metadata fields */}
                          {item.metadata && Object.keys(item.metadata).length > 0 && (
                            <div className="mt-2 pt-2 border-t border-outline-variant/60 flex flex-wrap gap-2 text-[10px] font-mono text-secondary">
                              {Object.entries(item.metadata).map(([k, v]) => (
                                <span
                                  key={k}
                                  className="bg-surface-container px-1.5 py-0.5 rounded"
                                >
                                  <strong className="text-on-surface">{k}:</strong>{" "}
                                  {typeof v === "object" ? JSON.stringify(v) : String(v)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Investigation Notes & Evidence Log (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* Add Note Card */}
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 shadow-sm">
              <div className="flex items-center gap-2 pb-2 mb-3 border-b border-outline-variant">
                <span className="material-symbols-outlined text-primary text-xl">
                  edit_note
                </span>
                <h3 className="font-bold text-sm text-on-surface">
                  Add Note
                </h3>
              </div>

              <form onSubmit={handleAddNote} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-secondary block mb-1">
                    Observation or Action Taken <span className="text-error">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Document findings, forensic notes, or actions taken..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="font-bold text-secondary block mb-1">
                    Evidence Reference (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., PCAP-1049, S3 Audit Log #88, Disk image MD5"
                    value={evidenceRef}
                    onChange={(e) => setEvidenceRef(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingNote || !newNote.trim()}
                  className="w-full py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary-container disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm text-xs"
                >
                  {submittingNote && (
                    <span className="material-symbols-outlined animate-spin text-sm">
                      progress_activity
                    </span>
                  )}
                  Add Note
                </button>
              </form>
            </div>

            {/* Case Notes History */}
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 shadow-sm">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-outline-variant">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-500 text-xl">
                    sticky_note_2
                  </span>
                  <h3 className="font-bold text-sm text-on-surface">
                    Evidence Notes
                  </h3>
                </div>
                <span className="font-mono text-xs text-secondary">
                  {incident.notes ? incident.notes.length : 0} Notes
                </span>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {!incident.notes || incident.notes.length === 0 ? (
                  <div className="p-4 text-center text-secondary text-xs">
                    No investigation notes recorded yet.
                  </div>
                ) : (
                  incident.notes.map((n) => (
                    <div
                      key={n.id}
                      className="bg-surface-container-low rounded-lg border border-outline-variant p-3 text-xs"
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-bold text-on-surface">
                          {n.author_name || "Security Analyst"}
                        </span>
                        <span className="text-[10px] text-secondary font-mono">
                          {n.created_at ? new Date(n.created_at).toLocaleString() : "Just now"}
                        </span>
                      </div>
                      <p className="text-on-surface-variant leading-relaxed">
                        {n.note}
                      </p>
                      {n.evidence_reference && (
                        <div className="mt-2 pt-1.5 border-t border-outline-variant/60 flex items-center gap-1 text-[10px] font-mono text-primary font-semibold">
                          <span className="material-symbols-outlined text-[12px]">link</span>
                          Evidence: {n.evidence_reference}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Resolve Case Modal */}
        {showResolveModal && (
          <div className="fixed inset-0 w-screen h-screen z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant w-[40%] max-w-[400px] min-w-[40%] p-5 sm:p-6 shadow-2xl my-auto animate-toast-slide-in
            ">
              <div className="flex justify-between items-start border-b border-outline-variant pb-sm mb-md">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-500 text-2xl">
                    verified
                  </span>
                  <div>
                    <h3 className="font-card-title text-card-title text-on-surface font-bold">
                      Resolve Investigation Case
                    </h3>
                    <p className="text-xs text-secondary">
                      Formal case resolution and findings closure
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowResolveModal(false)}
                  className="p-1 text-secondary hover:bg-surface-container rounded-lg cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <form onSubmit={handleResolveIncident} className="space-y-3.5 text-xs">
                <div>
                  <label className="font-bold text-secondary block mb-1">
                    Resolution Summary / Disposition <span className="text-error">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Provide detailed closure findings (e.g., False positive resolved, Credential revoked, Policy violation re-trained, User isolated)..."
                    value={resolutionSummary}
                    onChange={(e) => setResolutionSummary(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2.5 text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="mt-lg pt-md border-t border-outline-variant flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowResolveModal(false)}
                    className="px-3 py-1.5 border border-outline-variant rounded-lg text-secondary hover:text-on-surface font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updatingStatus || !resolutionSummary.trim()}
                    className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    {updatingStatus && (
                      <span className="material-symbols-outlined animate-spin text-sm">
                        progress_activity
                      </span>
                    )}
                    Confirm Case Resolution
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
