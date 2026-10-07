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
  const [exporting, setExporting] = useState(false);
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

    const handleThreatSimulated = () => fetchReport();
    const handleReset = () => fetchReport();

    window.addEventListener("threat-simulated", handleThreatSimulated);
    window.addEventListener("simulation-reset", handleReset);

    return () => {
      window.removeEventListener("threat-simulated", handleThreatSimulated);
      window.removeEventListener("simulation-reset", handleReset);
    };
  }, [user]);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const csvData = await reportApi.exportCsv();
      const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `ITBIS_Threat_Risk_Report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Export CSV failed:", err);
      alert("Failed to download CSV export.");
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      await reportApi.exportExcel();
    } catch (err) {
      console.error("Export Excel failed:", err);
      alert(err.response?.data?.detail || "Failed to download Excel report.");
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      await reportApi.exportPdf();
    } catch (err) {
      console.error("Export PDF failed:", err);
      alert(err.response?.data?.detail || "Failed to download PDF report.");
    } finally {
      setExporting(false);
    }
  };

  const complianceSections = reportResponse?.compliance_sections || [
    {
      title: "Data Exfiltration Controls (NIST SP 800-53)",
      score: "94% Compliant",
      status: "healthy",
      findings: "Automated USB monitoring, file download audits, and bulk egress detection active.",
    },
    {
      title: "Access Privileges & Identity Governance (ISO 27001)",
      score: "88% Compliant",
      status: "healthy",
      findings: "Least privilege enforcement and role-based access verified.",
    },
    {
      title: "Behavioral Deviation Baselines (SOC 2 Type II)",
      score: "91% Compliant",
      status: "healthy",
      findings: "Continuous audit logging meets enterprise retention standards.",
    },
  ];

  return (
    <RoleGuard allowedRoles={["admin", "security_manager", "soc_engineer", "security_analyst"]}>
      <AppLayout>
        <div className="flex flex-col gap-gutter">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm mb-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-2xl">
                  summarize
                </span>
                <h1 className="font-page-title text-page-title text-on-surface font-bold">
                  Risk & Compliance Reports
                </h1>
              </div>
              <p className="text-secondary text-xs mt-0.5">
                Organizational threat posture, regulatory compliance status, and downloadable reports.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCsv}
                disabled={exporting}
                className="bg-surface-container-high border border-outline-variant text-on-surface px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-surface-container transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">
                  download
                </span>
                Export CSV
              </button>
              {(user?.role === "admin" || user?.role === "security_manager") && (
                <>
                  <button
                    onClick={handleExportExcel}
                    disabled={exporting}
                    className="bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-emerald-800 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                    title="Download official Excel report"
                  >
                    <span className="material-symbols-outlined text-[16px]">table_view</span>
                    Download Excel
                  </button>
                  <button
                    onClick={handleExportPdf}
                    disabled={exporting}
                    className="bg-primary text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-primary-container transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                    title="Download official PDF report"
                  >
                    <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                    Download PDF
                  </button>
                </>
              )}
            </div>
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
                  Signed in as <strong>{user?.role || "Security Officer"}</strong>
                </span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                Live Data Synchronized
              </span>
            </div>
          )}

          {/* KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-gutter">
            <MetricCard
              title="Org Risk Index"
              value={`${reportResponse?.org_risk_score ?? 0} / 100`}
              trend="5-Factor Average"
              trendType="neutral"
              icon="verified_user"
              accentColor="#0284c7"
              description="Average risk across all employees"
            />
            <MetricCard
              title="Monitored Employees"
              value={reportResponse?.total_assets ?? reportResponse?.total_employees ?? 13}
              trend="Active Profiles"
              trendType="neutral"
              icon="group"
              accentColor="#16a34a"
              description="Total monitored employees"
            />
            <MetricCard
              title="Critical Alerts & Cases"
              value={reportResponse?.critical_alerts ?? 0}
              trend={reportResponse?.critical_alerts > 0 ? "Requires Review" : "Queue Clear"}
              trendType={reportResponse?.critical_alerts > 0 ? "up-danger" : "neutral"}
              icon="warning"
              accentColor="#dc2626"
              description="High and Critical priority items"
            />
          </div>

          {/* Compliance Evaluation Breakdown */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-sm">
            <div className="border-b border-outline-variant pb-sm mb-md flex justify-between items-center">
              <h2 className="font-section-title text-section-title text-on-surface font-semibold text-sm">
                Compliance Frameworks
              </h2>
              <span className="text-[11px] text-secondary">Status across security standards</span>
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
                      <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded text-[10px] font-bold">
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
