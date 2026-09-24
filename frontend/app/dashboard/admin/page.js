"use client";

import React, { useState, useEffect } from "react";
import AppLayout from "../../components/AppLayout";
import MetricCard from "../../components/MetricCard";
import RiskBadge from "../../components/RiskBadge";
import RoleGuard from "../../components/RoleGuard";
import { adminApi, systemApi, anomalyApi } from "../../lib/api";
import { useSimulation } from "../../context/SimulationContext";
import Link from "next/link";

export default function AdminDashboardPage() {
  const { isSimulated, openSimModal, resetSimulation } = useSimulation();
  const [adminData, setAdminData] = useState(null);
  const [anomalyStats, setAnomalyStats] = useState(null);
  const [systemHealthy, setSystemHealthy] = useState(true);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = () => {
    Promise.all([
      adminApi.getUsers().catch(() => null),
      systemApi.health().then(() => true).catch(() => false),
      anomalyApi.getStats().catch(() => null),
    ]).then(([userData, isHealthy, statsData]) => {
      if (userData) setAdminData(userData);
      setSystemHealthy(isHealthy);
      if (statsData) setAnomalyStats(statsData);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchAdminData();

    const handleSimulated = () => fetchAdminData();
    const handleReset = () => fetchAdminData();

    window.addEventListener("threat-simulated", handleSimulated);
    window.addEventListener("simulation-reset", handleReset);

    return () => {
      window.removeEventListener("threat-simulated", handleSimulated);
      window.removeEventListener("simulation-reset", handleReset);
    };
  }, []);

  const rolesSummary = adminData?.roles_summary || [
    {
      role: "Analysts",
      type: "security_analyst",
      count: 1,
      pending: "-",
      icon: "monitoring",
      bgIcon: "bg-surface-container",
    },
    {
      role: "SOC Team",
      type: "soc_engineer",
      count: 1,
      pending: "-",
      icon: "policy",
      bgIcon: "bg-surface-container",
    },
    {
      role: "Managers",
      type: "security_manager",
      count: 1,
      pending: "-",
      icon: "manage_accounts",
      bgIcon: "bg-surface-container",
    },
    {
      role: "Administrators",
      type: "admin",
      count: 1,
      pending: "-",
      icon: "admin_panel_settings",
      bgIcon: "bg-primary-fixed-dim text-on-primary-fixed-variant",
    },
  ];

  const systemServices = [
    {
      name: "API Gateway (FastAPI)",
      metric: "Port 8000 (Active)",
      status: systemHealthy ? "Online" : "Offline",
      level: systemHealthy ? "healthy" : "critical",
      icon: "api",
    },
    {
      name: "Main Relational DB (PostgreSQL)",
      metric: "Port 5432 (ACID)",
      status: "Online",
      level: "healthy",
      icon: "database",
    },
    {
      name: "Document Store (MongoDB)",
      metric: "Port 27017 (Time-Series)",
      status: "Online",
      level: "healthy",
      icon: "storage",
    },
    {
      name: "Identity & RBAC Governance",
      metric: "JWT Bearer Authentication",
      status: "Online",
      level: "healthy",
      icon: "verified_user",
    },
  ];

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <AppLayout>
        <div className="flex flex-col gap-gutter">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm mb-xs">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-page-title text-page-title text-on-surface font-bold">
                  Administrator Dashboard
                </h1>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isSimulated
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300 animate-pulse"
                      : "bg-surface-container-high text-secondary border-outline-variant"
                  }`}
                >
                  {isSimulated ? "● Threat Evaluation Active" : "○ Governance Standby"}
                </span>
              </div>
              <p className="text-on-surface-variant text-body-base text-xs mt-0.5">
                Platform administration, RBAC access governance, and PostgreSQL database accounts.
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
                onClick={() => alert("Downloading Platform Audit Report...")}
                className="bg-primary-container text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-primary transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                Export Report
              </button>
            </div>
          </div>

          {/* Standby Banner */}
          {!isSimulated ? (
            <div className="bg-gradient-to-r from-purple-500/10 via-surface-container-lowest to-surface-container-low border border-purple-500/25 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shrink-0 shadow-sm">
                  <span className="material-symbols-outlined text-[28px]">admin_panel_settings</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-on-surface">
                      Platform Administration Standby — Ready for Threat Simulation
                    </h3>
                    <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-200">
                      RBAC Enforced
                    </span>
                  </div>
                  <p className="text-xs text-secondary mt-1 max-w-2xl leading-relaxed">
                    Database services and RBAC authentication are healthy. Click <strong>"Simulate Threat"</strong> in the navigation bar to test live privilege escalation detection, sudo root execution alerts, and persona dispatch.
                  </p>
                </div>
              </div>
              <button
                onClick={openSimModal}
                className="bg-error text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-red-700 transition-all flex items-center gap-2 shrink-0 shadow-sm cursor-pointer active:scale-95 animate-pulse"
              >
                <span className="material-symbols-outlined text-[18px]">crisis_alert</span>
                <span>Simulate Threat Event</span>
              </button>
            </div>
          ) : (
            <div className="bg-surface-container-lowest border border-primary/20 rounded-xl p-md shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-md bg-gradient-to-r from-primary/5 via-surface-container-lowest to-tertiary/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px]">verified_user</span>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                    Platform Threat Evaluation Active
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.2 rounded-full">
                      System Monitored
                    </span>
                  </h3>
                  <p className="text-[11px] text-secondary mt-0.5">
                    Privilege escalation vectors, IAM role integrity, and ACID data stores monitored in real-time.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href="/admin"
                  className="bg-primary text-on-primary text-xs font-semibold px-3.5 py-1.5 rounded-lg hover:bg-primary-container transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                >
                  <span className="material-symbols-outlined text-[16px]">manage_accounts</span>
                  Manage RBAC Permissions
                </Link>
              </div>
            </div>
          )}

          {/* 4 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
            <MetricCard
              title="Total Platform Users"
              value={adminData?.total_users ?? 4}
              trend="PostgreSQL Store"
              trendType="up-good"
              icon="group"
              iconBg="bg-primary-fixed"
              iconColor="text-primary"
              description="Active database credentials"
            />
            <MetricCard
              title="Telemetry Data Points"
              value={
                isSimulated
                  ? (anomalyStats?.total_activity_logs ? Number(anomalyStats.total_activity_logs).toLocaleString() : "10,000")
                  : 0
              }
              trend={isSimulated ? "MongoDB Time-Series" : "Standby"}
              trendType={isSimulated ? "up-good" : "neutral"}
              icon="dataset"
              iconBg={isSimulated ? "bg-secondary-container" : "bg-surface-container"}
              iconColor={isSimulated ? "text-on-secondary-container" : "text-secondary"}
              description={isSimulated ? "Multi-indicator activity logs" : "Ready in database"}
            />
            <MetricCard
              title="Behavioral Baselines"
              value={isSimulated ? (anomalyStats?.total_baselines_calculated || 78) : 0}
              trend={isSimulated ? "6 Indicators / Person" : "Standby"}
              trendType="neutral"
              icon="tune"
              iconBg={isSimulated ? "bg-tertiary-fixed" : "bg-surface-container"}
              iconColor={isSimulated ? "text-tertiary" : "text-secondary"}
              description={isSimulated ? "Per-employee baseline store" : "Baselines standby"}
            />
            <MetricCard
              title="System Status"
              value={systemHealthy ? "Operational" : "Degraded"}
              trend="All services live"
              trendType={systemHealthy ? "up-good" : "up-danger"}
              icon="health_and_safety"
              iconBg="bg-emerald-100"
              iconColor="text-emerald-700"
              description="PostgreSQL + MongoDB ACID/Store"
            />
          </div>

          {/* Central Widget & System Health Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
            {/* User & Role Management Table (2 cols) */}
            <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xs flex flex-col">
              <div className="p-md border-b border-outline-variant flex justify-between items-center">
                <div>
                  <h2 className="font-card-title text-card-title text-on-surface text-sm font-semibold">
                    User &amp; Role Management (RBAC)
                  </h2>
                  <p className="text-[11px] text-secondary">
                    Enforced via FastAPI require_role and PostgreSQL identity persistence
                  </p>
                </div>
                <Link
                  href="/admin"
                  className="text-primary text-xs font-semibold hover:underline"
                >
                  Manage Permissions
                </Link>
              </div>

              <div className="p-md flex-1 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="text-[10px] uppercase font-bold text-secondary border-b border-surface-variant">
                      <th className="pb-2 font-semibold">Role Type</th>
                      <th className="pb-2 font-semibold">Active Count</th>
                      <th className="pb-2 font-semibold">Status</th>
                      <th className="pb-2 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-variant text-on-surface">
                    {rolesSummary.map((item) => (
                      <tr
                        key={item.role}
                        className="hover:bg-surface-container-low transition-colors"
                      >
                        <td className="py-2.5 flex items-center gap-2 font-medium">
                          <div
                            className={`w-7 h-7 rounded flex items-center justify-center shrink-0 ${item.bgIcon}`}
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              {item.icon}
                            </span>
                          </div>
                          <span>{item.role}</span>
                        </td>
                        <td className="py-2.5 font-bold">{item.count} users</td>
                        <td className="py-2.5">
                          <RiskBadge status="Active" level="healthy" />
                        </td>
                        <td className="py-2.5 text-right">
                          <button className="text-secondary hover:text-primary p-1 cursor-pointer">
                            <span className="material-symbols-outlined text-[18px]">
                              more_horiz
                            </span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* System Health Status Board (1 col) */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xs flex flex-col">
              <div className="p-md border-b border-outline-variant flex items-center justify-between">
                <h2 className="font-card-title text-card-title text-on-surface text-sm font-semibold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-secondary">
                    memory
                  </span>
                  System Health
                </h2>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                  100% Uptime
                </span>
              </div>

              <div className="p-md flex-1 flex flex-col gap-2.5">
                {systemServices.map((svc) => (
                  <div
                    key={svc.name}
                    className="flex items-center justify-between p-2.5 border border-outline-variant rounded-lg bg-surface hover:bg-surface-container-low transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary text-[18px]">
                        {svc.icon}
                      </span>
                      <div>
                        <div className="text-xs font-semibold text-on-surface">
                          {svc.name}
                        </div>
                        <div className="text-[10px] text-secondary">
                          {svc.metric}
                        </div>
                      </div>
                    </div>
                    <RiskBadge status={svc.status} level={svc.level} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    </RoleGuard>
  );
}
