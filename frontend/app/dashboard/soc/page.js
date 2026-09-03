"use client";

import React, { useState, useEffect } from "react";
import AppLayout from "../../components/AppLayout";
import MetricCard from "../../components/MetricCard";
import RiskBadge from "../../components/RiskBadge";
import RoleGuard from "../../components/RoleGuard";
import { logApi, employeeApi, alertApi } from "../../lib/api";

export default function SocDashboardPage() {
  const [isPaused, setIsPaused] = useState(false);
  const [filterType, setFilterType] = useState("ALL");
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [streamLogs, setStreamLogs] = useState([]);
  const [alertsCount, setAlertsCount] = useState(0);

  // Ingest form state
  const [ingestEmpId, setIngestEmpId] = useState("");
  const [ingestEventType, setIngestEventType] = useState("usb_connect");
  const [ingestDetails, setIngestDetails] = useState('{"device_name": "SanDisk 64GB", "transferred_mb": 5120}');
  const [ingestStatus, setIngestStatus] = useState(null);

  const fetchInitialData = async () => {
    try {
      const [empData, logsData, alertsData] = await Promise.all([
        employeeApi.list().catch(() => []),
        logApi.getAll().catch(() => []),
        alertApi.list().catch(() => []),
      ]);

      if (Array.isArray(empData) && empData.length > 0) {
        setEmployees(empData);
        setIngestEmpId(empData[0].employee_id);
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
  }, []);

  // Poll for new live telemetry from MongoDB when not paused
  useEffect(() => {
    if (isPaused) return;

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
  }, [isPaused, filterType]);

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

  const filteredLogs =
    filterType === "ALL"
      ? streamLogs
      : streamLogs.filter((l) => l.rawType === filterType || l.eventType === filterType);

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
              <span className="w-2.5 h-2.5 rounded-full bg-error animate-pulse" />
            </div>
            <p className="text-on-surface-variant text-body-base text-xs mt-0.5">
              Live event stream processing, MongoDB persistence, and cross-database behavioral integrity.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowIngestModal(true)}
              className="bg-primary-container text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-primary transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              Simulate / Ingest Log
            </button>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
          <MetricCard
            title="Telemetry Stream Count"
            value={streamLogs.length}
            trend="MongoDB Live"
            trendType="up-good"
            icon="speed"
            iconBg="bg-primary-fixed"
            iconColor="text-primary"
            description="Ingestion throughput stream"
          />
          <MetricCard
            title="Active Alerts"
            value={alertsCount}
            trend="PostgreSQL Store"
            trendType="up-danger"
            icon="warning"
            iconBg="bg-error-container"
            iconColor="text-error"
            description="High priority queue items"
          />
          <MetricCard
            title="High Severity Events"
            value={streamLogs.filter((l) => l.riskLevel === "Critical" || l.riskLevel === "High").length}
            trend="Flagged in DB"
            trendType="up-danger"
            icon="policy"
            iconBg="bg-tertiary-fixed"
            iconColor="text-tertiary"
            description="Behavioral deviation flagged"
          />
          <MetricCard
            title="Monitored Employees"
            value={employees.length}
            trend="PostgreSQL"
            trendType="neutral"
            icon="group"
            iconBg="bg-secondary-container"
            iconColor="text-on-secondary-container"
            description="Indexed in PostgreSQL directory"
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
                {!isPaused && (
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
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-secondary">
                        No activity logs in MongoDB matching filter.
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
                  <div
                    className="absolute inset-0 rounded-full border-[14px] border-primary-container border-t-transparent border-l-transparent transform rotate-45"
                  />
                  <div
                    className="absolute inset-0 rounded-full border-[14px] border-error border-r-transparent border-b-transparent transform -rotate-45"
                  />
                  <div className="flex flex-col items-center justify-center">
                    <span className="font-label-caps text-label-caps text-secondary text-[9px]">
                      Live
                    </span>
                    <span className="font-bold text-base leading-none">{streamLogs.length}</span>
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
                    <span className="text-secondary font-medium">Logins & Remote</span>
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
                <span className="font-label-caps text-label-caps text-error bg-error-container px-2 py-0.5 rounded text-[10px] font-bold">
                  Active Monitoring
                </span>
              </div>
              <div className="flex-1 relative flex items-end">
                <div className="w-full h-full flex items-end justify-between px-2 pb-1 gap-1.5">
                  <div className="w-full bg-tertiary-container/20 rounded-t h-[20%]" />
                  <div className="w-full bg-tertiary-container/20 rounded-t h-[30%]" />
                  <div className="w-full bg-tertiary-container/20 rounded-t h-[15%]" />
                  <div className="w-full bg-tertiary-container/20 rounded-t h-[50%]" />
                  <div className="w-full bg-error rounded-t h-[85%] relative group cursor-pointer">
                    <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 bg-inverse-surface text-inverse-on-surface text-[10px] font-bold px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                      Spike: Exfiltration Detection
                    </div>
                  </div>
                  <div className="w-full bg-tertiary-container/20 rounded-t h-[40%]" />
                  <div className="w-full bg-tertiary-container/20 rounded-t h-[25%]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Log Ingest Modal */}
        {showIngestModal && (
          <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-xs flex items-center justify-center p-md z-50">
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant max-w-md w-full p-lg shadow-xl">
              <div className="flex justify-between items-center border-b border-outline-variant pb-sm mb-md">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    cloud_upload
                  </span>
                  <h3 className="font-card-title text-card-title text-on-surface text-sm font-semibold">
                    Simulate & Ingest Digital Activity Log
                  </h3>
                </div>
                <button
                  onClick={() => setShowIngestModal(false)}
                  className="p-1 text-secondary hover:bg-surface-container rounded"
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
                    className="px-3 py-1.5 border border-outline-variant rounded-lg text-secondary font-semibold hover:bg-surface-container"
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
