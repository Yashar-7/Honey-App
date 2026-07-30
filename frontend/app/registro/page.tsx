"use client";

import { useEffect, useLayoutEffect, useState, type MouseEvent } from "react";
import { PetRegisterV2 } from "@/components/PetRegisterV2";
import { resolveOwnerDestination } from "@/lib/ownerAuth";
import { EMAIL_KEY, NAME_KEY, STORAGE_KEY } from "@/lib/utils";

const SERIAL_PATTERN = /^HNY-\d{3}$/;

/** Lectura segura de sessionStorage (Safari privado / storage bloqueado). */
function safeSessionGet(key: string): string {
  try {
    if (typeof window === "undefined") return "";
    return window.sessionStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function safeSessionRemove(...keys: string[]) {
  try {
    if (typeof window === "undefined") return;
    for (const key of keys) window.sessionStorage.removeItem(key);
  } catch {
    /* silencioso */
  }
}

/** Navegación ultra-segura para export estático (nunca lanza al React tree). */
function safeNavigate(href: string) {
  try {
    if (typeof window === "undefined") return;
    window.location.assign(href);
  } catch {
    try {
      window.location.href = href;
    } catch {
      /* silencioso: mejor quedarse en gate que tumbar la app */
    }
  }
}

function readSerialFromUrl(): string | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = (new URLSearchParams(window.location.search).get("serial") || "")
      .trim()
      .toUpperCase();
    return SERIAL_PATTERN.test(raw) ? raw : null;
  } catch {
    return null;
  }
}

function ChapitaGate() {
  const [guideOpen, setGuideOpen] = useState(false);
  const [logoOk, setLogoOk] = useState(true);

  function onSafeHomeClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    safeNavigate("/");
  }

  function onSafeLoginClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    safeNavigate("/login");
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-night px-4 py-10">
      <style>{`
        @keyframes honey-auth-scan {
          0% { transform: translateY(-8vh); opacity: 0; }
          12% { opacity: 0.95; }
          88% { opacity: 0.95; }
          100% { transform: translateY(108vh); opacity: 0; }
        }
        @keyframes honey-grid-drift {
          0% { background-position: 0 0; }
          100% { background-position: 48px 48px; }
        }
        .honey-auth-scan {
          animation: honey-auth-scan 3.4s ease-in-out infinite;
        }
        .honey-grid-drift {
          animation: honey-grid-drift 18s linear infinite;
        }
      `}</style>

      {/* Atmósfera cyber / grid */}
      <div
        aria-hidden
        className="honey-grid-drift pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(245,158,11,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.12) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.14)_0%,transparent_55%)]"
      />

      {/* Escáner de autenticidad en tiempo real */}
      <div
        aria-hidden
        className="honey-auth-scan pointer-events-none absolute inset-x-0 z-10 h-[2px]"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(52,211,153,0.15) 20%, rgba(52,211,153,0.95) 50%, rgba(245,158,11,0.9) 70%, transparent 100%)",
          boxShadow:
            "0 0 18px rgba(52,211,153,0.65), 0 0 36px rgba(245,158,11,0.35)",
        }}
      />

      <div className="relative z-20 w-full max-w-md">
        <div className="absolute -inset-[1px] rounded-chapita bg-gradient-to-br from-mustard/70 via-emerald-400/25 to-mustard/40 opacity-80 blur-[1px] animate-pulse" />
        <div className="relative overflow-hidden rounded-chapita border border-mustard/45 bg-card/95 px-6 py-10 text-center shadow-mustard backdrop-blur-sm">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-mustard/80 to-transparent"
          />

          {logoOk ? (
            <img
              src="/assets/honey-app-logo.png"
              alt="Honey App"
              width={72}
              height={72}
              className="relative mx-auto mb-5 h-[72px] w-[72px] object-contain drop-shadow-[0_0_18px_rgba(245,158,11,0.45)]"
              decoding="async"
              onError={() => setLogoOk(false)}
            />
          ) : (
            <div
              aria-hidden
              className="mx-auto mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-full border border-mustard/50 bg-night/80 font-extrabold tracking-widest text-mustard animate-pulse"
            >
              HNY
            </div>
          )}

          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.28em] text-mustard">
            Sistema de autenticación
          </p>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/35 bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Escáner activo · en vivo
          </div>
          <h1 className="mb-4 text-xl font-extrabold leading-snug text-white sm:text-2xl">
            Chapita física oficial requerida
          </h1>
          <p className="text-sm leading-relaxed text-white/75">
            Acceso restringido. Para proteger a tu mascota con Honey App, adquirí
            tu chapita física oficial en veterinarias y Pet Shops aliados.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-white/55">
            Si ya la tenés, escaneá el código QR impreso. El sistema validará el
            serial y abrirá el registro automáticamente.
          </p>

          <div className="mt-8 flex flex-col gap-3">
            {/* CTA principal: estado local + modal (sin router dinámico) */}
            <button
              type="button"
              onClick={() => {
                try {
                  setGuideOpen(true);
                } catch {
                  /* no-op */
                }
              }}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-mustard/60 bg-honey px-6 text-sm font-bold text-white shadow-honey transition hover:bg-honey-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mustard/70"
            >
              Cómo activar mi chapita
            </button>

            {/* Enlaces nativos + assign seguro (export estático) */}
            <a
              href="/"
              onClick={onSafeHomeClick}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 bg-night/60 px-6 text-sm font-semibold text-white/90 transition hover:border-mustard/40 hover:text-white"
            >
              Volver al inicio
            </a>
            <a
              href="/login"
              onClick={onSafeLoginClick}
              className="text-sm text-mustard/90 underline-offset-2 hover:underline"
            >
              Ya tengo cuenta — iniciar sesión
            </a>
          </div>
        </div>
      </div>

      {guideOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-night/80 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="chapita-guide-title"
          onClick={() => setGuideOpen(false)}
        >
          <div
            className="relative w-full max-w-sm overflow-hidden rounded-chapita border border-mustard/50 bg-card p-6 shadow-mustard"
            onClick={(event) => event.stopPropagation()}
          >
            <div
              aria-hidden
              className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse"
            />
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-mustard">
              Protocolo de activación
            </p>
            <h2
              id="chapita-guide-title"
              className="mb-3 text-lg font-extrabold text-white"
            >
              Escaneá tu chapita Honey
            </h2>
            <ol className="space-y-2 text-left text-sm leading-relaxed text-white/75">
              <li>1. Abrí la cámara del celular.</li>
              <li>2. Apuntá al QR grabado en la chapita (Ø18 mm).</li>
              <li>3. Entrá por el link corto `/s/XXXXXX`.</li>
              <li>4. El sistema te trae acá con el serial validado.</li>
            </ol>
            <p className="mt-4 text-xs leading-relaxed text-white/50">
              Sin serial oficial no se puede registrar. Así protegemos a todas las
              mascotas de la red.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setGuideOpen(false)}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-honey px-5 text-sm font-bold text-white hover:bg-honey-hover"
              >
                Entendido
              </button>
              <a
                href="/"
                onClick={onSafeHomeClick}
                className="inline-flex min-h-10 items-center justify-center text-sm text-mustard/90 underline-offset-2 hover:underline"
              >
                Ir al inicio
              </a>
            </div>
          </div>
        </div>
      ) : null}
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
  const [bootError, setBootError] = useState<string | null>(null);

  // Antes del paint: sin serial válido → gate inmediato (sin quedarse en "Cargando…")
  useLayoutEffect(() => {
    try {
      const serial = readSerialFromUrl();
      if (!serial) {
        setPhase("gate");
        setStockSerial("");
        return;
      }
      setStockSerial(serial);
      setPhase("loading");
    } catch {
      setPhase("gate");
      setStockSerial("");
    }
  }, []);

  useEffect(() => {
    if (phase !== "loading") return;

    let cancelled = false;

    async function initAuth() {
      try {
        const token = safeSessionGet(STORAGE_KEY);
        let forceRegister = false;
        try {
          const params = new URLSearchParams(window.location.search);
          forceRegister =
            params.get("modo") === "registro" || params.get("nueva") === "1";
        } catch {
          forceRegister = true;
        }

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
              safeSessionRemove(STORAGE_KEY, EMAIL_KEY, NAME_KEY);
              setAuthToken("");
              setOwnerName("Dueño");
              setOwnerEmail("");
              setPhase("ready");
              return;
            }
            if (dest === "/dashboard") {
              safeNavigate("/dashboard");
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
        setOwnerName(safeSessionGet(NAME_KEY) || "Dueño");
        setOwnerEmail(safeSessionGet(EMAIL_KEY) || "");
        setPhase("ready");
      } catch {
        if (cancelled) return;
        setBootError(
          "No pudimos preparar la sesión en este dispositivo. Podés reintentar o volver al inicio.",
        );
        setAuthToken("");
        setOwnerName("Dueño");
        setOwnerEmail("");
        setPhase("ready");
      }
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
      <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-night px-4">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 h-[2px] animate-pulse bg-gradient-to-r from-transparent via-emerald-400 to-transparent"
          style={{ top: "42%" }}
        />
        <p className="relative text-sm text-white/60">Cargando registro…</p>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-night px-4 py-6">
      {bootError ? (
        <div
          role="status"
          className="mx-auto mb-4 max-w-lg rounded-chapita border border-mustard/40 bg-card/90 px-4 py-3 text-center text-sm text-white/80"
        >
          {bootError}
        </div>
      ) : null}
      <PetRegisterV2
        authToken={authToken || ""}
        ownerName={ownerName || "Dueño"}
        ownerEmail={ownerEmail || ""}
        stockSerial={stockSerial || ""}
        onExit={() => {
          try {
            safeNavigate(authToken ? "/dashboard" : "/");
          } catch {
            /* silencioso */
          }
        }}
        onLogout={() => {
          try {
            safeSessionRemove(STORAGE_KEY, EMAIL_KEY, NAME_KEY);
            safeNavigate("/login");
          } catch {
            /* silencioso */
          }
        }}
      />
    </main>
  );
}
