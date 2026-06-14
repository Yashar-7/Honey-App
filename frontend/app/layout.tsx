import type { Metadata, Viewport } from "next";
import { Dancing_Script } from "next/font/google";
import "./globals.css";

const scriptFont = Dancing_Script({
  subsets: ["latin"],
  variable: "--font-script",
});

export const metadata: Metadata = {
  title: "Honey App — Protegé a tu mascota",
  description:
    "Registrá la chapita QR de tu mascota en Mar del Plata. Si se pierde, te avisan al toque.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${scriptFont.variable} bg-night`}>{children}</body>
    </html>
  );
}
