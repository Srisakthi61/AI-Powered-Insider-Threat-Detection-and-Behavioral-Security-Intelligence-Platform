"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, ROLE_CONFIG } from "./context/AuthContext";
import { systemApi } from "./lib/api";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [backendStatus, setBackendStatus] = useState("Checking backend connection...");
  const [isOnline, setIsOnline] = useState(false);
  const router = useRouter();

  useEffect(() => {
    systemApi
      .health()
      .then((res) => {
        if (res?.status) {
          setBackendStatus(res.status);
          setIsOnline(true);
        }
      })
      .catch(() => {
        setBackendStatus("Backend offline (FastAPI port 8000)");
        setIsOnline(false);
      });
  }, []);

  const roles = [
    {
      key: "security_analyst",
      title: "Security Analyst",
      icon: "monitoring",
      desc: "Investigate behavioral anomalies, triage high-priority alerts, and review risk timelines.",
      badge: "Analyst",
      path: "/dashboard/analyst",
      color: "border-primary/30 hover:border-primary",
    },
    {
      key: "security_manager",
      title: "Security Manager",
      icon: "assessment",
      desc: "Track organizational risk posture, departmental benchmarks, and compliance status.",
      badge: "Executive",
      path: "/dashboard/manager",
      color: "border-tertiary/30 hover:border-tertiary",
    },
    {
      key: "soc_engineer",
      title: "SOC Engineer",
      icon: "speed",
      desc: "Monitor live telemetry streams, detect anomaly spikes, and ingest activity logs.",
      badge: "SOC Tier-1",
      path: "/dashboard/soc",
      color: "border-error/30 hover:border-error",
    },
    {
      key: "admin",
      title: "Administrator",
      icon: "admin_panel_settings",
      desc: "Manage system governance, user roles, access control, and database services.",
      badge: "Admin",
      path: "/dashboard/admin",
      color: "border-secondary/30 hover:border-secondary",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col">
      {/* Header Bar */}
      <header className="border-b border-outline-variant bg-surface px-lg py-3 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-sm">
          <div className="w-9 h-9 rounded-lg bg-primary-container flex items-center justify-center text-white shadow-xs">
            <span className="material-symbols-outlined text-[22px]">shield</span>
          </div>
          <div>
            <span className="font-page-title text-page-title text-primary tracking-tight text-base font-bold">
              ITBIS SECURITY
            </span>
            <span className="text-[10px] text-secondary block font-medium">
              Behavioral Security Intelligence
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link
              href={ROLE_CONFIG[user?.role]?.dashboard || "/dashboard"}
              className="px-4 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary-container transition-colors shadow-xs"
            >
              Go to Dashboard ({ROLE_CONFIG[user?.role]?.title || user?.role})
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-3.5 py-1.5 border border-outline-variant text-on-surface rounded-lg text-xs font-semibold hover:bg-surface-container-low transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-3.5 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary-container transition-colors shadow-xs"
              >
                Create Account
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-md py-lg flex flex-col items-center justify-center text-center">
        {/* Backend Status Pill */}
        <div className="mb-md inline-flex items-center gap-2 px-3 py-1 bg-surface-container-low border border-outline-variant rounded-full text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              isOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
            }`}
          />
          <span className="font-medium text-secondary">{backendStatus}</span>
        </div>

        <h1 className="font-page-title text-3xl md:text-5xl font-extrabold text-on-surface tracking-tight max-w-3xl leading-tight">
          AI-Powered Insider Threat Detection &amp; Behavioral Security Platform
        </h1>

        <p className="mt-3 text-on-surface-variant text-sm md:text-base max-w-2xl leading-relaxed">
          Real-time behavioral intelligence and machine learning to detect, investigate, and prevent insider risks across your organization.
        </p>

        {/* Role Personas Showcase */}
        <div className="mt-12 w-full text-left">
          <div className="mb-6">
            <h2 className="font-section-title text-section-title text-on-surface font-bold text-base">
              Role-Based Dashboards
            </h2>
            <p className="text-xs text-secondary mt-0.5">
              Specialized operational workspaces tailored to each security team persona:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
            {roles.map((r) => (
              <div
                key={r.key}
                className={`bg-surface-container-lowest border rounded-xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${r.color} group`}
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-primary group-hover:bg-primary-container group-hover:text-white transition-colors">
                      <span className="material-symbols-outlined text-[22px]">
                        {r.icon}
                      </span>
                    </div>
                    <span className="bg-surface-container-high text-secondary px-2 py-0.5 rounded-full text-[10px] font-semibold">
                      {r.badge}
                    </span>
                  </div>

                  <h3 className="font-card-title text-card-title text-on-surface text-sm font-bold">
                    {r.title}
                  </h3>

                  <p className="text-xs text-secondary mt-1.5 leading-relaxed">
                    {r.desc}
                  </p>
                </div>

                <div className="mt-6 pt-3 border-t border-outline-variant/60">
                  <Link
                    href={isAuthenticated && user?.role === r.key ? r.path : "/login"}
                    className="w-full py-2 bg-surface-container-low hover:bg-primary hover:text-white text-on-surface rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer group-hover:bg-primary group-hover:text-white shadow-xs"
                  >
                    <span>
                      {isAuthenticated && user?.role === r.key
                        ? `Open Dashboard`
                        : `Sign in as ${r.title}`}
                    </span>
                    <span className="material-symbols-outlined text-[16px]">
                      arrow_forward
                    </span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-gutter w-full text-left">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-xs">
            <div className="flex items-center gap-2 mb-1.5 text-primary">
              <span className="material-symbols-outlined text-[20px]">database</span>
              <h4 className="font-semibold text-xs text-on-surface">
                Dual-Database Architecture
              </h4>
            </div>
            <p className="text-secondary text-xs leading-relaxed">
              PostgreSQL for relational identity and records; MongoDB for high-throughput activity logs.
            </p>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-xs">
            <div className="flex items-center gap-2 mb-1.5 text-primary">
              <span className="material-symbols-outlined text-[20px]">lock</span>
              <h4 className="font-semibold text-xs text-on-surface">
                Role-Based Access
              </h4>
            </div>
            <p className="text-secondary text-xs leading-relaxed">
              Fine-grained RBAC protecting routes and API endpoints across Analyst, SOC, Manager, and Admin roles.
            </p>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-xs">
            <div className="flex items-center gap-2 mb-1.5 text-primary">
              <span className="material-symbols-outlined text-[20px]">psychology</span>
              <h4 className="font-semibold text-xs text-on-surface">
                Behavioral AI Scoring
              </h4>
            </div>
            <p className="text-secondary text-xs leading-relaxed">
              Multi-indicator Isolation Forest model detecting statistical outliers with explainable risk factors.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-outline-variant bg-surface-container-lowest py-3 text-center text-xs text-secondary mt-auto">
        <p>ITBIS — Insider Threat Behavioral Intelligence System</p>
      </footer>
    </div>
  );
}
