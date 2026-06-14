import type { Metadata } from "next";
import { LandingPage } from "@/components/landing";

export const metadata: Metadata = {
  title: "Honey App — Seguridad Real para tu Mascota",
  description:
    "Registrá a tu mascota, generá su chapita QR y recibí alertas privadas sin exponer tu teléfono. Solución profesional para dueños y pet shops.",
};

export default function HomePage() {
  return <LandingPage />;
}
