"use client";

import { useEffect, useState } from "react";
import { PetRegisterV2 } from "@/components/PetRegisterV2";
import { resolveOwnerDestination } from "@/lib/ownerAuth";
import { EMAIL_KEY, NAME_KEY, STORAGE_KEY } from "@/lib/utils";

export default function RegistroPage() {
  const [ready, setReady] = useState(false);
  const [authToken, setAuthToken] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function guard() {
      const token = sessionStorage.getItem(STORAGE_KEY) || "";
      if (!token) {
        window.location.replace("/login");
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const forceRegister =
        params.get("modo") === "registro" || params.get("nueva") === "1";

      const dest = await resolveOwnerDestination(token, { forceRegister });
      if (dest === "/login") {
        window.location.replace("/login");
        return;
      }
      if (dest === "/dashboard.html") {
        window.location.replace(dest);
        return;
      }

      if (cancelled) return;
      setAuthToken(token);
      setOwnerName(sessionStorage.getItem(NAME_KEY) || "Dueño");
      setOwnerEmail(sessionStorage.getItem(EMAIL_KEY) || "");
      setReady(true);
    }

    guard();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-night px-4">
        <p className="text-sm text-white/60">Cargando portal del dueño…</p>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-night px-4 py-6">
      <PetRegisterV2
        authToken={authToken}
        ownerName={ownerName}
        ownerEmail={ownerEmail}
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
