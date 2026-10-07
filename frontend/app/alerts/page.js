"use client";

import React, { useState, useEffect } from "react";
import AppLayout from "../components/AppLayout";
import RiskBadge from "../components/RiskBadge";
import MetricCard from "../components/MetricCard";
import { alertApi, anomalyApi } from "../lib/api";
import { useSimulation } from "../context/SimulationContext";

export default function AlertsPage() {
  const { isSimulated, resetSimulation } = useSimulation();
  const [filterPriority, setFilterPriority] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterTargetRole, setFilterTargetRole] = useState("ALL");
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mlGenerating, setMlGenerating] = useState(false);
  const [mlSuccessMsg, setMlSuccessMsg] = useState(null);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const data = await alertApi.list(filterPriority, filterStatus, filterTargetRole);
      if (Array.isArray(data)) {
        setAlerts(data);
      }
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();

    const handleSimulated = () => fetchAlerts();
    const handleReset = () => {
      setAlerts([]);
      fetchAlerts();
    };

    window.addEventListener("threat-simulated", handleSimulated);
    window.addEventListener("simulation-reset", handleReset);

    return () => {
      window.removeEventListener("threat-simulated", handleSimulated);
      window.removeEventListener("simulation-reset", handleReset);
    };
  }, [filterPriority, filterStatus, filterTargetRole]);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await alertApi.update(id, { status: newStatus });
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
      );
      if (selectedAlert && selectedAlert.id === id) {
        setSelectedAlert({ ...selectedAlert, status: newStatus });
      }
    } catch (err) {
      console.error("Failed to update alert status in DB:", err);
    }
  };

  const handleRunMlAlertGenerator = async () => {
    setMlGenerating(true);
    setMlSuccessMsg(null);
    try {
      const res = await anomalyApi.generateMlAlerts();
      setMlSuccessMsg(res.message);
      await fetchAlerts();
      setTimeout(() => setMlSuccessMsg(null), 7000);
    } catch (err) {
      console.error("ML Alert generation failed:", err);
      setMlSuccessMsg("Failed to execute ML threat scan.");
    } finally {
      setMlGenerating(false);
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    const matchesPriority =
      filterPriority === "ALL" || (a.severity || "").toLowerCase() === filterPriority.toLowerCase();
    const matchesStatus =
      filterStatus === "ALL" || (a.status || "").toLowerCase() === filterStatus.toLowerCase();
    const matchesTargetRole =
      filterTargetRole === "ALL" || (a.target_role || "").toLowerCase() === filterTargetRole.toLowerCase();
    return matchesPriority && matchesStatus && matchesTargetRole;
  });

  return (
    <AppLayout>
      <div className="flex flex-col gap-gutter">
        {/* Page Header with Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-sm mb-xs">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-page-title text-page-title text-on-surface font-bold">
                Security Alerts &amp; Incident Triage Queue
              </h1>
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isSimulated ? "bg-error animate-pulse" : "bg-secondary/60"
                }`}
              />
            </div>
            <p className="text-on-surface-variant text-body-base text-xs mt-0.5">
              Automated multi-stakeholder alert dispatch powered by Isolation Forest unsupervised anomaly detection.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isSimulated && (
              <button
                onClick={resetSimulation}
                className="bg-surface-container-lowest border border-outline-variant text-secondary hover:text-error px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-error-container/30 transition-colors flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
                title="Reset dashboard to empty standby"
              >
                <span className="material-symbols-outlined text-[15px]">restart_alt</span>
                Reset
              </button>
            )}
          </div>
        </div>

        {/* ML Scan Status Alert */}
        {mlSuccessMsg && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-3 rounded-xl text-xs font-semibold flex items-center justify-between animate-toast-slide-in">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-600 text-[18px]">
                verified
              </span>
              <span>{mlSuccessMsg}</span>
            </div>
            <button
              onClick={() => setMlSuccessMsg(null)}
              className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-gutter">
          <MetricCard
            title="Critical Alerts"
            value={alerts.filter((a) => (a.severity || "").toLowerCase() === "critical").length}
            trend={alerts.some((a) => (a.severity || "").toLowerCase() === "critical") ? "Immediate Action" : "None"}
            trendType={alerts.some((a) => (a.severity || "").toLowerCase() === "critical") ? "up-danger" : "neutral"}
            icon="warning"
            iconBg="bg-error-container"
            iconColor="text-error"
          />
          <MetricCard
            title="Investigating"
            value={alerts.filter((a) => (a.status || "").toUpperCase() === "INVESTIGATING").length}
            trend="Active Triage"
            trendType="neutral"
            icon="policy"
            iconBg="bg-secondary-container"
            iconColor="text-on-secondary-container"
          />
          <MetricCard
            title="Unassigned"
            value={alerts.filter((a) => (a.status || "").toUpperCase() === "UNASSIGNED").length}
            trend="Awaiting Owner"
            trendType={alerts.some((a) => (a.status || "").toUpperCase() === "UNASSIGNED") ? "up-danger" : "neutral"}
            icon="hourglass_empty"
            iconBg="bg-tertiary-fixed"
            iconColor="text-tertiary"
          />
          <MetricCard
            title="Resolved"
            value={alerts.filter((a) => (a.status || "").toUpperCase() === "RESOLVED").length}
            trend="SLA Protected"
            trendType="up-good"
            icon="check_circle"
            iconBg="bg-emerald-100"
            iconColor="text-emerald-700"
          />
        </div>

        {/* Multi-Factor Filter Bar */}
        <div className="flex flex-wrap gap-3 items-center bg-surface-container-lowest p-3 border border-outline-variant rounded-xl shadow-xs text-xs">
          <span className="font-bold text-secondary">Filter by:</span>

          {/* Priority */}
          <div className="flex items-center gap-1.5">
            <span className="text-secondary text-[11px]">Priority:</span>
            {["ALL", "Critical", "High", "Medium", "Low"].map((p) => (
              <button
                key={p}
                onClick={() => setFilterPriority(p)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer text-xs ${
                  filterPriority === p
                    ? "bg-primary text-white"
                    : "bg-surface-container-low text-secondary hover:bg-surface-container"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-outline-variant hidden md:block" />

          {/* Status */}
          <div className="flex items-center gap-1.5">
            <span className="text-secondary text-[11px]">Status:</span>
            {["ALL", "UNASSIGNED", "INVESTIGATING", "RESOLVED"].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer text-xs ${
                  filterStatus === s
                    ? "bg-primary text-white"
                    : "bg-surface-container-low text-secondary hover:bg-surface-container"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-outline-variant hidden md:block" />

          {/* Target Stakeholder Role */}
          <div className="flex items-center gap-1.5">
            <span className="text-secondary text-[11px]">Recommended Responder:</span>
            {[
              { id: "ALL", label: "All Roles" },
              { id: "soc_engineer", label: "SOC Engineer" },
              { id: "security_manager", label: "Manager" },
              { id: "admin", label: "Admin" },
              { id: "security_analyst", label: "Analyst" },
            ].map((r) => (
              <button
                key={r.id}
                onClick={() => setFilterTargetRole(r.id)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer text-xs ${
                  filterTargetRole === r.id
                    ? "bg-primary text-white"
                    : "bg-surface-container-low text-secondary hover:bg-surface-container"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Alerts Table */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="table-fixed w-full min-w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant text-on-surface-variant font-label-caps text-label-caps text-[10px]">
                  <th className="w-24 p-3 pl-4 font-semibold">Priority</th>
                  <th className="w-80 p-3 font-semibold">Message &amp; Root Cause</th>
                  <th className="w-44 p-3 font-semibold">Recommended Responder</th>
                  <th className="w-44 p-3 font-semibold">Employee / Dept</th>
                  <th className="w-28 p-3 font-semibold">Status</th>
                  <th className="w-32 p-3 pr-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-body-sm text-on-surface divide-y divide-outline-variant text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 px-6 text-center text-secondary">
                      <span className="material-symbols-outlined animate-spin text-[28px]">
                        progress_activity
                      </span>
                    </td>
                  </tr>
                ) : filteredAlerts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 px-6 text-center text-secondary">
                      <div className="w-full max-w-[400px] mx-auto flex flex-col items-center justify-center text-center gap-2">
                        <span className="material-symbols-outlined text-[32px] text-outline">
                          notifications_off
                        </span>
                        <h4 className="font-bold text-sm text-on-surface">No Alerts in Queue</h4>
                        <p className="text-xs text-secondary leading-relaxed text-center w-full">
                          No alerts matching your criteria. Use &ldquo;Simulate Threat&rdquo; in the top navigation bar to trigger a threat scenario.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAlerts.map((alert) => (
                    <tr
                      key={alert.id}
                      onClick={() => setSelectedAlert(alert)}
                      className="hover:bg-surface-container-low transition-colors cursor-pointer group"
                    >
                      <td className="p-3 pl-4">
                        <RiskBadge level={alert.severity} />
                      </td>
                      <td className="p-3 font-semibold text-on-surface max-w-xs">
                        <div className="truncate">{alert.message}</div>
                        {alert.details && (
                          <div className="text-[10px] text-secondary font-mono truncate mt-0.5">
                            {alert.details}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="font-mono text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                          {alert.target_role_title || "Security Analyst"}
                        </span>
                      </td>
                      <td className="p-3 text-secondary">
                        <div className="font-semibold text-on-surface">
                          {alert.employee_name || "Employee"}
                        </div>
                        <div className="text-[10px] font-mono">
                          {alert.employee_code || `ID: ${alert.employee_id}`} • {alert.department || "General"}
                        </div>
                      </td>
                      <td className="p-3">
                        <RiskBadge status={alert.status} />
                      </td>
                      <td className="p-3 pr-4 text-right">
                        <div
                          className="flex items-center justify-end gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {alert.status !== "INVESTIGATING" && alert.status !== "RESOLVED" && (
                            <button
                              onClick={() => handleUpdateStatus(alert.id, "INVESTIGATING")}
                              className="px-2 py-1 bg-secondary-container text-on-secondary-container rounded text-[11px] font-semibold hover:bg-secondary-fixed cursor-pointer"
                            >
                              Triage
                            </button>
                          )}
                          {alert.status !== "RESOLVED" && (
                            <button
                              onClick={() => handleUpdateStatus(alert.id, "RESOLVED")}
                              className="px-2 py-1 bg-primary text-white rounded text-[11px] font-semibold hover:bg-primary-container cursor-pointer"
                            >
                              Resolve
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedAlert(alert)}
                            className="p-1 text-secondary hover:text-primary rounded cursor-pointer"
                            title="Inspect Alert"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              open_in_new
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Alert Modal */}
        {selectedAlert && (
          <div className="fixed inset-0 w-screen h-screen z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant max-w-lg w-full p-5 sm:p-6 shadow-2xl relative my-auto animate-toast-slide-in">
              <div className="flex justify-between items-start border-b border-outline-variant pb-sm mb-md">
                <div>
                  <div className="flex items-center gap-2">
                    <RiskBadge level={selectedAlert.severity} />
                    <span className="text-xs font-mono text-secondary">
                      ALT-{selectedAlert.id}
                    </span>
                  </div>
                  <h3 className="font-card-title text-card-title text-on-surface mt-1">
                    {selectedAlert.message}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="p-1 text-secondary hover:bg-surface-container rounded-lg cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="font-bold text-secondary">Subject Employee:</span>
                  <p className="text-on-surface font-semibold">
                    {selectedAlert.employee_name} ({selectedAlert.employee_code || `ID:${selectedAlert.employee_id}`})
                  </p>
                </div>
                <div>
                  <span className="font-bold text-secondary">Department:</span>
                  <p className="text-on-surface">{selectedAlert.department || "General"}</p>
                </div>
                <div>
                  <span className="font-bold text-secondary">Recommended Responder:</span>
                  <p className="text-primary font-bold">{selectedAlert.target_role_title || "Security Analyst"}</p>
                </div>
                <div>
                  <span className="font-bold text-secondary">Incident Details:</span>
                  <p className="text-on-surface-variant bg-surface-container-low p-2.5 rounded-lg border border-outline-variant mt-1 leading-relaxed">
                    {selectedAlert.details || "No details provided."}
                  </p>
                </div>
                {selectedAlert.recommended_action && (
                  <div>
                    <span className="font-bold text-secondary">Recommended Action:</span>
                    <p className="text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200 mt-1 font-semibold">
                      ⚡ {selectedAlert.recommended_action}
                    </p>
                  </div>
                )}
                <div>
                  <span className="font-bold text-secondary">Current Status:</span>
                  <div className="mt-1">
                    <RiskBadge status={selectedAlert.status} />
                  </div>
                </div>
              </div>

              <div className="mt-lg pt-md border-t border-outline-variant flex justify-end gap-2">
                <button
                  onClick={() => handleUpdateStatus(selectedAlert.id, "INVESTIGATING")}
                  className="px-3.5 py-1.5 bg-secondary-container text-on-secondary-container font-semibold rounded-lg text-xs hover:bg-secondary-fixed transition-colors cursor-pointer"
                >
                  Mark Investigating
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedAlert.id, "RESOLVED")}
                  className="px-3.5 py-1.5 bg-primary text-white font-semibold rounded-lg text-xs hover:bg-primary-container transition-colors cursor-pointer"
                >
                  Resolve Alert
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
