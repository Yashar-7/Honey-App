"use client";

import { useEffect, useState } from "react";
import { PetRegisterV2 } from "@/components/PetRegisterV2";
import { resolveOwnerDestination } from "@/lib/ownerAuth";
import { EMAIL_KEY, NAME_KEY, STORAGE_KEY } from "@/lib/utils";

const SERIAL_PATTERN = /^HNY-\d{3}$/;

function ChapitaGate() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-night px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-mustard/30 bg-card px-6 py-10 text-center shadow-mustard">
        <img
          src="/assets/honey-app-logo.png"
          alt="Honey App"
          width={72}
          height={72}
          className="mx-auto mb-5 h-[72px] w-[72px] object-contain"
          decoding="async"
        />
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-mustard">
          Chapita física requerida
        </p>
        <h1 className="mb-4 text-xl font-extrabold leading-snug text-white sm:text-2xl">
          Activación solo con chapita oficial
        </h1>
        <p className="text-sm leading-relaxed text-white/70">
          Para proteger a tu mascota con Honey App, adquiere tu chapita física
          oficial en nuestras veterinarias aliadas.
        </p>
        <p className="mt-4 text-xs leading-relaxed text-white/45">
          Escaneá el QR de tu chapita o abrí el enlace impreso. El serial
          (ej. HNY-001) habilita el registro.
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

export default function RegistroPage() {
  const [ready, setReady] = useState(false);
  const [authToken, setAuthToken] = useState("");
  const [ownerName, setOwnerName] = useState("Dueño");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [stockSerial, setStockSerial] = useState("");
  const [hasValidSerial, setHasValidSerial] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const token = sessionStorage.getItem(STORAGE_KEY) || "";
      const params = new URLSearchParams(window.location.search);
      const forceRegister =
        params.get("modo") === "registro" || params.get("nueva") === "1";
      const serialParam = (params.get("serial") || "").trim().toUpperCase();
      const serialOk = SERIAL_PATTERN.test(serialParam);

      if (!serialOk) {
        if (cancelled) return;
        setHasValidSerial(false);
        setStockSerial("");
        setReady(true);
        return;
      }

      if (!token) {
        if (cancelled) return;
        setAuthToken("");
        setOwnerName("Dueño");
        setOwnerEmail("");
        setStockSerial(serialParam);
        setHasValidSerial(true);
        setReady(true);
        return;
      }

      if (!forceRegister) {
        const dest = await resolveOwnerDestination(token, { forceRegister: false });
        if (dest === "/login") {
          sessionStorage.removeItem(STORAGE_KEY);
          sessionStorage.removeItem(EMAIL_KEY);
          sessionStorage.removeItem(NAME_KEY);
          if (cancelled) return;
          setAuthToken("");
          setOwnerName("Dueño");
          setOwnerEmail("");
          setStockSerial(serialParam);
          setHasValidSerial(true);
          setReady(true);
          return;
        }
        if (dest === "/dashboard") {
          window.location.replace("/dashboard");
          return;
        }
      }

      if (cancelled) return;
      setAuthToken(token);
      setOwnerName(sessionStorage.getItem(NAME_KEY) || "Dueño");
      setOwnerEmail(sessionStorage.getItem(EMAIL_KEY) || "");
      setStockSerial(serialParam);
      setHasValidSerial(true);
      setReady(true);
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-night px-4">
        <p className="text-sm text-white/60">Cargando registro…</p>
      </main>
    );
  }

  if (!hasValidSerial) {
    return <ChapitaGate />;
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
