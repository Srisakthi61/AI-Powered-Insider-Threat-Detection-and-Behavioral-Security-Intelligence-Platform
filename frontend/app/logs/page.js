"use client";

import React, { useState, useEffect } from "react";
import AppLayout from "../components/AppLayout";
import RoleGuard from "../components/RoleGuard";
import { logApi, employeeApi } from "../lib/api";

export default function LogsPage() {
  const [employeeId, setEmployeeId] = useState("ALL");
  const [eventType, setEventType] = useState("");
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(10000);

  useEffect(() => {
    employeeApi
      .list()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setEmployees(data);
        }
      })
      .catch(() => {});
  }, []);

  const fetchLogs = async (id, ev, currPage, currPageSize) => {
    setLoading(true);
    try {
      const skip = (currPage - 1) * currPageSize;
      
      const [countRes, data] = await Promise.all([
        logApi.getCount(ev || null, id !== "ALL" ? id : null).catch(() => ({ total: 10000 })),
        id === "ALL"
          ? logApi.getAll(ev || null, null, currPageSize, skip)
          : logApi.getLogs(id, ev || null, currPageSize, skip)
      ]);

      if (countRes && typeof countRes.total === "number") {
        setTotalCount(countRes.total);
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
    setPage(1);
    fetchLogs(employeeId, eventType, 1, pageSize);

    const handleThreatSimulated = () => fetchLogs(employeeId, eventType, 1, pageSize);
    const handleReset = () => fetchLogs(employeeId, eventType, 1, pageSize);

    window.addEventListener("threat-simulated", handleThreatSimulated);
    window.addEventListener("simulation-reset", handleReset);

    return () => {
      window.removeEventListener("threat-simulated", handleThreatSimulated);
      window.removeEventListener("simulation-reset", handleReset);
    };
  }, [employeeId, eventType, pageSize]);

  const handlePageChange = (newPage) => {
    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      fetchLogs(employeeId, eventType, newPage, pageSize);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <RoleGuard allowedRoles={["security_analyst", "soc_engineer", "admin"]}>
      <AppLayout>
        <div className="flex flex-col gap-gutter">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm mb-xs">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-page-title text-page-title text-on-surface font-bold">
                  Activity Logs & Telemetry Stream
                </h1>
                <span className="bg-primary/10 text-primary text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-primary/20">
                  {Number(totalCount).toLocaleString()} Total Events
                </span>
              </div>
              <p className="text-on-surface-variant text-body-base text-xs mt-0.5">
                High-throughput time-series digital events stored in MongoDB with pagination across 10,000+ data points.
              </p>
            </div>
            <button
              onClick={() => fetchLogs(employeeId, eventType, page, pageSize)}
              className="bg-secondary-container text-on-secondary-container px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-secondary-fixed transition-colors flex items-center gap-1.5 shadow-xs self-start cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              Refresh Telemetry
            </button>
          </div>

          {/* Telemetry Log Query Panel */}
          <div className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-xs flex flex-col">
            <div className="p-md border-b border-outline-variant bg-surface-bright flex flex-wrap gap-3 justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  manage_search
                </span>
                <span className="font-semibold text-xs text-on-surface">
                  Filter &amp; Query MongoDB Logs
                </span>
              </div>

              {/* Filters */}
              <div className="flex gap-2 text-xs flex-wrap items-center">
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="px-2.5 py-1 bg-surface-container-low border border-outline-variant rounded-lg font-mono font-semibold text-primary outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="ALL">All Employees ({employees.length})</option>
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
                  <option value="">All 8 Event Types</option>
                  <option value="login">login (Login Times)</option>
                  <option value="file_download">file_download</option>
                  <option value="file_upload">file_upload</option>
                  <option value="data_transfer">data_transfer (Volume)</option>
                  <option value="email_activity">email_activity (Comms)</option>
                  <option value="privilege_change">privilege_change</option>
                  <option value="remote_access">remote_access</option>
                  <option value="usb_connect">usb_connect (USB Egress)</option>
                </select>

                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-2.5 py-1 bg-surface-container-low border border-outline-variant rounded-lg font-semibold text-secondary outline-none cursor-pointer"
                >
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page</option>
                  <option value={100}>100 / page</option>
                  <option value={250}>250 / page</option>
                </select>
              </div>
            </div>

            {/* Results Table */}
            <div className="overflow-x-auto flex-1 max-h-[580px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-surface-container-low sticky top-0 border-b border-outline-variant z-10">
                  <tr className="text-[10px] uppercase font-bold text-secondary font-label-caps text-label-caps">
                    <th className="p-sm pl-md">Timestamp (UTC)</th>
                    <th className="p-sm">Event Type</th>
                    <th className="p-sm">Employee</th>
                    <th className="p-sm">Risk Assessment</th>
                    <th className="p-sm pr-md">Metadata Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/60 text-on-surface">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-secondary">
                        <span className="material-symbols-outlined animate-spin text-[28px]">
                          progress_activity
                        </span>
                        <p className="mt-2 text-xs">Querying MongoDB activity logs...</p>
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-secondary">
                        <div className="w-full max-w-[380px] mx-auto flex flex-col items-center justify-center text-center">
                          <p className="text-xs text-secondary leading-relaxed text-center w-full">
                            No activity logs matching this query in MongoDB.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => {
                      const isThreat =
                        Boolean(log.details?.risk_flag) ||
                        Boolean(log.is_simulation) ||
                        (log.event_type === "usb_connect" && parseFloat(log.details?.transferred_mb || 0) > 500) ||
                        (log.event_type === "privilege_change" && (log.details?.status === "denied" || String(log.details?.command || "").toLowerCase().includes("sudo"))) ||
                        (log.details?.status === "failed_mfa_bruteforce");
                      return (
                        <tr
                          key={log._id || log.id}
                          className={`hover:bg-surface-container-low transition-colors ${
                            isThreat ? "bg-error-container/5" : ""
                          }`}
                        >
                          <td className="p-sm pl-md text-secondary font-mono text-[11px] whitespace-nowrap">
                            {log.timestamp ? new Date(log.timestamp).toLocaleString() : "Recent"}
                          </td>
                          <td className="p-sm">
                            <span
                              className={`px-2 py-0.5 rounded font-mono font-semibold text-[11px] ${
                                isThreat
                                  ? "bg-error-container text-error font-bold"
                                  : "bg-primary-fixed text-primary-container"
                              }`}
                            >
                              {log.event_type}
                            </span>
                          </td>
                          <td className="p-sm font-mono text-primary font-bold">
                            {log.employee_id}
                          </td>
                          <td className="p-sm">
                            {log.details?.risk_flag ? (
                              <span className="text-[10px] font-bold bg-error-container text-error px-2 py-0.5 rounded">
                                {log.details.risk_flag}
                              </span>
                            ) : isThreat ? (
                              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                                Unusual
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                                Normal Baseline
                              </span>
                            )}
                          </td>
                          <td className="p-sm pr-md font-mono text-[11px] text-secondary max-w-md truncate">
                            {JSON.stringify(log.details)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-md border-t border-outline-variant bg-surface-bright flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
              <div className="text-secondary font-medium">
                Showing <strong className="text-on-surface font-mono">{logs.length > 0 ? (page - 1) * pageSize + 1 : 0}</strong> to{" "}
                <strong className="text-on-surface font-mono">{Math.min(page * pageSize, totalCount)}</strong> of{" "}
                <strong className="text-primary font-mono">{Number(totalCount).toLocaleString()}</strong> records
              </div>

              <div className="flex items-center gap-1.5 font-semibold">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={page === 1 || loading}
                  className="px-2.5 py-1 rounded bg-surface-container-low border border-outline-variant hover:bg-surface-container disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  ⏮ First
                </button>
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1 || loading}
                  className="px-2.5 py-1 rounded bg-surface-container-low border border-outline-variant hover:bg-surface-container disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  ◀ Prev
                </button>
                <span className="px-3 py-1 font-mono text-primary font-bold">
                  Page {page} / {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages || loading}
                  className="px-2.5 py-1 rounded bg-surface-container-low border border-outline-variant hover:bg-surface-container disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  Next ▶
                </button>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={page >= totalPages || loading}
                  className="px-2.5 py-1 rounded bg-surface-container-low border border-outline-variant hover:bg-surface-container disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  Last ⏭
                </button>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    </RoleGuard>
  );
}
