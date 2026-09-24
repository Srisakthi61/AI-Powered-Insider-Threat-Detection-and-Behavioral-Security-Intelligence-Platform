"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { anomalyApi, alertApi } from "../lib/api";

const SimulationContext = createContext(null);

export const SimulationProvider = ({ children }) => {
  const [isSimulated, setIsSimulated] = useState(false);
  const [simLoading, setSimLoading] = useState(false);
  const [simulatedThreat, setSimulatedThreat] = useState(null);
  const [targetedAlerts, setTargetedAlerts] = useState([]);
  const [realtimeAlert, setRealtimeAlert] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showSimModal, setShowSimModal] = useState(false);

  // Initialize simulation status from sessionStorage if previously run in this session
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("itbis_simulated");
      if (stored === "true") {
        setIsSimulated(true);
        const storedThreat = sessionStorage.getItem("itbis_simulated_threat");
        if (storedThreat) {
          setSimulatedThreat(JSON.parse(storedThreat));
        }
      } else {
        setIsSimulated(false);
      }
    } catch (e) {
      setIsSimulated(false);
    }
  }, []);

  const fetchTargetedAlerts = useCallback(async () => {
    try {
      const data = await alertApi.getRoleTargeted();
      if (data && Array.isArray(data.targeted_alerts)) {
        setTargetedAlerts(data.targeted_alerts);
      }
    } catch (err) {}
  }, []);

  useEffect(() => {
    fetchTargetedAlerts();
    const interval = setInterval(fetchTargetedAlerts, 8000);
    return () => clearInterval(interval);
  }, [fetchTargetedAlerts]);

  const openSimModal = useCallback(() => setShowSimModal(true), []);
  const closeSimModal = useCallback(() => setShowSimModal(false), []);

  const triggerSimulation = useCallback(
    async ({ scenario = "usb_exfiltration", employeeId = "EMP1007", customMessage = null }) => {
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

        let res;
        try {
          res = await anomalyApi.simulateThreatEvent({
            employee_id: employeeId,
            threat_scenario: scenario,
            custom_message: customMessage,
          });
        } catch (firstErr) {
          // If 401 occurred (e.g. token expired), re-authenticate and retry once
          if (firstErr.response && firstErr.response.status === 401) {
            const authRes = await authApi.login("analyst@itbis.com", "AnalystPass123!");
            if (authRes && authRes.access_token) {
              localStorage.setItem("itbis_token", authRes.access_token);
              localStorage.setItem("itbis_role", authRes.role || "security_analyst");
              localStorage.setItem("itbis_email", "analyst@itbis.com");
              
              res = await anomalyApi.simulateThreatEvent({
                employee_id: employeeId,
                threat_scenario: scenario,
                custom_message: customMessage,
              });
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
          sessionStorage.setItem("itbis_simulated_threat", JSON.stringify(res));
        } catch (e) {}

        // Re-fetch targeted alerts for current role
        await fetchTargetedAlerts();

        // Dispatch global event so all dashboards can immediately react
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("threat-simulated", { detail: res }));
        }

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
    try {
      await anomalyApi.resetSimulation();
    } catch (e) {}

    setIsSimulated(false);
    setSimulatedThreat(null);
    setRealtimeAlert(null);
    setTargetedAlerts([]);

    try {
      sessionStorage.removeItem("itbis_simulated");
      sessionStorage.removeItem("itbis_simulated_threat");
    } catch (e) {}

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("simulation-reset"));
    }
  }, []);

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
