import type { Metadata, Viewport } from "next";
import { LayoutShell } from "@/components/ui/LayoutShell";
import { Suspense } from 'react'
import { AppCallBanner } from "@/components/ui/AppCallBanner";
import "./globals.css";

export const metadata: Metadata = {
  title: "SIDEQUEST",
  description: "Your journey. Your people. Your side quests.",
};

export const viewport: Viewport = {
  themeColor: "#0B1220",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={null}><AppCallBanner /></Suspense>
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}



