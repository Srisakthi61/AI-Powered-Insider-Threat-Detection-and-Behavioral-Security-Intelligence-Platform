"use client";

import React, { useState, useEffect } from "react";
import AppLayout from "../components/AppLayout";
import RiskBadge from "../components/RiskBadge";
import MetricCard from "../components/MetricCard";
import { alertApi } from "../lib/api";

export default function AlertsPage() {
  const [filterPriority, setFilterPriority] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [myAlertsMsg, setMyAlertsMsg] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const data = await alertApi.list(filterPriority, filterStatus);
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
  }, [filterPriority, filterStatus]);

  useEffect(() => {
    alertApi
      .getMyAlerts()
      .then((data) => setMyAlertsMsg(data?.message))
      .catch(() => {});
  }, []);

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

  const filteredAlerts = alerts.filter((a) => {
    const matchesPriority =
      filterPriority === "ALL" || (a.severity || "").toLowerCase() === filterPriority.toLowerCase();
    const matchesStatus =
      filterStatus === "ALL" || (a.status || "").toLowerCase() === filterStatus.toLowerCase();
    return matchesPriority && matchesStatus;
  });

  return (
    <AppLayout>
      <div className="flex flex-col gap-gutter">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm mb-xs">
          <div>
            <h1 className="font-page-title text-page-title text-on-surface font-bold">
              Investigation & Security Alerts Queue
            </h1>
            <p className="text-on-surface-variant text-body-base text-xs mt-0.5">
              Triage active behavioral anomalies, assign investigations, and execute mitigation workflows from PostgreSQL.
            </p>
          </div>
          {myAlertsMsg && (
            <div className="bg-primary-fixed text-primary-container px-3 py-1 rounded-lg text-xs font-semibold">
              {myAlertsMsg}
            </div>
          )}
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-gutter">
          <MetricCard
            title="Critical Alerts"
            value={alerts.filter((a) => (a.severity || "").toLowerCase() === "critical").length}
            trend="Action Req."
            trendType="up-danger"
            icon="warning"
            iconBg="bg-error-container"
            iconColor="text-error"
          />
          <MetricCard
            title="Investigating"
            value={alerts.filter((a) => (a.status || "").toUpperCase() === "INVESTIGATING").length}
            trend="In progress"
            trendType="neutral"
            icon="policy"
            iconBg="bg-secondary-container"
            iconColor="text-on-secondary-container"
          />
          <MetricCard
            title="Unassigned"
            value={alerts.filter((a) => (a.status || "").toUpperCase() === "UNASSIGNED").length}
            trend="Tier 1 Queue"
            trendType="up-danger"
            icon="hourglass_empty"
            iconBg="bg-tertiary-fixed"
            iconColor="text-tertiary"
          />
          <MetricCard
            title="Resolved"
            value={alerts.filter((a) => (a.status || "").toUpperCase() === "RESOLVED").length}
            trend="100% SLA"
            trendType="up-good"
            icon="check_circle"
            iconBg="bg-emerald-100"
            iconColor="text-emerald-700"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center bg-surface-container-lowest p-3 border border-outline-variant rounded-xl shadow-xs text-xs">
          <span className="font-semibold text-secondary">Filter by:</span>

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

          <div className="flex items-center gap-1.5">
            <span className="text-secondary text-[11px]">Status:</span>
            {["ALL", "UNASSIGNED", "INVESTIGATING", "RESOLVED"].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer text-xs ${
                  filterStatus === s
                    ? "bg-secondary-container text-on-secondary-container font-bold"
                    : "bg-surface-container-low text-secondary hover:bg-surface-container"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Alerts Table & Inspector */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          <div
            className={`${
              selectedAlert ? "lg:col-span-7" : "lg:col-span-12"
            } bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-xs`}
          >
            <div className="p-md border-b border-outline-variant flex justify-between items-center bg-surface-bright">
              <span className="font-semibold text-xs text-on-surface">
                Alerts Queue ({filteredAlerts.length})
              </span>
              <span className="text-[11px] text-secondary">
                PostgreSQL Relational Alerts
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant text-secondary font-label-caps text-label-caps">
                    <th className="p-sm pl-md">Priority</th>
                    <th className="p-sm">Alert Title</th>
                    <th className="p-sm">Employee</th>
                    <th className="p-sm">Timestamp</th>
                    <th className="p-sm">Status</th>
                    <th className="p-sm pr-md text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/60 text-on-surface">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-secondary">
                        <span className="material-symbols-outlined animate-spin text-[24px]">
                          progress_activity
                        </span>
                      </td>
                    </tr>
                  ) : filteredAlerts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-secondary">
                        No alerts matching selected criteria in PostgreSQL.
                      </td>
                    </tr>
                  ) : (
                    filteredAlerts.map((alertItem) => (
                      <tr
                        key={alertItem.id}
                        onClick={() => setSelectedAlert(alertItem)}
                        className={`hover:bg-surface-container-low transition-colors cursor-pointer ${
                          selectedAlert?.id === alertItem.id
                            ? "bg-secondary-container/40"
                            : ""
                        }`}
                      >
                        <td className="p-sm pl-md">
                          <RiskBadge level={alertItem.severity} />
                        </td>
                        <td className="p-sm font-semibold text-xs">
                          {alertItem.message}
                        </td>
                        <td className="p-sm text-secondary">
                          {alertItem.employee_name || "Employee"} ({alertItem.employee_code || `ID:${alertItem.employee_id}`})
                        </td>
                        <td className="p-sm text-secondary font-mono text-[11px]">
                          {alertItem.created_at ? new Date(alertItem.created_at).toLocaleTimeString() : "Recent"}
                        </td>
                        <td className="p-sm">
                          <RiskBadge status={alertItem.status} />
                        </td>
                        <td className="p-sm pr-md text-right">
                          <button className="text-primary hover:text-primary-container p-1">
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

          {/* Investigation Drawer */}
          {selectedAlert && (
            <div className="lg:col-span-5 bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-xs flex flex-col h-fit">
              <div className="flex justify-between items-start border-b border-outline-variant pb-sm mb-md">
                <div>
                  <div className="flex items-center gap-2">
                    <RiskBadge level={selectedAlert.severity} />
                    <span className="font-mono text-xs text-secondary font-bold">
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
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <div className="space-y-3 text-xs mb-md">
                <div>
                  <span className="font-bold text-secondary">Subject Employee:</span>
                  <div className="text-on-surface font-semibold mt-0.5">
                    {selectedAlert.employee_name} ({selectedAlert.employee_code || `ID:${selectedAlert.employee_id}`}) —{" "}
                    {selectedAlert.department || "General"}
                  </div>
                </div>

                <div>
                  <span className="font-bold text-secondary">Incident Telemetry:</span>
                  <p className="p-2.5 bg-surface-container-low rounded-lg border border-outline-variant text-on-surface mt-1 leading-relaxed text-[11px]">
                    {selectedAlert.details || "No detailed telemetry recorded."}
                  </p>
                </div>

                <div>
                  <span className="font-bold text-secondary">
                    Recommended SOC Action:
                  </span>
                  <p className="p-2.5 bg-primary-fixed/40 text-on-primary-fixed-variant rounded-lg border border-primary/20 mt-1 leading-relaxed text-[11px] font-medium">
                    {selectedAlert.recommended_action || "Standard investigation workflow."}
                  </p>
                </div>

                <div>
                  <span className="font-bold text-secondary block mb-1">
                    Update Investigation Status:
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateStatus(selectedAlert.id, "UNASSIGNED")}
                      className={`px-2.5 py-1 rounded text-xs font-semibold border ${
                        selectedAlert.status === "UNASSIGNED"
                          ? "bg-error-container text-error font-bold"
                          : "border-outline-variant text-secondary"
                      }`}
                    >
                      Unassigned
                    </button>
                    <button
                      onClick={() =>
                        handleUpdateStatus(selectedAlert.id, "INVESTIGATING")
                      }
                      className={`px-2.5 py-1 rounded text-xs font-semibold border ${
                        selectedAlert.status === "INVESTIGATING"
                          ? "bg-secondary-container text-on-secondary-container font-bold"
                          : "border-outline-variant text-secondary"
                      }`}
                    >
                      Investigating
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedAlert.id, "RESOLVED")}
                      className={`px-2.5 py-1 rounded text-xs font-semibold border ${
                        selectedAlert.status === "RESOLVED"
                          ? "bg-emerald-100 text-emerald-800 font-bold"
                          : "border-outline-variant text-secondary"
                      }`}
                    >
                      Resolved
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
