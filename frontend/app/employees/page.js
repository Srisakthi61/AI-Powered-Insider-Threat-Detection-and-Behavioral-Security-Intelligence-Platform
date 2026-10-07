"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppLayout from "../components/AppLayout";
import RiskBadge from "../components/RiskBadge";
import MetricCard from "../components/MetricCard";
import { employeeApi, uebaApi } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function EmployeesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [riskMap, setRiskMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    employee_code: "",
    department: "Engineering",
    designation: "Software Engineer",
    device_info: "Dell Latitude 5420, Windows 11 Enterprise",
    access_privileges: "standard_corp,git_repo",
  });
  const [creating, setCreating] = useState(false);

  // Edit Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    department: "",
    designation: "",
    device_info: "",
    access_privileges: "",
  });
  const [updating, setUpdating] = useState(false);

  const fetchEmployeesAndRisks = async () => {
    setLoading(true);
    try {
      const [empData, riskData] = await Promise.all([
        employeeApi.list(selectedDept === "ALL" ? null : selectedDept),
        uebaApi.listRiskScores().catch(() => []),
      ]);

      if (Array.isArray(empData)) {
        setEmployees(empData);
      }

      if (Array.isArray(riskData)) {
        const map = {};
        riskData.forEach((r) => {
          map[r.employee_id] = r;
        });
        setRiskMap(map);
      }
    } catch (err) {
      console.error("Failed to fetch employees:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeesAndRisks();

    const handleThreatSimulated = () => fetchEmployeesAndRisks();
    const handleReset = () => fetchEmployeesAndRisks();

    window.addEventListener("threat-simulated", handleThreatSimulated);
    window.addEventListener("simulation-reset", handleReset);

    return () => {
      window.removeEventListener("threat-simulated", handleThreatSimulated);
      window.removeEventListener("simulation-reset", handleReset);
    };
  }, [selectedDept]);

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const payload = {
        name: createForm.name,
        employee_code: createForm.employee_code || undefined,
        department: createForm.department,
        designation: createForm.designation,
        device_info: createForm.device_info,
        access_privileges: createForm.access_privileges
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };
      await employeeApi.create(payload);
      setShowCreateModal(false);
      setCreateForm({
        name: "",
        employee_code: "",
        department: "Engineering",
        designation: "Software Engineer",
        device_info: "Dell Latitude 5420, Windows 11 Enterprise",
        access_privileges: "standard_corp,git_repo",
      });
      fetchEmployeesAndRisks();
    } catch (err) {
      console.error("Creation failed:", err);
      alert("Failed to create employee profile.");
    } finally {
      setCreating(false);
    }
  };

  const handleOpenEdit = (emp) => {
    setEditingEmp(emp);
    setEditForm({
      name: emp.name || "",
      department: emp.department || "Engineering",
      designation: emp.designation || "",
      device_info:
        typeof emp.device_info === "object"
          ? JSON.stringify(emp.device_info)
          : emp.device_info || "",
      access_privileges: Array.isArray(emp.access_privileges)
        ? emp.access_privileges.join(", ")
        : emp.access_privileges || "",
    });
    setShowEditModal(true);
  };

  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    if (!editingEmp) return;
    setUpdating(true);
    try {
      const payload = {
        name: editForm.name,
        department: editForm.department,
        designation: editForm.designation,
        device_info: editForm.device_info,
        access_privileges: editForm.access_privileges
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };
      await employeeApi.update(editingEmp.id, payload);
      setShowEditModal(false);
      setEditingEmp(null);
      fetchEmployeesAndRisks();
    } catch (err) {
      console.error("Update failed:", err);
      alert("Failed to update employee.");
    } finally {
      setUpdating(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      (emp.name && emp.name.toLowerCase().includes(q)) ||
      (emp.employee_code && emp.employee_code.toLowerCase().includes(q)) ||
      `emp-${emp.id}`.includes(q) ||
      (emp.department && emp.department.toLowerCase().includes(q)) ||
      (emp.designation && emp.designation.toLowerCase().includes(q))
    );
  });

  const canManage =
    user?.role === "admin" ||
    user?.role === "security_manager" ||
    user?.role === "soc_engineer" ||
    user?.role === "security_analyst";

  return (
    <AppLayout>
      <div className="flex flex-col gap-gutter">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm mb-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-2xl">
                badge
              </span>
              <h1 className="font-page-title text-page-title text-on-surface font-bold">
                Monitored Employee Directory
              </h1>
            </div>
            <p className="text-secondary text-xs mt-0.5">
              Identity records, organizational hierarchy, cross-database behavioral dossiers, and 5-factor risk telemetry.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {canManage && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-primary text-white px-3.5 py-2 rounded-lg text-xs font-semibold hover:bg-primary-container transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">person_add</span>
                Register Employee
              </button>
            )}
          </div>
        </div>

        {/* Directory Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
          <MetricCard
            title="Total Personnel"
            value={employees.length}
            icon="group"
            trend="Active Directory"
          />
          <MetricCard
            title="High / Critical Risks"
            value={
              Object.values(riskMap).filter(
                (r) => r.risk_level === "High" || r.risk_level === "Critical"
              ).length
            }
            icon="person_alert"
            accentColor="#dc2626"
            trend="Needs Triage"
          />
          <MetricCard
            title="Departments"
            value={new Set(employees.map((e) => e.department).filter(Boolean)).size || 5}
            icon="domain"
            trend="Org Units"
          />
          <MetricCard
            title="UEBA Analyzed"
            value={Object.keys(riskMap).length}
            icon="psychology"
            accentColor="#0284c7"
            trend="5-Factor Profiles"
          />
        </div>

        {/* Filter and Search Controls */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-surface-container-lowest p-3.5 border border-outline-variant rounded-xl shadow-sm">
          <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
            {["ALL", "Engineering", "Finance", "Sales", "Human Resources", "Marketing", "IT"].map(
              (dept) => (
                <button
                  key={dept}
                  onClick={() => setSelectedDept(dept)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    selectedDept === dept
                      ? "bg-primary text-white"
                      : "bg-surface-container-low text-secondary hover:bg-surface-container"
                  }`}
                >
                  {dept}
                </button>
              )
            )}
          </div>

          <div className="relative w-full sm:w-72">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-secondary text-[16px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search by name, code, role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface-container-low border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Employees Table */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant text-secondary font-semibold">
                  <th className="p-3 pl-4">Employee</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Designation</th>
                  <th className="p-3">5-Factor Risk Score</th>
                  <th className="p-3">Device / Endpoint</th>
                  <th className="p-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-secondary">
                      <div className="flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined animate-spin text-primary">
                          progress_activity
                        </span>
                        <span>Loading employee directory...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-secondary">
                      <div className="w-full max-w-[380px] mx-auto flex flex-col items-center justify-center text-center">
                        <p className="text-xs text-secondary leading-relaxed text-center w-full">
                          No employees found matching the filters.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => {
                    const risk = riskMap[emp.id];
                    return (
                      <tr
                        key={emp.id}
                        onClick={() => router.push(`/employees/${emp.id}`)}
                        className="hover:bg-surface-container-low transition-colors cursor-pointer group"
                      >
                        <td className="p-3 pl-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                              {emp.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-on-surface group-hover:text-primary transition-colors">
                                {emp.name}
                              </div>
                              <div className="text-[10px] font-mono text-secondary">
                                {emp.employee_code || `EMP-${emp.id}`} • ID: {emp.id}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 font-semibold text-on-surface">
                          {emp.department || "General"}
                        </td>
                        <td className="p-3 text-secondary">
                          {emp.designation || "Staff Member"}
                        </td>
                        <td className="p-3">
                          {risk ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-on-surface">
                                {risk.overall_score}
                              </span>
                              <RiskBadge level={risk.risk_level} />
                            </div>
                          ) : (
                            <span className="text-secondary text-[11px]">—</span>
                          )}
                        </td>
                        <td className="p-3 text-secondary text-[11px] font-mono max-w-xs truncate">
                          {typeof emp.device_info === "object"
                            ? JSON.stringify(emp.device_info)
                            : emp.device_info || "Standard Device"}
                        </td>
                        <td className="p-3 pr-4 text-right">
                          <div
                            className="flex items-center justify-end gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link
                              href={`/employees/${emp.id}`}
                              className="px-2.5 py-1 bg-primary text-white rounded text-[11px] font-semibold hover:bg-primary-container inline-flex items-center gap-1 transition-colors"
                            >
                              Investigate
                              <span className="material-symbols-outlined text-[13px]">
                                arrow_forward
                              </span>
                            </Link>

                            {canManage && (
                              <button
                                onClick={() => handleOpenEdit(emp)}
                                className="p-1 text-secondary hover:text-on-surface rounded cursor-pointer"
                                title="Edit Employee"
                              >
                                <span className="material-symbols-outlined text-[18px]">
                                  edit
                                </span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Employee Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 w-screen h-screen z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant max-w-md w-full p-5 sm:p-6 shadow-2xl relative my-auto animate-toast-slide-in">
              <div className="flex justify-between items-center border-b border-outline-variant pb-sm mb-md">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-2xl">
                    person_add
                  </span>
                  <h3 className="font-card-title text-card-title text-on-surface font-bold">
                    Register Monitored Employee
                  </h3>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 text-secondary hover:bg-surface-container rounded-lg cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <form onSubmit={handleCreateEmployee} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-secondary block mb-1">
                    Full Name <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Elena Rostova"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="font-bold text-secondary block mb-1">
                    Employee Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. EMP1015"
                    value={createForm.employee_code}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, employee_code: e.target.value })
                    }
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-secondary block mb-1">Department</label>
                    <select
                      value={createForm.department}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, department: e.target.value })
                      }
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-on-surface focus:outline-none focus:border-primary"
                    >
                      <option value="Engineering">Engineering</option>
                      <option value="Finance">Finance</option>
                      <option value="Sales">Sales</option>
                      <option value="Human Resources">Human Resources</option>
                      <option value="Marketing">Marketing</option>
                      <option value="IT">IT</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-secondary block mb-1">Designation</label>
                    <input
                      type="text"
                      placeholder="e.g. Senior Analyst"
                      value={createForm.designation}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, designation: e.target.value })
                      }
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-on-surface focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-secondary block mb-1">Device Info</label>
                  <input
                    type="text"
                    value={createForm.device_info}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, device_info: e.target.value })
                    }
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-on-surface focus:outline-none focus:border-primary font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="font-bold text-secondary block mb-1">
                    Access Privileges (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={createForm.access_privileges}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, access_privileges: e.target.value })
                    }
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-on-surface focus:outline-none focus:border-primary font-mono text-[11px]"
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
                    Register
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Employee Modal */}
        {showEditModal && editingEmp && (
          <div className="fixed inset-0 w-screen h-screen z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant max-w-md w-full p-5 sm:p-6 shadow-2xl relative my-auto animate-toast-slide-in">
              <div className="flex justify-between items-center border-b border-outline-variant pb-sm mb-md">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-2xl">
                    manage_accounts
                  </span>
                  <div>
                    <h3 className="font-card-title text-card-title text-on-surface font-bold">
                      Edit Employee Record
                    </h3>
                    <p className="text-xs text-secondary font-mono">
                      ID: {editingEmp.id} ({editingEmp.employee_code || "EMP"})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-1 text-secondary hover:bg-surface-container rounded-lg cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <form onSubmit={handleUpdateEmployee} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-secondary block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-secondary block mb-1">Department</label>
                    <select
                      value={editForm.department}
                      onChange={(e) =>
                        setEditForm({ ...editForm, department: e.target.value })
                      }
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-on-surface focus:outline-none focus:border-primary"
                    >
                      <option value="Engineering">Engineering</option>
                      <option value="Finance">Finance</option>
                      <option value="Sales">Sales</option>
                      <option value="Human Resources">Human Resources</option>
                      <option value="Marketing">Marketing</option>
                      <option value="IT">IT</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-secondary block mb-1">Designation</label>
                    <input
                      type="text"
                      value={editForm.designation}
                      onChange={(e) =>
                        setEditForm({ ...editForm, designation: e.target.value })
                      }
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-on-surface focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-secondary block mb-1">Device Info</label>
                  <input
                    type="text"
                    value={editForm.device_info}
                    onChange={(e) =>
                      setEditForm({ ...editForm, device_info: e.target.value })
                    }
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-on-surface focus:outline-none focus:border-primary font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="font-bold text-secondary block mb-1">
                    Access Privileges (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={editForm.access_privileges}
                    onChange={(e) =>
                      setEditForm({ ...editForm, access_privileges: e.target.value })
                    }
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-on-surface focus:outline-none focus:border-primary font-mono text-[11px]"
                  />
                </div>

                <div className="mt-lg pt-md border-t border-outline-variant flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-3 py-1.5 border border-outline-variant rounded-lg text-secondary hover:text-on-surface font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updating}
                    className="px-4 py-1.5 bg-primary text-white rounded-lg font-semibold hover:bg-primary-container disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    {updating && (
                      <span className="material-symbols-outlined animate-spin text-sm">
                        progress_activity
                      </span>
                    )}
                    Save Changes
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
