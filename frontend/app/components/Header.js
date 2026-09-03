"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth, ROLE_CONFIG } from "../context/AuthContext";
import { systemApi } from "../lib/api";

export default function Header({ onToggleSidebar = () => {} }) {
  const { user, logout } = useAuth();
  const [systemOnline, setSystemOnline] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  useEffect(() => {
    // Check backend connection
    systemApi
      .health()
      .then(() => setSystemOnline(true))
      .catch(() => setSystemOnline(false));
  }, []);

  const currentRole = user?.role || "security_analyst";
  const roleTitle = ROLE_CONFIG[currentRole]?.title || "Security Analyst";

  return (
    <header className="flex items-center justify-between px-md md:px-lg h-16 w-full sticky top-0 z-40 bg-surface border-b border-outline-variant">
      {/* Left: Mobile Toggle & Brand/Search */}
      <div className="flex items-center gap-md">
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-1.5 text-on-surface hover:bg-surface-container rounded-lg"
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

        {/* Live Status Badge */}
        <div className="hidden sm:flex items-center gap-2 bg-surface-container-low px-3 py-1 rounded-full border border-outline-variant">
          <span
            className={`w-2 h-2 rounded-full ${
              systemOnline ? "bg-emerald-500 animate-pulse" : "bg-error"
            }`}
          />
          <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">
            {systemOnline
              ? "Live Status: Critical Monitoring Active"
              : "Backend Offline — Running Local Client"}
          </span>
        </div>
      </div>

      {/* Center: Search Bar */}
      <div className="hidden lg:flex items-center bg-surface-container-low rounded-lg px-sm py-1.5 border border-outline-variant w-full max-w-xs focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
        <span className="material-symbols-outlined text-outline text-[18px]">
          search
        </span>
        <input
          className="bg-transparent border-none focus:outline-none focus:ring-0 text-body-base text-on-surface w-full ml-2 placeholder-outline text-xs"
          placeholder="Search alerts, employees, IPs..."
          type="text"
        />
      </div>

      {/* Right: Actions & User Persona */}
      <div className="flex items-center gap-sm md:gap-md relative">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="p-1.5 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors relative cursor-pointer active:opacity-80"
            title="System Alerts"
          >
            <span className="material-symbols-outlined text-[20px]">
              notifications
            </span>
            <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full" />
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg p-sm z-50">
              <div className="flex justify-between items-center px-sm py-1 border-b border-outline-variant">
                <span className="font-semibold text-xs text-on-surface">
                  Notifications (3 New)
                </span>
                <span className="text-[10px] text-primary font-bold cursor-pointer">
                  Mark all read
                </span>
              </div>
              <div className="flex flex-col gap-1 mt-1 text-xs">
                <div className="p-2 hover:bg-surface-container-low rounded-lg cursor-pointer">
                  <div className="font-semibold text-error flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">
                      warning
                    </span>
                    Mass Data Exfiltration Detected
                  </div>
                  <div className="text-secondary text-[11px]">
                    EMP-1002 transferred 5GB via USB
                  </div>
                  <div className="text-[10px] text-outline mt-0.5">10m ago</div>
                </div>
                <div className="p-2 hover:bg-surface-container-low rounded-lg cursor-pointer">
                  <div className="font-semibold text-tertiary flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">
                      policy
                    </span>
                    Off-hours Sensitive DB Access
                  </div>
                  <div className="text-secondary text-[11px]">
                    EMP-1005 logged in at 03:15 AM
                  </div>
                  <div className="text-[10px] text-outline mt-0.5">45m ago</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Settings button (only for admin or manager) */}
        <Link
          href="/support"
          className="p-1.5 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors cursor-pointer active:opacity-80"
          title="System Guide & Specs"
        >
          <span className="material-symbols-outlined text-[20px]">settings</span>
        </Link>

        <div className="h-6 w-px bg-outline-variant mx-1" />

        {/* User Persona Profile & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-sm cursor-pointer p-1 rounded-lg hover:bg-surface-container-low transition-colors"
          >
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-on-surface leading-tight">
                {roleTitle}
              </div>
              <div className="text-[10px] text-emerald-600 font-semibold flex items-center justify-end gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Active Session
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
            <div className="absolute right-0 mt-2 w-56 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl p-2 z-50">
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
  );
}
