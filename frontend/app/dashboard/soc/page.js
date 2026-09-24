"use client";

import React, { useState, useEffect } from "react";
import AppLayout from "../../components/AppLayout";
import MetricCard from "../../components/MetricCard";
import RiskBadge from "../../components/RiskBadge";
import RoleGuard from "../../components/RoleGuard";
import { logApi, employeeApi, alertApi, anomalyApi } from "../../lib/api";
import { useSimulation } from "../../context/SimulationContext";
import Link from "next/link";

export default function SocDashboardPage() {
  const { isSimulated, openSimModal, resetSimulation } = useSimulation();
  const [isPaused, setIsPaused] = useState(false);
  const [filterType, setFilterType] = useState("ALL");
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [streamLogs, setStreamLogs] = useState([]);
  const [alertsCount, setAlertsCount] = useState(0);
  const [anomalyStats, setAnomalyStats] = useState(null);

  // Ingest form state
  const [ingestEmpId, setIngestEmpId] = useState("");
  const [ingestEventType, setIngestEventType] = useState("usb_connect");
  const [ingestDetails, setIngestDetails] = useState('{"device_name": "SanDisk 64GB", "transferred_mb": 5120}');
  const [ingestStatus, setIngestStatus] = useState(null);

  const fetchInitialData = async () => {
    try {
      const [empData, logsData, alertsData, statsData] = await Promise.all([
        employeeApi.list().catch(() => []),
        logApi.getAll().catch(() => []),
        alertApi.list().catch(() => []),
        anomalyApi.getStats().catch(() => null),
      ]);

      if (Array.isArray(empData) && empData.length > 0) {
        setEmployees(empData);
        setIngestEmpId(empData[0].employee_id);
      }
      if (statsData) {
        setAnomalyStats(statsData);
      }
      if (Array.isArray(logsData)) {
        setStreamLogs(
          logsData.map((l) => ({
            id: l._id || l.id,
            timestamp: l.timestamp ? new Date(l.timestamp).toLocaleTimeString() : "Recent",
            eventType: (l.event_type || "").toUpperCase(),
            rawType: l.event_type,
            employeeId: l.employee_id,
            riskLevel:
              l.event_type === "usb_connect"
                ? "Critical"
                : l.event_type === "privilege_change"
                ? "High"
                : "Low",
            icon:
              l.event_type === "usb_connect"
                ? "usb"
                : l.event_type === "login"
                ? "login"
                : l.event_type === "file_download"
                ? "folder_open"
                : "bolt",
            highlight: l.event_type === "usb_connect" || l.event_type === "privilege_change",
          }))
        );
      }
      if (Array.isArray(alertsData)) {
        setAlertsCount(alertsData.length);
      }
    } catch (e) {
      console.error("SOC initial fetch error:", e);
    }
  };

  useEffect(() => {
    fetchInitialData();

    const handleSimulated = () => fetchInitialData();
    const handleReset = () => {
      setStreamLogs([]);
      setAlertsCount(0);
      fetchInitialData();
    };

    window.addEventListener("threat-simulated", handleSimulated);
    window.addEventListener("simulation-reset", handleReset);

    return () => {
      window.removeEventListener("threat-simulated", handleSimulated);
      window.removeEventListener("simulation-reset", handleReset);
    };
  }, []);

  // Poll for new live telemetry from MongoDB when simulated and not paused
  useEffect(() => {
    if (isPaused || !isSimulated) return;

    const interval = setInterval(async () => {
      try {
        const latest = await logApi.getAll(filterType !== "ALL" ? filterType : null, null, 25);
        if (Array.isArray(latest)) {
          setStreamLogs(
            latest.map((l) => ({
              id: l._id || l.id,
              timestamp: l.timestamp ? new Date(l.timestamp).toLocaleTimeString() : "Recent",
              eventType: (l.event_type || "").toUpperCase(),
              rawType: l.event_type,
              employeeId: l.employee_id,
              riskLevel:
                l.event_type === "usb_connect"
                  ? "Critical"
                  : l.event_type === "privilege_change"
                  ? "High"
                  : "Low",
              icon:
                l.event_type === "usb_connect"
                  ? "usb"
                  : l.event_type === "login"
                  ? "login"
                  : l.event_type === "file_download"
                  ? "folder_open"
                  : "bolt",
              highlight: l.event_type === "usb_connect" || l.event_type === "privilege_change",
            }))
          );
        }
      } catch (e) {}
    }, 5000);

    return () => clearInterval(interval);
  }, [isPaused, filterType, isSimulated]);

  const handleIngestSubmit = async (e) => {
    e.preventDefault();
    setIngestStatus("Ingesting log into MongoDB...");

    try {
      let parsedDetails = {};
      try {
        parsedDetails = JSON.parse(ingestDetails);
      } catch {
        parsedDetails = { raw: ingestDetails };
      }

      const res = await logApi.ingest(ingestEmpId, ingestEventType, parsedDetails);
      setIngestStatus(`Success! MongoDB Log ID: ${res.log_id}`);

      // Refresh stream directly from database
      const latest = await logApi.getAll(filterType !== "ALL" ? filterType : null, null, 25);
      if (Array.isArray(latest)) {
        setStreamLogs(
          latest.map((l) => ({
            id: l._id || l.id,
            timestamp: l.timestamp ? new Date(l.timestamp).toLocaleTimeString() : "Recent",
            eventType: (l.event_type || "").toUpperCase(),
            rawType: l.event_type,
            employeeId: l.employee_id,
            riskLevel:
              l.event_type === "usb_connect"
                ? "Critical"
                : l.event_type === "privilege_change"
                ? "High"
                : "Low",
            icon:
              l.event_type === "usb_connect"
                ? "usb"
                : l.event_type === "login"
                ? "login"
                : l.event_type === "file_download"
                ? "folder_open"
                : "bolt",
            highlight: l.event_type === "usb_connect" || l.event_type === "privilege_change",
          }))
        );
      }

      setTimeout(() => {
        setShowIngestModal(false);
        setIngestStatus(null);
      }, 1000);
    } catch (err) {
      setIngestStatus(
        `Error: ${err.response?.data?.detail || "Log ingestion failed"}`
      );
    }
  };

  const displayLogs = isSimulated ? streamLogs : [];
  const filteredLogs =
    filterType === "ALL"
      ? displayLogs
      : displayLogs.filter((l) => l.rawType === filterType || l.eventType === filterType);

  return (
    <RoleGuard allowedRoles={["soc_engineer"]}>
      <AppLayout>
        <div className="flex flex-col gap-gutter">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm mb-xs">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-page-title text-page-title text-on-surface font-bold">
                  SOC Operations Center
                </h1>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isSimulated
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300 animate-pulse"
                      : "bg-surface-container-high text-secondary border-outline-variant"
                  }`}
                >
                  {isSimulated ? "● Live Stream Active" : "○ Stream Standby"}
                </span>
              </div>
              <p className="text-on-surface-variant text-body-base text-xs mt-0.5">
                Real-time event stream processing, MongoDB persistence, and cross-database behavioral integrity.
              </p>
            </div>
            <div className="flex items-center gap-2">
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
              <button
                onClick={openSimModal}
                className="bg-primary text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-primary-container transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">bolt</span>
                Simulate Threat
              </button>
              <button
                onClick={() => setShowIngestModal(true)}
                className="bg-primary-container text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-primary transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                Ingest Log
              </button>
            </div>
          </div>

          {/* Standby Banner */}
          {!isSimulated ? (
            <div className="bg-gradient-to-r from-red-500/10 via-surface-container-lowest to-surface-container-low border border-red-500/25 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-error text-white flex items-center justify-center shrink-0 shadow-sm">
                  <span className="material-symbols-outlined text-[28px]">crisis_alert</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-on-surface">
                      SOC Real-Time Stream in Standby — No Active Threat Scenario
                    </h3>
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                      Telemetry Idle
                    </span>
                  </div>
                  <p className="text-xs text-secondary mt-1 max-w-2xl leading-relaxed">
                    Live telemetry stream is waiting for incident events. Click <strong>"Simulate Threat"</strong> to inject mass USB data exfiltration or privilege escalation into MongoDB and observe real-time AI outlier detection.
                  </p>
                </div>
              </div>
              <button
                onClick={openSimModal}
                className="bg-error text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-red-700 transition-all flex items-center gap-2 shrink-0 shadow-sm cursor-pointer active:scale-95 animate-pulse"
              >
                <span className="material-symbols-outlined text-[18px]">bolt</span>
                <span>Simulate Threat Event</span>
              </button>
            </div>
          ) : (
            <div className="bg-surface-container-lowest border border-primary/20 rounded-xl p-md shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-md bg-gradient-to-r from-primary/5 via-surface-container-lowest to-tertiary/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px]">sensors</span>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                    Live Telemetry Ingestion Active
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.2 rounded-full animate-pulse">
                      MongoDB Stream Live
                    </span>
                  </h3>
                  <p className="text-[11px] text-secondary mt-0.5">
                    Real-time event stream connected. Evaluating USB transfers, sudo executions, and login drift.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 4 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
            <MetricCard
              title="Total Telemetry Logs"
              value={
                isSimulated
                  ? (anomalyStats?.total_activity_logs ? Number(anomalyStats.total_activity_logs).toLocaleString() : "10,000")
                  : 0
              }
              trend={isSimulated ? "MongoDB Store" : "Standby"}
              trendType={isSimulated ? "up-safe" : "neutral"}
              icon="dataset"
              iconBg={isSimulated ? "bg-primary-fixed" : "bg-surface-container"}
              iconColor={isSimulated ? "text-primary" : "text-secondary"}
              description={isSimulated ? "Time-series log stream" : "Awaiting telemetry stream"}
            />
            <MetricCard
              title="Behavioral Baselines"
              value={isSimulated ? (anomalyStats?.total_baselines_calculated || 78) : 0}
              trend={isSimulated ? "6 Indicators / Emp" : "Standby"}
              trendType="neutral"
              icon="tune"
              iconBg={isSimulated ? "bg-tertiary-fixed" : "bg-surface-container"}
              iconColor={isSimulated ? "text-tertiary" : "text-secondary"}
              description={isSimulated ? "MongoDB Baselines Store" : "Per-employee baselines"}
            />
            <MetricCard
              title="Active Alerts"
              value={isSimulated ? alertsCount : 0}
              trend={isSimulated ? "PostgreSQL Store" : "Queue Empty"}
              trendType={isSimulated && alertsCount > 0 ? "up-danger" : "neutral"}
              icon="warning"
              iconBg={isSimulated && alertsCount > 0 ? "bg-error-container" : "bg-surface-container"}
              iconColor={isSimulated && alertsCount > 0 ? "text-error" : "text-secondary"}
              description={isSimulated ? "High priority queue items" : "No active alerts"}
            />
            <MetricCard
              title="Monitored Employees"
              value={isSimulated ? (employees.length || 13) : 0}
              trend={isSimulated ? "PostgreSQL" : "Standby"}
              trendType="neutral"
              icon="group"
              iconBg={isSimulated ? "bg-secondary-container" : "bg-surface-container"}
              iconColor={isSimulated ? "text-on-secondary-container" : "text-secondary"}
              description={isSimulated ? "Indexed in directory" : "Directory ready"}
            />
          </div>

          {/* Main Grid: Activity Stream + Right Widgets */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
            {/* Live Activity Stream (Left 7/12) */}
            <div className="lg:col-span-7 bg-surface-container-lowest border border-outline-variant rounded-xl flex flex-col h-[520px] overflow-hidden shadow-xs">
              <div className="p-md border-b border-outline-variant flex justify-between items-center bg-surface-bright">
                <div className="flex items-center gap-2">
                  <h2 className="font-card-title text-card-title text-on-surface text-sm font-semibold">
                    Live Activity Stream (MongoDB)
                  </h2>
                  {isSimulated && !isPaused && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold animate-pulse">
                      LIVE
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsPaused(!isPaused)}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition-colors cursor-pointer ${
                      isPaused
                        ? "bg-primary text-white border-primary"
                        : "bg-surface-container-low border-outline-variant text-on-surface-variant hover:bg-surface-container"
                    }`}
                  >
                    {isPaused ? "Resume" : "Pause"}
                  </button>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-2 py-1 bg-surface-container-low border border-outline-variant rounded text-[11px] font-semibold text-on-surface-variant focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">All Events</option>
                    <option value="usb_connect">USB Connect</option>
                    <option value="login">Logins</option>
                    <option value="file_download">File Access</option>
                    <option value="privilege_change">Privilege Change</option>
                  </select>
                </div>
              </div>

              {/* Scrolling Content Area */}
              <div className="flex-1 overflow-y-auto relative">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-surface-container-low sticky top-0 z-10 border-b border-outline-variant">
                    <tr className="text-[10px] uppercase font-bold text-secondary tracking-wider">
                      <th className="px-md py-2">Timestamp</th>
                      <th className="px-md py-2">Event Type</th>
                      <th className="px-md py-2">Employee ID</th>
                      <th className="px-md py-2">Risk Level</th>
                    </tr>
                  </thead>
                  <tbody className="text-body-sm text-on-surface divide-y divide-outline-variant/60 text-xs">
                    {!isSimulated || filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-12 text-center text-secondary">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-[28px] text-outline">
                              sensors_off
                            </span>
                            <p className="font-semibold text-xs text-on-surface">No Activity Logs in Stream</p>
                            <p className="text-[11px] text-secondary">
                              Click "Simulate Threat" or "Ingest Log" to stream live events.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((log) => (
                        <tr
                          key={log.id}
                          className={`hover:bg-surface-container-low transition-colors h-11 ${
                            log.highlight ? "bg-error/5" : ""
                          }`}
                        >
                          <td className="px-md py-2 text-secondary font-mono text-[11px]">
                            {log.timestamp}
                          </td>
                          <td className="px-md py-2">
                            <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                              <span
                                className={`material-symbols-outlined text-[15px] ${
                                  log.riskLevel === "Critical"
                                    ? "text-error"
                                    : log.riskLevel === "High"
                                    ? "text-tertiary"
                                    : "text-secondary"
                                }`}
                              >
                                {log.icon}
                              </span>
                              {log.eventType}
                            </div>
                          </td>
                          <td className="px-md py-2 font-mono text-[11px] font-bold text-primary">
                            {log.employeeId}
                          </td>
                          <td className="px-md py-2">
                            <RiskBadge level={log.riskLevel} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Column: Secondary Widgets (Right 5/12) */}
            <div className="lg:col-span-5 flex flex-col gap-gutter h-[520px]">
              {/* Event Distribution Widget */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl flex-1 flex flex-col p-md shadow-xs">
                <div className="mb-2 border-b border-outline-variant pb-2">
                  <h3 className="font-card-title text-card-title text-on-surface text-sm font-semibold">
                    Event Distribution
                  </h3>
                </div>
                <div className="flex-1 flex items-center justify-around">
                  {/* Visual Donut */}
                  <div className="w-28 h-28 rounded-full border-[14px] border-surface-container relative flex items-center justify-center">
                    {isSimulated && (
                      <>
                        <div className="absolute inset-0 rounded-full border-[14px] border-primary-container border-t-transparent border-l-transparent transform rotate-45" />
                        <div className="absolute inset-0 rounded-full border-[14px] border-error border-r-transparent border-b-transparent transform -rotate-45" />
                      </>
                    )}
                    <div className="flex flex-col items-center justify-center">
                      <span className="font-label-caps text-label-caps text-secondary text-[9px]">
                        {isSimulated ? "Live" : "Standby"}
                      </span>
                      <span className="font-bold text-base leading-none">
                        {isSimulated ? displayLogs.length : 0}
                      </span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex flex-col gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded bg-primary-container" />
                      <span className="text-secondary font-medium">Standard Events</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded bg-surface-container-highest" />
                      <span className="text-secondary font-medium">Logins &amp; Remote</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded bg-error" />
                      <span className="text-error font-semibold">USB / Privilege Anomalies</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Anomaly Trend / Spike Widget */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl flex-1 flex flex-col p-md shadow-xs">
                <div className="mb-2 border-b border-outline-variant pb-2 flex justify-between items-center">
                  <h3 className="font-card-title text-card-title text-on-surface text-sm font-semibold">
                    Anomaly Spike Detection
                  </h3>
                  <span
                    className={`font-label-caps text-label-caps px-2 py-0.5 rounded text-[10px] font-bold ${
                      isSimulated
                        ? "text-error bg-error-container"
                        : "text-secondary bg-surface-container-high"
                    }`}
                  >
                    {isSimulated ? "Active Monitoring" : "Standby"}
                  </span>
                </div>
                <div className="flex-1 relative flex items-end">
                  <div className="w-full h-full flex items-end justify-between px-2 pb-1 gap-1.5">
                    <div className={`w-full bg-tertiary-container/20 rounded-t transition-all ${isSimulated ? "h-[20%]" : "h-[5%]"}`} />
                    <div className={`w-full bg-tertiary-container/20 rounded-t transition-all ${isSimulated ? "h-[30%]" : "h-[8%]"}`} />
                    <div className={`w-full bg-tertiary-container/20 rounded-t transition-all ${isSimulated ? "h-[15%]" : "h-[4%]"}`} />
                    <div className={`w-full bg-tertiary-container/20 rounded-t transition-all ${isSimulated ? "h-[50%]" : "h-[6%]"}`} />
                    {isSimulated ? (
                      <div className="w-full bg-error rounded-t h-[85%] relative group cursor-pointer animate-pulse">
                        <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 bg-inverse-surface text-inverse-on-surface text-[10px] font-bold px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                          Spike: Exfiltration Detection
                        </div>
                      </div>
                    ) : (
                      <div className="w-full bg-surface-container-highest rounded-t h-[5%]" />
                    )}
                    <div className={`w-full bg-tertiary-container/20 rounded-t transition-all ${isSimulated ? "h-[40%]" : "h-[7%]"}`} />
                    <div className={`w-full bg-tertiary-container/20 rounded-t transition-all ${isSimulated ? "h-[25%]" : "h-[5%]"}`} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Log Ingest Modal */}
          {showIngestModal && (
            <div className="fixed inset-0 w-screen h-screen z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant max-w-md w-full p-5 sm:p-6 shadow-2xl relative my-auto animate-toast-slide-in">
                <div className="flex justify-between items-center border-b border-outline-variant pb-sm mb-md">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">
                      cloud_upload
                    </span>
                    <h3 className="font-card-title text-card-title text-on-surface text-sm font-semibold">
                      Simulate &amp; Ingest Digital Activity Log
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowIngestModal(false)}
                    className="p-1 text-secondary hover:bg-surface-container rounded-lg cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>

                {ingestStatus && (
                  <div className="mb-3 p-2.5 bg-secondary-container text-on-secondary-container rounded-lg text-xs font-semibold">
                    {ingestStatus}
                  </div>
                )}

                <form onSubmit={handleIngestSubmit} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-on-surface mb-1">
                      Employee
                    </label>
                    <select
                      value={ingestEmpId}
                      onChange={(e) => setIngestEmpId(e.target.value)}
                      className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface text-xs outline-none focus:ring-1 focus:ring-primary cursor-pointer font-mono"
                    >
                      {employees.map((emp) => (
                        <option key={emp.employee_id} value={emp.employee_id}>
                          {emp.employee_id} — {emp.name} ({emp.department})
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-secondary mt-0.5 block">
                      Validates against PostgreSQL employees table.
                    </span>
                  </div>

                  <div>
                    <label className="block font-semibold text-on-surface mb-1">
                      Event Type
                    </label>
                    <select
                      value={ingestEventType}
                      onChange={(e) => setIngestEventType(e.target.value)}
                      className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface text-xs outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      <option value="usb_connect">usb_connect (High Severity)</option>
                      <option value="file_download">file_download</option>
                      <option value="file_upload">file_upload</option>
                      <option value="data_transfer">data_transfer</option>
                      <option value="login">login</option>
                      <option value="privilege_change">privilege_change</option>
                      <option value="remote_access">remote_access</option>
                      <option value="email_activity">email_activity</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-on-surface mb-1">
                      JSON Details / Metadata
                    </label>
                    <textarea
                      rows={3}
                      value={ingestDetails}
                      onChange={(e) => setIngestDetails(e.target.value)}
                      className="w-full font-mono text-[11px] p-2 border border-outline-variant rounded-lg bg-surface outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="pt-2 border-t border-outline-variant flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowIngestModal(false)}
                      className="px-3 py-1.5 border border-outline-variant rounded-lg text-secondary font-semibold hover:bg-surface-container cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 bg-primary text-white rounded-lg font-semibold hover:bg-primary-container cursor-pointer"
                    >
                      Post to MongoDB
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </AppLayout>
    </RoleGuard>
  );
}
