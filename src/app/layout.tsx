import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HMS — Hospital Management System",
  description: "Comprehensive hospital management system for patient care, billing, and operations",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
