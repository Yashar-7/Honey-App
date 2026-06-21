"use client";

import { useEffect, useState } from "react";
import { PetRegisterV2 } from "@/components/PetRegisterV2";
import { resolveOwnerDestination } from "@/lib/ownerAuth";
import { EMAIL_KEY, NAME_KEY, STORAGE_KEY } from "@/lib/utils";

export default function RegistroPage() {
  const [ready, setReady] = useState(false);
  const [authToken, setAuthToken] = useState("");
  const [ownerName, setOwnerName] = useState("Dueño");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [stockSerial, setStockSerial] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const token = sessionStorage.getItem(STORAGE_KEY) || "";
      const params = new URLSearchParams(window.location.search);
      const forceRegister =
        params.get("modo") === "registro" || params.get("nueva") === "1";
      const serialParam = (params.get("serial") || "").trim().toUpperCase();

      if (!token) {
        if (cancelled) return;
        setAuthToken("");
        setOwnerName("Dueño");
        setOwnerEmail("");
        setStockSerial(serialParam);
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
