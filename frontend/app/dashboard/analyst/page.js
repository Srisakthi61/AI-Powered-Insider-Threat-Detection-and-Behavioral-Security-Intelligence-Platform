"use client";

import React, { useState, useEffect } from "react";
import AppLayout from "../../components/AppLayout";
import MetricCard from "../../components/MetricCard";
import RiskBadge from "../../components/RiskBadge";
import RoleGuard from "../../components/RoleGuard";
import { employeeApi, alertApi, logApi } from "../../lib/api";

export default function AnalystDashboardPage() {
  const [timeRange, setTimeRange] = useState("24h");
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [empData, alertData, logData] = await Promise.all([
        employeeApi.list().catch(() => []),
        alertApi.list().catch(() => []),
        logApi.getAll(null, null, 10).catch(() => []),
      ]);
      if (Array.isArray(empData)) setEmployees(empData);
      if (Array.isArray(alertData)) setAlerts(alertData);
      if (Array.isArray(logData)) setRecentEvents(logData);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleResolveAlert = async (id) => {
    try {
      await alertApi.update(id, { status: "RESOLVED" });
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "RESOLVED" } : a))
      );
      setSelectedAlert(null);
    } catch (err) {
      console.error("Failed to resolve alert:", err);
    }
  };

  const handleInvestigateAlert = async (id) => {
    try {
      await alertApi.update(id, { status: "INVESTIGATING" });
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "INVESTIGATING" } : a))
      );
      setSelectedAlert(null);
    } catch (err) {
      console.error("Failed to mark alert investigating:", err);
    }
  };

  const activeAlerts = alerts.filter((a) => (a.status || "").toUpperCase() !== "RESOLVED");

  return (
    <RoleGuard allowedRoles={["security_analyst"]}>
      <AppLayout>
      <div className="flex flex-col gap-gutter">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm mb-xs">
          <div>
            <h1 className="font-page-title text-page-title text-on-surface font-bold">
              Security Analyst Dashboard
            </h1>
            <p className="text-on-surface-variant text-body-base text-xs mt-0.5">
              Live threat telemetry from PostgreSQL & MongoDB anomaly detection pipelines.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-surface-container-lowest border border-outline-variant text-on-surface rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-1 focus:ring-primary focus:border-primary shadow-xs outline-none cursor-pointer"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
            <button
              onClick={() => alert("Exporting investigation summary report...")}
              className="bg-primary-container text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-primary transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Export
            </button>
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
          <MetricCard
            title="Open Alerts"
            value={activeAlerts.length}
            trend="Active Queue"
            trendType="up-danger"
            icon="warning"
            iconBg="bg-error-container"
            iconColor="text-error"
            description="Requires tier-1 triage"
          />
          <MetricCard
            title="Monitored Employees"
            value={employees.length}
            trend="Active Directory"
            trendType="neutral"
            icon="person_alert"
            iconBg="bg-tertiary-fixed"
            iconColor="text-tertiary"
            description="Indexed in PostgreSQL"
          />
          <MetricCard
            title="Active Investigations"
            value={alerts.filter((a) => (a.status || "").toUpperCase() === "INVESTIGATING").length}
            trend="Under review"
            trendType="neutral"
            icon="policy"
            iconBg="bg-primary-fixed"
            iconColor="text-primary"
            description="Active SOC investigations"
          />
          <MetricCard
            title="Recent Telemetry Events"
            value={recentEvents.length}
            trend="MongoDB Store"
            trendType="neutral"
            icon="history"
            iconBg="bg-secondary-container"
            iconColor="text-on-secondary-container"
            description="Time-series logs"
          />
        </div>

        {/* Main Analysis Area: Priority Queue + Recent Events Stream */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          {/* Priority Queue (Left 8/12) */}
          <div className="lg:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-xl flex flex-col overflow-hidden shadow-xs">
            <div className="p-md border-b border-outline-variant flex justify-between items-center bg-surface-bright">
              <div className="flex items-center gap-2">
                <h2 className="font-section-title text-section-title text-on-surface font-semibold text-sm">
                  Alerts / Priority Queue (PostgreSQL)
                </h2>
                <span className="text-[10px] bg-error-container text-error px-2 py-0.5 rounded-full font-bold">
                  {activeAlerts.length} Active
                </span>
              </div>
              <button
                onClick={fetchDashboardData}
                className="text-secondary text-xs hover:text-primary flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">refresh</span>
                Refresh
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant text-on-surface-variant font-label-caps text-label-caps">
                    <th className="p-sm pl-md font-semibold">Priority</th>
                    <th className="p-sm font-semibold">Alert Message</th>
                    <th className="p-sm font-semibold">Employee</th>
                    <th className="p-sm font-semibold">Timestamp</th>
                    <th className="p-sm font-semibold">Status</th>
                    <th className="p-sm pr-md font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="text-body-sm text-on-surface divide-y divide-outline-variant">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-secondary">
                        <span className="material-symbols-outlined animate-spin text-[24px]">
                          progress_activity
                        </span>
                      </td>
                    </tr>
                  ) : alerts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-secondary text-xs">
                        No alerts recorded in database.
                      </td>
                    </tr>
                  ) : (
                    alerts.map((alertItem) => (
                      <tr
                        key={alertItem.id}
                        className="hover:bg-surface-container-low transition-colors group cursor-pointer"
                        onClick={() => setSelectedAlert(alertItem)}
                      >
                        <td className="p-sm pl-md">
                          <RiskBadge level={alertItem.severity} />
                        </td>
                        <td className="p-sm font-medium text-xs text-on-surface">
                          {alertItem.message}
                        </td>
                        <td className="p-sm text-on-surface-variant text-xs">
                          {alertItem.employee_name || "Employee"} ({alertItem.employee_code || `ID:${alertItem.employee_id}`})
                        </td>
                        <td className="p-sm text-on-surface-variant text-xs font-mono">
                          {alertItem.created_at ? new Date(alertItem.created_at).toLocaleTimeString() : "Recent"}
                        </td>
                        <td className="p-sm">
                          <RiskBadge status={alertItem.status} />
                        </td>
                        <td className="p-sm pr-md text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAlert(alertItem);
                            }}
                            className="p-1 text-primary hover:bg-primary-fixed rounded transition-colors"
                            title="View Alert Details"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              open_in_new
                            </span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Events Stream (Right 4/12) */}
          <div className="lg:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-xl flex flex-col shadow-xs">
            <div className="p-md border-b border-outline-variant bg-surface-bright flex justify-between items-center">
              <h2 className="font-section-title text-section-title text-on-surface font-semibold text-sm">
                Recent Security Events (MongoDB)
              </h2>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="p-md flex-1 overflow-y-auto relative space-y-4 max-h-[380px]">
              {recentEvents.length === 0 ? (
                <p className="text-xs text-secondary italic">No telemetry logs found.</p>
              ) : (
                recentEvents.slice(0, 6).map((log, idx) => (
                  <div key={log._id || idx} className="flex gap-3 relative z-10 text-xs">
                    <div className="w-7 h-7 rounded-full bg-surface border-2 border-primary-container flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-primary-container text-[14px]">
                        {log.event_type === "usb_connect" ? "usb" : log.event_type === "login" ? "login" : "bolt"}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-on-surface uppercase text-[11px]">
                          {log.event_type}
                        </span>
                        <span className="text-[10px] font-mono text-primary font-bold">
                          {log.employee_id}
                        </span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant mt-0.5 leading-snug font-mono truncate max-w-[200px]">
                        {JSON.stringify(log.details)}
                      </p>
                      <span className="text-[10px] text-outline mt-1 block">
                        {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : "Recent"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Lower Section: Activity & Risk Trend */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-xs">
          <div className="flex justify-between items-center mb-md">
            <div>
              <h2 className="font-section-title text-section-title text-on-surface font-semibold text-sm">
                Activity / Risk Trend Analysis
              </h2>
              <p className="text-[11px] text-secondary">
                Real-time telemetry analysis across monitored organizational endpoints
              </p>
            </div>
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-on-surface-variant text-xs">
                <div className="w-3 h-3 bg-primary rounded-xs opacity-60" /> Normal Activity
              </span>
              <span className="flex items-center gap-1.5 text-on-surface-variant text-xs">
                <div className="w-3 h-3 bg-error rounded-xs opacity-80" /> Risk Events
              </span>
            </div>
          </div>

          {/* Interactive SVG Sparkline/Area Chart */}
          <div className="w-full h-44 bg-surface-container-low rounded-lg border border-outline-variant relative overflow-hidden flex items-end p-2">
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 500 120">
              <defs>
                <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ba1a1a" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#ba1a1a" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="normGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#004ac6" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#004ac6" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="30" x2="500" y2="30" stroke="#e1e2ed" strokeDasharray="3 3" />
              <line x1="0" y1="60" x2="500" y2="60" stroke="#e1e2ed" strokeDasharray="3 3" />
              <line x1="0" y1="90" x2="500" y2="90" stroke="#e1e2ed" strokeDasharray="3 3" />

              {/* Normal Activity Area & Line */}
              <polygon
                points="0,120 0,80 50,75 100,60 150,70 200,50 250,55 300,45 350,60 400,50 450,40 500,55 500,120"
                fill="url(#normGrad)"
              />
              <polyline
                points="0,80 50,75 100,60 150,70 200,50 250,55 300,45 350,60 400,50 450,40 500,55"
                fill="none"
                stroke="#004ac6"
                strokeWidth="2"
              />

              {/* Risk Events Area & Line */}
              <polygon
                points="0,120 0,115 50,110 100,105 150,90 200,110 250,100 300,70 350,85 400,30 450,75 500,90 500,120"
                fill="url(#riskGrad)"
              />
              <polyline
                points="0,115 50,110 100,105 150,90 200,110 250,100 300,70 350,85 400,30 450,75 500,90"
                fill="none"
                stroke="#ba1a1a"
                strokeWidth="2"
              />

              <circle cx="400" cy="30" r="4" fill="#ba1a1a" stroke="#ffffff" strokeWidth="2" />
            </svg>

            <div className="absolute top-2 right-4 bg-inverse-surface text-inverse-on-surface px-2 py-1 rounded text-[10px] font-semibold">
              Peak: 14 Risk Events Detected
            </div>
          </div>
        </div>

        {/* Alert Investigation Modal */}
        {selectedAlert && (
          <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-xs flex items-center justify-center p-md z-50">
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant max-w-lg w-full p-lg shadow-xl">
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
                  className="p-1 text-secondary hover:bg-surface-container rounded"
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
                  <span className="font-bold text-secondary">Incident Details:</span>
                  <p className="text-on-surface-variant bg-surface-container-low p-2.5 rounded-lg border border-outline-variant mt-1 leading-relaxed">
                    {selectedAlert.details || "No details provided."}
                  </p>
                </div>
                <div>
                  <span className="font-bold text-secondary">Current Status:</span>
                  <div className="mt-1">
                    <RiskBadge status={selectedAlert.status} />
                  </div>
                </div>
              </div>

              <div className="mt-lg pt-md border-t border-outline-variant flex justify-end gap-2">
                <button
                  onClick={() => handleInvestigateAlert(selectedAlert.id)}
                  className="px-3 py-1.5 bg-secondary-container text-on-secondary-container font-semibold rounded-lg text-xs hover:bg-secondary-fixed transition-colors"
                >
                  Mark Investigating
                </button>
                <button
                  onClick={() => handleResolveAlert(selectedAlert.id)}
                  className="px-3 py-1.5 bg-primary text-white font-semibold rounded-lg text-xs hover:bg-primary-container transition-colors"
                >
                  Resolve Alert
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      </AppLayout>
    </RoleGuard>
  );
}
