"use client";

import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function AppLayout({ children }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-on-surface">
      {/* Sidebar */}
      <Sidebar
        mobileOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      {/* Main Staging Area */}
      <div className="flex-1 flex flex-col md:ml-64 w-full h-full overflow-y-auto">
        <Header onToggleSidebar={() => setMobileNavOpen(!mobileNavOpen)} />
        <main className="flex-1 p-md md:p-container-padding max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
