"use client";

import React, { useState, useEffect } from "react";
import AppLayout from "../components/AppLayout";
import RiskBadge from "../components/RiskBadge";
import RoleGuard from "../components/RoleGuard";
import { logApi, employeeApi } from "../lib/api";

export default function LogsPage() {
  const [employeeId, setEmployeeId] = useState("ALL");
  const [eventType, setEventType] = useState("");
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);

  // Ingest form
  const [ingestEmpId, setIngestEmpId] = useState("");
  const [ingestType, setIngestType] = useState("usb_connect");
  const [ingestDetails, setIngestDetails] = useState('{"file_count": 140, "total_size_mb": 5200}');
  const [ingestMsg, setIngestMsg] = useState(null);

  useEffect(() => {
    employeeApi
      .list()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setEmployees(data);
          setIngestEmpId(data[0].employee_id);
        }
      })
      .catch(() => {});
  }, []);

  const fetchLogs = async (id, ev) => {
    setLoading(true);
    try {
      let data = [];
      if (!id || id === "ALL") {
        data = await logApi.getAll(ev || null, null, 50);
      } else {
        data = await logApi.getLogs(id, ev || null, 50);
      }
      setLogs(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to fetch logs from MongoDB:", e);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(employeeId, eventType);
  }, [employeeId, eventType]);

  const handleIngest = async (e) => {
    e.preventDefault();
    setIngestMsg("Ingesting log into MongoDB time-series collection...");

    try {
      let parsed = {};
      try {
        parsed = JSON.parse(ingestDetails);
      } catch {
        parsed = { note: ingestDetails };
      }

      const res = await logApi.ingest(ingestEmpId, ingestType, parsed);
      setIngestMsg(`Success! Ingested MongoDB log ID: ${res.log_id}`);

      fetchLogs(employeeId, eventType);
    } catch (err) {
      setIngestMsg(`Error: ${err.response?.data?.detail || "Ingestion failed"}`);
    }
  };

  return (
    <RoleGuard allowedRoles={["security_analyst", "soc_engineer", "admin"]}>
      <AppLayout>
      <div className="flex flex-col gap-gutter">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm mb-xs">
          <div>
            <h1 className="font-page-title text-page-title text-on-surface font-bold">
              Activity Logs & Ingestion Console
            </h1>
            <p className="text-on-surface-variant text-body-base text-xs mt-0.5">
              High-throughput time-series digital events stored in MongoDB with PostgreSQL integrity validation.
            </p>
          </div>
          <button
            onClick={() => fetchLogs(employeeId, eventType)}
            className="bg-secondary-container text-on-secondary-container px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-secondary-fixed transition-colors flex items-center gap-1.5 shadow-xs self-start cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            Refresh Telemetry
          </button>
        </div>

        {/* Ingestion Sandbox & Log Query Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          {/* Query & Filter Panel (Left 8/12) */}
          <div className="lg:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-xs flex flex-col">
            <div className="p-md border-b border-outline-variant bg-surface-bright flex flex-wrap gap-2 justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  manage_search
                </span>
                <span className="font-semibold text-xs text-on-surface">
                  Query MongoDB Telemetry
                </span>
              </div>

              {/* Filters */}
              <div className="flex gap-2 text-xs flex-wrap">
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="px-2.5 py-1 bg-surface-container-low border border-outline-variant rounded-lg font-mono font-semibold text-primary outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="ALL">All Employees</option>
                  {employees.map((e) => (
                    <option key={e.employee_id} value={e.employee_id}>
                      {e.employee_id} — {e.name}
                    </option>
                  ))}
                </select>

                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="px-2.5 py-1 bg-surface-container-low border border-outline-variant rounded-lg font-semibold text-on-surface-variant outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="">All Event Types</option>
                  <option value="login">login</option>
                  <option value="file_download">file_download</option>
                  <option value="file_upload">file_upload</option>
                  <option value="data_transfer">data_transfer</option>
                  <option value="email_activity">email_activity</option>
                  <option value="privilege_change">privilege_change</option>
                  <option value="remote_access">remote_access</option>
                  <option value="usb_connect">usb_connect</option>
                </select>
              </div>
            </div>

            {/* Results Table */}
            <div className="overflow-x-auto flex-1 max-h-[500px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-surface-container-low sticky top-0 border-b border-outline-variant z-10">
                  <tr className="text-[10px] uppercase font-bold text-secondary font-label-caps text-label-caps">
                    <th className="p-sm pl-md">Timestamp (UTC)</th>
                    <th className="p-sm">Event Type</th>
                    <th className="p-sm">Employee</th>
                    <th className="p-sm pr-md">Metadata Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/60 text-on-surface">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-secondary">
                        <span className="material-symbols-outlined animate-spin text-[24px]">
                          progress_activity
                        </span>
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-secondary">
                        No activity logs matching this query in MongoDB.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr
                        key={log._id || log.id}
                        className="hover:bg-surface-container-low transition-colors"
                      >
                        <td className="p-sm pl-md text-secondary font-mono text-[11px] whitespace-nowrap">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : "Recent"}
                        </td>
                        <td className="p-sm">
                          <span className="px-2 py-0.5 rounded font-mono font-semibold bg-primary-fixed text-primary-container text-[11px]">
                            {log.event_type}
                          </span>
                        </td>
                        <td className="p-sm font-mono text-primary font-bold">
                          {log.employee_id}
                        </td>
                        <td className="p-sm pr-md font-mono text-[11px] text-secondary max-w-xs truncate">
                          {JSON.stringify(log.details)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Real-time Ingestion Simulator (Right 4/12) */}
          <div className="lg:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-xs flex flex-col">
            <div className="border-b border-outline-variant pb-sm mb-md flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">
                post_add
              </span>
              <h3 className="font-card-title text-card-title text-on-surface text-sm font-semibold">
                Ingest Activity Log (API Test)
              </h3>
            </div>

            {ingestMsg && (
              <div
                className={`mb-3 p-2.5 rounded-lg text-xs font-semibold ${
                  ingestMsg.startsWith("Success")
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-error-container text-on-error-container border border-error/20"
                }`}
              >
                {ingestMsg}
              </div>
            )}

            <form onSubmit={handleIngest} className="space-y-3 text-xs flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                <div>
                  <label className="block font-semibold text-on-surface mb-1">
                    Employee ID
                  </label>
                  <select
                    required
                    value={ingestEmpId}
                    onChange={(e) => setIngestEmpId(e.target.value)}
                    className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface text-xs outline-none focus:ring-1 focus:ring-primary font-mono cursor-pointer"
                  >
                    {employees.map((emp) => (
                      <option key={emp.employee_id} value={emp.employee_id}>
                        {emp.employee_id} — {emp.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-secondary mt-0.5">
                    Validates against PostgreSQL employees table before writing to MongoDB.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-on-surface mb-1">
                    Event Type
                  </label>
                  <select
                    value={ingestType}
                    onChange={(e) => setIngestType(e.target.value)}
                    className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface text-xs outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="usb_connect">usb_connect</option>
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
                    Details JSON Payload
                  </label>
                  <textarea
                    rows={4}
                    value={ingestDetails}
                    onChange={(e) => setIngestDetails(e.target.value)}
                    className="w-full font-mono text-[11px] p-2.5 border border-outline-variant rounded-lg bg-surface outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary-container transition-colors shadow-xs cursor-pointer active:scale-95 text-xs flex items-center justify-center gap-1.5 mt-2"
              >
                <span className="material-symbols-outlined text-[16px]">send</span>
                Ingest Event into MongoDB
              </button>
            </form>
          </div>
        </div>
      </div>
      </AppLayout>
    </RoleGuard>
  );
}
