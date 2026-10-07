"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const result = await login(email, password);
    if (!result.success) {
      setError(result.error);
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#f3f3fe] min-h-screen flex items-center justify-center p-4 md:p-6 text-[#191b23] relative overflow-hidden">
      {/* Decorative background glow elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-1/4 -right-1/4 w-96 h-96 bg-[#004ac6]/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/4 -left-1/4 w-96 h-96 bg-[#585f6c]/5 rounded-full blur-3xl" />
      </div>

      <main className="w-full max-w-[460px] relative z-10 my-8">
        {/* Login Card */}
        <div className="bg-white rounded-xl border border-[#c3c6d7] p-6 md:p-8 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05)]">
          {/* Header Section */}
          <div className="flex flex-col items-center mb-6 text-center">
            <div className="w-16 h-16 mb-3 rounded-2xl bg-[#004ac6] flex items-center justify-center text-white shadow-md">
              <span className="material-symbols-outlined text-[36px]">shield</span>
            </div>
            <h1 className="text-2xl font-bold text-[#004ac6] tracking-tight">
              ITBIS Platform
            </h1>
            <p className="text-sm text-[#434655] mt-1">
              Sign in to your account
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-3 bg-[#ffdad6] text-[#93000a] rounded-lg text-xs flex items-center gap-2 border border-[#ba1a1a]/20">
              <span className="material-symbols-outlined text-sm">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Form Section */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label
                className="block text-xs font-semibold text-[#191b23] mb-1.5"
                htmlFor="email"
              >
                Email Address
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3 flex items-center pointer-events-none text-[#737686]">
                  <span className="material-symbols-outlined text-[18px]">
                    mail
                  </span>
                </div>
                <input
                  className="w-full pl-10 pr-3.5 py-2.5 border border-[#c3c6d7] rounded-lg bg-[#faf8ff] focus:bg-white focus:ring-2 focus:ring-[#004ac6] focus:border-[#004ac6] text-xs text-[#191b23] placeholder-[#737686]/60 transition-colors outline-none"
                  id="email"
                  name="email"
                  placeholder="analyst@itbis.com"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  className="block text-xs font-semibold text-[#191b23]"
                  htmlFor="password"
                >
                  Password
                </label>
                <a
                  className="text-[11px] text-[#004ac6] hover:underline transition-colors"
                  href="#"
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative flex items-center">
                <div className="absolute left-3 flex items-center pointer-events-none text-[#737686]">
                  <span className="material-symbols-outlined text-[18px]">
                    lock
                  </span>
                </div>
                <input
                  className="w-full pl-10 pr-3.5 py-2.5 border border-[#c3c6d7] rounded-lg bg-[#faf8ff] focus:bg-white focus:ring-2 focus:ring-[#004ac6] focus:border-[#004ac6] text-xs text-[#191b23] placeholder-[#737686]/60 transition-colors outline-none"
                  id="password"
                  name="password"
                  placeholder="••••••••"
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              disabled={isLoading}
              className="w-full flex justify-center items-center py-2.5 px-4 mt-2 bg-[#004ac6] text-white rounded-lg hover:bg-[#003ea8] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#004ac6] disabled:opacity-75 cursor-pointer shadow-sm text-sm font-semibold"
              type="submit"
            >
              {isLoading ? (
                <span className="material-symbols-outlined animate-spin text-[20px]">
                  progress_activity
                </span>
              ) : (
                <>
                  <span className="material-symbols-outlined mr-2 text-[20px]">
                    login
                  </span>
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* 1-Click Demo Personas */}
          <div className="mt-6 pt-5 border-t border-[#c3c6d7]/60">
            <p className="text-[11px] font-bold text-[#191b23] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#004ac6]">key</span>
              Demo Logins:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEmail("analyst@itbis.com");
                  setPassword("AnalystPass123!");
                  login("analyst@itbis.com", "AnalystPass123!");
                }}
                className="p-2 border border-[#c3c6d7] rounded-lg bg-[#faf8ff] hover:bg-[#004ac6] hover:text-white transition-all text-left cursor-pointer group"
              >
                <div className="font-bold text-[11px] text-[#004ac6] group-hover:text-white">Security Analyst</div>
                <div className="text-[9px] text-[#737686] group-hover:text-white/80">analyst@itbis.com</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail("soc@itbis.com");
                  setPassword("SocPass123!");
                  login("soc@itbis.com", "SocPass123!");
                }}
                className="p-2 border border-[#c3c6d7] rounded-lg bg-[#faf8ff] hover:bg-[#004ac6] hover:text-white transition-all text-left cursor-pointer group"
              >
                <div className="font-bold text-[11px] text-[#004ac6] group-hover:text-white">SOC Engineer</div>
                <div className="text-[9px] text-[#737686] group-hover:text-white/80">soc@itbis.com</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail("manager@itbis.com");
                  setPassword("MgrPass123!");
                  login("manager@itbis.com", "MgrPass123!");
                }}
                className="p-2 border border-[#c3c6d7] rounded-lg bg-[#faf8ff] hover:bg-[#004ac6] hover:text-white transition-all text-left cursor-pointer group"
              >
                <div className="font-bold text-[11px] text-[#004ac6] group-hover:text-white">Security Manager</div>
                <div className="text-[9px] text-[#737686] group-hover:text-white/80">manager@itbis.com</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail("admin@itbis.com");
                  setPassword("AdminPass123!");
                  login("admin@itbis.com", "AdminPass123!");
                }}
                className="p-2 border border-[#c3c6d7] rounded-lg bg-[#faf8ff] hover:bg-[#004ac6] hover:text-white transition-all text-left cursor-pointer group"
              >
                <div className="font-bold text-[11px] text-[#004ac6] group-hover:text-white">Administrator</div>
                <div className="text-[9px] text-[#737686] group-hover:text-white/80">admin@itbis.com</div>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-5 text-center">
            <p className="text-xs text-[#434655]">
              Don&apos;t have an account?{" "}
              <Link
                className="text-[#004ac6] font-semibold hover:underline transition-colors"
                href="/signup"
              >
                Create Account
              </Link>
            </p>
          </div>
        </div>

        {/* Security Badge Note */}
        <div className="flex items-center justify-center mt-4 text-[#434655] opacity-80 gap-1.5">
          <span className="material-symbols-outlined text-[16px]">
            encrypted
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider">
            End-to-end encrypted connection
          </span>
        </div>
      </main>
    </div>
  );
}
