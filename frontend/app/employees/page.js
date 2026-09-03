"use client";

import React, { useState, useEffect } from "react";
import AppLayout from "../components/AppLayout";
import RiskBadge from "../components/RiskBadge";
import { employeeApi, logApi } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function EmployeesPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeLogs, setEmployeeLogs] = useState([]);
  const [directReports, setDirectReports] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Employee Form
  const [newEmpId, setNewEmpId] = useState("");
  const [newName, setNewName] = useState("");
  const [newDept, setNewDept] = useState("Engineering");
  const [newDesignation, setNewDesignation] = useState("Software Engineer");
  const [createMsg, setCreateMsg] = useState(null);

  const fetchEmployees = async (dept) => {
    setLoading(true);
    try {
      const data = await employeeApi.list(dept === "ALL" ? null : dept);
      if (Array.isArray(data)) setEmployees(data);
    } catch (err) {
      console.error("Failed to fetch employees:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees(selectedDept);
  }, [selectedDept]);

  const handleSelectEmployee = async (emp) => {
    setSelectedEmployee(emp);
    setEmployeeLogs([]);
    setDirectReports(null);

    // Fetch MongoDB logs for this employee
    try {
      const logs = await logApi.getLogs(emp.employee_id, null, 20);
      setEmployeeLogs(Array.isArray(logs) ? logs : []);
    } catch (e) {
      console.error("Failed to fetch logs for employee:", e);
      setEmployeeLogs([]);
    }

    // Fetch direct reports if allowed
    try {
      const reports = await employeeApi.getReports(emp.employee_id);
      setDirectReports(reports);
    } catch (e) {}
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    setCreateMsg("Creating employee profile in PostgreSQL...");

    try {
      await employeeApi.create({
        employee_id: newEmpId,
        name: newName,
        department: newDept,
        designation: newDesignation,
        device_info: { os: "Windows 11 Enterprise", serial: "ITBIS-" + Date.now().toString().slice(-4) },
        access_privileges: ["standard_corp", "git_repo"],
      });

      setCreateMsg("Employee successfully registered!");
      setTimeout(() => {
        setShowCreateModal(false);
        setCreateMsg(null);
        setNewEmpId("");
        setNewName("");
        fetchEmployees(selectedDept);
      }, 1000);
    } catch (err) {
      setCreateMsg(`Error: ${err.response?.data?.detail || "Creation failed"}`);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employee_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.department?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const canCreate = user?.role === "admin" || user?.role === "security_manager";

  return (
    <AppLayout>
      <div className="flex flex-col gap-gutter">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm mb-xs">
          <div>
            <h1 className="font-page-title text-page-title text-on-surface font-bold">
              Monitored Employees Directory
            </h1>
            <p className="text-on-surface-variant text-body-base text-xs mt-0.5">
              Identity mapping, organizational hierarchy, and cross-database behavioral tracking.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canCreate && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-primary-container text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-primary transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">person_add</span>
                Register Employee
              </button>
            )}
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-2 justify-between items-center bg-surface-container-lowest p-3 border border-outline-variant rounded-xl shadow-xs">
          <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
            {["ALL", "Engineering", "Finance", "Sales", "Human Resources", "Marketing"].map(
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

          <div className="relative w-full sm:w-64">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-secondary text-[16px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-surface-container-low border border-outline-variant rounded-lg text-xs outline-none focus:ring-1 focus:ring-primary text-on-surface"
            />
          </div>
        </div>

        {/* Directory Grid & Detail Drawer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          {/* Employee Table (8/12 or 12/12) */}
          <div
            className={`${
              selectedEmployee ? "lg:col-span-7" : "lg:col-span-12"
            } bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-xs`}
          >
            <div className="p-md border-b border-outline-variant flex justify-between items-center bg-surface-bright">
              <span className="font-semibold text-xs text-on-surface">
                Indexed Employees ({filteredEmployees.length})
              </span>
              <span className="text-[11px] text-secondary">
                PostgreSQL Relational Storage
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant text-secondary font-label-caps text-label-caps">
                    <th className="p-sm pl-md font-semibold">Employee ID</th>
                    <th className="p-sm font-semibold">Name</th>
                    <th className="p-sm font-semibold">Department</th>
                    <th className="p-sm font-semibold">Designation</th>
                    <th className="p-sm pr-md font-semibold text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/60 text-on-surface">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-secondary">
                        <span className="material-symbols-outlined animate-spin text-[24px]">
                          progress_activity
                        </span>
                      </td>
                    </tr>
                  ) : filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-secondary">
                        No employees found matching filter.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <tr
                        key={emp.id || emp.employee_id}
                        onClick={() => handleSelectEmployee(emp)}
                        className={`hover:bg-surface-container-low transition-colors cursor-pointer ${
                          selectedEmployee?.employee_id === emp.employee_id
                            ? "bg-secondary-container/40"
                            : ""
                        }`}
                      >
                        <td className="p-sm pl-md font-mono font-bold text-primary text-[11px]">
                          {emp.employee_id}
                        </td>
                        <td className="p-sm font-medium">{emp.name}</td>
                        <td className="p-sm text-secondary">{emp.department}</td>
                        <td className="p-sm text-secondary">{emp.designation}</td>
                        <td className="p-sm pr-md text-right">
                          <button className="text-primary hover:text-primary-container">
                            <span className="material-symbols-outlined text-[18px]">
                              visibility
                            </span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed Inspector Drawer (5/12) */}
          {selectedEmployee && (
            <div className="lg:col-span-5 bg-surface-container-lowest border border-outline-variant rounded-xl flex flex-col p-md shadow-xs h-fit">
              <div className="flex justify-between items-start border-b border-outline-variant pb-sm mb-md">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-primary">
                      {selectedEmployee.employee_id}
                    </span>
                    <RiskBadge level="Medium" />
                  </div>
                  <h3 className="font-card-title text-card-title text-on-surface mt-1">
                    {selectedEmployee.name}
                  </h3>
                  <p className="text-[11px] text-secondary">
                    {selectedEmployee.designation} — {selectedEmployee.department}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="p-1 text-secondary hover:bg-surface-container rounded"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              {/* Direct Reports */}
              {directReports && directReports.direct_reports?.length > 0 && (
                <div className="mb-md p-2.5 bg-surface-container-low rounded-lg border border-outline-variant text-xs">
                  <span className="font-bold text-on-surface block mb-1">
                    Direct Reports ({directReports.direct_reports.length}):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {directReports.direct_reports.map((r, i) => (
                      <span
                        key={i}
                        className="bg-surface-container-highest px-2 py-0.5 rounded text-[11px] text-on-surface"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Device & Access Info */}
              <div className="space-y-2 text-xs mb-md border-b border-outline-variant pb-md">
                <div className="flex justify-between">
                  <span className="text-secondary">Assigned Device:</span>
                  <span className="font-mono text-[11px] text-on-surface">
                    {selectedEmployee.device_info?.os || "Windows 11 Pro"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Access Privileges:</span>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {(selectedEmployee.access_privileges || ["Standard", "VPN"]).map(
                      (priv, idx) => (
                        <span
                          key={idx}
                          className="bg-primary-fixed text-primary-container px-1.5 py-0.2 rounded text-[10px] font-semibold"
                        >
                          {priv}
                        </span>
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* Activity Logs in MongoDB */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-xs text-on-surface flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-secondary">
                      history
                    </span>
                    Recent Activity Logs (MongoDB)
                  </span>
                  <span className="text-[10px] text-secondary">
                    {employeeLogs.length} events
                  </span>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {employeeLogs.length === 0 ? (
                    <p className="text-[11px] text-secondary italic">
                      No activity logs recorded for this employee yet.
                    </p>
                  ) : (
                    employeeLogs.map((log) => (
                      <div
                        key={log._id || log.id}
                        className="p-2 bg-surface-container-low rounded-lg border border-outline-variant text-[11px]"
                      >
                        <div className="flex justify-between items-center font-semibold">
                          <span className="text-primary uppercase font-mono">
                            {log.event_type}
                          </span>
                          <span className="text-secondary text-[10px] font-mono">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        {log.details && (
                          <div className="text-secondary text-[10px] mt-1 font-mono truncate">
                            {JSON.stringify(log.details)}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Register Employee Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-xs flex items-center justify-center p-md z-50">
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant max-w-md w-full p-lg shadow-xl">
              <div className="flex justify-between items-center border-b border-outline-variant pb-sm mb-md">
                <h3 className="font-card-title text-card-title text-on-surface text-sm font-semibold">
                  Register Monitored Employee
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 text-secondary hover:bg-surface-container rounded"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              {createMsg && (
                <div className="mb-3 p-2.5 bg-secondary-container text-on-secondary-container rounded-lg text-xs font-semibold">
                  {createMsg}
                </div>
              )}

              <form onSubmit={handleCreateEmployee} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-on-surface mb-1">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    required
                    value={newEmpId}
                    onChange={(e) => setNewEmpId(e.target.value)}
                    placeholder="EMP-2045"
                    className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface text-xs outline-none focus:ring-1 focus:ring-primary font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-on-surface mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Sarah Connor"
                    className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface text-xs outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-on-surface mb-1">
                    Department
                  </label>
                  <select
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface text-xs outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Finance">Finance</option>
                    <option value="Sales">Sales</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="Marketing">Marketing</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-on-surface mb-1">
                    Designation / Title
                  </label>
                  <input
                    type="text"
                    required
                    value={newDesignation}
                    onChange={(e) => setNewDesignation(e.target.value)}
                    placeholder="Senior DevOps Lead"
                    className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface text-xs outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="pt-2 border-t border-outline-variant flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-3 py-1.5 border border-outline-variant rounded-lg text-secondary font-semibold hover:bg-surface-container"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-primary text-white rounded-lg font-semibold hover:bg-primary-container"
                  >
                    Save Employee
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
