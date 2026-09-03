"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, ROLE_CONFIG } from "../context/AuthContext";

export default function DashboardIndexPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push("/login");
      } else {
        const targetDashboard =
          ROLE_CONFIG[user?.role]?.dashboard || "/dashboard/analyst";
        router.push(targetDashboard);
      }
    }
  }, [user, loading, isAuthenticated, router]);

  return (
    <div className="min-h-screen bg-[#faf8ff] flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <span className="material-symbols-outlined animate-spin text-[32px] text-[#004ac6]">
          progress_activity
        </span>
        <p className="text-xs text-[#585f6c] font-semibold">
          Navigating to your assigned ITBIS dashboard...
        </p>
      </div>
    </div>
  );
}
