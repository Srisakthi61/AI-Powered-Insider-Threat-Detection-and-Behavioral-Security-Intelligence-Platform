"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import MetricCard from "../../components/MetricCard";
import RiskBadge from "../../components/RiskBadge";
import RoleGuard from "../../components/RoleGuard";
import { uebaApi, incidentApi, alertApi, employeeApi, anomalyApi } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

export default function EmployeeInvestigationPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const employeeId = params?.id;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview"); // overview, ueba, baselines, timeline, incidents, alerts

  // Create Incident Modal State
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [incSeverity, setIncSeverity] = useState("HIGH");
  const [incSummary, setIncSummary] = useState("");
  const [incSubmitting, setIncSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);

  const fetchProfile = async () => {
    if (!employeeId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await uebaApi.getProfile(employeeId);
      setProfile(data);
    } catch (err) {
      console.error("Failed to load employee profile:", err);
      setError(err.response?.data?.detail || "Failed to load employee investigation dossier.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();

    const handleThreatSimulated = () => fetchProfile();
    const handleReset = () => fetchProfile();

    window.addEventListener("threat-simulated", handleThreatSimulated);
    window.addEventListener("simulation-reset", handleReset);

    return () => {
      window.removeEventListener("threat-simulated", handleThreatSimulated);
      window.removeEventListener("simulation-reset", handleReset);
    };
  }, [employeeId]);

  const handleCreateIncident = async (e) => {
    e.preventDefault();
    if (!incSummary.trim()) return;
    setIncSubmitting(true);
    try {
      const alertIds = profile?.alerts?.map((a) => a.id) || [];
      const res = await incidentApi.create({
        employee_id: employeeId,
        severity: incSeverity,
        summary: incSummary,
        alert_ids: alertIds.slice(0, 3),
      });
      setShowIncidentModal(false);
      setIncSummary("");
      setActionSuccess(`Incident #${res.id} created successfully.`);
      await fetchProfile();
      setTimeout(() => setActionSuccess(null), 6000);
    } catch (err) {
      console.error("Failed to create incident:", err);
      alert(err.response?.data?.detail || "Failed to open incident case.");
    } finally {
      setIncSubmitting(false);
    }
  };

  const handleRecalculate = async () => {
    try {
      await anomalyApi.calculateBaselines(employeeId);
      await fetchProfile();
      setActionSuccess("Behavioral baselines recalculated from latest MongoDB telemetry.");
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err) {
      console.error("Baseline calculation error:", err);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <span className="material-symbols-outlined animate-spin text-[36px] text-primary">
            progress_activity
          </span>
          <p className="text-xs font-semibold text-secondary">
            Loading Employee Behavioral Intelligence Dossier...
          </p>
        </div>
      </AppLayout>
    );
  }

  if (error || !profile) {
    return (
      <AppLayout>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 max-w-xl mx-auto text-center shadow-xs my-12">
          <div className="w-12 h-12 rounded-full bg-error-container text-error flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-outlined text-[24px]">person_off</span>
          </div>
          <h2 className="font-bold text-sm text-on-surface">Employee Record Not Found</h2>
          <p className="text-xs text-secondary mt-1">{error || `No data for ID ${employeeId}`}</p>
          <button
            onClick={() => router.push("/employees")}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary-container"
          >
            Return to Employee Directory
          </button>
        </div>
      </AppLayout>
    );
  }

  const riskScore = profile.risk_score || 0;
  const riskLevel = profile.risk_level || "Low";
  const breakdown = profile.risk_breakdown || {};
  const peer = profile.peer_comparison || {};
  const trend = profile.trend_14_days || [];
  const baselines = profile.baselines || [];
  const incidents = profile.incidents || [];
  const alerts = profile.alerts || [];

  return (
    <RoleGuard allowedRoles={["security_analyst", "security_manager", "soc_engineer", "admin"]}>
      <AppLayout>
        <div className="flex flex-col gap-gutter">
          {/* Breadcrumb & Top Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm">
            <div className="flex items-center gap-2 text-xs">
              <Link href="/employees" className="text-secondary hover:text-primary flex items-center gap-1 font-medium">
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                Employees Directory
              </Link>
              <span className="text-outline">/</span>
              <span className="text-on-surface font-bold font-mono">{profile.employee_id}</span>
              <span className="text-outline">/</span>
              <span className="text-secondary">Security Investigation Profile</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRecalculate}
                className="bg-surface-container-low border border-outline-variant text-on-surface px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-surface-container transition-colors flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-[15px]">tune</span>
                Recalculate Baselines
              </button>
              <button
                onClick={() => setShowIncidentModal(true)}
                className="bg-error text-white px-3.5 py-1.5 rounded-lg text-xs font-bold hover:bg-red-700 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">gavel</span>
                Create Incident Case
              </button>
            </div>
          </div>

          {/* Action Success Toast */}
          {actionSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-[18px]">verified</span>
                <span>{actionSuccess}</span>
              </div>
              <button onClick={() => setActionSuccess(null)} className="text-emerald-700 hover:text-emerald-900">
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          )}

          {/* Employee Identity Hero Banner */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary-container text-white font-extrabold text-xl flex items-center justify-center shrink-0 shadow-sm">
                {(profile.employee_name || "UN")
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg font-bold text-on-surface">{profile.employee_name}</h1>
                  <span className="px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-surface-container text-primary border border-outline-variant">
                    {profile.employee_id}
                  </span>
                  <RiskBadge level={riskLevel} />
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-secondary mt-1.5">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">corporate_fare</span>
                    {profile.department}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">badge</span>
                    {profile.designation}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">laptop</span>
                    {profile.device_info || "Corporate Workstation"}
                  </span>
                </div>
                {profile.access_privileges && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {profile.access_privileges.split(",").map((p) => (
                      <span key={p} className="text-[10px] font-mono bg-surface-container-high px-2 py-0.5 rounded text-on-surface-variant font-medium">
                        {p.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Overall Risk Score Badge Widget */}
            <div className="flex items-center gap-4 bg-surface-container-low border border-outline-variant/80 rounded-xl p-3.5 shrink-0">
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-outline tracking-wider">
                  5-Factor Composite Risk
                </div>
                <div className="text-2xl font-black text-on-surface">
                  {riskScore} <span className="text-xs text-secondary font-normal">/ 100</span>
                </div>
                <div className="text-[11px] font-semibold text-secondary">
                  Risk Tier: <span className={riskLevel === "Critical" ? "text-error font-bold" : riskLevel === "High" ? "text-tertiary font-bold" : "text-primary"}>{riskLevel}</span>
                </div>
              </div>
              <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg text-white shadow-xs ${
                riskLevel === "Critical" ? "bg-error" : riskLevel === "High" ? "bg-tertiary" : riskLevel === "Medium" ? "bg-primary" : "bg-emerald-600"
              }`}>
                {riskScore}%
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-outline-variant gap-1 overflow-x-auto text-xs font-semibold">
            {[
              { key: "overview", label: "5-Factor Risk Breakdown", icon: "donut_large" },
              { key: "ueba", label: "UEBA & Peer Comparison", icon: "compare_arrows" },
              { key: "baselines", label: "Behavioral Baselines (6)", icon: "tune" },
              { key: "timeline", label: "Investigation Timeline", icon: "history_edu" },
              { key: "incidents", label: `Incidents (${incidents.length})`, icon: "gavel" },
              { key: "alerts", label: `Alerts (${alerts.length})`, icon: "warning" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab.key
                    ? "border-primary text-primary font-bold bg-primary/5"
                    : "border-transparent text-secondary hover:text-on-surface hover:bg-surface-container-high"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* TAB 1: 5-Factor Risk Breakdown */}
          {activeTab === "overview" && (
            <div className="space-y-gutter">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-gutter">
                {breakdown.contributing_factors?.map((f) => (
                  <div key={f.key} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[11px] font-bold text-on-surface">{f.factor}</span>
                        <span className="text-[10px] font-mono text-outline font-semibold">{f.weight_pct}% Weight</span>
                      </div>
                      <div className="text-xl font-extrabold text-on-surface mt-1">
                        {f.score} <span className="text-[11px] text-secondary font-normal">/ 100</span>
                      </div>
                      <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden mt-2">
                        <div
                          className={`h-full rounded-full ${
                            f.score >= 70 ? "bg-error" : f.score >= 40 ? "bg-tertiary" : "bg-primary"
                          }`}
                          style={{ width: `${Math.min(100, f.score)}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-secondary mt-1.5">
                        Contribution: <strong>+{f.contribution} pts</strong>
                      </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-outline-variant/60 text-[10px] text-on-surface-variant leading-relaxed">
                      {f.reasons?.[0]}
                    </div>
                  </div>
                ))}
              </div>

              {/* Primary Risk Drivers & Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
                <div className="lg:col-span-7 bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-xs">
                  <h3 className="text-xs font-bold text-on-surface mb-3 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-[18px]">verified_user</span>
                    Contributing Security Factors &amp; Telemetry Evidence
                  </h3>
                  <div className="space-y-2.5">
                    {breakdown.all_reasons?.map((r, idx) => (
                      <div key={idx} className="p-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-xs flex items-start gap-2.5">
                        <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">
                          arrow_right
                        </span>
                        <span className="text-on-surface leading-relaxed">{r}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-5 bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-on-surface mb-3 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-tertiary text-[18px]">gavel</span>
                      Recommended Remediation Playbook
                    </h3>
                    <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs space-y-2">
                      <div className="font-bold">Automated Security Recommendations:</div>
                      <ul className="list-disc pl-4 space-y-1 text-[11px]">
                        <li>Isolate endpoint host if USB exfiltration or root escalation was confirmed.</li>
                        <li>Audit IAM bindings and revoke unapproved administrative cluster permissions.</li>
                        <li>Enforce mandatory MFA reset on off-hours drift detection.</li>
                        <li>Assign high-priority investigation case to Tier-2 SOC Analyst.</li>
                      </ul>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-outline-variant flex justify-between items-center">
                    <span className="text-[11px] text-secondary">Need formal case tracking?</span>
                    <button
                      onClick={() => setShowIncidentModal(true)}
                      className="px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-container"
                    >
                      Open Incident
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: UEBA & Peer Comparison */}
          {activeTab === "ueba" && (
            <div className="space-y-gutter">
              {/* Peer Comparison Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
                <MetricCard
                  title="Department Average Risk"
                  value={`${peer.department_average || 0} / 100`}
                  trend={`${peer.department} Dept`}
                  trendType="neutral"
                  icon="groups"
                  iconBg="bg-primary-fixed"
                  iconColor="text-primary"
                  description={`Calculated across ${peer.peer_count} peer employees`}
                />
                <MetricCard
                  title="Peer Deviation Delta"
                  value={`${peer.deviation > 0 ? "+" : ""}${peer.deviation || 0} pts`}
                  trend={peer.is_above_peer_average ? "Above Peer Average" : "Within Baseline"}
                  trendType={peer.is_above_peer_average ? "up-danger" : "up-good"}
                  icon="compare_arrows"
                  iconBg={peer.is_above_peer_average ? "bg-error-container" : "bg-emerald-100"}
                  iconColor={peer.is_above_peer_average ? "text-error" : "text-emerald-700"}
                  description={peer.is_above_peer_average ? "Statistical anomaly relative to peers" : "Normal peer distribution"}
                />
                <MetricCard
                  title="14-Day Trend Direction"
                  value={profile.trend_direction || "Stable"}
                  trend="14-Day Snapshot"
                  trendType={profile.trend_direction === "Increasing" ? "up-danger" : profile.trend_direction === "Decreasing" ? "up-good" : "neutral"}
                  icon="trending_up"
                  iconBg="bg-secondary-container"
                  iconColor="text-on-secondary-container"
                  description="Computed slope over last 14 days"
                />
              </div>

              {/* 14-Day Historical Risk Trend Bar Graph */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-xs">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-xs font-bold text-on-surface">14-Day Daily Risk Evolution</h3>
                    <p className="text-[11px] text-secondary">
                      {trend.length > 0
                        ? `Historical daily composite risk trajectory (${trend.length} snapshot${trend.length > 1 ? "s" : ""} available)`
                        : "Persisted daily risk snapshots from risk engine"}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    profile.trend_direction === "Increasing" ? "bg-error-container text-error" : "bg-surface-container text-secondary"
                  }`}>
                    {profile.trend_direction || "Stable"} Trajectory
                  </span>
                </div>

                {!trend || trend.length === 0 ? (
                  <div className="h-36 bg-surface-container-low rounded-xl p-4 border border-outline-variant flex flex-col items-center justify-center text-center gap-2">
                    <span className="material-symbols-outlined text-secondary text-2xl">
                      history_toggle_off
                    </span>
                    <p className="text-xs font-bold text-on-surface">
                      Insufficient historical risk data
                    </p>
                    <p className="text-[11px] text-secondary max-w-md">
                      Daily risk snapshots are persisted as telemetry is processed. Historical trend points will accumulate over monitored calendar days.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-7 sm:grid-cols-14 gap-2 pt-2 items-end h-40">
                    {trend.map((d, i) => (
                      <div key={i} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                        <div className="text-[10px] font-mono text-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                          {d.risk_score}
                        </div>
                        <div className="w-full bg-surface-container rounded-t h-28 flex items-end">
                          <div
                            className={`w-full rounded-t transition-all ${
                              d.risk_score >= 70 ? "bg-error" : d.risk_score >= 40 ? "bg-tertiary" : "bg-primary"
                            }`}
                            style={{ height: `${Math.max(8, d.risk_score)}%` }}
                            title={`${d.date || d.day_label}: Risk ${d.risk_score} (${d.risk_level})`}
                          />
                        </div>
                        <span className="text-[9px] font-mono text-outline truncate max-w-full">
                          {d.day_label || d.date?.slice(5)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Behavioral Baselines (6 Indicators) */}
          {activeTab === "baselines" && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-xs">
              <div className="p-4 border-b border-outline-variant bg-surface-bright flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-bold text-on-surface">6-Indicator Behavioral Baselines</h3>
                  <p className="text-[11px] text-secondary">Per-employee normal profiles computed from MongoDB telemetry</p>
                </div>
                <button
                  onClick={handleRecalculate}
                  className="px-3 py-1 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-container"
                >
                  Recalculate All
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-outline-variant text-[10px] uppercase font-bold text-outline">
                      <th className="p-3 pl-4">Indicator Name</th>
                      <th className="p-3">Typical Baseline Value</th>
                      <th className="p-3">Normal Spread (±2σ)</th>
                      <th className="p-3">Sample Telemetry Events</th>
                      <th className="p-3 pr-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-outline-variant">
                    {baselines.map((b) => (
                      <tr key={b.indicator} className="hover:bg-surface-container-low/50">
                        <td className="p-3 pl-4">
                          <div className="font-bold text-on-surface">{b.title}</div>
                          <div className="text-[10px] text-secondary">{b.description}</div>
                        </td>
                        <td className="p-3 font-mono font-bold text-primary">
                          {b.typical_value !== null ? b.typical_value : "—"}
                        </td>
                        <td className="p-3 font-mono text-secondary">{b.spread_range}</td>
                        <td className="p-3 font-mono">{b.sample_size} records</td>
                        <td className="p-3 pr-4 text-right">
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: Investigation Timeline */}
          {activeTab === "timeline" && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-xs">
              <div className="flex justify-between items-center mb-4 border-b border-outline-variant pb-3">
                <div>
                  <h3 className="text-xs font-bold text-on-surface">Chronological Security Investigation Timeline</h3>
                  <p className="text-[11px] text-secondary">Unified audit trail merging activity logs, rule anomalies, ML outliers, notes, and alerts</p>
                </div>
              </div>

              <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-outline-variant">
                {profile.recent_activity?.map((act, idx) => (
                  <div key={idx} className="flex items-start gap-3 relative pl-1">
                    <div className="w-6 h-6 rounded-full bg-surface-container-high border-2 border-primary flex items-center justify-center shrink-0 z-10 text-primary">
                      <span className="material-symbols-outlined text-[13px]">terminal</span>
                    </div>
                    <div className="flex-1 p-3 bg-surface-container-low border border-outline-variant rounded-xl text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-on-surface uppercase text-[11px]">
                          {act.event_type}
                        </span>
                        <span className="text-[10px] font-mono text-outline">{act.timestamp ? new Date(act.timestamp).toLocaleString() : "Recent"}</span>
                      </div>
                      <p className="text-on-surface-variant font-mono text-[11px] mt-1 bg-surface-container p-2 rounded">
                        {JSON.stringify(act.details)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: Incidents */}
          {activeTab === "incidents" && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-xs">
              <div className="p-4 border-b border-outline-variant bg-surface-bright flex justify-between items-center">
                <h3 className="text-xs font-bold text-on-surface">Formal Security Incidents ({incidents.length})</h3>
                <button
                  onClick={() => setShowIncidentModal(true)}
                  className="px-3 py-1 bg-error text-white text-xs font-semibold rounded-lg hover:bg-red-700"
                >
                  Open New Case
                </button>
              </div>

              {incidents.length === 0 ? (
                <div className="p-8 text-center text-secondary text-xs">
                  No security incident cases currently open for {profile.employee_name}.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-surface-container-low border-b border-outline-variant text-[10px] uppercase font-bold text-outline">
                        <th className="p-3 pl-4">Incident ID</th>
                        <th className="p-3">Severity</th>
                        <th className="p-3">Summary</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Created</th>
                        <th className="p-3 pr-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {incidents.map((inc) => (
                        <tr key={inc.id} className="hover:bg-surface-container-low">
                          <td className="p-3 pl-4 font-mono font-bold text-primary">INC-{inc.id}</td>
                          <td className="p-3"><RiskBadge level={inc.severity} /></td>
                          <td className="p-3 font-semibold text-on-surface">{inc.summary}</td>
                          <td className="p-3"><RiskBadge status={inc.status} /></td>
                          <td className="p-3 font-mono text-outline">{inc.created_at ? new Date(inc.created_at).toLocaleDateString() : "—"}</td>
                          <td className="p-3 pr-4 text-right">
                            <Link
                              href={`/incidents/${inc.id}`}
                              className="px-2.5 py-1 bg-primary text-white text-[11px] font-semibold rounded hover:bg-primary-container"
                            >
                              Open Case
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: Alerts */}
          {activeTab === "alerts" && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-xs">
              <div className="p-4 border-b border-outline-variant bg-surface-bright flex justify-between items-center">
                <h3 className="text-xs font-bold text-on-surface">Security Alerts ({alerts.length})</h3>
              </div>

              {alerts.length === 0 ? (
                <div className="p-8 text-center text-secondary text-xs">
                  No security alerts flagged for {profile.employee_name}.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-surface-container-low border-b border-outline-variant text-[10px] uppercase font-bold text-outline">
                        <th className="p-3 pl-4">Alert ID</th>
                        <th className="p-3">Severity</th>
                        <th className="p-3">Alert Message</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Linked Incident</th>
                        <th className="p-3 pr-4 text-right">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {alerts.map((alt) => (
                        <tr key={alt.id} className="hover:bg-surface-container-low">
                          <td className="p-3 pl-4 font-mono font-bold text-primary">ALT-{alt.id}</td>
                          <td className="p-3"><RiskBadge level={alt.severity} /></td>
                          <td className="p-3 font-semibold text-on-surface">{alt.message}</td>
                          <td className="p-3"><RiskBadge status={alt.status} /></td>
                          <td className="p-3 font-mono text-secondary">
                            {alt.incident_id ? (
                              <Link href={`/incidents/${alt.incident_id}`} className="text-primary underline">
                                INC-{alt.incident_id}
                              </Link>
                            ) : (
                              "None"
                            )}
                          </td>
                          <td className="p-3 pr-4 text-right font-mono text-outline">
                            {alt.created_at ? new Date(alt.created_at).toLocaleTimeString() : "Recent"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Create Incident Modal */}
          {showIncidentModal && (
            <div className="fixed inset-0 w-screen h-screen z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant max-w-lg w-full p-6 shadow-2xl relative my-auto animate-toast-slide-in">
                <div className="flex justify-between items-center border-b border-outline-variant pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-error text-[22px]">gavel</span>
                    <h3 className="font-bold text-sm text-on-surface">
                      Open Security Incident Case
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowIncidentModal(false)}
                    className="p-1 text-secondary hover:bg-surface-container rounded-lg"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>

                <form onSubmit={handleCreateIncident} className="space-y-4 text-xs">
                  <div>
                    <label className="font-bold text-secondary block mb-1">Target Subject Employee</label>
                    <input
                      type="text"
                      disabled
                      value={`${profile.employee_name} (${profile.employee_id}) — ${profile.department}`}
                      className="w-full p-2.5 bg-surface-container border border-outline-variant rounded-lg font-semibold text-on-surface"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-secondary block mb-1">Incident Severity Level</label>
                    <select
                      value={incSeverity}
                      onChange={(e) => setIncSeverity(e.target.value)}
                      className="w-full p-2.5 bg-surface-container-low border border-outline-variant rounded-lg font-bold text-on-surface outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="CRITICAL">CRITICAL (Immediate Containment Required)</option>
                      <option value="HIGH">HIGH (Escalated Priority Investigation)</option>
                      <option value="MEDIUM">MEDIUM (Standard Security Triage)</option>
                      <option value="LOW">LOW (Informational Case)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-secondary block mb-1">Incident Executive Summary &amp; Scope</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Describe the detected anomalous activity, indicators of compromise, and required investigation steps..."
                      value={incSummary}
                      onChange={(e) => setIncSummary(e.target.value)}
                      className="w-full p-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-on-surface outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="pt-3 border-t border-outline-variant flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowIncidentModal(false)}
                      className="px-3.5 py-2 bg-surface-container-low text-secondary font-semibold rounded-lg hover:bg-surface-container"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={incSubmitting}
                      className="px-4 py-2 bg-error text-white font-bold rounded-lg hover:bg-red-700 transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">gavel</span>
                      {incSubmitting ? "Creating Case..." : "Initiate Formal Investigation"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </AppLayout>
    </RoleGuard>
  );
}
