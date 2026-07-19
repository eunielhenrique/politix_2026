import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "Politix — Inteligência eleitoral",
  description: "Rede de lideranças, promessa × entrega de votos. Campanha Wesley Cezar (Lelinho) — SP 2026.",
  applicationName: "Politix",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Politix" },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${GeistSans.variable} ${GeistMono.variable} h-full`}>
      <body className="h-full">{children}</body>
    </html>
  );
}
