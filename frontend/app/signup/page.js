"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("security_analyst");
  const [terms, setTerms] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!terms) {
      setError("Please agree to the Terms of Service.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    const result = await signup(email, password, role);
    if (result.success) {
      setSuccessMsg("Account created successfully! Redirecting to login...");
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } else {
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

      {/* Main Container */}
      <main className="w-full max-w-[460px] relative z-10 my-8">
        {/* Signup Card */}
        <div className="bg-white rounded-xl border border-[#c3c6d7] p-6 md:p-8 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05)]">
          {/* Logo Header */}
          <div className="flex flex-col items-center mb-6 text-center">
            <div className="w-16 h-16 mb-3 rounded-2xl bg-[#004ac6] flex items-center justify-center text-white shadow-md">
              <span className="material-symbols-outlined text-[36px]">shield</span>
            </div>
            <h1 className="text-2xl font-bold text-[#004ac6] tracking-tight">
              ITBIS Platform
            </h1>
            <p className="text-sm text-[#434655] mt-1">
              Create your account
            </p>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-4 p-3 bg-[#ffdad6] text-[#93000a] rounded-lg text-xs flex items-center gap-2 border border-[#ba1a1a]/20">
              <span className="material-symbols-outlined text-sm">error</span>
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs flex items-center gap-2 border border-emerald-200">
              <span className="material-symbols-outlined text-sm text-emerald-600">
                check_circle
              </span>
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label
                className="block text-xs font-semibold text-[#191b23] mb-1.5"
                htmlFor="fullName"
              >
                Full Name
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3 flex items-center pointer-events-none text-[#737686]">
                  <span className="material-symbols-outlined text-[18px]">
                    person
                  </span>
                </div>
                <input
                  className="w-full pl-10 pr-3.5 py-2.5 border border-[#c3c6d7] rounded-lg bg-[#faf8ff] focus:bg-white focus:ring-2 focus:ring-[#004ac6] focus:border-[#004ac6] text-xs text-[#191b23] placeholder-[#737686]/60 transition-colors outline-none"
                  id="fullName"
                  name="fullName"
                  placeholder="John Doe"
                  required
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            </div>

            {/* Email */}
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

            {/* Password */}
            <div>
              <label
                className="block text-xs font-semibold text-[#191b23] mb-1.5"
                htmlFor="password"
              >
                Password
              </label>
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
              <p className="text-[11px] text-[#434655] mt-1">
                Must be at least 8 characters.
              </p>
            </div>

            {/* Role Selector */}
            <div>
              <label
                className="block text-xs font-semibold text-[#191b23] mb-1.5"
                htmlFor="role"
              >
                Operational Role
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3 flex items-center pointer-events-none text-[#737686]">
                  <span className="material-symbols-outlined text-[18px]">
                    badge
                  </span>
                </div>
                <select
                  className="w-full pl-10 pr-10 py-2.5 border border-[#c3c6d7] rounded-lg bg-[#faf8ff] focus:bg-white focus:ring-2 focus:ring-[#004ac6] focus:border-[#004ac6] text-xs text-[#191b23] appearance-none transition-colors outline-none cursor-pointer"
                  id="role"
                  name="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="security_analyst">Security Analyst</option>
                  <option value="soc_engineer">SOC Engineer</option>
                  <option value="security_manager">Security Manager</option>
                  <option value="admin">Administrator</option>
                </select>
                <div className="absolute right-3 flex items-center pointer-events-none text-[#737686]">
                  <span className="material-symbols-outlined text-[18px]">
                    expand_more
                  </span>
                </div>
              </div>
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start gap-2 pt-1">
              <input
                className="w-4 h-4 mt-0.5 text-[#004ac6] border-[#c3c6d7] rounded focus:ring-[#004ac6] cursor-pointer"
                id="terms"
                name="terms"
                type="checkbox"
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
              />
              <label
                className="text-xs text-[#434655] leading-snug cursor-pointer select-none"
                htmlFor="terms"
              >
                I agree to the{" "}
                <a className="text-[#004ac6] hover:underline font-semibold" href="#">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a className="text-[#004ac6] hover:underline font-semibold" href="#">
                  Privacy Policy
                </a>
                .
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                disabled={isLoading}
                className="w-full flex justify-center items-center py-2.5 px-4 rounded-lg shadow-sm text-white bg-[#004ac6] hover:bg-[#003ea8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#004ac6] transition-colors cursor-pointer text-sm font-semibold disabled:opacity-75"
                type="submit"
              >
                {isLoading ? (
                  <span className="material-symbols-outlined animate-spin text-[20px]">
                    progress_activity
                  </span>
                ) : (
                  <>
                    Create Account
                    <span className="material-symbols-outlined ml-2 text-[18px]">
                      arrow_forward
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Login Link */}
          <div className="mt-6 pt-4 border-t border-[#c3c6d7]/60 text-center">
            <p className="text-xs text-[#434655]">
              Already have an account?{" "}
              <Link
                className="font-semibold text-[#004ac6] hover:text-[#003ea8] transition-colors"
                href="/login"
              >
                Log in
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
