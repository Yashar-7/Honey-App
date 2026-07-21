"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { PetRegisterV2 } from "@/components/PetRegisterV2";
import { resolveOwnerDestination } from "@/lib/ownerAuth";
import { EMAIL_KEY, NAME_KEY, STORAGE_KEY } from "@/lib/utils";

const SERIAL_PATTERN = /^HNY-\d{3}$/;

function readSerialFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const raw = (new URLSearchParams(window.location.search).get("serial") || "")
    .trim()
    .toUpperCase();
  return SERIAL_PATTERN.test(raw) ? raw : null;
}

function ChapitaGate() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-night px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-mustard/35 bg-card px-6 py-10 text-center shadow-mustard">
        <img
          src="/assets/honey-app-logo.png"
          alt="Honey App"
          width={72}
          height={72}
          className="mx-auto mb-5 h-[72px] w-[72px] object-contain"
          decoding="async"
        />
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-mustard">
          Acceso restringido
        </p>
        <h1 className="mb-4 text-xl font-extrabold leading-snug text-white sm:text-2xl">
          Chapita física oficial requerida
        </h1>
        <p className="text-sm leading-relaxed text-white/75">
          Acceso Restringido. Para proteger a tu mascota con Honey App, adquiere
          tu chapita física oficial en nuestras veterinarias y Pet Shops
          aliados.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-white/55">
          Si ya la tienes, escanea el código QR impreso para activar tu cuenta.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <a
            href="/"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-honey px-6 text-sm font-bold text-white shadow-honey transition hover:bg-honey-hover"
          >
            Volver al inicio
          </a>
          <a
            href="/login"
            className="text-sm text-mustard/90 underline-offset-2 hover:underline"
          >
            Ya tengo cuenta — iniciar sesión
          </a>
        </div>
      </div>
    </main>
  );
}

type Phase = "boot" | "gate" | "loading" | "ready";

export default function RegistroPage() {
  const [phase, setPhase] = useState<Phase>("boot");
  const [authToken, setAuthToken] = useState("");
  const [ownerName, setOwnerName] = useState("Dueño");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [stockSerial, setStockSerial] = useState("");

  // Antes del paint: sin serial válido → gate inmediato (sin quedarse en "Cargando…")
  useLayoutEffect(() => {
    const serial = readSerialFromUrl();
    if (!serial) {
      setPhase("gate");
      setStockSerial("");
      return;
    }
    setStockSerial(serial);
    setPhase("loading");
  }, []);

  useEffect(() => {
    if (phase !== "loading") return;

    let cancelled = false;
    const serial = stockSerial;

    async function initAuth() {
      const token = sessionStorage.getItem(STORAGE_KEY) || "";
      const params = new URLSearchParams(window.location.search);
      const forceRegister =
        params.get("modo") === "registro" || params.get("nueva") === "1";

      if (!token) {
        if (cancelled) return;
        setAuthToken("");
        setOwnerName("Dueño");
        setOwnerEmail("");
        setPhase("ready");
        return;
      }

      if (!forceRegister) {
        try {
          const dest = await resolveOwnerDestination(token, {
            forceRegister: false,
          });
          if (cancelled) return;

          if (dest === "/login") {
            sessionStorage.removeItem(STORAGE_KEY);
            sessionStorage.removeItem(EMAIL_KEY);
            sessionStorage.removeItem(NAME_KEY);
            setAuthToken("");
            setOwnerName("Dueño");
            setOwnerEmail("");
            setPhase("ready");
            return;
          }
          if (dest === "/dashboard") {
            window.location.replace("/dashboard");
            return;
          }
        } catch {
          if (cancelled) return;
          setAuthToken("");
          setPhase("ready");
          return;
        }
      }

      if (cancelled) return;
      setAuthToken(token);
      setOwnerName(sessionStorage.getItem(NAME_KEY) || "Dueño");
      setOwnerEmail(sessionStorage.getItem(EMAIL_KEY) || "");
      setPhase("ready");
    }

    void initAuth();
    return () => {
      cancelled = true;
    };
  }, [phase, stockSerial]);

  if (phase === "gate") {
    return <ChapitaGate />;
  }

  if (phase === "boot" || phase === "loading") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-night px-4">
        <p className="text-sm text-white/60">Cargando registro…</p>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-night px-4 py-6">
      <PetRegisterV2
        authToken={authToken}
        ownerName={ownerName}
        ownerEmail={ownerEmail}
        stockSerial={stockSerial}
        onExit={() => {
          window.location.href = authToken ? "/dashboard" : "/";
        }}
        onLogout={() => {
          sessionStorage.removeItem(STORAGE_KEY);
          sessionStorage.removeItem(EMAIL_KEY);
          sessionStorage.removeItem(NAME_KEY);
          window.location.href = "/login";
        }}
      />
    </main>
  );
}
