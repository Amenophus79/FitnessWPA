import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { RegisterServiceWorker } from "@/app/register-service-worker";
import { QueryProvider } from "@/services/query-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fitness PWA",
  description: "Offline-first multi-sport training planner",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" }
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", type: "image/png", sizes: "180x180" }]
  },
  appleWebApp: {
    capable: true,
    title: "Fitness PWA",
    statusBarStyle: "default"
  }
};

export const viewport: Viewport = {
  themeColor: "#14836f",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <RegisterServiceWorker />
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
