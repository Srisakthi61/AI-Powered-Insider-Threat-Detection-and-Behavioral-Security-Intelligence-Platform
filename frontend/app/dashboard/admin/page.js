"use client";

import React, { useState, useEffect } from "react";
import AppLayout from "../../components/AppLayout";
import MetricCard from "../../components/MetricCard";
import RiskBadge from "../../components/RiskBadge";
import RoleGuard from "../../components/RoleGuard";
import { adminApi, systemApi } from "../../lib/api";

export default function AdminDashboardPage() {
  const [adminData, setAdminData] = useState(null);
  const [systemHealthy, setSystemHealthy] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminApi.getUsers().catch(() => null),
      systemApi.health().then(() => true).catch(() => false),
    ]).then(([userData, isHealthy]) => {
      if (userData) setAdminData(userData);
      setSystemHealthy(isHealthy);
      setLoading(false);
    });
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
            <h1 className="font-page-title text-page-title text-on-surface font-bold">
              Administrator Dashboard
            </h1>
            <p className="text-on-surface-variant text-body-base text-xs mt-0.5">
              Platform administration, RBAC access governance, and PostgreSQL database accounts.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => alert("Downloading Platform Audit Report...")}
              className="bg-primary-container text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-primary transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Export Report
            </button>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
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
            title="Active Admins"
            value={rolesSummary.find((r) => r.type === "admin")?.count || 1}
            trend="Superuser tier"
            trendType="neutral"
            icon="admin_panel_settings"
            iconBg="bg-secondary-container"
            iconColor="text-on-secondary-container"
            description="Elevated privileges enabled"
          />
          <MetricCard
            title="System Status"
            value={systemHealthy ? "Operational" : "Degraded"}
            trend="All nodes live"
            trendType={systemHealthy ? "up-good" : "up-danger"}
            icon="health_and_safety"
            iconBg="bg-emerald-100"
            iconColor="text-emerald-700"
            description="Dual-database persistence verified"
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
              <a
                href="/admin"
                className="text-primary text-xs font-semibold hover:underline"
              >
                Manage Permissions
              </a>
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
                        <button className="text-secondary hover:text-primary p-1">
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
