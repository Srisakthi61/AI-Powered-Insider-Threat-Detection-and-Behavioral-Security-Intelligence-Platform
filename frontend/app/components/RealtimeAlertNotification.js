"use client";

import React, { useState, useEffect } from "react";
import RiskBadge from "./RiskBadge";
import Link from "next/link";

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
  soundEnabled = true,
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (alert) {
      setVisible(true);
      if (soundEnabled) {
        playAlertChime(alert.severity?.toLowerCase() === "critical");
      }

      const timer = setTimeout(() => {
        setVisible(false);
        onDismiss();
      }, 9000);

      return () => clearTimeout(timer);
    }
  }, [alert, soundEnabled]);

  if (!visible || !alert) return null;

  const isCritical = (alert.severity || "").toLowerCase() === "critical";

  return (
    <div className="fixed top-20 right-4 z-[100000] max-w-md w-full animate-toast-slide-in">
      <div
        className={`rounded-xl border p-4 shadow-2xl backdrop-blur-md transition-all ${
          isCritical
            ? "bg-red-950/90 border-red-500 text-white shadow-red-900/50"
            : "bg-surface-container-lowest/95 border-amber-500/80 text-on-surface shadow-amber-900/20"
        }`}
      >
        {/* Top bar with alert badge and close */}
        <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2 mb-2">
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                isCritical ? "bg-red-500 animate-ping" : "bg-amber-500 animate-pulse"
              }`}
            />
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-400 flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">
                {isCritical ? "crisis_alert" : "warning"}
              </span>
              REAL-TIME ML THREAT DETECTED
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <RiskBadge level={alert.severity || "High"} />
            <button
              onClick={() => {
                setVisible(false);
                onDismiss();
              }}
              className="text-white/60 hover:text-white p-0.5 rounded cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* Message and target persona */}
        <div className="space-y-1.5">
          <h4 className="font-bold text-sm leading-snug">
            {alert.alert_message || alert.message || "Behavioral Anomaly Triggered"}
          </h4>

          <div className="text-xs opacity-90 flex items-center gap-2">
            <span>Subject:</span>
            <strong className="font-mono text-cyan-300">
              {alert.employee_name || alert.employee_id} ({alert.employee_id || "EMP"})
            </strong>
            {alert.department && <span>• {alert.department}</span>}
          </div>

          {/* Stakeholder Target Badge */}
          <div className="mt-2 pt-1 border-t border-white/10 flex items-center justify-between text-[11px]">
            <span className="text-white/70">Dispatched To:</span>
            <span className="bg-primary-container text-white px-2 py-0.5 rounded font-bold text-[10px] tracking-wide">
              👤 {alert.target_role_title || "Security Analyst"}
            </span>
          </div>

          {alert.recommended_action && (
            <p className="text-[11px] text-amber-200/90 italic bg-black/30 p-2 rounded border border-white/5 mt-1">
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
            className="bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-primary-container transition-colors flex items-center gap-1 shadow cursor-pointer"
          >
            <span>Open Investigation Queue</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
