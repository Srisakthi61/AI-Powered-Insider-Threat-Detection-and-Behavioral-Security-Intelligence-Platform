"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, ROLE_CONFIG } from "../context/AuthContext";

export default function Sidebar({ mobileOpen = false, onClose = () => {} }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const currentRole = user?.role || "security_analyst";
  const currentRoleConfig = ROLE_CONFIG[currentRole] || {
    title: "Security Analyst",
    dashboard: "/dashboard/analyst",
  };

  // Role-based navigation items
  const allNavItems = [
    {
      label: "Overview",
      icon: "dashboard",
      href: currentRoleConfig.dashboard,
      pattern: /^\/(dashboard(\/.*)?)?$/,
      roles: ["security_analyst", "security_manager", "soc_engineer", "admin"],
    },
    {
      label: "Monitoring",
      icon: "visibility",
      href: "/logs",
      pattern: /^\/logs/,
      roles: ["security_analyst", "soc_engineer", "admin"],
    },
    {
      label: "Alerts",
      icon: "notifications",
      href: "/alerts",
      pattern: /^\/alerts/,
      roles: ["security_analyst", "security_manager", "soc_engineer", "admin"],
    },
    {
      label: "Incidents",
      icon: "security",
      href: "/incidents",
      pattern: /^\/incidents/,
      roles: ["security_analyst", "security_manager", "soc_engineer", "admin"],
    },
    {
      label: "Employees",
      icon: "badge",
      href: "/employees",
      pattern: /^\/employees/,
      roles: ["security_analyst", "security_manager", "soc_engineer", "admin"],
    },
    {
      label: "Anomalies",
      icon: "troubleshoot",
      href: "/anomalies",
      pattern: /^\/anomalies/,
      roles: ["security_analyst", "security_manager", "soc_engineer", "admin"],
    },
    {
      label: "Reporting",
      icon: "assessment",
      href: "/reports",
      pattern: /^\/reports/,
      roles: ["security_manager", "admin"],
    },
    {
      label: "Administration",
      icon: "admin_panel_settings",
      href: "/admin",
      pattern: /^\/admin/,
      roles: ["admin"],
    },
  ];

  const visibleNavItems = allNavItems.filter((item) =>
    item.roles.includes(currentRole)
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-on-surface/40 backdrop-blur-xs z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-surface-container-low border-r border-outline-variant flex flex-col p-md gap-base z-30 transition-transform duration-200 ease-in-out md:translate-x-0 ${
          mobileOpen ? "translate-x-0 !z-45" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center gap-sm mb-md px-sm">
          <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center text-on-primary-container shadow-xs">
            <span className="material-symbols-outlined text-[24px]">shield</span>
          </div>
          <div>
            <div className="font-section-title text-section-title text-on-surface leading-tight">
              ITBIS
            </div>
            <div className="text-xs text-on-surface-variant font-medium">
              Threat Intel
            </div>
          </div>
        </div>

        {/* Authenticated Persona Badge (Static, strictly read-only) */}
        <div className="px-sm pb-md mb-xs">
          <div className="p-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl">
            <div className="text-[10px] uppercase font-bold text-outline tracking-wider">
              Assigned Role
            </div>
            <div className="font-bold text-xs text-primary mt-0.5">
              {currentRoleConfig.title}
            </div>
            <div className="text-[10px] text-secondary truncate mt-0.5">
              {user?.email || `${currentRole}@itbis.com`}
            </div>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 flex flex-col gap-1 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const isActive = item.pattern.test(pathname);
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-md px-md py-2 rounded-lg font-label-caps text-label-caps transition-all duration-150 cursor-pointer active:scale-95 ${
                  isActive
                    ? "bg-secondary-container text-on-secondary-container font-bold shadow-xs"
                    : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                }`}
              >
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Navigation */}
        <div className="mt-auto flex flex-col gap-1 border-t border-outline-variant pt-sm">

          <button
            onClick={logout}
            className="flex items-center gap-md px-md py-2 rounded-lg text-on-surface-variant hover:bg-error-container hover:text-error font-label-caps text-label-caps transition-all text-left w-full cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
