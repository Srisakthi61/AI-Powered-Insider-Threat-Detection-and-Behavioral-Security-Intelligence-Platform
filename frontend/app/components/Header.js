"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth, ROLE_CONFIG } from "../context/AuthContext";
import { useSimulation } from "../context/SimulationContext";
import RealtimeAlertNotification from "./RealtimeAlertNotification";
import { formatThreatTitle } from "../lib/threatFormatting";

export default function Header({ onToggleSidebar = () => {} }) {
  const { user, logout } = useAuth();
  const {
    isSimulated,
    simLoading,
    targetedAlerts,
    realtimeAlert,
    setRealtimeAlert,
    soundEnabled,
    setSoundEnabled,
    triggerSimulation,
    resetSimulation,
  } = useSimulation();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  const currentRole = user?.role || "security_analyst";
  const roleTitle = ROLE_CONFIG[currentRole]?.title || "Security Analyst";

  const handleSimulateClick = () => {
    triggerSimulation();
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
              placeholder="Search employees, alerts and activity..."
              type="text"
            />
          </div>
        </div>

        {/* Right: Actions & User Persona */}
        <div className="flex items-center gap-2 md:gap-3 relative shrink-0">

          {/* Real-time Threat Trigger Quick Button */}
          <button
            onClick={handleSimulateClick}
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
                : "Simulate security event & run AI threat detection"
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
                            {formatThreatTitle(a.message)}
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
    </>
  );
}
