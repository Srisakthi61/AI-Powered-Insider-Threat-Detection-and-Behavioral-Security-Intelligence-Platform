"use client";

import React, { useState, useEffect } from "react";
import AppLayout from "../components/AppLayout";
import MetricCard from "../components/MetricCard";
import RiskBadge from "../components/RiskBadge";
import RoleGuard from "../components/RoleGuard";
import { adminApi, systemApi } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function AdminPage() {
  const { user } = useAuth();
  const [adminUsersData, setAdminUsersData] = useState(null);
  const [systemOnline, setSystemOnline] = useState(true);
  const [error, setError] = useState(null);

  const fetchAdminData = () => {
    adminApi
      .getUsers()
      .then((data) => setAdminUsersData(data))
      .catch((err) => {
        setError(
          err.response?.data?.detail ||
            "Access restricted. Only 'admin' role has access to platform user management."
        );
      });

    systemApi
      .health()
      .then(() => setSystemOnline(true))
      .catch(() => setSystemOnline(false));
  };

  useEffect(() => {
    fetchAdminData();

    const handleThreatSimulated = () => fetchAdminData();
    const handleReset = () => fetchAdminData();

    window.addEventListener("threat-simulated", handleThreatSimulated);
    window.addEventListener("simulation-reset", handleReset);

    return () => {
      window.removeEventListener("threat-simulated", handleThreatSimulated);
      window.removeEventListener("simulation-reset", handleReset);
    };
  }, [user]);

  const platformRoles = adminUsersData?.platform_roles || [
    {
      role: "Security Analyst",
      code: "security_analyst",
      permissions: "View dashboards, triage alerts, and investigate incidents",
      count: 1,
      active: true,
    },
    {
      role: "Security Manager",
      code: "security_manager",
      permissions: "Executive reports, organizational risk posture, and team oversight",
      count: 1,
      active: true,
    },
    {
      role: "SOC Engineer",
      code: "soc_engineer",
      permissions: "Live telemetry monitoring, raw log ingestion, and threat mitigation",
      count: 1,
      active: true,
    },
    {
      role: "Administrator",
      code: "admin",
      permissions: "System administration, user access management, and governance",
      count: 1,
      active: true,
    },
  ];

  const userList = adminUsersData?.users || [];

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <AppLayout>
      <div className="flex flex-col gap-gutter">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm mb-xs">
          <div>
            <h1 className="font-page-title text-page-title text-on-surface font-bold">
              User Administration
            </h1>
            <p className="text-on-surface-variant text-body-base text-xs mt-0.5">
              Manage platform users, credentials, and access roles.
            </p>
          </div>
          <button
            onClick={() => alert("Audit log export initiated.")}
            className="bg-primary-container text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-primary transition-colors flex items-center gap-1.5 shadow-xs self-start cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            Export Audit Trail
          </button>
        </div>

        {/* Error or Success message */}
        {error ? (
          <div className="p-3 bg-error-container text-on-error-container rounded-xl border border-error/20 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-error">lock</span>
            <span>{error}</span>
          </div>
        ) : (
          <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-emerald-600">
                admin_panel_settings
              </span>
              <span>
                Signed in as Administrator: <strong>{user?.email}</strong>
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
              Full Admin Access
            </span>
          </div>
        )}

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          <MetricCard
            title="Platform Users"
            value={adminUsersData?.total_users ?? userList.length}
            trend="Active Accounts"
            trendType="up-good"
            icon="group"
            iconBg="bg-primary-fixed"
            iconColor="text-primary"
            description="Active accounts registered"
          />
          <MetricCard
            title="Database Stores"
            value="2 Active"
            trend="PostgreSQL & MongoDB"
            trendType="neutral"
            icon="database"
            iconBg="bg-secondary-container"
            iconColor="text-on-secondary-container"
            description="Data stores online"
          />
          <MetricCard
            title="Backend Status"
            value={systemOnline ? "Operational" : "Offline"}
            trend="Port 8000"
            trendType={systemOnline ? "up-good" : "up-danger"}
            icon="health_and_safety"
            iconBg="bg-emerald-100"
            iconColor="text-emerald-700"
            description="API services online"
          />
        </div>

        {/* Registered Platform Users Table */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-xs">
          <div className="p-md border-b border-outline-variant bg-surface-bright flex justify-between items-center">
            <h2 className="font-section-title text-section-title text-on-surface font-semibold text-sm">
              Platform Users
            </h2>
            <span className="text-secondary text-xs">{userList.length} Accounts Found</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant text-secondary font-label-caps text-label-caps">
                  <th className="p-sm pl-md">User ID</th>
                  <th className="p-sm">Email Address</th>
                  <th className="p-sm">Assigned Role</th>
                  <th className="p-sm pr-md text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60 text-on-surface">
                {userList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 px-6 text-center text-secondary">
                      <div className="w-full max-w-[380px] mx-auto flex flex-col items-center justify-center text-center">
                        <span className="material-symbols-outlined text-[32px] text-outline mb-1">
                          person_off
                        </span>
                        <h4 className="font-bold text-sm text-on-surface">No Users Registered</h4>
                        <p className="text-xs text-secondary leading-relaxed mt-1 w-full">
                          No platform user accounts found in the database.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  userList.map((u) => (
                    <tr key={u.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="p-sm pl-md font-mono font-bold text-primary">
                        USR-{u.id}
                      </td>
                      <td className="p-sm font-semibold">{u.email}</td>
                      <td className="p-sm">
                        <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-secondary-container text-on-secondary-container font-semibold">
                          {u.role}
                        </span>
                      </td>
                      <td className="p-sm pr-md text-right">
                        <RiskBadge status="Active" level="healthy" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RBAC Roles Matrix */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-xs">
          <div className="p-md border-b border-outline-variant bg-surface-bright flex justify-between items-center">
            <h2 className="font-section-title text-section-title text-on-surface font-semibold text-sm">
              Role-Based Access Control (RBAC) Hierarchy
            </h2>
            <span className="text-secondary text-xs">FastAPI require_role</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant text-secondary font-label-caps text-label-caps">
                  <th className="p-sm pl-md">Role Name</th>
                  <th className="p-sm">Role Identifier</th>
                  <th className="p-sm">Endpoint Scope &amp; Permissions</th>
                  <th className="p-sm">Active Identities</th>
                  <th className="p-sm pr-md text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60 text-on-surface">
                {platformRoles.map((r) => (
                  <tr key={r.code} className="hover:bg-surface-container-low transition-colors">
                    <td className="p-sm pl-md font-bold text-on-surface">
                      {r.role}
                    </td>
                    <td className="p-sm font-mono text-[11px] text-primary">
                      {r.code}
                    </td>
                    <td className="p-sm text-secondary text-[11px] max-w-[420px]">
                      {r.permissions}
                    </td>
                    <td className="p-sm font-bold">{r.count} users</td>
                    <td className="p-sm pr-md text-right">
                      <RiskBadge status="Active" level="healthy" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </AppLayout>
    </RoleGuard>
  );
}
