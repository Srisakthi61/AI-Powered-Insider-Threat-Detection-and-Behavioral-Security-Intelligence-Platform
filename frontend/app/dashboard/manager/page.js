"use client";

import React, { useState, useEffect } from "react";
import AppLayout from "../../components/AppLayout";
import MetricCard from "../../components/MetricCard";
import RiskBadge from "../../components/RiskBadge";
import RoleGuard from "../../components/RoleGuard";
import { employeeApi, reportApi, departmentApi, anomalyApi } from "../../lib/api";
import { useSimulation } from "../../context/SimulationContext";
import Link from "next/link";

export default function ManagerDashboardPage() {
  const { isSimulated, openSimModal, resetSimulation } = useSimulation();
  const [employees, setEmployees] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [anomalyReport, setAnomalyReport] = useState(null);
  const [anomalyStats, setAnomalyStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empData, reportRes, deptRes, anomReport, anomStats] = await Promise.all([
        employeeApi.list().catch(() => []),
        reportApi.getRiskPosture().catch(() => null),
        departmentApi.list().catch(() => []),
        anomalyApi.getReport().catch(() => null),
        anomalyApi.getStats().catch(() => null),
      ]);

      if (Array.isArray(empData)) setEmployees(empData);
      if (reportRes) setReportData(reportRes);
      if (Array.isArray(deptRes)) setDepartments(deptRes);
      if (anomReport) setAnomalyReport(anomReport);
      if (anomStats) setAnomalyStats(anomStats);
    } catch (e) {
      console.error("Manager dashboard load error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleSimulated = () => fetchData();
    const handleReset = () => {
      setAnomalyReport(null);
      fetchData();
    };

    window.addEventListener("threat-simulated", handleSimulated);
    window.addEventListener("simulation-reset", handleReset);

    return () => {
      window.removeEventListener("threat-simulated", handleSimulated);
      window.removeEventListener("simulation-reset", handleReset);
    };
  }, []);

  const deptScores = departments.length > 0 ? departments : (reportData?.department_scores || []);

  const topRisks = (anomalyReport?.all_analyzed && anomalyReport.all_analyzed.length > 0)
    ? anomalyReport.all_analyzed.slice(0, 6).map((emp) => ({
        name: emp.name,
        email: `${(emp.name || "user").toLowerCase().replace(/\s+/g, ".")}@itbis.com`,
        dept: emp.department,
        score: emp.is_outlier ? 88 : (emp.risk_score || 45),
        level: emp.risk_level || (emp.is_outlier ? "Critical" : "Low"),
        initials: (emp.name || "UN").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase(),
        code: emp.employee_id,
        anomaly_score: emp.anomaly_score,
      }))
    : employees.slice(0, 6).map((emp) => ({
        name: emp.name,
        email: `${(emp.name || "user").toLowerCase().replace(/\s+/g, ".")}@itbis.com`,
        dept: emp.department,
        score: emp.risk_score || 25,
        level: emp.risk_level || "Low",
        initials: (emp.name || "UN").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase(),
        code: emp.employee_id,
      }));

  return (
    <RoleGuard allowedRoles={["security_manager", "admin", "security_analyst", "soc_engineer"]}>
      <AppLayout>
        <div className="flex flex-col gap-gutter">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm mb-xs">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-page-title text-page-title text-on-surface font-bold">
                  Executive Threat Overview
                </h1>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isSimulated
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300 animate-pulse"
                      : "bg-surface-container-high text-secondary border-outline-variant"
                  }`}
                >
                  {isSimulated ? "● Posture Analyzed" : "○ Posture Standby"}
                </span>
              </div>
              <p className="text-on-surface-variant text-body-base text-xs mt-0.5">
                Strategic risk posture, department comparisons, and organizational threat posture from PostgreSQL ACID store.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="bg-surface-container-lowest border border-outline-variant text-on-surface px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-surface-container-high transition-colors flex items-center gap-1 shadow-xs cursor-pointer">
                <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                Last 30 Days
              </button>
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
            </div>
          </div>

          {/* Standby Banner */}
          {!isSimulated ? (
            <div className="bg-gradient-to-r from-blue-500/10 via-surface-container-lowest to-surface-container-low border border-blue-500/25 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shrink-0 shadow-sm">
                  <span className="material-symbols-outlined text-[28px]">assessment</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-on-surface">
                      Executive Risk Posture Standby — Awaiting AI Threat Simulation
                    </h3>
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
                      Clean Baseline
                    </span>
                  </div>
                  <p className="text-xs text-secondary mt-1 max-w-2xl leading-relaxed">
                    No departmental threat vectors are currently flagged. Use <strong>"Simulate Threat"</strong> in the top navigation bar to evaluate employee risk profiles, department benchmarks, and generate manager-targeted alerts.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-surface-container-lowest border border-primary/20 rounded-xl p-md shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-md bg-gradient-to-r from-primary/5 via-surface-container-lowest to-tertiary/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px]">corporate_fare</span>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                    Organizational Risk Intelligence Evaluated
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.2 rounded-full">
                      PostgreSQL + MongoDB Synced
                    </span>
                  </h3>
                  <p className="text-[11px] text-secondary mt-0.5">
                    Strategic threat posture computed across all business departments and user roles.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href="/reports"
                  className="bg-primary text-on-primary text-xs font-semibold px-3.5 py-1.5 rounded-lg hover:bg-primary-container transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                >
                  <span className="material-symbols-outlined text-[16px]">assessment</span>
                  Open Reports
                </Link>
              </div>
            </div>
          )}

          {/* 4 Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
            <MetricCard
              title="Telemetry Data Points"
              value={
                isSimulated && anomalyStats?.total_activity_logs
                  ? Number(anomalyStats.total_activity_logs).toLocaleString()
                  : "0"
              }
              trend="MongoDB Time-Series"
              trendType="up-safe"
              icon="dataset"
              iconBg={isSimulated ? "bg-primary-fixed" : "bg-surface-container"}
              iconColor={isSimulated ? "text-primary" : "text-secondary"}
              description={isSimulated ? "Indexed security events" : "Standby baseline"}
            />
            <MetricCard
              title="ML Flagged Outliers"
              value={isSimulated ? (anomalyReport?.flagged_count ?? (reportData?.high_risk_profiles || 0)) : 0}
              trend="Isolation Forest"
              trendType="neutral"
              icon="psychology"
              iconBg={isSimulated ? "bg-error-container" : "bg-surface-container"}
              iconColor={isSimulated ? "text-error" : "text-secondary"}
              description="High risk insider profiles"
            />
            <MetricCard
              title="Behavioral Baselines"
              value={isSimulated ? (anomalyStats?.total_baselines_calculated || 0) : 0}
              trend="6 Indicators / Person"
              trendType="neutral"
              icon="tune"
              iconBg={isSimulated ? "bg-tertiary-fixed" : "bg-surface-container"}
              iconColor={isSimulated ? "text-tertiary" : "text-secondary"}
              description="Statistical baseline profiles"
            />
            <MetricCard
              title="Monitored Employees"
              value={employees.length || 10}
              trend="Active Directory"
              trendType="neutral"
              icon="person_alert"
              iconBg="bg-secondary-container"
              iconColor="text-on-secondary-container"
              description="Indexed in PostgreSQL"
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
                <span className="text-[11px] text-secondary font-semibold">
                  {isSimulated ? "Asset Tiering" : "Baseline"}
                </span>
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
                    {isSimulated ? (
                      <>
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
                      </>
                    ) : (
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        stroke="#004ac6"
                        strokeWidth="14"
                        strokeDasharray="238.76"
                        strokeDashoffset="0"
                        fill="none"
                        opacity="0.25"
                      />
                    )}
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-on-surface leading-none">
                      {isSimulated ? employees.length : 0}
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
                  <span className="font-body-sm text-secondary text-xs">
                    {isSimulated ? "Low (65%)" : "Low (100%)"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  <span className="font-body-sm text-secondary text-xs">
                    {isSimulated ? "Medium (25%)" : "Medium (0%)"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-tertiary" />
                  <span className="font-body-sm text-secondary text-xs">
                    {isSimulated ? "High (8%)" : "High (0%)"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-error" />
                  <span className="font-body-sm text-secondary text-xs">
                    {isSimulated ? "Critical (2%)" : "Critical (0%)"}
                  </span>
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
                {deptScores.map((dept) => {
                  const scoreVal = isSimulated ? (dept.avg_score || dept.score) : 0;
                  return (
                    <div key={dept.name}>
                      <div className="flex justify-between mb-1 text-xs">
                        <span className="font-semibold text-on-surface">
                          {dept.name} ({dept.employee_count || 1})
                        </span>
                        <span className={`font-bold ${isSimulated ? (dept.textColor || "text-primary") : "text-secondary"}`}>
                          {scoreVal} / 100
                        </span>
                      </div>
                      <div className="w-full bg-surface-container-high rounded-full h-2 overflow-hidden">
                        <div
                          className={`${dept.color || "bg-primary"} h-2 rounded-full transition-all duration-500`}
                          style={{ width: `${scoreVal}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Section: Top Risk Profiles */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex flex-col overflow-hidden shadow-xs">
            <div className="border-b border-outline-variant pb-sm mb-md flex justify-between items-center">
              <h3 className="font-card-title text-card-title text-on-surface text-sm font-semibold">
                Top Risk Profiles ({isSimulated ? topRisks.length : 0})
              </h3>
              <Link href="/employees" className="text-primary text-xs font-semibold hover:underline">
                View All Directory
              </Link>
            </div>

            {!isSimulated || topRisks.length === 0 ? (
              <div className="py-10 flex flex-col items-center justify-center text-center w-full min-w-0">
                <div className="w-12 h-12 rounded-full bg-surface-container-high text-secondary flex items-center justify-center mb-2">
                  <span className="material-symbols-outlined text-[24px]">verified</span>
                </div>
                <h4 className="font-bold text-sm text-on-surface">
                  No high-risk employee profiles detected.
                </h4>
                <p className="text-xs text-secondary text-center leading-relaxed max-w-md mt-1">
                  Threat evaluations will appear here after simulation.
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-auto w-full min-w-0">
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
            )}
          </div>
        </div>
      </AppLayout>
    </RoleGuard>
  );
}
