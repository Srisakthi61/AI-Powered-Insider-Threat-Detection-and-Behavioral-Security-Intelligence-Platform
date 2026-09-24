import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import { SimulationProvider } from "./context/SimulationContext";

export const metadata = {
  title: "ITBIS SECURITY — Insider Threat Behavioral Intelligence System",
  description: "AI-Powered Insider Threat Detection and Behavioral Security Intelligence Platform",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-on-surface antialiased min-h-screen">
        <AuthProvider>
          <SimulationProvider>{children}</SimulationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
