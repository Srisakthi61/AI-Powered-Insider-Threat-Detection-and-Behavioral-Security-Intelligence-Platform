"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth, ROLE_CONFIG } from "../context/AuthContext";
import { useSimulation } from "../context/SimulationContext";
import RealtimeAlertNotification from "./RealtimeAlertNotification";

const THREAT_SCENARIOS = [
  {
    id: "usb_exfiltration",
    title: "1. Mass USB Data Exfiltration",
    metric: "6.5 GB Bulk Copied",
    desc: "Unauthorized SanDisk 128GB flash drive connected to engineering workstation. 48 classified files copied.",
    target: "SOC Incident Response",
    badgeStyle: "bg-red-100 text-red-800 border-red-300",
    icon: "usb",
    accent: "border-red-500/40 bg-red-50/40",
  },
  {
    id: "sudo_privilege_abuse",
    title: "2. Unauthorized Sudo Root Escalation",
    metric: "Root Shell Execution",
    desc: "Terminal bash execution attempt against /etc/shadow and root cluster IAM role binding tampering.",
    target: "System Administrator",
    badgeStyle: "bg-amber-100 text-amber-800 border-amber-300",
    icon: "terminal",
    accent: "border-amber-500/40 bg-amber-50/40",
  },
  {
    id: "off_hours_mfa_attack",
    title: "3. Off-Hours Brute-Force Login Drift",
    metric: "03:15 AM Anomalous Login",
    desc: "12 consecutive failed MFA authentication drifts from external Kali Linux node outside standard work hours.",
    target: "Department Manager",
    badgeStyle: "bg-blue-100 text-blue-800 border-blue-300",
    icon: "schedule",
    accent: "border-blue-500/40 bg-blue-50/40",
  },
  {
    id: "cloud_data_dump",
    title: "4. High-Volume External SFTP Dump",
    metric: "4.2 GB Bulk Egress",
    desc: "Mass outbound data egress transfer stream to unauthorized external staging cloud server destination.",
    target: "Security Analyst",
    badgeStyle: "bg-purple-100 text-purple-800 border-purple-300",
    icon: "cloud_upload",
    accent: "border-purple-500/40 bg-purple-50/40",
  },
];

const TARGET_EMPLOYEES = [
  { id: "EMP1007", name: "John Doe", dept: "Engineering", role: "DevOps Engineer" },
  { id: "EMP1008", name: "Alex Johnson", dept: "Sales", role: "Account Executive" },
  { id: "EMP1011", name: "Robert Jones", dept: "Engineering", role: "Backend Developer" },
  { id: "EMP1002", name: "Jane Doe", dept: "Marketing", role: "Growth Lead" },
  { id: "EMP1005", name: "Sarah Connor", dept: "Engineering", role: "Security Architect" },
];

export default function Header({ onToggleSidebar = () => {} }) {
  const { user, logout } = useAuth();
  const {
    isSimulated,
    simLoading,
    targetedAlerts,
    realtimeAlert,
    soundEnabled,
    setSoundEnabled,
    showSimModal,
    openSimModal,
    closeSimModal,
    triggerSimulation,
    resetSimulation,
  } = useSimulation();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [simScenario, setSimScenario] = useState("usb_exfiltration");
  const [simEmpId, setSimEmpId] = useState("EMP1007");
  const [simError, setSimError] = useState(null);

  const currentRole = user?.role || "security_analyst";
  const roleTitle = ROLE_CONFIG[currentRole]?.title || "Security Analyst";

  const handleSimulateSubmit = async (e) => {
    if (e) e.preventDefault();
    setSimError(null);
    const result = await triggerSimulation({
      scenario: simScenario,
      employeeId: simEmpId,
    });
    if (!result.success) {
      setSimError(result.error);
    }
  };

  return (
    <>
      <header className="flex items-center justify-between px-4 md:px-6 h-16 w-full sticky top-0 z-40 bg-surface border-b border-outline-variant shadow-2xs">
        {/* Left: Mobile Toggle & Brand/Search */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-1.5 text-on-surface hover:bg-surface-container rounded-lg cursor-pointer"
            aria-label="Toggle Navigation"
          >
            <span className="material-symbols-outlined text-[24px]">menu</span>
          </button>

          <Link
            href="/dashboard"
            className="font-page-title text-page-title text-primary tracking-tight md:hidden flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-primary text-[22px]">
              shield
            </span>
            ITBIS
          </Link>
        </div>

        {/* Center: Live Monitoring Status Bar & Search Bar */}
        <div className="flex-1 max-w-3xl mx-2 sm:mx-4 md:mx-6 flex items-center gap-3">
          {/* Live Radar Pulse Indicator */}
          <div className="hidden lg:flex items-center gap-2 bg-surface-container-low border border-outline-variant px-3 py-1.5 rounded-xl text-xs shrink-0 shadow-2xs">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isSimulated
                  ? "bg-emerald-500 animate-pulse-emerald"
                  : "bg-secondary/60 animate-pulse"
              }`}
            />
            <span className="font-mono font-bold text-[11px] text-on-surface">
              {isSimulated ? "ML THREAT RADAR ACTIVE" : "AI RADAR STANDBY"}
            </span>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                isSimulated
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-surface-container-high text-secondary"
              }`}
            >
              {isSimulated ? "15-D Active" : "Standby"}
            </span>
          </div>

          <div className="w-full flex items-center bg-surface-container-low hover:bg-surface-container-high/50 rounded-xl px-3.5 py-1.5 border border-outline-variant focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 focus-within:bg-surface-container-lowest transition-all">
            <span className="material-symbols-outlined text-outline text-[20px] shrink-0">
              search
            </span>
            <input
              className="bg-transparent border-none focus:outline-none focus:ring-0 text-xs text-on-surface w-full ml-2 placeholder:text-outline/70"
              placeholder="Search anomalies, employee IDs, exfiltration events, ML alerts..."
              type="text"
            />
          </div>
        </div>

        {/* Right: Actions & User Persona */}
        <div className="flex items-center gap-2 md:gap-3 relative shrink-0">
          {/* Dashboard Switcher */}
          <div className="hidden lg:flex items-center gap-1 bg-surface-container-low border border-outline-variant p-0.5 rounded-lg text-[11px] font-medium">
            <Link
              href="/dashboard/analyst"
              className="px-2 py-1 rounded hover:bg-surface-container text-secondary hover:text-on-surface transition-colors"
              title="Analyst Dashboard"
            >
              Analyst
            </Link>
            <Link
              href="/dashboard/soc"
              className="px-2 py-1 rounded hover:bg-surface-container text-secondary hover:text-on-surface transition-colors"
              title="SOC Stream"
            >
              SOC
            </Link>
            <Link
              href="/dashboard/manager"
              className="px-2 py-1 rounded hover:bg-surface-container text-secondary hover:text-on-surface transition-colors"
              title="Manager Posture"
            >
              Manager
            </Link>
            <Link
              href="/dashboard/admin"
              className="px-2 py-1 rounded hover:bg-surface-container text-secondary hover:text-on-surface transition-colors"
              title="Admin Telemetry"
            >
              Admin
            </Link>
          </div>

          {/* Real-time Threat Trigger Quick Button */}
          <button
            onClick={openSimModal}
            disabled={simLoading}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl cursor-pointer transition-all active:scale-95 shadow-xs ${
              simLoading
                ? "bg-primary/70 text-white cursor-not-allowed opacity-80"
                : isSimulated
                ? "bg-primary text-white hover:bg-primary-container"
                : "bg-error text-white hover:bg-red-700 shadow-md animate-pulse"
            }`}
            title={
              simLoading
                ? "Executing AI threat pipeline..."
                : isSimulated
                ? "Simulated threat scenario active"
                : "Inject simulated threat event & run AI Isolation Forest model"
            }
          >
            <span
              className={`material-symbols-outlined text-[17px] ${
                simLoading ? "animate-spin" : ""
              }`}
            >
              {simLoading ? "progress_activity" : isSimulated ? "psychology" : "bolt"}
            </span>
            <span className="font-semibold">
              {simLoading ? "Simulating..." : isSimulated ? "Threat Active" : "Simulate Threat"}
            </span>
          </button>

          {/* Reset Dashboard button (visible if simulated) */}
          {isSimulated && (
            <button
              onClick={resetSimulation}
              className="flex items-center gap-1 text-[11px] font-semibold text-secondary hover:text-error bg-surface-container-low hover:bg-error-container/30 px-2.5 py-2 rounded-xl border border-outline-variant transition-colors cursor-pointer active:scale-95 shadow-xs"
              title="Reset dashboards to empty standby state"
            >
              <span className="material-symbols-outlined text-[14px]">restart_alt</span>
              <span>Reset</span>
            </button>
          )}

          {/* Notifications Dropdown (Targeted for Current Role) */}
          <div className="relative">
            <button
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors relative cursor-pointer active:opacity-80"
              title="Role-Targeted Alerts"
            >
              <span className="material-symbols-outlined text-[20px]">
                notifications
              </span>
              {targetedAlerts.length > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 bg-error text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
                  {targetedAlerts.length}
                </span>
              )}
            </button>

            {showNotifMenu && (
              <div className="absolute right-0 mt-2 w-88 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-2xl p-sm z-50 animate-toast-slide-in">
                <div className="flex justify-between items-center px-sm py-1.5 border-b border-outline-variant">
                  <div>
                    <span className="font-bold text-xs text-on-surface block">
                      Targeted for {roleTitle}
                    </span>
                    <span className="text-[10px] text-secondary">
                      {targetedAlerts.length} active alerts routed to your persona
                    </span>
                  </div>
                  <Link
                    href="/alerts"
                    onClick={() => setShowNotifMenu(false)}
                    className="text-[10px] text-primary font-bold hover:underline"
                  >
                    View All Queue
                  </Link>
                </div>

                <div className="flex flex-col gap-1 mt-1 text-xs max-h-72 overflow-y-auto">
                  {targetedAlerts.length === 0 ? (
                    <div className="p-4 text-center text-secondary text-xs">
                      No active alerts targeted for your role right now.
                      <p className="mt-1 text-[10px] text-secondary/80">
                        Use "Simulate Threat" in the header to trigger telemetry and model scan.
                      </p>
                    </div>
                  ) : (
                    targetedAlerts.slice(0, 5).map((a) => (
                      <Link
                        key={a.id}
                        href="/alerts"
                        onClick={() => setShowNotifMenu(false)}
                        className={`p-2 rounded-lg cursor-pointer transition-colors hover:bg-surface-container-low ${
                          a.severity === "Critical" ? "border-l-4 border-error" : ""
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-xs text-on-surface truncate pr-2">
                            {a.message}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                              a.severity === "Critical"
                                ? "bg-error-container text-error"
                                : "bg-secondary-container text-on-secondary-container"
                            }`}
                          >
                            {a.severity}
                          </span>
                        </div>
                        <div className="text-secondary text-[11px] mt-0.5">
                          {a.employee_name || `Emp #${a.employee_id}`} • {a.department || "Organization"}
                        </div>
                        <div className="text-[10px] text-primary font-mono mt-0.5">
                          Target: {a.target_role_title || roleTitle}
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-outline-variant mx-1" />

          {/* User Persona Profile & Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 cursor-pointer p-1 rounded-lg hover:bg-surface-container-low transition-colors"
            >
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-on-surface leading-tight">
                  {roleTitle}
                </div>
                <div className="text-[10px] text-emerald-600 font-semibold flex items-center justify-end gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Active
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary font-bold text-xs flex items-center justify-center border border-outline-variant shadow-xs">
                {roleTitle.slice(0, 2).toUpperCase()}
              </div>
              <span className="material-symbols-outlined text-outline text-[16px]">
                expand_more
              </span>
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl p-2 z-50 animate-toast-slide-in">
                <div className="px-3 py-2 border-b border-outline-variant">
                  <p className="text-xs font-bold text-on-surface">{roleTitle}</p>
                  <p className="text-[11px] text-secondary truncate">
                    {user?.email || `${currentRole}@itbis.com`}
                  </p>
                  <span className="inline-block mt-1 text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-secondary-container text-on-secondary-container">
                    {currentRole}
                  </span>
                </div>

                <div className="pt-1 mt-1">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      logout();
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-error hover:bg-error-container rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      logout
                    </span>
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Real-time Toast Component */}
      <RealtimeAlertNotification
        alert={realtimeAlert}
        soundEnabled={soundEnabled}
        onDismiss={() => setRealtimeAlert(null)}
      />

      {/* Global Quick Simulation Modal (Wide, full-featured dialog) */}
      {showSimModal && (
        <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col p-5 sm:p-7 shadow-2xl relative my-auto animate-toast-slide-in overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-outline-variant pb-3.5 mb-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-error-container flex items-center justify-center text-error shadow-xs shrink-0">
                  <span className="material-symbols-outlined text-[24px] animate-pulse">
                    crisis_alert
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-on-surface leading-tight">
                    Simulate Live Threat Event &amp; Run AI Risk Pipeline
                  </h3>
                  <p className="text-[11px] text-secondary mt-0.5">
                    Evaluates multi-dimensional behavioral indicators from database telemetry &amp; routes targeted alerts.
                  </p>
                </div>
              </div>
              <button
                onClick={closeSimModal}
                className="text-secondary hover:text-on-surface p-1.5 rounded-lg hover:bg-surface-container-low transition-colors cursor-pointer"
                aria-label="Close Modal"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSimulateSubmit} className="space-y-4 text-xs flex-1 overflow-y-auto pr-1">
              {simError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm shrink-0">error</span>
                  <span className="font-medium">{simError}</span>
                </div>
              )}

              {/* Target Employee Selection */}
              <div>
                <label className="font-bold text-on-surface block mb-1.5 text-xs">
                  1. Target Monitored Employee (Indexed in PostgreSQL):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {TARGET_EMPLOYEES.map((emp) => {
                    const isSelected = simEmpId === emp.id;
                    return (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => setSimEmpId(emp.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? "border-primary bg-primary/10 ring-2 ring-primary shadow-xs"
                            : "border-outline-variant hover:bg-surface-container-low bg-surface"
                        }`}
                      >
                        <div className="font-mono font-bold text-[11px] text-primary">{emp.id}</div>
                        <div className="font-bold text-xs text-on-surface mt-0.5 truncate">{emp.name}</div>
                        <div className="text-[10px] text-secondary truncate">{emp.dept}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Threat Scenario Selection: 2-Column Grid */}
              <div>
                <label className="font-bold text-on-surface block mb-1.5 text-xs">
                  2. Select Threat Scenario &amp; Targeted Persona Dispatch:
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {THREAT_SCENARIOS.map((s) => {
                    const isSelected = simScenario === s.id;
                    return (
                      <div
                        key={s.id}
                        onClick={() => setSimScenario(s.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? "ring-2 ring-primary border-primary bg-primary/5 shadow-xs"
                            : "border-outline-variant hover:bg-surface-container-low bg-surface"
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                  isSelected
                                    ? "border-primary bg-primary"
                                    : "border-outline"
                                }`}
                              >
                                {isSelected && (
                                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                )}
                              </div>
                              <span className="font-bold text-xs text-on-surface flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[16px] text-primary">
                                  {s.icon}
                                </span>
                                {s.title}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono font-bold text-error bg-error/10 px-1.5 py-0.5 rounded shrink-0">
                              {s.metric}
                            </span>
                          </div>

                          <p className="text-[11px] text-secondary mt-1 leading-snug pl-6">
                            {s.desc}
                          </p>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-outline-variant/60 flex items-center justify-between pl-6">
                          <span className="text-[10px] text-secondary">Role Recipient:</span>
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${s.badgeStyle}`}
                          >
                            👤 {s.target}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-outline-variant flex items-center justify-between gap-3 shrink-0">
                <button
                  type="button"
                  onClick={closeSimModal}
                  className="px-3.5 py-2 border border-outline-variant rounded-xl text-secondary font-semibold hover:bg-surface-container transition-colors cursor-pointer text-xs"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={simLoading}
                    className="px-4 py-2 bg-error text-white font-bold rounded-xl hover:bg-red-700 transition-all flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50 text-xs active:scale-95"
                  >
                    <span className={`material-symbols-outlined text-[17px] ${simLoading ? "animate-spin" : ""}`}>
                      {simLoading ? "progress_activity" : "crisis_alert"}
                    </span>
                    <span>{simLoading ? "Running Isolation Forest AI Model..." : "Trigger Live Threat & Run AI Scan"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
