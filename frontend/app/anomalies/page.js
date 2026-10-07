"use client";

import React, { useState, useEffect } from "react";
import AppLayout from "../components/AppLayout";
import MetricCard from "../components/MetricCard";
import RiskBadge from "../components/RiskBadge";
import RoleGuard from "../components/RoleGuard";
import RadarScanner from "../components/RadarScanner";
import { useSimulation } from "../context/SimulationContext";
import { anomalyApi, employeeApi } from "../lib/api";

export default function AnomaliesPage() {
  const { isSimulated } = useSimulation();
  const [activeTab, setActiveTab] = useState("ml_model"); // 'ml_model' | 'baselines' | 'sandbox'
  const [stats, setStats] = useState(null);
  const [report, setReport] = useState(null);
  const [modelStatus, setModelStatus] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [selectedEmpId, setSelectedEmpId] = useState("EMP1001");
  const [employeeBaselines, setEmployeeBaselines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [baselineLoading, setBaselineLoading] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [dispatchingAlerts, setDispatchingAlerts] = useState(false);
  const [dispatchSuccessMsg, setDispatchSuccessMsg] = useState(null);

  // Sandbox State
  const [sandboxEmpId, setSandboxEmpId] = useState("EMP1007");
  const [sandboxValues, setSandboxValues] = useState({
    avg_login_hour: 9.0,
    off_hours_logins: 0,
    usb_total_mb: 6500.0,
    usb_event_count: 5,
    sudo_attempts: 0,
    denied_events: 0,
    critical_flags: 12,
    total_transfer_mb: 7000.0,
  });
  const [sandboxResult, setSandboxResult] = useState(null);
  const [sandboxLoading, setSandboxLoading] = useState(false);
  const [realtimeAlert, setRealtimeAlert] = useState(null);

  const fetchCoreData = async () => {
    setLoading(true);
    try {
      const [statsRes, reportRes, empsRes, modelRes] = await Promise.all([
        anomalyApi.getStats().catch(() => null),
        anomalyApi.getReport().catch(() => null),
        employeeApi.list().catch(() => []),
        anomalyApi.getModelStatus().catch(() => null),
      ]);

      if (statsRes) setStats(statsRes);
      if (reportRes) setReport(reportRes);
      if (modelRes) setModelStatus(modelRes);
      if (Array.isArray(empsRes) && empsRes.length > 0) {
        setEmployees(empsRes);
        if (!selectedEmpId) setSelectedEmpId(empsRes[0].employee_id);
      }
    } catch (err) {
      console.error("Failed to load anomaly data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeBaselines = async (empId) => {
    if (!empId) return;
    setBaselineLoading(true);
    try {
      const res = await anomalyApi.getEmployeeBaselines(empId);
      if (res && Array.isArray(res.baselines)) {
        setEmployeeBaselines(res.baselines);
      } else {
        setEmployeeBaselines([]);
      }
    } catch (err) {
      console.error("Failed to fetch employee baselines:", err);
      setEmployeeBaselines([]);
    } finally {
      setBaselineLoading(false);
    }
  };

  useEffect(() => {
    fetchCoreData();

    const handleThreatSimulated = () => {
      fetchCoreData();
      if (selectedEmpId) fetchEmployeeBaselines(selectedEmpId);
    };
    const handleReset = () => {
      fetchCoreData();
      if (selectedEmpId) fetchEmployeeBaselines(selectedEmpId);
    };

    window.addEventListener("threat-simulated", handleThreatSimulated);
    window.addEventListener("simulation-reset", handleReset);

    return () => {
      window.removeEventListener("threat-simulated", handleThreatSimulated);
      window.removeEventListener("simulation-reset", handleReset);
    };
  }, [selectedEmpId]);

  useEffect(() => {
    if (selectedEmpId) {
      fetchEmployeeBaselines(selectedEmpId);
    }
  }, [selectedEmpId]);

  const handleRecalculateBaselines = async () => {
    setRecalculating(true);
    try {
      await anomalyApi.calculateBaselines();
      await fetchCoreData();
      await fetchEmployeeBaselines(selectedEmpId);
    } catch (err) {
      console.error("Baseline recalculation failed:", err);
    } finally {
      setRecalculating(false);
    }
  };

  const handleDispatchMlAlerts = async () => {
    setDispatchingAlerts(true);
    setDispatchSuccessMsg(null);
    try {
      const res = await anomalyApi.generateMlAlerts();
      setDispatchSuccessMsg(res.message);
      await fetchCoreData();
      setTimeout(() => setDispatchSuccessMsg(null), 7000);
    } catch (err) {
      console.error("Dispatch alerts failed:", err);
    } finally {
      setDispatchingAlerts(false);
    }
  };

  const handleRunLiveSandbox = async (e) => {
    if (e) e.preventDefault();
    setSandboxLoading(true);
    try {
      const payload = {
        employee_id: sandboxEmpId,
        ...sandboxValues,
      };
      const res = await anomalyApi.evaluateLive(payload);
      setSandboxResult(res);
      if (res.is_outlier || res.risk_tier === "Critical" || res.risk_tier === "High") {
        setRealtimeAlert({
          severity: res.risk_tier,
          alert_message: `[Sandbox Evaluation] ${res.primary_reason || "ML Outlier Flagged"}`,
          employee_id: res.employee_id,
          employee_name: res.name,
          department: res.department,
          target_role: res.target_role,
          target_role_title: res.target_role_title,
          recommended_action: res.recommended_action,
        });
      }
    } catch (err) {
      console.error("Sandbox test error:", err);
    } finally {
      setSandboxLoading(false);
    }
  };

  const applySandboxPreset = (type) => {
    if (type === "usb_exfiltration") {
      setSandboxEmpId("EMP1007");
      setSandboxValues({
        avg_login_hour: 9.17,
        off_hours_logins: 0,
        usb_total_mb: 6500.0,
        usb_event_count: 8,
        sudo_attempts: 0,
        denied_events: 0,
        critical_flags: 103,
        total_transfer_mb: 7200.0,
      });
    } else if (type === "sudo_escalation") {
      setSandboxEmpId("EMP1011");
      setSandboxValues({
        avg_login_hour: 9.27,
        off_hours_logins: 0,
        usb_total_mb: 255.9,
        usb_event_count: 3,
        sudo_attempts: 62,
        denied_events: 99,
        critical_flags: 99,
        total_transfer_mb: 1200.0,
      });
    } else if (type === "off_hours_mfa") {
      setSandboxEmpId("EMP1008");
      setSandboxValues({
        avg_login_hour: 3.25,
        off_hours_logins: 29,
        usb_total_mb: 346.2,
        usb_event_count: 2,
        sudo_attempts: 0,
        denied_events: 50,
        critical_flags: 87,
        total_transfer_mb: 850.0,
      });
    } else if (type === "normal_baseline") {
      setSandboxEmpId("EMP1001");
      setSandboxValues({
        avg_login_hour: 9.18,
        off_hours_logins: 0,
        usb_total_mb: 0.0,
        usb_event_count: 0,
        sudo_attempts: 0,
        denied_events: 0,
        critical_flags: 0,
        total_transfer_mb: 35.0,
      });
    }
  };

  const selectedEmployeeObj = employees.find((e) => e.employee_id === selectedEmpId);

  return (
    <RoleGuard allowedRoles={["security_analyst", "security_manager", "soc_engineer", "admin"]}>
      <AppLayout>
        <div className="flex flex-col gap-gutter">


          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm mb-xs">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-page-title text-page-title text-on-surface font-bold">
                  Behavioral Intelligence & ML Threat Engine
                </h1>
                <span className="bg-primary/10 text-primary text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-primary/20">
                  Isolation Forest Active
                </span>
              </div>
              <p className="text-on-surface-variant text-body-base text-xs mt-0.5">
                Loaded scikit-learn Isolation Forest model evaluating 15 telemetry indicators across 10,000 data points.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDispatchMlAlerts}
                disabled={dispatchingAlerts}
                className="bg-primary text-on-primary px-3.5 py-1.5 rounded-lg text-xs font-bold hover:bg-primary-container transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-[16px] ${dispatchingAlerts ? "animate-spin" : ""}`}>
                  {dispatchingAlerts ? "sync" : "forward_to_inbox"}
                </span>
                {dispatchingAlerts ? "Dispatching..." : "Dispatch ML Alerts"}
              </button>
            </div>
          </div>

          {/* Dispatch Success Alert */}
          {dispatchSuccessMsg && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-3 rounded-xl text-xs font-semibold flex items-center justify-between animate-toast-slide-in">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-[18px]">
                  verified
                </span>
                <span>{dispatchSuccessMsg}</span>
              </div>
              <button
                onClick={() => setDispatchSuccessMsg(null)}
                className="text-emerald-700 hover:text-emerald-900"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          )}

          {/* 4 Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
            <MetricCard
              title="Telemetry Data Points"
              value={isSimulated && stats?.total_activity_logs ? Number(stats.total_activity_logs).toLocaleString() : "0"}
              trend={isSimulated ? "MongoDB Store" : "Standby"}
              trendType={isSimulated ? "up-safe" : "neutral"}
              icon="dataset"
              iconBg="bg-primary-container"
              iconColor="text-on-primary-container"
              description="Time-series telemetry events"
            />
            <MetricCard
              title="ML Feature Vector"
              value="15 Indicators"
              trend="Standardized Scale"
              trendType="neutral"
              icon="tune"
              iconBg="bg-tertiary-fixed"
              iconColor="text-tertiary"
              description="Multi-factor dimensions"
            />
            <MetricCard
              title="ML Flagged Outliers"
              value={isSimulated ? (report?.flagged_count ?? 0) : 0}
              trend={isSimulated && (report?.flagged_count || 0) > 0 ? "Threats Detected" : "Standby"}
              trendType={isSimulated && (report?.flagged_count || 0) > 0 ? "up-danger" : "neutral"}
              icon="psychology"
              iconBg="bg-error-container"
              iconColor="text-error"
              description="Ranked by decision score"
            />
            <MetricCard
              title="Contamination Parameter"
              value="15% (0.15)"
              trend="200 Estimators"
              trendType="neutral"
              icon="ssid_chart"
              iconBg="bg-secondary-container"
              iconColor="text-on-secondary-container"
              description="Outlier sensitivity threshold"
            />
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-outline-variant gap-2 text-xs font-semibold">
            <button
              onClick={() => setActiveTab("ml_model")}
              className={`pb-2.5 px-4 flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                activeTab === "ml_model"
                  ? "border-primary text-primary font-bold"
                  : "border-transparent text-secondary hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">smart_toy</span>
              Isolation Forest ML Threat Engine & Radar
            </button>
            <button
              onClick={() => setActiveTab("sandbox")}
              className={`pb-2.5 px-4 flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                activeTab === "sandbox"
                  ? "border-primary text-primary font-bold"
                  : "border-transparent text-secondary hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">biotech</span>
              Interactive Live Model Sandbox
            </button>
            <button
              onClick={() => setActiveTab("baselines")}
              className={`pb-2.5 px-4 flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                activeTab === "baselines"
                  ? "border-primary text-primary font-bold"
                  : "border-transparent text-secondary hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">account_box</span>
              Per-Employee Behavioral Baselines
            </button>
          </div>

          {/* TAB 1: Isolation Forest ML Model & Threat Radar */}
          {activeTab === "ml_model" && (
            <div className="flex flex-col gap-gutter">
              {/* Joblib Model Metadata Bar */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-xs">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-md">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[22px]">
                        verified_user
                      </span>
                      <h2 className="text-sm font-bold text-on-surface">
                        Loaded Model Artifact: isolation_forest_model.joblib
                      </h2>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                        {modelStatus?.status || "LOADED_AND_ACTIVE"}
                      </span>
                    </div>
                    <p className="text-xs text-secondary mt-1 max-w-3xl leading-relaxed">
                      Trained on 10,000 synthetic multi-indicator activity logs using <strong>scikit-learn Isolation Forest</strong> with standard scaler normalization. Detects subtle combinations of multi-factor outliers across 15 behavioral indicators.
                    </p>
                  </div>

                  {/* Model Telemetry Pills */}
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                    <div className="px-2.5 py-1.5 bg-surface-container-low rounded-lg border border-outline-variant">
                      <span className="text-secondary text-[9px] block">FEATURES</span>
                      <span className="font-bold text-primary">15 Dimensions</span>
                    </div>
                    <div className="px-2.5 py-1.5 bg-surface-container-low rounded-lg border border-outline-variant">
                      <span className="text-secondary text-[9px] block">CONTAMINATION</span>
                      <span className="font-bold text-primary">0.15 (15%)</span>
                    </div>
                    <div className="px-2.5 py-1.5 bg-surface-container-low rounded-lg border border-outline-variant">
                      <span className="text-secondary text-[9px] block">ESTIMATORS</span>
                      <span className="font-bold text-primary">200 Trees</span>
                    </div>
                    <div className="px-2.5 py-1.5 bg-surface-container-low rounded-lg border border-outline-variant">
                      <span className="text-secondary text-[9px] block">CV ACCURACY</span>
                      <span className="font-bold text-emerald-600">80.0%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Threat Radar Grid (Left Radar, Right Flagged Outliers) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-stretch">
                {/* Threat Radar Visualization (Left 5/12) */}
                <div className="lg:col-span-5 flex flex-col h-full">
                  <RadarScanner
                    employees={isSimulated ? (report?.all_analyzed || []) : []}
                    flaggedCount={isSimulated ? (report?.flagged_count || 0) : 0}
                    isSimulated={isSimulated}
                    onSelectEmployee={(empId) => {
                      setSelectedEmpId(empId);
                      setActiveTab("baselines");
                    }}
                  />
                </div>

                {/* Ranked Threat Outliers Table (Right 7/12) */}
                <div className="lg:col-span-7 bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-xs flex flex-col h-full min-h-[440px]">
                  <div className="p-md border-b border-outline-variant bg-surface-bright flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-xs text-on-surface">
                        Flagged Threat Outliers (Ranked by Decision Score)
                      </h3>
                      <span className="text-[10px] bg-error-container text-error px-2 py-0.5 rounded-full font-bold">
                        {isSimulated ? (report?.flagged_count || 0) : 0} Flagged
                      </span>
                    </div>
                    <span className="text-[11px] text-secondary">
                      Automated Stakeholder Dispatching
                    </span>
                  </div>

                  <div className="overflow-x-auto flex-1 overflow-y-auto min-h-0">
                    <table className="table-fixed w-full min-w-full text-left border-collapse text-xs">
                      <thead className="sticky top-0 z-10 bg-surface-container-low border-b border-outline-variant text-[10px] uppercase font-bold text-secondary backdrop-blur-xs">
                        <tr>
                          <th className="w-16 p-sm pl-md">Rank</th>
                          <th className="w-44 p-sm">Employee</th>
                          <th className="w-24 p-sm">ML Score</th>
                          <th className="w-48 p-sm">Primary Threat Vector</th>
                          <th className="w-36 p-sm">Recommended Responder</th>
                          <th className="w-24 p-sm">Risk</th>
                          <th className="w-24 p-sm pr-md text-right">Inspect</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/60 text-on-surface">
                        {isSimulated && report?.all_analyzed && report.all_analyzed.length > 0 ? (
                          report.all_analyzed.map((row) => {
                            const isHighRisk = row.risk_level === "Critical" || row.risk_level === "High";
                            return (
                              <tr
                                key={row.employee_id}
                                className={`hover:bg-surface-container-low transition-colors ${
                                  isHighRisk ? "bg-error-container/10" : ""
                                }`}
                              >
                                <td className="p-sm pl-md font-mono font-bold">
                                  #{row.threat_rank || 1}
                                </td>
                                <td className="p-sm">
                                  <div className="font-bold text-on-surface">{row.name}</div>
                                  <div className="text-[10px] font-mono text-primary">
                                    {row.employee_id} • {row.department}
                                  </div>
                                </td>
                                <td className="p-sm font-mono font-bold">
                                  <span className={row.anomaly_score < 0 ? (isHighRisk ? "text-error" : "text-amber-600") : "text-emerald-600"}>
                                    {row.anomaly_score?.toFixed(4)}
                                  </span>
                                </td>
                                <td className="p-sm text-secondary max-w-[160px] truncate text-[11px]">
                                  {row.primary_reason || "Normal Baseline"}
                                </td>
                                <td className="p-sm">
                                  <span className="bg-surface-container-high text-on-surface-variant px-1.5 py-0.5 rounded text-[10px] font-bold border border-outline-variant">
                                    {row.target_role_title || "Security Analyst"}
                                  </span>
                                </td>
                                <td className="p-sm">
                                  <RiskBadge level={row.risk_level || "Low"} />
                                </td>
                                <td className="p-sm pr-md text-right">
                                  <button
                                    onClick={() => {
                                      setSelectedEmpId(row.employee_id);
                                      setActiveTab("baselines");
                                    }}
                                    className="text-primary hover:underline text-[11px] font-semibold cursor-pointer"
                                  >
                                    Baseline →
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={7} className="py-12 px-6 text-center">
                              <div className="w-full max-w-[380px] mx-auto flex flex-col items-center justify-center text-center">
                                <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center text-slate-400 mb-3 border border-outline-variant">
                                  <span className="material-symbols-outlined text-2xl">radar</span>
                                </div>
                                <h4 className="text-sm font-bold text-on-surface mb-1">
                                  No Threat Outliers Detected
                                </h4>
                                <p className="text-xs text-secondary leading-relaxed text-center w-full">
                                  Isolation Forest model is active in standby mode. Click &ldquo;Simulate Threat&rdquo; in the global header to evaluate live telemetry.
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Interactive Sandbox & Live Model Scoring */}
          {activeTab === "sandbox" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
              {/* Sandbox Controls (Left 6/12) */}
              <div className="lg:col-span-6 bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-xs flex flex-col gap-md">
                <div>
                  <h2 className="text-sm font-bold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">science</span>
                    Isolation Forest Live Inference Sandbox
                  </h2>
                  <p className="text-xs text-secondary mt-0.5">
                    Adjust multi-dimensional behavioral parameters and run inference in real time through the joblib model artifact.
                  </p>
                </div>

                {/* Presets */}
                <div>
                  <span className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1.5">
                    Quick Scenario Presets:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => applySandboxPreset("usb_exfiltration")}
                      className="text-[11px] bg-red-50 text-red-700 border border-red-300 hover:bg-red-100 px-2.5 py-1 rounded-md font-semibold cursor-pointer active:scale-95"
                    >
                      ⚠️ Mass USB Transfer (6.5 GB)
                    </button>
                    <button
                      type="button"
                      onClick={() => applySandboxPreset("sudo_escalation")}
                      className="text-[11px] bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 px-2.5 py-1 rounded-md font-semibold cursor-pointer active:scale-95"
                    >
                      ⚠️ Sudo Root Escalation (62x)
                    </button>
                    <button
                      type="button"
                      onClick={() => applySandboxPreset("off_hours_mfa")}
                      className="text-[11px] bg-purple-50 text-purple-800 border border-purple-300 hover:bg-purple-100 px-2.5 py-1 rounded-md font-semibold cursor-pointer active:scale-95"
                    >
                      ⚠️ 3:15 AM MFA Drift (29x)
                    </button>
                    <button
                      type="button"
                      onClick={() => applySandboxPreset("normal_baseline")}
                      className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 px-2.5 py-1 rounded-md font-semibold cursor-pointer active:scale-95"
                    >
                      ✓ 9:15 AM Normal Inlier
                    </button>
                  </div>
                </div>

                {/* Sandbox Inputs Form */}
                <form onSubmit={handleRunLiveSandbox} className="grid grid-cols-2 gap-3 text-xs">
                  <div className="col-span-2">
                    <label className="font-semibold text-on-surface block mb-1">Target Employee Profile:</label>
                    <select
                      value={sandboxEmpId}
                      onChange={(e) => setSandboxEmpId(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-1.5 font-mono outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      {employees.map((emp) => (
                        <option key={emp.employee_id} value={emp.employee_id}>
                          {emp.employee_id} — {emp.name} ({emp.department})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-on-surface block mb-1">Avg Login Hour (0-24):</label>
                    <input
                      type="number"
                      step="0.1"
                      value={sandboxValues.avg_login_hour}
                      onChange={(e) => setSandboxValues({ ...sandboxValues, avg_login_hour: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-1.5 font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-on-surface block mb-1">Off-Hours Logins (10PM-5AM):</label>
                    <input
                      type="number"
                      value={sandboxValues.off_hours_logins}
                      onChange={(e) => setSandboxValues({ ...sandboxValues, off_hours_logins: parseInt(e.target.value) || 0 })}
                      className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-1.5 font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-on-surface block mb-1">USB Total Transfer (MB):</label>
                    <input
                      type="number"
                      step="any"
                      value={sandboxValues.usb_total_mb}
                      onChange={(e) => setSandboxValues({ ...sandboxValues, usb_total_mb: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-1.5 font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-on-surface block mb-1">Sudo / Root Attempts:</label>
                    <input
                      type="number"
                      value={sandboxValues.sudo_attempts}
                      onChange={(e) => setSandboxValues({ ...sandboxValues, sudo_attempts: parseInt(e.target.value) || 0 })}
                      className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-1.5 font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-on-surface block mb-1">Denied / Failed Access Events:</label>
                    <input
                      type="number"
                      value={sandboxValues.denied_events}
                      onChange={(e) => setSandboxValues({ ...sandboxValues, denied_events: parseInt(e.target.value) || 0 })}
                      className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-1.5 font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-on-surface block mb-1">Critical Security Flags:</label>
                    <input
                      type="number"
                      value={sandboxValues.critical_flags}
                      onChange={(e) => setSandboxValues({ ...sandboxValues, critical_flags: parseInt(e.target.value) || 0 })}
                      className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-1.5 font-mono"
                    />
                  </div>

                  <div className="col-span-2 mt-2">
                    <button
                      type="submit"
                      disabled={sandboxLoading}
                      className="w-full bg-primary text-white py-2 rounded-lg font-bold hover:bg-primary-container transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {sandboxLoading ? "progress_activity" : "psychology"}
                      </span>
                      <span>{sandboxLoading ? "Running Model Inference..." : "Evaluate with Isolation Forest Model"}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Sandbox Results Display (Right 6/12) */}
              <div className="lg:col-span-6 bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-md border-b border-outline-variant pb-sm">
                    <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">
                      Isolation Forest Model Verdict
                    </h3>
                    {sandboxResult && (
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          sandboxResult.is_outlier
                            ? "bg-error-container text-error"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {sandboxResult.is_outlier ? "OUTLIER FLAGGED (-1)" : "NORMAL INLIER (+1)"}
                      </span>
                    )}
                  </div>

                  {!sandboxResult ? (
                    <div className="p-8 text-center text-secondary text-xs">
                      <span className="material-symbols-outlined text-[40px] text-outline opacity-40 block mb-2">
                        psychology
                      </span>
                      Select a scenario above or enter custom feature values and click <strong>Evaluate with Isolation Forest Model</strong>.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 text-xs">
                      {/* Decision Score & Risk Banner */}
                      <div
                        className={`p-3 rounded-lg border ${
                          sandboxResult.is_outlier || sandboxResult.risk_tier === "Critical"
                            ? "bg-red-50 border-red-300 text-red-900"
                            : "bg-emerald-50 border-emerald-300 text-emerald-900"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="font-bold text-sm">
                            {sandboxResult.primary_reason || "Normal Activity"}
                          </div>
                          <RiskBadge level={sandboxResult.risk_tier} />
                        </div>
                        <p className="text-xs mt-1">{sandboxResult.details}</p>
                      </div>

                      {/* Decision Score Metric */}
                      <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono">
                        <div>
                          <span className="text-[10px] text-secondary block">DECISION SCORE</span>
                          <span className={`text-base font-bold ${sandboxResult.anomaly_score < 0 ? "text-error" : "text-emerald-700"}`}>
                            {sandboxResult.anomaly_score}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-secondary block">OUTLIER STATUS</span>
                          <span className="text-base font-bold text-on-surface">
                            {sandboxResult.is_outlier ? "-1 (Outlier)" : "+1 (Normal)"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-secondary block">DISPATCH TARGET</span>
                          <span className="text-xs font-bold text-primary truncate block mt-1">
                            👤 {sandboxResult.target_role_title}
                          </span>
                        </div>
                      </div>

                      {/* Recommended Mitigation */}
                      {sandboxResult.recommended_action && (
                        <div className="p-2.5 bg-primary-fixed/40 text-on-primary-fixed-variant rounded-lg border border-primary/20 text-[11px] font-medium">
                          ⚡ <strong>Recommended Action:</strong> {sandboxResult.recommended_action}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Behavioral Baselines Explorer */}
          {activeTab === "baselines" && (
            <div className="flex flex-col gap-gutter">
              {/* Employee Selector Bar */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex flex-col sm:flex-row sm:items-center justify-between gap-md shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center font-bold text-primary text-sm">
                    {(selectedEmployeeObj?.name || "EMP").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-on-surface">
                      {selectedEmployeeObj?.name || "Selected Employee"}
                    </h2>
                    <p className="text-xs text-secondary">
                      {selectedEmployeeObj?.designation} • {selectedEmployeeObj?.department} Department
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs text-secondary font-medium">Select Employee Profile:</label>
                  <select
                    value={selectedEmpId}
                    onChange={(e) => setSelectedEmpId(e.target.value)}
                    className="bg-surface-container-low border border-outline-variant text-primary font-mono font-bold text-xs rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    {employees.map((emp) => (
                      <option key={emp.employee_id} value={emp.employee_id}>
                        {emp.employee_id} — {emp.name} ({emp.department})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Baseline Indicators Grid (6 Indicators) */}
              {baselineLoading ? (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-12 text-center text-secondary">
                  <span className="material-symbols-outlined animate-spin text-[32px]">progress_activity</span>
                  <p className="text-xs mt-2">Loading behavioral baselines from MongoDB...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
                  {/* Indicator 1: Login Times */}
                  {(() => {
                    const b = employeeBaselines.find((item) => item.indicator === "avg_login_hour");
                    const meanHour = b?.typical_value ?? 9.25;
                    const hours = Math.floor(meanHour);
                    const mins = Math.round((meanHour % 1) * 60);
                    const timeStr = `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
                    return (
                      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-xs flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-center mb-sm">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[16px] text-primary">schedule</span>
                              1. Login Times
                            </span>
                            <span className="text-[10px] bg-primary/10 text-primary font-mono font-bold px-2 py-0.5 rounded">
                              N = {b?.sample_size || 0}
                            </span>
                          </div>
                          <div className="text-2xl font-bold font-mono text-on-surface">
                            {timeStr} <span className="text-xs font-sans text-secondary font-normal">({meanHour}h)</span>
                          </div>
                          <p className="text-xs text-secondary mt-1">
                            Typical login time with <strong className="text-on-surface font-mono">±{b?.std_deviation || 0.4}h</strong> standard deviation spread.
                          </p>
                        </div>
                        <div className="mt-md pt-sm border-t border-outline-variant/60 flex justify-between text-[11px] text-secondary">
                          <span>Baseline Status: <strong className="text-emerald-600 font-semibold">Active</strong></span>
                          <span>Indicator: <code className="font-mono text-primary">avg_login_hour</code></span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Indicator 2: Resource Access Frequency */}
                  {(() => {
                    const b = employeeBaselines.find((item) => item.indicator === "resource_access_freq");
                    return (
                      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-xs flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-center mb-sm">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[16px] text-primary">folder_managed</span>
                              2. Resource Access Frequency
                            </span>
                            <span className="text-[10px] bg-primary/10 text-primary font-mono font-bold px-2 py-0.5 rounded">
                              N = {b?.sample_size || 0}
                            </span>
                          </div>
                          <div className="text-2xl font-bold font-mono text-on-surface">
                            {b?.typical_value ?? 6.8} <span className="text-xs font-sans text-secondary font-normal">events/day</span>
                          </div>
                          <p className="text-xs text-secondary mt-1">
                            Average file/endpoint accesses per active shift (<strong className="text-on-surface font-mono">±{b?.std_deviation || 2.5}</strong> sigma).
                          </p>
                        </div>
                        <div className="mt-md pt-sm border-t border-outline-variant/60 flex justify-between text-[11px] text-secondary">
                          <span>Max Single Day: <strong className="text-on-surface">{b?.metadata?.max_daily_accesses || 14}</strong></span>
                          <span>Indicator: <code className="font-mono text-primary">resource_access_freq</code></span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Indicator 3: Device Usage */}
                  {(() => {
                    const b = employeeBaselines.find((item) => item.indicator === "device_usage");
                    return (
                      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-xs flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-center mb-sm">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[16px] text-primary">devices</span>
                              3. Device Usage
                            </span>
                            <span className="text-[10px] bg-primary/10 text-primary font-mono font-bold px-2 py-0.5 rounded">
                              {((b?.typical_value || 0.95) * 100).toFixed(0)}% Affinity
                            </span>
                          </div>
                          <div className="text-base font-bold text-on-surface truncate">
                            {b?.metadata?.primary_device || selectedEmployeeObj?.device_info?.split(",")[0] || "Primary Workstation"}
                          </div>
                          <p className="text-xs text-secondary mt-1">
                            Primary verified asset with {b?.metadata?.known_devices?.length || 1} registered hostname(s).
                          </p>
                        </div>
                        <div className="mt-md pt-sm border-t border-outline-variant/60 flex justify-between text-[11px] text-secondary">
                          <span>Device Diversity: <strong className="text-on-surface">{b?.metadata?.known_devices?.length || 1} Known</strong></span>
                          <span>Indicator: <code className="font-mono text-primary">device_usage</code></span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Indicator 4: Application Usage */}
                  {(() => {
                    const b = employeeBaselines.find((item) => item.indicator === "app_usage_freq");
                    return (
                      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-xs flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-center mb-sm">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[16px] text-primary">terminal</span>
                              4. Application Usage
                            </span>
                            <span className="text-[10px] bg-primary/10 text-primary font-mono font-bold px-2 py-0.5 rounded">
                              N = {b?.sample_size || 0}
                            </span>
                          </div>
                          <div className="text-2xl font-bold font-mono text-on-surface">
                            {b?.typical_value ?? 5.2} <span className="text-xs font-sans text-secondary font-normal">commands/day</span>
                          </div>
                          <p className="text-xs text-secondary mt-1">
                            Workflow actions and privileged session executions (<strong className="text-on-surface font-mono">±{b?.std_deviation || 2.1}</strong> sigma).
                          </p>
                        </div>
                        <div className="mt-md pt-sm border-t border-outline-variant/60 flex justify-between text-[11px] text-secondary">
                          <span>Total App Events: <strong className="text-on-surface">{b?.metadata?.total_app_events || 0}</strong></span>
                          <span>Indicator: <code className="font-mono text-primary">app_usage_freq</code></span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Indicator 5: Data Transfer Volume */}
                  {(() => {
                    const b = employeeBaselines.find((item) => item.indicator === "avg_data_transfer_mb");
                    return (
                      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-xs flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-center mb-sm">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[16px] text-primary">cloud_sync</span>
                              5. Data Transfer Volume
                            </span>
                            <span className="text-[10px] bg-primary/10 text-primary font-mono font-bold px-2 py-0.5 rounded">
                              N = {b?.sample_size || 0}
                            </span>
                          </div>
                          <div className="text-2xl font-bold font-mono text-on-surface">
                            {b?.typical_value ?? 25.4} <span className="text-xs font-sans text-secondary font-normal">MB/event</span>
                          </div>
                          <p className="text-xs text-secondary mt-1">
                            Typical payload size across uploads & transfers (<strong className="text-on-surface font-mono">±{b?.std_deviation || 10.2} MB</strong>).
                          </p>
                        </div>
                        <div className="mt-md pt-sm border-t border-outline-variant/60 flex justify-between text-[11px] text-secondary">
                          <span>Max Historical: <strong className="text-on-surface">{b?.metadata?.max_single_transfer_mb || 45} MB</strong></span>
                          <span>Indicator: <code className="font-mono text-primary">avg_data_transfer_mb</code></span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Indicator 6: Communication Patterns */}
                  {(() => {
                    const b = employeeBaselines.find((item) => item.indicator === "communication_patterns");
                    return (
                      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-xs flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-center mb-sm">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[16px] text-primary">mail</span>
                              6. Communication Patterns
                            </span>
                            <span className="text-[10px] bg-primary/10 text-primary font-mono font-bold px-2 py-0.5 rounded">
                              N = {b?.sample_size || 0}
                            </span>
                          </div>
                          <div className="text-2xl font-bold font-mono text-on-surface">
                            {b?.typical_value ?? 2.4} <span className="text-xs font-sans text-secondary font-normal">emails/day</span>
                          </div>
                          <p className="text-xs text-secondary mt-1">
                            Daily outbound volume with <strong className="text-on-surface font-mono">{b?.metadata?.avg_attachment_mb || 1.2} MB</strong> avg attachments.
                          </p>
                        </div>
                        <div className="mt-md pt-sm border-t border-outline-variant/60 flex justify-between text-[11px] text-secondary">
                          <span>Total Emails: <strong className="text-on-surface">{b?.metadata?.total_emails_sent || 0}</strong></span>
                          <span>Indicator: <code className="font-mono text-primary">communication_patterns</code></span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      </AppLayout>
    </RoleGuard>
  );
}
