"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppLayout from "../components/AppLayout";
import RiskBadge from "../components/RiskBadge";
import MetricCard from "../components/MetricCard";
import { incidentApi, employeeApi } from "../lib/api";
import { useSimulation } from "../context/SimulationContext";

export default function IncidentsPage() {
  const router = useRouter();
  const { isSimulated, resetSimulation } = useSimulation();
  const [incidents, setIncidents] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterSeverity, setFilterSeverity] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Create Incident Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    employee_id: "",
    title: "",
    severity: "HIGH",
    summary: "",
    initial_note: "",
    evidence_reference: "",
  });

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const data = await incidentApi.list(filterStatus, filterSeverity);
      if (Array.isArray(data)) {
        setIncidents(data);
      }
    } catch (err) {
      console.error("Failed to fetch incidents:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const data = await employeeApi.list();
      if (Array.isArray(data)) {
        setEmployees(data);
        if (data.length > 0 && !createForm.employee_id) {
          setCreateForm((prev) => ({ ...prev, employee_id: data[0].id.toString() }));
        }
      }
    } catch (err) {
      console.error("Failed to fetch employees:", err);
    }
  };

  useEffect(() => {
    fetchIncidents();
    fetchEmployees();

    const handleThreatSimulated = () => {
      fetchIncidents();
      fetchEmployees();
    };
    const handleReset = () => {
      fetchIncidents();
      fetchEmployees();
    };

    window.addEventListener("threat-simulated", handleThreatSimulated);
    window.addEventListener("simulation-reset", handleReset);

    return () => {
      window.removeEventListener("threat-simulated", handleThreatSimulated);
      window.removeEventListener("simulation-reset", handleReset);
    };
  }, [filterStatus, filterSeverity]);

  const [createError, setCreateError] = useState(null);

  const handleCreateIncident = async (e) => {
    e.preventDefault();
    if (!createForm.employee_id || !createForm.title) return;
    setCreating(true);
    setCreateError(null);
    try {
      const payload = {
        employee_id: parseInt(createForm.employee_id, 10),
        title: createForm.title,
        severity: createForm.severity,
        summary: createForm.summary,
      };
      const created = await incidentApi.create(payload);

      // If initial note was provided, add it
      if (createForm.initial_note.trim() && created && created.id) {
        await incidentApi.addNote(created.id, {
          note: createForm.initial_note,
          evidence_reference: createForm.evidence_reference || null,
        });
      }

      setShowCreateModal(false);
      setCreateForm({
        employee_id: employees.length > 0 ? employees[0].id.toString() : "",
        title: "",
        severity: "HIGH",
        summary: "",
        initial_note: "",
        evidence_reference: "",
      });
      fetchIncidents();
      router.push(`/incidents/${created.id}`);
    } catch (err) {
      console.error("Failed to create incident:", err);
      const msg = err.response?.data?.detail || "Error creating incident. Please verify the form inputs.";
      setCreateError(msg);
    } finally {
      setCreating(false);
    }
  };

  // Summary Metrics
  const totalCases = incidents.length;
  const openCases = incidents.filter((i) => i.status === "OPEN").length;
  const investigatingCases = incidents.filter((i) => i.status === "INVESTIGATING").length;
  const resolvedCases = incidents.filter((i) => i.status === "RESOLVED" || i.status === "CLOSED").length;
  const criticalCases = incidents.filter((i) => (i.severity || "").toUpperCase() === "CRITICAL").length;

  const displayTotalCases = totalCases;
  const displayOpenCases = openCases;
  const displayInvestigatingCases = investigatingCases;
  const displayResolvedCases = resolvedCases;
  const displayCriticalCases = criticalCases;

  const filteredIncidents = incidents.filter((inc) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      !q ||
      (inc.title && inc.title.toLowerCase().includes(q)) ||
      (inc.employee_name && inc.employee_name.toLowerCase().includes(q)) ||
      (inc.employee_code && inc.employee_code.toLowerCase().includes(q)) ||
      `inc-${inc.id}`.includes(q) ||
      `${inc.id}` === q;

    const matchesStatus =
      filterStatus === "ALL" || (inc.status || "").toUpperCase() === filterStatus.toUpperCase();
    const matchesSeverity =
      filterSeverity === "ALL" || (inc.severity || "").toUpperCase() === filterSeverity.toUpperCase();

    return matchesQuery && matchesStatus && matchesSeverity;
  });

  const displayIncidents = isSimulated ? filteredIncidents : [];

  return (
    <AppLayout>
      <div className="flex flex-col gap-gutter">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-sm mb-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-2xl">folder_special</span>
              <h1 className="font-page-title text-page-title text-on-surface font-bold">
                Incident Management Cases
              </h1>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isSimulated
                    ? "bg-amber-50 text-amber-800 border-amber-300 animate-pulse"
                    : "bg-surface-container-high text-secondary border-outline-variant"
                }`}
              >
                {isSimulated ? "● Threat Incident Active" : "○ Incident Queue Standby"}
              </span>
            </div>
            <p className="text-secondary text-sm mt-0.5">
              Formal insider threat investigation cases, evidence timelines, notes, and audit chains.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isSimulated && (
              <button
                onClick={resetSimulation}
                className="bg-surface-container-lowest border border-outline-variant text-secondary hover:text-error px-3 py-2 rounded-lg text-xs font-semibold hover:bg-error-container/30 transition-colors flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
                title="Reset incidents to clean standby"
              >
                <span className="material-symbols-outlined text-[15px]">restart_alt</span>
                Reset
              </button>
            )}

            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-container shadow-sm flex items-center gap-2 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add_moderator</span>
              Open New Case
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-md">
          <MetricCard
            title="Total Cases"
            value={displayTotalCases}
            icon="folder_open"
            trend={displayTotalCases > 0 ? "Active Cases" : "No Cases"}
          />
          <MetricCard
            title="Open / Triage"
            value={displayOpenCases}
            icon="pending_actions"
            accentColor="#d97706"
            trend={displayOpenCases > 0 ? "Needs assignment" : "Nominal"}
          />
          <MetricCard
            title="Investigating"
            value={displayInvestigatingCases}
            icon="manage_search"
            accentColor="#0284c7"
            trend={displayInvestigatingCases > 0 ? "Active inquiries" : "Nominal"}
          />
          <MetricCard
            title="Resolved / Closed"
            value={displayResolvedCases}
            icon="verified"
            accentColor="#16a34a"
            trend={displayResolvedCases > 0 ? "Case closed" : "Nominal"}
          />
          <MetricCard
            title="Critical Severity"
            value={displayCriticalCases}
            icon="warning"
            accentColor="#dc2626"
            trend={displayCriticalCases > 0 ? "Urgent attention" : "Nominal"}
          />
        </div>

        {/* Incidents Table & Controls */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          {/* Table Toolbar */}
          <div className="p-4 border-b border-outline-variant flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface-container-low/40">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <span className="material-symbols-outlined text-secondary text-lg">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Case ID, Employee, or Case Title..."
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 text-xs">
                <span className="text-secondary font-medium">Status:</span>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-surface-container-lowest border border-outline-variant rounded-lg px-2.5 py-1 text-xs text-on-surface focus:outline-none focus:border-primary"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="OPEN">Open</option>
                  <option value="INVESTIGATING">Investigating</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>

              <div className="flex items-center gap-1 text-xs">
                <span className="text-secondary font-medium">Severity:</span>
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="bg-surface-container-lowest border border-outline-variant rounded-lg px-2.5 py-1 text-xs text-on-surface focus:outline-none focus:border-primary"
                >
                  <option value="ALL">All Severities</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>

              <button
                onClick={() => {
                  setFilterStatus("ALL");
                  setFilterSeverity("ALL");
                  setSearchQuery("");
                }}
                className="px-2.5 py-1 text-xs text-secondary hover:text-on-surface bg-surface-container rounded-lg border border-outline-variant cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="table-fixed w-full min-w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low text-secondary font-semibold">
                  <th className="w-24 p-3 pl-4">Case ID</th>
                  <th className="w-24 p-3">Severity</th>
                  <th className="w-72 p-3">Title &amp; Summary</th>
                  <th className="w-48 p-3">Subject Employee</th>
                  <th className="w-28 p-3">Status</th>
                  <th className="w-20 p-3">Notes</th>
                  <th className="w-28 p-3">Created</th>
                  <th className="w-28 p-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-8 px-6 text-center text-secondary">
                      <div className="flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined animate-spin text-primary">
                          progress_activity
                        </span>
                        <span>Loading incident cases...</span>
                      </div>
                    </td>
                  </tr>
                ) : !isSimulated ? (
                  <tr>
                    <td colSpan={8} className="py-8 px-6 text-center text-secondary">
                      <div className="w-full max-w-[420px] mx-auto flex flex-col items-center justify-center text-center gap-2">
                        <span className="material-symbols-outlined text-[36px] text-primary">
                          shield
                        </span>
                        <h4 className="font-bold text-sm text-on-surface">Incident Investigation Standby</h4>
                        <p className="text-xs text-secondary leading-relaxed text-center w-full">
                          No active investigation cases in nominal baseline. Click &quot;Simulate Threat&quot; in the header to run ML inference and generate threat incidents.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : displayIncidents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 px-6 text-center text-secondary">
                      <div className="w-full max-w-[420px] mx-auto flex flex-col items-center justify-center text-center gap-2">
                        <span className="material-symbols-outlined text-[36px] text-outline">
                          folder_off
                        </span>
                        <h4 className="font-bold text-sm text-on-surface">No Incidents Found</h4>
                        <p className="text-xs text-secondary leading-relaxed text-center w-full">
                          No investigation cases match your filters. Click &quot;Open New Case&quot; to formalize a threat investigation.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayIncidents.map((inc) => (
                    <tr
                      key={inc.id}
                      onClick={() => router.push(`/incidents/${inc.id}`)}
                      className="hover:bg-surface-container-low transition-colors cursor-pointer group"
                    >
                      <td className="p-3 pl-4 font-mono font-bold text-primary">
                        INC-{String(inc.id).padStart(4, "0")}
                      </td>
                      <td className="p-3">
                        <RiskBadge level={inc.severity} />
                      </td>
                      <td className="p-3 max-w-sm">
                        <div className="font-bold text-on-surface group-hover:text-primary transition-colors">
                          {inc.title}
                        </div>
                        {inc.summary && (
                          <div className="text-[11px] text-secondary truncate mt-0.5">
                            {inc.summary}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <Link
                          href={`/employees/${inc.employee_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-semibold text-on-surface hover:text-primary hover:underline flex items-center gap-1"
                        >
                          {inc.employee_name || `Employee #${inc.employee_id}`}
                          <span className="material-symbols-outlined text-[14px] text-secondary">
                            open_in_new
                          </span>
                        </Link>
                        <div className="text-[10px] font-mono text-secondary">
                          {inc.employee_code || `ID: ${inc.employee_id}`} • {inc.department || "Dept"}
                        </div>
                      </td>
                      <td className="p-3">
                        <RiskBadge status={inc.status} />
                      </td>
                      <td className="p-3 font-mono text-secondary">
                        <span className="inline-flex items-center gap-1 bg-surface-container px-2 py-0.5 rounded text-[11px]">
                          <span className="material-symbols-outlined text-[13px]">description</span>
                          {inc.notes ? inc.notes.length : 0}
                        </span>
                      </td>
                      <td className="p-3 text-secondary text-[11px]">
                        {inc.created_at ? new Date(inc.created_at).toLocaleDateString() : "Recent"}
                      </td>
                      <td className="p-3 pr-4 text-right">
                        <div
                          className="flex items-center justify-end gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link
                            href={`/incidents/${inc.id}`}
                            className="px-2.5 py-1 bg-primary text-white rounded text-[11px] font-semibold hover:bg-primary-container inline-flex items-center gap-1 transition-all"
                          >
                            Workspace
                            <span className="material-symbols-outlined text-[14px]">
                              arrow_forward
                            </span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Incident Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 w-screen h-screen z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant max-w-lg w-full p-5 sm:p-6 shadow-2xl relative my-auto animate-toast-slide-in">
              <div className="flex justify-between items-start border-b border-outline-variant pb-sm mb-md">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-2xl">
                    add_moderator
                  </span>
                  <div>
                    <h3 className="font-card-title text-card-title text-on-surface font-bold">
                      Open Security Incident Case
                    </h3>
                    <p className="text-xs text-secondary">
                      Formal case initiation for insider behavioral threat investigation
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 text-secondary hover:bg-surface-container rounded-lg cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {createError && (
                <div className="mb-3 p-3 bg-red-50 text-red-800 rounded-lg border border-red-200 text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-red-600 shrink-0">error</span>
                  <span className="font-medium">{createError}</span>
                </div>
              )}

              <form onSubmit={handleCreateIncident} className="space-y-3.5 text-xs">
                <div>
                  <label className="font-bold text-secondary block mb-1">
                    Subject Employee <span className="text-error">*</span>
                  </label>
                  <select
                    value={createForm.employee_id}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, employee_id: e.target.value })
                    }
                    required
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-on-surface focus:outline-none focus:border-primary"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.employee_code || `EMP-${emp.id}`}) — {emp.department}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-secondary block mb-1">
                    Case Title <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Critical After-Hours Database Exfiltration"
                    value={createForm.title}
                    onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="font-bold text-secondary block mb-1">Severity Level</label>
                  <select
                    value={createForm.severity}
                    onChange={(e) => setCreateForm({ ...createForm, severity: e.target.value })}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-on-surface focus:outline-none focus:border-primary"
                  >
                    <option value="CRITICAL">CRITICAL — Immediate exfiltration/privilege abuse</option>
                    <option value="HIGH">HIGH — Severe anomalous activity</option>
                    <option value="MEDIUM">MEDIUM — Suspicious baseline deviation</option>
                    <option value="LOW">LOW — Low risk audit inquiry</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-secondary block mb-1">
                    Executive Summary / Incident Context
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe the context, triggers, anomalies observed, and initial findings..."
                    value={createForm.summary}
                    onChange={(e) => setCreateForm({ ...createForm, summary: e.target.value })}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="pt-2 border-t border-outline-variant">
                  <label className="font-bold text-secondary block mb-1">
                    Initial Investigation Note (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="First log entry or triage note..."
                    value={createForm.initial_note}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, initial_note: e.target.value })
                    }
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="font-bold text-secondary block mb-1">
                    Evidence Reference (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., LOG-9481, S3 Bucket logs, Packet capture #12"
                    value={createForm.evidence_reference}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, evidence_reference: e.target.value })
                    }
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="mt-lg pt-md border-t border-outline-variant flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-3 py-1.5 border border-outline-variant rounded-lg text-secondary hover:text-on-surface font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-1.5 bg-primary text-white rounded-lg font-semibold hover:bg-primary-container disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    {creating && (
                      <span className="material-symbols-outlined animate-spin text-sm">
                        progress_activity
                      </span>
                    )}
                    Open Incident
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
