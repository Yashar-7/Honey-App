import type { Metadata } from "next";
import { LandingPage } from "@/components/landing";

export const metadata: Metadata = {
  title: "Honey App — Que tu mascota vuelva a casa",
  description:
    "Chapita QR en el collar. Si se pierde, te avisan al instante por chat interno — sin WhatsApp ni exponer tu número. Registrá gratis en 2 minutos.",
};

export default function HomePage() {
  return <LandingPage />;
}
