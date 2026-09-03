"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, ROLE_CONFIG } from "../context/AuthContext";
import Link from "next/link";

export default function RoleGuard({ allowedRoles = [], children }) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf8ff] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <span className="material-symbols-outlined animate-spin text-[32px] text-[#004ac6]">
            progress_activity
          </span>
          <p className="text-xs text-[#585f6c] font-semibold">
            Verifying RBAC permissions...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const userRole = user?.role;
  const isAuthorized = allowedRoles.length === 0 || allowedRoles.includes(userRole);

  if (!isAuthorized) {
    const userRoleConfig = ROLE_CONFIG[userRole] || {
      title: userRole,
      dashboard: "/dashboard",
    };

    const allowedTitles = allowedRoles
      .map((r) => ROLE_CONFIG[r]?.title || r)
      .join(" or ");

    return (
      <div className="min-h-screen bg-[#f3f3fe] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-[#c3c6d7] p-6 md:p-8 max-w-md w-full shadow-md text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center">
            <span className="material-symbols-outlined text-[32px]">lock</span>
          </div>

          <h2 className="text-lg font-bold text-[#191b23] tracking-tight">
            Access Restricted by RBAC Policy
          </h2>

          <p className="text-xs text-[#434655] mt-2 leading-relaxed">
            This dashboard or resource is restricted strictly to{" "}
            <strong>{allowedTitles}</strong>.
          </p>

          <div className="my-4 p-3 bg-[#f3f3fe] border border-[#c3c6d7] rounded-lg text-xs text-left">
            <div className="text-secondary text-[11px]">Your Authenticated Persona:</div>
            <div className="font-bold text-[#004ac6] mt-0.5">
              {userRoleConfig.title} ({user?.email})
            </div>
          </div>

          <Link
            href={userRoleConfig.dashboard || "/dashboard"}
            className="w-full py-2.5 px-4 bg-[#004ac6] text-white rounded-lg text-xs font-semibold hover:bg-[#003ea8] transition-colors inline-flex items-center justify-center gap-1.5 shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px]">
              arrow_back
            </span>
            Go to My Dedicated Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
