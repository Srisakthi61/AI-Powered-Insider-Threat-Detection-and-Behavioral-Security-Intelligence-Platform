"use client";

import React, { useState } from "react";
import RiskBadge from "./RiskBadge";

export default function RadarScanner({
  employees = [],
  flaggedCount = 0,
  onSelectEmployee = () => {},
}) {
  const [hoveredEmp, setHoveredEmp] = useState(null);

  // Position employees in circular radar coordinates based on anomaly score and index
  const blips = employees.map((emp, idx) => {
    const score = typeof emp.anomaly_score === "number" ? emp.anomaly_score : 0.15;
    const isOutlier = emp.is_outlier || emp.risk_level === "Critical" || emp.risk_level === "High";

    // Distance from center: higher threat / negative score = further out into danger perimeter
    let distancePercent;
    if (emp.risk_level === "Critical" || score < -0.05) {
      distancePercent = 78 + (idx % 3) * 6; // 78% - 90% radius
    } else if (emp.risk_level === "High" || isOutlier) {
      distancePercent = 60 + (idx % 3) * 6; // 60% - 72%
    } else if (emp.risk_level === "Medium" || score < 0.08) {
      distancePercent = 40 + (idx % 3) * 5; // 40% - 50%
    } else {
      distancePercent = 15 + (idx % 4) * 5; // Safe center core 15% - 30%
    }

    // Angle in degrees distributed evenly around the 360 circle
    const angle = (idx * (360 / Math.max(employees.length, 1)) + 45) * (Math.PI / 180);
    const x = 50 + (distancePercent / 2) * Math.cos(angle);
    const y = 50 + (distancePercent / 2) * Math.sin(angle);

    return {
      ...emp,
      x,
      y,
      isOutlier,
      color:
        emp.risk_level === "Critical"
          ? "#ba1a1a"
          : emp.risk_level === "High"
          ? "#bc4800"
          : emp.risk_level === "Medium"
          ? "#d97706"
          : "#16a34a",
    };
  });

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-xs flex flex-col">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant pb-3 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse-emerald" />
            <h3 className="font-card-title text-card-title text-on-surface text-sm font-bold flex items-center gap-1.5">
              Isolation Forest Threat Radar
            </h3>
            <span className="text-[10px] bg-primary/10 text-primary font-mono font-bold px-2 py-0.5 rounded-full border border-primary/20">
              15-D Spatial Projection
            </span>
          </div>
          <p className="text-[11px] text-secondary mt-0.5">
            Radial distance corresponds to anomaly severity and multi-indicator drift.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-error">
            <span className="w-2.5 h-2.5 rounded-full bg-error animate-pulse" />
            <span>{flaggedCount} Outliers Flagged</span>
          </div>
          <div className="h-4 w-px bg-outline-variant hidden sm:block" />
          <div className="text-[11px] text-secondary font-mono">
            Radar Sweep: <strong className="text-emerald-600">Active</strong>
          </div>
        </div>
      </div>

      {/* Main Radar Screen */}
      <div className="relative w-full aspect-square max-w-[420px] mx-auto my-2 rounded-full bg-[#0a0f1d] border-2 border-primary/30 overflow-hidden shadow-inner flex items-center justify-center select-none">
        {/* Radar Concentric Rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Ring 1 - Outer Danger Perimeter (80%) */}
          <div className="w-[85%] h-[85%] rounded-full border border-red-500/20 absolute flex items-start justify-center">
            <span className="text-[8px] font-mono text-red-400/60 uppercase tracking-widest mt-1">
              Critical Perimeter (&gt;2.5σ)
            </span>
          </div>
          {/* Ring 2 - High Risk Drift (60%) */}
          <div className="w-[62%] h-[62%] rounded-full border border-amber-500/25 absolute flex items-start justify-center">
            <span className="text-[8px] font-mono text-amber-400/60 uppercase tracking-widest mt-0.5">
              Warning Band
            </span>
          </div>
          {/* Ring 3 - Medium Baseline Boundary (40%) */}
          <div className="w-[40%] h-[40%] rounded-full border border-cyan-500/20 border-dashed absolute" />
          {/* Ring 4 - Safe Core Inliers (20%) */}
          <div className="w-[18%] h-[18%] rounded-full border border-emerald-500/30 bg-emerald-500/5 absolute flex items-center justify-center">
            <span className="text-[7px] font-mono text-emerald-400 font-bold">CORE</span>
          </div>

          {/* Crosshairs */}
          <div className="w-full h-px bg-primary/20 absolute" />
          <div className="h-full w-px bg-primary/20 absolute" />
          <div className="w-full h-px bg-primary/10 rotate-45 absolute" />
          <div className="w-full h-px bg-primary/10 -rotate-45 absolute" />
        </div>

        {/* Rotating Radar Sweep Beam */}
        <div
          className="absolute inset-0 animate-radar-sweep pointer-events-none"
          style={{
            background:
              "conic-gradient(from 0deg at 50% 50%, rgba(0, 240, 255, 0.28) 0deg, rgba(0, 240, 255, 0.05) 45deg, transparent 60deg, transparent 360deg)",
          }}
        />

        {/* Monitored Employee Target Blips */}
        {blips.map((blip) => {
          const isSelected = hoveredEmp?.employee_id === blip.employee_id;
          return (
            <div
              key={blip.employee_id}
              onClick={() => onSelectEmployee(blip.employee_id)}
              onMouseEnter={() => setHoveredEmp(blip)}
              onMouseLeave={() => setHoveredEmp(null)}
              style={{
                left: `${blip.x}%`,
                top: `${blip.y}%`,
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 group"
            >
              {/* Outer Pulse Ring for Outliers */}
              {blip.isOutlier && (
                <span className="absolute -inset-1.5 rounded-full bg-error/40 animate-ping" />
              )}

              {/* Dot Center */}
              <div
                style={{ backgroundColor: blip.color }}
                className={`w-3.5 h-3.5 rounded-full border-2 border-white shadow-md transition-transform duration-150 ${
                  isSelected ? "scale-150 ring-2 ring-cyan-400" : "group-hover:scale-125"
                }`}
              />

              {/* Permanent Small Code Tag for Outliers */}
              {blip.isOutlier && (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-black/80 text-[8px] font-mono font-bold text-red-300 px-1 rounded shadow pointer-events-none whitespace-nowrap">
                  {blip.employee_id}
                </span>
              )}
            </div>
          );
        })}

        {/* Hover / Selection HUD Tooltip */}
        {hoveredEmp && (
          <div className="absolute bottom-2 left-2 right-2 bg-[#0d1527]/95 border border-primary/40 text-white rounded-lg p-2.5 z-30 shadow-2xl backdrop-blur-sm pointer-events-none text-left">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-bold text-xs text-cyan-300 flex items-center gap-1">
                  <span>{hoveredEmp.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">({hoveredEmp.employee_id})</span>
                </div>
                <div className="text-[10px] text-slate-300">
                  {hoveredEmp.department} Department • {hoveredEmp.designation}
                </div>
              </div>
              <RiskBadge level={hoveredEmp.risk_level || (hoveredEmp.is_outlier ? "Critical" : "Low")} />
            </div>

            <div className="mt-1.5 pt-1 border-t border-slate-700/60 flex justify-between items-center text-[10px] font-mono">
              <span className="text-slate-400">
                Score: <strong className={hoveredEmp.anomaly_score < 0 ? "text-red-400" : "text-emerald-400"}>{hoveredEmp.anomaly_score}</strong>
              </span>
              <span className="text-slate-400">
                Rank: <strong className="text-white">#{hoveredEmp.threat_rank || 1}</strong>
              </span>
              <span className="text-cyan-400 font-bold truncate max-w-[140px]">
                {hoveredEmp.target_role_title || "Security Analyst"}
              </span>
            </div>

            {hoveredEmp.primary_reason && (
              <div className="text-[9px] text-red-300 mt-1 truncate">
                ⚠️ {hoveredEmp.primary_reason}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend Footer */}
      <div className="grid grid-cols-4 gap-2 pt-2 border-t border-outline-variant text-center text-[10px] font-semibold">
        <div className="flex items-center justify-center gap-1 text-emerald-700">
          <span className="w-2 h-2 rounded-full bg-emerald-600" />
          <span>Core Inliers</span>
        </div>
        <div className="flex items-center justify-center gap-1 text-amber-700">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>Medium Drift</span>
        </div>
        <div className="flex items-center justify-center gap-1 text-orange-700">
          <span className="w-2 h-2 rounded-full bg-orange-600" />
          <span>High Anomaly</span>
        </div>
        <div className="flex items-center justify-center gap-1 text-error">
          <span className="w-2 h-2 rounded-full bg-error animate-pulse" />
          <span>Critical Outlier</span>
        </div>
      </div>
    </div>
  );
}
