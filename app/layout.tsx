import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SAENAGA Reminder",
  description: "Pengingat presensi SAENAGA pribadi",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="id"><body>{children}</body></html>;
}