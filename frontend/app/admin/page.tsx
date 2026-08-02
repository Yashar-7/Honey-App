"use client";

import { useEffect } from "react";

/** Compat: /admin → Master Hub unificado. */
export default function AdminRedirectPage() {
  useEffect(() => {
    try {
      window.location.replace("/admin/dashboard/");
    } catch {
      window.location.href = "/admin/dashboard/";
    }
  }, []);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-night px-4">
      <p className="text-sm text-white/60">Abriendo consola unificada…</p>
    </main>
  );
}
