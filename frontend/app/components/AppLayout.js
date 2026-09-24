"use client";

import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function AppLayout({ children }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-on-surface w-full">
      {/* Sidebar */}
      <Sidebar
        mobileOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      {/* Main Staging Area */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0 w-full h-full overflow-y-auto overflow-x-hidden">
        <Header onToggleSidebar={() => setMobileNavOpen(!mobileNavOpen)} />
        <main className="flex-1 p-4 md:p-6 w-full min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
