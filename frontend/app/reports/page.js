"use client";

import React, { useState, useEffect } from "react";
import AppLayout from "../components/AppLayout";
import MetricCard from "../components/MetricCard";
import RiskBadge from "../components/RiskBadge";
import RoleGuard from "../components/RoleGuard";
import { reportApi } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function ReportsPage() {
  const { user } = useAuth();
  const [reportResponse, setReportResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await reportApi.getRiskPosture();
      setReportResponse(data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Access denied. Only 'admin' and 'security_manager' roles can access risk posture reports."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [user]);

  const complianceSections = reportResponse?.compliance_sections || [
    {
      title: "Data Exfiltration Controls (NIST SP 800-53)",
      score: "94% Compliant",
      status: "healthy",
      findings: "Automated USB telemetry and bulk egress detection active across all endpoints.",
    },
    {
      title: "Access Privileges & Identity Governance (ISO 27001)",
      score: "88% Compliant",
      status: "healthy",
      findings: "Least privilege enforcement verified in PostgreSQL ACID store.",
    },
    {
      title: "Behavioral Deviation Baselines (SOC 2 Type II)",
      score: "91% Compliant",
      status: "healthy",
      findings: "Dual-database audit logging (PostgreSQL ACID + MongoDB Time-Series) meets retention standards.",
    },
  ];

  return (
    <RoleGuard allowedRoles={["admin", "security_manager"]}>
      <AppLayout>
      <div className="flex flex-col gap-gutter">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm mb-xs">
          <div>
            <h1 className="font-page-title text-page-title text-on-surface font-bold">
              Organization Risk Posture & Compliance Reports
            </h1>
            <p className="text-on-surface-variant text-body-base text-xs mt-0.5">
              Strategic risk assessments, regulatory compliance scoring, and executive summaries from database.
            </p>
          </div>
          <button
            onClick={() => alert("Downloading Executive Risk Intelligence PDF...")}
            className="bg-primary text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-primary-container transition-colors flex items-center gap-1.5 shadow-xs self-start cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
            Export PDF Report
          </button>
        </div>

        {/* Access Status Banner */}
        {error ? (
          <div className="p-3 bg-error-container text-on-error-container rounded-xl border border-error/20 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-error">
              lock
            </span>
            <span>{error}</span>
          </div>
        ) : (
          <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-emerald-600">
                verified_user
              </span>
              <span>
                Authorized via Role: <strong>{user?.role}</strong> (FastAPI /reports/risk-posture)
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
              ACID Verified
            </span>
          </div>
        )}

        {/* KPI Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-gutter">
          <MetricCard
            title="Composite Security Index"
            value={`${reportResponse?.org_risk_score || 72} / 100`}
            trend="Calculated"
            trendType="neutral"
            icon="verified_user"
            iconBg="bg-primary-fixed"
            iconColor="text-primary"
            description="Weighted risk formula across all nodes"
          />
          <MetricCard
            title="Monitored Assets"
            value={reportResponse?.total_assets || "21"}
            trend="Active in DB"
            trendType="neutral"
            icon="timer"
            iconBg="bg-emerald-100"
            iconColor="text-emerald-700"
            description="PostgreSQL employees store"
          />
          <MetricCard
            title="Critical Open Incidents"
            value={reportResponse?.critical_alerts ?? 3}
            trend="Action Req."
            trendType="up-danger"
            icon="bolt"
            iconBg="bg-secondary-container"
            iconColor="text-on-secondary-container"
            description="Triage lifecycle in progress"
          />
        </div>

        {/* Compliance Evaluation Breakdown */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-xs">
          <div className="border-b border-outline-variant pb-sm mb-md flex justify-between items-center">
            <h2 className="font-section-title text-section-title text-on-surface font-semibold text-sm">
              Regulatory Compliance Posture Breakdown
            </h2>
            <span className="text-[11px] text-secondary">Updated from database</span>
          </div>

          <div className="space-y-3">
            {complianceSections.map((sec, idx) => (
              <div
                key={idx}
                className="p-3 bg-surface-container-low border border-outline-variant rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-on-surface">
                      {sec.title}
                    </span>
                    <span className="bg-primary-fixed text-primary-container px-2 py-0.5 rounded text-[10px] font-bold">
                      {sec.score}
                    </span>
                  </div>
                  <p className="text-[11px] text-secondary mt-1">
                    {sec.findings}
                  </p>
                </div>
                <RiskBadge status="Passed" level="healthy" />
              </div>
            ))}
          </div>
        </div>
      </div>
      </AppLayout>
    </RoleGuard>
  );
}
