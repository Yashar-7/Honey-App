"use client";

import { FormEvent, useState } from "react";
import {
  EMAIL_KEY,
  NAME_KEY,
  STORAGE_KEY,
  persistOwnerSession,
} from "@/lib/utils";

const ADMIN_FLAG_KEY = "honey_owner_is_admin";

function safeNavigate(href: string) {
  try {
    window.location.assign(href);
  } catch {
    try {
      window.location.href = href;
    } catch {
      /* silencioso */
    }
  }
}

function safePersistAdminSession(token: string, email: string, name: string) {
  try {
    persistOwnerSession(token, email, name);
    sessionStorage.setItem(ADMIN_FLAG_KEY, "1");
  } catch {
    try {
      sessionStorage.setItem(STORAGE_KEY, token);
      sessionStorage.setItem(EMAIL_KEY, email);
      sessionStorage.setItem(NAME_KEY, name);
      sessionStorage.setItem(ADMIN_FLAG_KEY, "1");
    } catch {
      /* silencioso */
    }
  }
}

/**
 * Acceso secreto de administrador.
 * No pasa por ChapitaGate ni exige ?serial= — login allowlist → /dashboard.
 */
export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        token?: string;
        user?: { name?: string; email?: string };
        error?: string;
        message?: string;
        redirectTo?: string;
      };

      if (!res.ok || !data.token) {
        throw new Error(
          data.error || data.message || "No se pudo iniciar sesión de admin",
        );
      }

      const sessionEmail = data.user?.email || email.trim();
      const sessionName = data.user?.name || "Administrador";
      safePersistAdminSession(data.token, sessionEmail, sessionName);

      // Hub unificado (nunca /registro ni panel fragmentado)
      safeNavigate(data.redirectTo || "/admin/dashboard/");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error de autenticación";
      setError(message);
      setSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-night px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.14),transparent_55%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(245,158,11,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.15) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        <div className="absolute -inset-[1px] rounded-chapita bg-gradient-to-br from-mustard/60 via-honey/20 to-mustard/30 opacity-80 blur-[1px]" />
        <section className="relative overflow-hidden rounded-chapita border border-mustard/40 bg-card/95 px-6 py-8 shadow-mustard backdrop-blur-sm">
          <div className="mb-6 text-center">
            <img
              src="/assets/honey-app-logo.png"
              alt="Honey App"
              width={64}
              height={64}
              className="mx-auto mb-4 h-16 w-16 object-contain"
              decoding="async"
            />
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.28em] text-mustard">
              Acceso restringido
            </p>
            <h1 className="text-xl font-extrabold text-white sm:text-2xl">
              Consola de administración
            </h1>
            <p className="mt-2 text-sm text-white/60">
              Entrada directa al panel — sin chapita física ni serial de stock.
            </p>
          </div>

          <form className="space-y-4" onSubmit={onSubmit} noValidate>
            <div>
              <label
                htmlFor="admin-email"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/55"
              >
                Usuario / Email
              </label>
              <input
                id="admin-email"
                name="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="min-h-12 w-full rounded-xl border border-border bg-night/70 px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-mustard/60 focus:ring-2 focus:ring-mustard/25"
                placeholder="admin@honey.app"
              />
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/55"
              >
                Contraseña
              </label>
              <input
                id="admin-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                minLength={1}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="min-h-12 w-full rounded-xl border border-border bg-night/70 px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-mustard/60 focus:ring-2 focus:ring-mustard/25"
                placeholder="••••••••"
              />
            </div>

            {error ? (
              <p
                role="alert"
                className="rounded-xl border border-red-400/30 bg-red-950/35 px-3 py-2 text-sm text-red-200"
              >
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-honey px-6 text-sm font-bold text-white shadow-honey transition hover:bg-honey-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Verificando…" : "Entrar a la consola admin"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-white/40">
            Solo cuentas listadas en{" "}
            <span className="font-mono text-mustard/80">ADMIN_EMAILS</span>.
          </p>
        </section>
      </div>
    </main>
  );
}
