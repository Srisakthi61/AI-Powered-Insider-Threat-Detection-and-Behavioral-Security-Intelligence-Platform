"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "../lib/api";

const AuthContext = createContext(null);

export const ROLE_CONFIG = {
  security_analyst: {
    title: "Security Analyst",
    dashboard: "/dashboard/analyst",
    description: "Triage behavioral anomalies, priority alert queues, and incident investigations.",
    allowedRoutes: ["/dashboard/analyst", "/alerts", "/logs", "/employees", "/support"],
  },
  security_manager: {
    title: "Security Manager",
    dashboard: "/dashboard/manager",
    description: "Executive strategic risk posture, department comparisons, and employee governance.",
    allowedRoutes: ["/dashboard/manager", "/reports", "/employees", "/alerts", "/support"],
  },
  soc_engineer: {
    title: "SOC Engineer",
    dashboard: "/dashboard/soc",
    description: "Real-time activity telemetry stream, anomaly spike monitoring, and log ingestion.",
    allowedRoutes: ["/dashboard/soc", "/logs", "/employees", "/alerts", "/support"],
  },
  admin: {
    title: "Administrator",
    dashboard: "/dashboard/admin",
    description: "Full platform governance, RBAC matrix administration, and system health status.",
    allowedRoutes: [
      "/dashboard/admin",
      "/admin",
      "/employees",
      "/logs",
      "/alerts",
      "/reports",
      "/support",
    ],
  },
};

export const DEMO_CREDENTIALS = [
  { role: "security_analyst", title: "Security Analyst", email: "analyst@itbis.com", password: "AnalystPass123!" },
  { role: "soc_engineer", title: "SOC Engineer", email: "soc@itbis.com", password: "SocPass123!" },
  { role: "security_manager", title: "Security Manager", email: "manager@itbis.com", password: "MgrPass123!" },
  { role: "admin", title: "Administrator", email: "admin@itbis.com", password: "AdminPass123!" },
];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check saved session on mount
    try {
      const token = localStorage.getItem("itbis_token");
      const storedRole = localStorage.getItem("itbis_role");
      const storedEmail = localStorage.getItem("itbis_email");

      if (token && storedRole && ROLE_CONFIG[storedRole]) {
        setUser({
          token,
          role: storedRole,
          email: storedEmail || `${storedRole}@itbis.com`,
          title: ROLE_CONFIG[storedRole]?.title || storedRole,
          dashboard: ROLE_CONFIG[storedRole]?.dashboard || "/dashboard",
        });
      } else if (token && storedRole) {
        // Clear invalid role
        localStorage.removeItem("itbis_token");
        localStorage.removeItem("itbis_role");
        localStorage.removeItem("itbis_email");
      }
    } catch (e) {
      console.error("Failed to load auth session:", e);
    } finally {
      setLoading(false);
    }

    const handleExpired = () => {
      setUser(null);
    };

    window.addEventListener("itbis-auth-expired", handleExpired);
    return () => window.removeEventListener("itbis-auth-expired", handleExpired);
  }, []);

  const login = async (email, password, shouldRedirect = true) => {
    try {
      const data = await authApi.login(email, password);
      const role = data.role;
      const token = data.access_token;

      localStorage.setItem("itbis_token", token);
      localStorage.setItem("itbis_role", role);
      localStorage.setItem("itbis_email", email);

      const roleInfo = ROLE_CONFIG[role] || {
        title: role,
        dashboard: "/dashboard",
      };

      const userInfo = {
        token,
        role,
        email,
        title: roleInfo.title,
        dashboard: roleInfo.dashboard,
      };
      setUser(userInfo);

      if (shouldRedirect) {
        // Navigate directly to this role's dedicated dashboard
        router.push(roleInfo.dashboard);
      }
      return { success: true, data, token };
    } catch (err) {
      const errorMsg =
        err.response?.data?.detail || "Authentication failed. Check your credentials.";
      return { success: false, error: errorMsg };
    }
  };

  const quickLogin = async (roleName = "security_analyst", shouldRedirect = true) => {
    const found = DEMO_CREDENTIALS.find((c) => c.role === roleName) || DEMO_CREDENTIALS[0];
    return await login(found.email, found.password, shouldRedirect);
  };

  const signup = async (email, password, role) => {
    try {
      const data = await authApi.signup(email, password, role);
      return { success: true, data };
    } catch (err) {
      const errorMsg =
        err.response?.data?.detail || "Account registration failed.";
      return { success: false, error: errorMsg };
    }
  };

  const logout = () => {
    localStorage.removeItem("itbis_token");
    localStorage.removeItem("itbis_role");
    localStorage.removeItem("itbis_email");
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        quickLogin,
        signup,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
