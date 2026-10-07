"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { anomalyApi, alertApi, authApi } from "../lib/api";

const SimulationContext = createContext(null);

export const SimulationProvider = ({ children }) => {
  const [isSimulated, setIsSimulated] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        return (
          sessionStorage.getItem("itbis_simulated") === "true" ||
          localStorage.getItem("itbis_simulated") === "true"
        );
      } catch (e) {
        return false;
      }
    }
    return false;
  });
  const [simLoading, setSimLoading] = useState(false);
  const [simulatedThreat, setSimulatedThreat] = useState(null);
  const [targetedAlerts, setTargetedAlerts] = useState([]);
  const [realtimeAlert, setRealtimeAlert] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [showSimModal, setShowSimModal] = useState(false);

  // Initialize simulation status from storage if previously run in this session
  useEffect(() => {
    try {
      const stored =
        sessionStorage.getItem("itbis_simulated") ||
        localStorage.getItem("itbis_simulated");
      if (stored === "true") {
        setIsSimulated(true);
        const storedThreat =
          sessionStorage.getItem("itbis_simulated_threat") ||
          localStorage.getItem("itbis_simulated_threat");
        if (storedThreat) {
          setSimulatedThreat(JSON.parse(storedThreat));
        }
      } else {
        setIsSimulated(false);
      }
    } catch (e) {
      setIsSimulated(false);
    }

    const handleReset = () => {
      setIsSimulated(false);
      setSimulatedThreat(null);
      setRealtimeAlert(null);
      setTargetedAlerts([]);
    };

    const handleSimulated = (e) => {
      setIsSimulated(true);
      if (e?.detail) {
        setSimulatedThreat(e.detail);
        setRealtimeAlert(e.detail);
        if (Array.isArray(e.detail.created_alerts)) {
          setTargetedAlerts(e.detail.created_alerts);
        }
      }
    };

    const handleStorageChange = (e) => {
      if (e.key === "itbis_simulated") {
        if (e.newValue === "true") {
          setIsSimulated(true);
          try {
            const raw = localStorage.getItem("itbis_simulated_threat");
            if (raw) setSimulatedThreat(JSON.parse(raw));
          } catch (err) {}
        } else {
          setIsSimulated(false);
          setSimulatedThreat(null);
          setRealtimeAlert(null);
          setTargetedAlerts([]);
        }
      }
    };

    window.addEventListener("simulation-reset", handleReset);
    window.addEventListener("threat-simulated", handleSimulated);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("simulation-reset", handleReset);
      window.removeEventListener("threat-simulated", handleSimulated);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const fetchTargetedAlerts = useCallback(async () => {
    if (!isSimulated) {
      setTargetedAlerts([]);
      return;
    }
    try {
      const data = await alertApi.getRoleTargeted();
      if (data && Array.isArray(data.targeted_alerts)) {
        setTargetedAlerts(data.targeted_alerts);
      }
    } catch (err) {}
  }, [isSimulated]);

  useEffect(() => {
    if (isSimulated) {
      fetchTargetedAlerts();
      const interval = setInterval(fetchTargetedAlerts, 8000);
      return () => clearInterval(interval);
    } else {
      setTargetedAlerts([]);
    }
  }, [isSimulated, fetchTargetedAlerts]);

  const openSimModal = useCallback(() => setShowSimModal(true), []);
  const closeSimModal = useCallback(() => setShowSimModal(false), []);

  const triggerSimulation = useCallback(
    async ({ scenario = "usb_exfiltration", employeeId = null, customMessage = null }) => {
      setSimLoading(true);
      try {
        let token = typeof window !== "undefined" ? localStorage.getItem("itbis_token") : null;
        
        // If token is missing, attempt quick demo authentication
        if (!token) {
          try {
            const authRes = await authApi.login("analyst@itbis.com", "AnalystPass123!");
            if (authRes && authRes.access_token) {
              token = authRes.access_token;
              localStorage.setItem("itbis_token", token);
              localStorage.setItem("itbis_role", authRes.role || "security_analyst");
              localStorage.setItem("itbis_email", "analyst@itbis.com");
            }
          } catch (authErr) {
            console.warn("Auto demo login attempt:", authErr);
          }
        }

        const payload = { threat_scenario: scenario };
        if (employeeId) payload.employee_id = employeeId;
        if (customMessage) payload.custom_message = customMessage;

        let res;
        try {
          res = await anomalyApi.simulateThreatEvent(payload);
        } catch (firstErr) {
          // If 401 occurred (e.g. token expired), re-authenticate and retry once
          if (firstErr.response && firstErr.response.status === 401) {
            const authRes = await authApi.login("analyst@itbis.com", "AnalystPass123!");
            if (authRes && authRes.access_token) {
              localStorage.setItem("itbis_token", authRes.access_token);
              localStorage.setItem("itbis_role", authRes.role || "security_analyst");
              localStorage.setItem("itbis_email", "analyst@itbis.com");
              
              res = await anomalyApi.simulateThreatEvent(payload);
            } else {
              throw firstErr;
            }
          } else {
            throw firstErr;
          }
        }


        setIsSimulated(true);
        setSimulatedThreat(res);
        setRealtimeAlert(res);
        setShowSimModal(false);

        try {
          sessionStorage.setItem("itbis_simulated", "true");
          localStorage.setItem("itbis_simulated", "true");
          if (res) {
            sessionStorage.setItem("itbis_simulated_threat", JSON.stringify(res));
            localStorage.setItem("itbis_simulated_threat", JSON.stringify(res));
          }
        } catch (e) {}

        // Use the alerts returned by the simulation response directly
        if (res && Array.isArray(res.created_alerts)) {
          setTargetedAlerts(res.created_alerts);
        }

        // Dispatch global event so all dashboards can immediately react
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("threat-simulated", { detail: res }));
        }

        fetchTargetedAlerts();

        return { success: true, data: res };
      } catch (err) {
        console.error("Threat simulation failed:", err);
        return {
          success: false,
          error: err.response?.data?.detail || "Simulation failed. Please verify credentials or backend connection.",
        };
      } finally {
        setSimLoading(false);
      }
    },
    [fetchTargetedAlerts]
  );

  const resetSimulation = useCallback(async () => {
    setIsSimulated(false);
    setSimulatedThreat(null);
    setRealtimeAlert(null);
    setTargetedAlerts([]);

    try {
      sessionStorage.removeItem("itbis_simulated");
      localStorage.removeItem("itbis_simulated");
      sessionStorage.removeItem("itbis_simulated_threat");
      localStorage.removeItem("itbis_simulated_threat");
    } catch (e) {}

    try {
      await anomalyApi.resetSimulation();
    } catch (e) {}

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("simulation-reset"));
    }

    fetchTargetedAlerts();
  }, [fetchTargetedAlerts]);

  return (
    <SimulationContext.Provider
      value={{
        isSimulated,
        setIsSimulated,
        simLoading,
        simulatedThreat,
        targetedAlerts,
        realtimeAlert,
        setRealtimeAlert,
        soundEnabled,
        setSoundEnabled,
        showSimModal,
        setShowSimModal,
        openSimModal,
        closeSimModal,
        triggerSimulation,
        resetSimulation,
        fetchTargetedAlerts,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
};

export const useSimulation = () => {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error("useSimulation must be used within a SimulationProvider");
  }
  return context;
};
