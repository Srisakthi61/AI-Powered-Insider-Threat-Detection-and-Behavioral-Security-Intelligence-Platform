"use client";

import React from "react";

export default function MetricCard({
  title,
  value,
  trend,
  trendType = "neutral", // "up-danger", "up-good", "down-good", "down-danger", "neutral"
  icon,
  iconBg = "bg-primary-fixed",
  iconColor = "text-primary",
  description,
  variant = "default", // "default", "danger", "warning"
}) {
  let cardStyles = "bg-surface-container-lowest border-outline-variant";
  if (variant === "danger") {
    cardStyles = "bg-error/5 border-error/20";
  } else if (variant === "warning") {
    cardStyles = "bg-tertiary/5 border-tertiary/20";
  }

  return (
    <div
      className={`border rounded-xl p-md flex flex-col justify-between shadow-sm hover:shadow transition-all ${cardStyles}`}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-on-surface-variant font-card-title text-sm">
          {title}
        </span>
        {icon && (
          <div
            className={`w-8 h-8 rounded-full ${iconBg} flex items-center justify-center shrink-0`}
          >
            <span className={`material-symbols-outlined text-sm ${iconColor}`}>
              {icon}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-end justify-between mt-1">
        <div className="text-3xl font-bold text-on-surface tracking-tight">
          {value}
        </div>
        {trend && (
          <span
            className={`text-xs font-semibold flex items-center gap-1 ${
              trendType === "up-danger" || trendType === "down-danger"
                ? "text-error"
                : trendType === "up-good" || trendType === "down-good"
                ? "text-primary"
                : "text-secondary"
            }`}
          >
            {trendType.startsWith("up") && (
              <span className="material-symbols-outlined text-[14px]">
                arrow_upward
              </span>
            )}
            {trendType.startsWith("down") && (
              <span className="material-symbols-outlined text-[14px]">
                arrow_downward
              </span>
            )}
            {trend}
          </span>
        )}
      </div>

      {description && (
        <p className="text-body-sm text-secondary mt-2 text-[12px]">
          {description}
        </p>
      )}
    </div>
  );
}
