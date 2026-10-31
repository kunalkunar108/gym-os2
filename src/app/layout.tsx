import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GymOS — Gym management, made simple",
  description: "A focused operating system for independent gyms in India.",
  applicationName: "GymOS",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
