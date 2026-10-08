"use client";

import React, { useState, useEffect } from "react";
import RiskBadge from "./RiskBadge";
import Link from "next/link";
import { formatThreatTitle, formatThreatDescription } from "../lib/threatFormatting";

// Web Audio API synthesized alert sound generator
function playAlertChime(isCritical = true) {
  try {
    if (typeof window === "undefined") return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = isCritical ? "sawtooth" : "sine";
    osc.frequency.setValueAtTime(isCritical ? 880 : 587.33, ctx.currentTime); // A5 or D5
    osc.frequency.exponentialRampToValueAtTime(isCritical ? 1320 : 880, ctx.currentTime + 0.15); // Ramp up

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (err) {
    // Audio context may be restricted by browser policy before first user interaction
  }
}

export default function RealtimeAlertNotification({
  alert = null,
  onDismiss = () => {},
  soundEnabled = false,
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (alert) {
      setVisible(true);
      if (soundEnabled) {
        playAlertChime(true);
      }

      const timer = setTimeout(() => {
        setVisible(false);
        onDismiss();
      }, 9000);

      return () => clearTimeout(timer);
    }
  }, [alert, soundEnabled]);

  if (!visible || !alert) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "5rem",
        right: "1.25rem",
        left: "auto",
        maxWidth: "min(28rem, calc(100vw - 2.5rem))",
        width: "100%",
        boxSizing: "border-box",
        zIndex: 100000,
      }}
      className="animate-toast-slide-in pointer-events-auto"
    >
      <div
        style={{
          backgroundColor: "#450a0a",
          borderColor: "#ef4444",
          color: "#ffffff",
          boxShadow: "0 20px 25px -5px rgba(185, 28, 28, 0.5), 0 8px 10px -6px rgba(185, 28, 28, 0.5)",
        }}
        className="rounded-xl border border-red-500 bg-red-950 text-white p-4 shadow-2xl backdrop-blur-md transition-all box-border overflow-hidden"
      >
        {/* Top bar with alert badge and close */}
        <div className="flex items-center justify-between gap-2 border-b border-white/15 pb-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-400 flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">
                crisis_alert
              </span>
              REAL-TIME THREAT DETECTED
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <RiskBadge level={alert.severity || "Critical"} />
            <button
              onClick={() => {
                setVisible(false);
                onDismiss();
              }}
              className="text-white/70 hover:text-white p-0.5 rounded cursor-pointer"
              aria-label="Close Notification"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* Message and responder */}
        <div className="space-y-1.5">
          <h4 className="font-bold text-sm leading-snug text-white">
            {formatThreatTitle(alert.alert_message || alert.message || alert.title)}
          </h4>
          <p className="text-xs text-white/90 leading-snug">
            {formatThreatDescription(alert.alert_message || alert.message || alert.title, alert.details)}
          </p>

          <div className="text-xs text-white/90 flex items-center gap-2">
            <span>Subject:</span>
            <strong className="font-mono text-cyan-300">
              {alert.employee_name || alert.name || alert.employee_id || alert.employee_code} ({alert.employee_id || alert.employee_code || "EMP"})
            </strong>
            {alert.department && <span>• {alert.department}</span>}
          </div>

          {/* Stakeholder Target Badge */}
          <div className="mt-2 pt-1 border-t border-white/15 flex items-center justify-between text-[11px]">
            <span className="text-white/70">Suggested Owner:</span>
            <span className="bg-primary text-white px-2 py-0.5 rounded font-bold text-[10px] tracking-wide border border-white/20">
              👤 {alert.target_role_title || "Security Analyst"}
            </span>
          </div>

          {alert.recommended_action && (
            <p className="text-[11px] text-amber-200 italic bg-black/40 p-2 rounded border border-white/10 mt-1">
              ⚡ Action: {alert.recommended_action}
            </p>
          )}
        </div>

        {/* Action button */}
        <div className="mt-3 flex justify-end gap-2">
          <Link
            href="/alerts"
            onClick={() => {
              setVisible(false);
              onDismiss();
            }}
            className="bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1 shadow cursor-pointer border border-white/20"
          >
            <span>Open Investigation Queue</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
