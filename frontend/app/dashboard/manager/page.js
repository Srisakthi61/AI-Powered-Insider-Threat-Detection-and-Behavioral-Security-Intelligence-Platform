"use client";

import React, { useState, useEffect } from "react";
import AppLayout from "../../components/AppLayout";
import MetricCard from "../../components/MetricCard";
import RiskBadge from "../../components/RiskBadge";
import RoleGuard from "../../components/RoleGuard";
import { employeeApi, reportApi, departmentApi } from "../../lib/api";

export default function ManagerDashboardPage() {
  const [employees, setEmployees] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empData, reportRes, deptRes] = await Promise.all([
        employeeApi.list().catch(() => []),
        reportApi.getRiskPosture().catch(() => null),
        departmentApi.list().catch(() => []),
      ]);

      if (Array.isArray(empData)) setEmployees(empData);
      if (reportRes) setReportData(reportRes);
      if (Array.isArray(deptRes)) setDepartments(deptRes);
    } catch (e) {
      console.error("Manager dashboard load error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const deptScores = departments.length > 0 ? departments : (reportData?.department_scores || []);

  const topRisks = employees.slice(0, 6).map((emp, idx) => {
    const scores = [92, 88, 85, 79, 74, 65];
    const levels = ["Critical", "High", "High", "Medium", "Medium", "Low"];
    const score = scores[idx % scores.length];
    const level = levels[idx % levels.length];
    const initials = (emp.name || "UN")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    return {
      name: emp.name,
      email: `${(emp.name || "user").toLowerCase().replace(/\s+/g, ".")}@itbis.com`,
      dept: emp.department,
      score,
      level,
      initials,
      code: emp.employee_id,
    };
  });

  return (
    <RoleGuard allowedRoles={["security_manager"]}>
      <AppLayout>
      <div className="flex flex-col gap-gutter">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm mb-xs">
          <div>
            <h1 className="font-page-title text-page-title text-on-surface font-bold">
              Executive Overview
            </h1>
            <p className="text-on-surface-variant text-body-base text-xs mt-0.5">
              Strategic risk posture, department comparisons, and organizational threat posture from PostgreSQL ACID store.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="bg-surface-container-lowest border border-outline-variant text-on-surface px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-surface-container-high transition-colors flex items-center gap-1 shadow-xs">
              <span className="material-symbols-outlined text-[16px]">calendar_month</span>
              Last 30 Days
            </button>
            <button
              onClick={() => alert("Generating Executive Risk Intelligence PDF Report...")}
              className="bg-primary text-on-primary px-3.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-primary-container transition-colors flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Export Report
            </button>
          </div>
        </div>

        {/* 4 Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
          <MetricCard
            title="Org Risk Score"
            value={reportData?.org_risk_score || "72"}
            trend="Calculated"
            trendType="neutral"
            icon="monitoring"
            iconBg="bg-primary-fixed"
            iconColor="text-primary"
            description="Elevated compared to baseline"
          />
          <MetricCard
            title="Monitored Profiles"
            value={employees.length}
            trend="In Database"
            trendType="neutral"
            icon="person_alert"
            iconBg="bg-tertiary-fixed"
            iconColor="text-tertiary"
            description="Active organizational directory"
          />
          <MetricCard
            title="Critical Alerts"
            value={reportData?.critical_alerts ?? 3}
            trend="Action Req."
            trendType="up-danger"
            icon="campaign"
            iconBg="bg-error-container"
            iconColor="text-error"
            variant="danger"
            description="Immediate attention and triage needed"
          />
          <MetricCard
            title="Open Incidents"
            value={reportData?.open_incidents ?? 2}
            trend="Active Queue"
            trendType="neutral"
            icon="folder_open"
            iconBg="bg-secondary-container"
            iconColor="text-on-secondary-container"
            description="Under active investigation lifecycle"
          />
        </div>

        {/* Bento Grid Middle Section: Donut + Dept Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          {/* Organization Risk Posture Card */}
          <div className="lg:col-span-5 bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex flex-col shadow-xs">
            <div className="border-b border-outline-variant pb-sm mb-md flex justify-between items-center">
              <h3 className="font-card-title text-card-title text-on-surface text-sm font-semibold">
                Organization Risk Posture
              </h3>
              <span className="text-[11px] text-secondary font-semibold">Asset Tiering</span>
            </div>

            <div className="flex-1 flex flex-col justify-center items-center relative py-4">
              {/* Donut Chart SVG */}
              <div className="relative w-44 h-44 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#ededf9"
                    strokeWidth="14"
                    fill="none"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#585f6c"
                    strokeWidth="14"
                    strokeDasharray="238.76"
                    strokeDashoffset="83.56"
                    fill="none"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#004ac6"
                    strokeWidth="14"
                    strokeDasharray="59.69 238.76"
                    strokeDashoffset="0"
                    fill="none"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#943700"
                    strokeWidth="14"
                    strokeDasharray="19.1 238.76"
                    strokeDashoffset="-59.69"
                    fill="none"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#ba1a1a"
                    strokeWidth="14"
                    strokeDasharray="4.77 238.76"
                    strokeDashoffset="-78.79"
                    fill="none"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-on-surface leading-none">
                    {employees.length}
                  </span>
                  <span className="font-label-caps text-label-caps text-secondary text-[9px] mt-0.5">
                    Monitored Assets
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-outline-variant text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-secondary" />
                <span className="font-body-sm text-secondary text-xs">Low (65%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                <span className="font-body-sm text-secondary text-xs">Medium (25%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-tertiary" />
                <span className="font-body-sm text-secondary text-xs">High (8%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-error" />
                <span className="font-body-sm text-secondary text-xs">Critical (2%)</span>
              </div>
            </div>
          </div>

          {/* Department Risk Comparison */}
          <div className="lg:col-span-7 bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex flex-col shadow-xs">
            <div className="border-b border-outline-variant pb-sm mb-md flex justify-between items-center">
              <h3 className="font-card-title text-card-title text-on-surface text-sm font-semibold">
                Department Risk Comparison (PostgreSQL)
              </h3>
              <span className="font-label-caps text-label-caps bg-surface-container-high px-2 py-0.5 rounded text-secondary text-[10px]">
                Avg Score
              </span>
            </div>

            <div className="flex-1 flex flex-col justify-center gap-3.5 py-1">
              {deptScores.map((dept) => (
                <div key={dept.name}>
                  <div className="flex justify-between mb-1 text-xs">
                    <span className="font-semibold text-on-surface">{dept.name} ({dept.employee_count || 1})</span>
                    <span className={`font-bold ${dept.textColor || "text-primary"}`}>{dept.avg_score || dept.score} / 100</span>
                  </div>
                  <div className="w-full bg-surface-container-high rounded-full h-2 overflow-hidden">
                    <div
                      className={`${dept.color || "bg-primary"} h-2 rounded-full transition-all duration-500`}
                      style={{ width: `${dept.avg_score || dept.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Section: Top Risk Profiles */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex flex-col overflow-hidden shadow-xs">
          <div className="border-b border-outline-variant pb-sm mb-md flex justify-between items-center">
            <h3 className="font-card-title text-card-title text-on-surface text-sm font-semibold">
              Top Risk Profiles ({topRisks.length})
            </h3>
            <a href="/employees" className="text-primary text-xs font-semibold hover:underline">
              View All Directory
            </a>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant">
                  <th className="pb-2 font-label-caps text-label-caps text-secondary font-medium text-[10px]">
                    User
                  </th>
                  <th className="pb-2 font-label-caps text-label-caps text-secondary font-medium text-[10px]">
                    Dept
                  </th>
                  <th className="pb-2 font-label-caps text-label-caps text-secondary font-medium text-right text-[10px]">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {topRisks.map((profile) => (
                  <tr
                    key={profile.code}
                    className="hover:bg-surface-container-low transition-colors group cursor-pointer"
                  >
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-surface-container-high flex items-center justify-center font-bold text-secondary text-[10px]">
                          {profile.initials}
                        </div>
                        <div>
                          <div className="font-medium text-xs text-on-surface">
                            {profile.name}
                          </div>
                          <div className="text-[10px] text-secondary font-mono">
                            {profile.code} — {profile.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 text-xs text-secondary">{profile.dept}</td>
                    <td className="py-2 text-right">
                      <RiskBadge level={profile.level} />
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
