import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Automatically inject JWT Bearer token if stored in localStorage
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("itbis_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("itbis_token");
        localStorage.removeItem("itbis_role");
        localStorage.removeItem("itbis_email");
        window.dispatchEvent(new CustomEvent("itbis-auth-expired"));
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (email, password) => {
    const response = await api.post("/auth/login", { email, password });
    return response.data;
  },
  signup: async (email, password, role) => {
    const response = await api.post("/auth/signup", { email, password, role });
    return response.data;
  },
};

export const employeeApi = {
  list: async (department = null) => {
    const params = department && department !== "ALL" ? { department } : {};
    const response = await api.get("/employees/", { params });
    return response.data;
  },
  get: async (employeeId) => {
    const response = await api.get(`/employees/${employeeId}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post("/employees/", data);
    return response.data;
  },
  update: async (employeeId, data) => {
    const response = await api.patch(`/employees/${employeeId}`, data);
    return response.data;
  },
  getReports: async (employeeId) => {
    const response = await api.get(`/employees/${employeeId}/reports`);
    return response.data;
  },
  delete: async (employeeId) => {
    const response = await api.delete(`/employees/${employeeId}`);
    return response.data;
  },
};

export const departmentApi = {
  list: async () => {
    const response = await api.get("/departments/");
    return response.data;
  },
  getEmployees: async (department) => {
    const response = await api.get(`/departments/${department}/employees`);
    return response.data;
  },
};

export const logApi = {
  ingest: async (employeeId, eventType, details = {}) => {
    const response = await api.post("/logs/ingest", {
      employee_id: employeeId,
      event_type: eventType,
      details,
    });
    return response.data;
  },
  getCount: async (eventType = null, employeeId = null) => {
    const params = {};
    if (eventType && eventType !== "ALL") params.event_type = eventType;
    if (employeeId && employeeId !== "ALL") params.employee_id = employeeId;
    const response = await api.get("/logs/count", { params });
    return response.data;
  },
  getAll: async (eventType = null, employeeId = null, limit = 50, skip = 0) => {
    const params = { limit, skip };
    if (eventType && eventType !== "ALL") params.event_type = eventType;
    if (employeeId && employeeId !== "ALL") params.employee_id = employeeId;
    const response = await api.get("/logs/", { params });
    return response.data;
  },
  getLogs: async (employeeId, eventType = null, limit = 50, skip = 0) => {
    const params = { limit, skip };
    if (eventType && eventType !== "ALL") params.event_type = eventType;
    const response = await api.get(`/logs/${employeeId}`, { params });
    return response.data;
  },
};

export const alertApi = {
  list: async (severity = null, status = null, targetRole = null, limit = 100) => {
    const params = { limit };
    if (severity && severity !== "ALL") params.severity = severity;
    if (status && status !== "ALL") params.status = status;
    if (targetRole && targetRole !== "ALL") params.target_role = targetRole;
    const response = await api.get("/alerts/", { params });
    return response.data;
  },
  getRoleTargeted: async () => {
    const response = await api.get("/alerts/role-targeted");
    return response.data;
  },
  get: async (alertId) => {
    const response = await api.get(`/alerts/${alertId}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post("/alerts/", data);
    return response.data;
  },
  update: async (alertId, data) => {
    const response = await api.patch(`/alerts/${alertId}`, data);
    return response.data;
  },
  getMyAlerts: async () => {
    const response = await api.get("/alerts/my");
    return response.data;
  },
  assign: async (alertId, assignedTo) => {
    const response = await api.post(`/alerts/${alertId}/assign`, { assigned_to: assignedTo });
    return response.data;
  },
  resolve: async (alertId, notes = null) => {
    const response = await api.post(`/alerts/${alertId}/resolve`, { resolution_notes: notes });
    return response.data;
  },
  getNotifications: async () => {
    const response = await api.get("/alerts/notifications/in-app");
    return response.data;
  },
};

export const anomalyApi = {
  getModelStatus: async () => {
    const response = await api.get("/anomalies/model-status");
    return response.data;
  },
  getReport: async (forceRetrain = false) => {
    const params = forceRetrain ? { force_retrain: true } : {};
    const response = await api.get("/anomalies/report", { params });
    return response.data;
  },
  evaluateLive: async (data) => {
    const response = await api.post("/anomalies/evaluate-live", data);
    return response.data;
  },
  generateMlAlerts: async () => {
    const response = await api.post("/anomalies/generate-ml-alerts");
    return response.data;
  },
  simulateThreatEvent: async (data) => {
    const response = await api.post("/anomalies/simulate-threat-event", data);
    return response.data;
  },
  resetSimulation: async () => {
    const response = await api.post("/anomalies/reset-simulation");
    return response.data;
  },
  getLiveStream: async (limit = 20) => {
    const params = { limit };
    const response = await api.get("/anomalies/live-stream", { params });
    return response.data;
  },
  getBaselines: async (employeeId = null, indicator = null) => {
    const params = {};
    if (employeeId && employeeId !== "ALL") params.employee_id = employeeId;
    if (indicator && indicator !== "ALL") params.indicator = indicator;
    const response = await api.get("/anomalies/baselines", { params });
    return response.data;
  },
  getEmployeeBaselines: async (employeeId) => {
    const response = await api.get(`/anomalies/baselines/${employeeId}`);
    return response.data;
  },
  calculateBaselines: async (employeeId = null) => {
    const params = employeeId && employeeId !== "ALL" ? { employee_id: employeeId } : {};
    const response = await api.post("/anomalies/calculate-baselines", null, { params });
    return response.data;
  },
  checkAnomaly: async (data) => {
    const response = await api.post("/anomalies/check-anomaly", data);
    return response.data;
  },
  getStats: async () => {
    const response = await api.get("/anomalies/stats");
    return response.data;
  },
  getTrend: async (days = 7) => {
    const response = await api.get("/anomalies/trend", { params: { days } });
    return response.data;
  },
};

export const incidentApi = {
  list: async (status = null, severity = null, employeeId = null) => {
    const params = {};
    if (status && status !== "ALL") params.status = status;
    if (severity && severity !== "ALL") params.severity = severity;
    if (employeeId && employeeId !== "ALL") params.employee_id = employeeId;
    const response = await api.get("/incidents/", { params });
    return response.data;
  },
  get: async (incidentId) => {
    const response = await api.get(`/incidents/${incidentId}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post("/incidents/", data);
    return response.data;
  },
  update: async (incidentId, data) => {
    const response = await api.patch(`/incidents/${incidentId}`, data);
    return response.data;
  },
  addNote: async (incidentId, data) => {
    const response = await api.post(`/incidents/${incidentId}/notes`, data);
    return response.data;
  },
  resolve: async (incidentId, resolutionSummary) => {
    const response = await api.post(`/incidents/${incidentId}/resolve`, {
      resolution_summary: resolutionSummary,
    });
    return response.data;
  },
  getTimeline: async (incidentId, limit = 100) => {
    const response = await api.get(`/incidents/${incidentId}/timeline`, {
      params: { limit },
    });
    return response.data;
  },
};

export const uebaApi = {
  getRiskScore: async (employeeId) => {
    const response = await api.get(`/ueba/risk-score/${employeeId}`);
    return response.data;
  },
  listRiskScores: async () => {
    const response = await api.get("/ueba/risk-scores");
    return response.data;
  },
  getPeerComparison: async (employeeId) => {
    const response = await api.get(`/ueba/peer-comparison/${employeeId}`);
    return response.data;
  },
  getTrend: async (employeeId) => {
    const response = await api.get(`/ueba/trend/${employeeId}`);
    return response.data;
  },
  getProfile: async (employeeId) => {
    const response = await api.get(`/ueba/profile/${employeeId}`);
    return response.data;
  },
  createSnapshot: async (employeeId) => {
    const response = await api.post(`/ueba/snapshot/${employeeId}`);
    return response.data;
  },
  createAllSnapshots: async () => {
    const response = await api.post("/ueba/snapshots");
    return response.data;
  },
  getTimeline: async (employeeId, limit = 100) => {
    const response = await api.get(`/ueba/timeline/${employeeId}`, {
      params: { limit },
    });
    return response.data;
  },
};

export const reportApi = {
  getRiskPosture: async () => {
    const response = await api.get("/reports/risk-posture");
    return response.data;
  },
  exportCsv: async () => {
    const response = await api.get("/reports/export", {
      params: { format: "csv" },
      responseType: "blob",
    });
    // Trigger real browser download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "ITBIS_Risk_Intelligence_Report.csv");
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
    return { success: true };
  },
  getInsiderThreatReport: async () => {
    const response = await api.get("/reports/insider-threat");
    return response.data;
  },
  exportExcel: async () => {
    const response = await api.get("/reports/insider-threat/excel", {
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "insider_threat_report.xlsx");
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
    return { success: true };
  },
  exportPdf: async () => {
    const response = await api.get("/reports/insider-threat/pdf", {
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "insider_threat_report.pdf");
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
    return { success: true };
  },
};

export const adminApi = {
  getUsers: async () => {
    const response = await api.get("/admin/users");
    return response.data;
  },
  getDashboard: async () => {
    const response = await api.get("/dashboard/admin");
    return response.data;
  },
  exportAuditTrail: async () => {
    const response = await api.get("/admin/audit-export", {
      responseType: "blob",
    });
    let filename = "itbis_audit_trail.csv";
    const disposition = response.headers ? response.headers["content-disposition"] : null;
    if (disposition && disposition.includes("filename=")) {
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) filename = match[1];
    }
    const url = window.URL.createObjectURL(new Blob([response.data], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
    return { success: true, filename };
  },
};

export const systemApi = {
  health: async () => {
    const response = await api.get("/");
    return response.data;
  },
};

export default api;

