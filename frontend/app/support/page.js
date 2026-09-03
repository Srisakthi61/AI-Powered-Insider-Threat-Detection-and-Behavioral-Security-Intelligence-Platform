"use client";

import React from "react";
import AppLayout from "../components/AppLayout";

export default function SupportPage() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-gutter max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="font-page-title text-page-title text-on-surface font-bold">
            ITBIS Architecture &amp; System Documentation
          </h1>
          <p className="text-on-surface-variant text-body-base text-xs mt-0.5">
            Overview of the 4-layer security architecture, dual-database model, and API contracts.
          </p>
        </div>

        {/* Dual-Database Architecture Card */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-xs space-y-3">
          <div className="flex items-center gap-2 border-b border-outline-variant pb-2">
            <span className="material-symbols-outlined text-primary text-[20px]">
              hub
            </span>
            <h2 className="font-section-title text-section-title text-on-surface font-semibold text-sm">
              Dual-Database Persistence Layer
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant">
              <div className="flex items-center gap-1.5 font-bold text-on-surface mb-1">
                <span className="material-symbols-outlined text-primary text-[18px]">
                  database
                </span>
                PostgreSQL (Relational / ACID)
              </div>
              <p className="text-secondary text-[11px] leading-relaxed">
                Stores structured relational business entities: <code className="bg-surface-container px-1 py-0.5 rounded">users</code>, <code className="bg-surface-container px-1 py-0.5 rounded">employees</code>, <code className="bg-surface-container px-1 py-0.5 rounded">incidents</code>, and <code className="bg-surface-container px-1 py-0.5 rounded">alerts</code>. Governs identity, manager-subordinate hierarchies, and investigations.
              </p>
            </div>

            <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant">
              <div className="flex items-center gap-1.5 font-bold text-on-surface mb-1">
                <span className="material-symbols-outlined text-primary text-[18px]">
                  storage
                </span>
                MongoDB (Time-Series / Events)
              </div>
              <p className="text-secondary text-[11px] leading-relaxed">
                Stores high-throughput digital security telemetry: <code className="bg-surface-container px-1 py-0.5 rounded">activity_logs</code> and <code className="bg-surface-container px-1 py-0.5 rounded">behavioral_baselines</code>. Enforces cross-database integrity before ingestion.
              </p>
            </div>
          </div>
        </div>

        {/* API Endpoint Reference */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-xs space-y-3">
          <div className="flex items-center gap-2 border-b border-outline-variant pb-2">
            <span className="material-symbols-outlined text-primary text-[20px]">
              api
            </span>
            <h2 className="font-section-title text-section-title text-on-surface font-semibold text-sm">
              RESTful API Endpoint Directory
            </h2>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-2 bg-surface-container-low rounded border border-outline-variant flex justify-between items-center">
              <div>
                <span className="font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded mr-2 font-mono text-[10px]">
                  POST
                </span>
                <code className="font-mono font-semibold">/auth/login</code> &amp;{" "}
                <code className="font-mono font-semibold">/auth/signup</code>
              </div>
              <span className="text-secondary text-[11px]">JWT Bearer Auth</span>
            </div>

            <div className="p-2 bg-surface-container-low rounded border border-outline-variant flex justify-between items-center">
              <div>
                <span className="font-bold text-primary bg-primary-fixed px-1.5 py-0.5 rounded mr-2 font-mono text-[10px]">
                  GET
                </span>
                <code className="font-mono font-semibold">/employees/</code> &amp;{" "}
                <code className="font-mono font-semibold">/employees/&#123;id&#125;/reports</code>
              </div>
              <span className="text-secondary text-[11px]">Directory &amp; Org Chart</span>
            </div>

            <div className="p-2 bg-surface-container-low rounded border border-outline-variant flex justify-between items-center">
              <div>
                <span className="font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded mr-2 font-mono text-[10px]">
                  POST
                </span>
                <code className="font-mono font-semibold">/logs/ingest</code> &amp;{" "}
                <span className="font-bold text-primary bg-primary-fixed px-1.5 py-0.5 rounded mr-1 font-mono text-[10px]">
                  GET
                </span>
                <code className="font-mono font-semibold">/logs/&#123;id&#125;</code>
              </div>
              <span className="text-secondary text-[11px]">MongoDB Log Telemetry</span>
            </div>

            <div className="p-2 bg-surface-container-low rounded border border-outline-variant flex justify-between items-center">
              <div>
                <span className="font-bold text-primary bg-primary-fixed px-1.5 py-0.5 rounded mr-2 font-mono text-[10px]">
                  GET
                </span>
                <code className="font-mono font-semibold">/reports/risk-posture</code>
              </div>
              <span className="text-secondary text-[11px]">Admin / Manager Scope</span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
