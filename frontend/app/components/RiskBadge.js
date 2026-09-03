"use client";

import React from "react";

export default function RiskBadge({ level, status, className = "" }) {
  const normalized = (level || status || "").toString().toLowerCase().trim();

  let styles = "bg-secondary-container text-on-secondary-container";
  let dotColor = "bg-secondary";
  let label = level || status || "Unknown";

  if (normalized === "critical" || normalized === "critical alerts") {
    styles = "bg-error/10 text-error border border-error/20";
    dotColor = "bg-error";
    label = "Critical";
  } else if (normalized === "high" || normalized === "high risk") {
    styles = "bg-tertiary/10 text-tertiary border border-tertiary/20";
    dotColor = "bg-tertiary";
    label = "High";
  } else if (normalized === "medium") {
    styles = "bg-primary-fixed text-primary-container border border-primary/20";
    dotColor = "bg-primary";
    label = "Medium";
  } else if (normalized === "low" || normalized === "normal" || normalized === "stable") {
    styles = "bg-surface-container-high text-secondary border border-outline-variant";
    dotColor = "bg-secondary";
    label = "Low";
  } else if (normalized === "unassigned") {
    styles = "bg-error-container text-error font-bold";
    label = "UNASSIGNED";
  } else if (normalized === "investigating") {
    styles = "bg-secondary-container text-on-secondary-container font-bold";
    label = "INVESTIGATING";
  } else if (normalized === "resolved") {
    styles = "bg-surface-container text-on-surface-variant font-bold";
    label = "RESOLVED";
  } else if (normalized === "healthy" || normalized === "online") {
    styles = "bg-emerald-50 text-emerald-700 border border-emerald-200";
    dotColor = "bg-emerald-500";
    label = "Online";
  } else if (normalized === "warning") {
    styles = "bg-amber-50 text-amber-700 border border-amber-200";
    dotColor = "bg-amber-500";
    label = "Warning";
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase ${styles} ${className}`}
    >
      {dotColor && <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />}
      {label}
    </span>
  );
}
