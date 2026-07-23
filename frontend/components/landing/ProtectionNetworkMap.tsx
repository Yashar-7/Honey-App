"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MapPin, Navigation, Store, Stethoscope, X } from "lucide-react";
import { PrimaryCta } from "./PrimaryCta";

type PetShop = {
  id: string;
  name: string;
  type: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
};

/** Aliados de respaldo (MDP) si /api/pet-shops está vacío. */
const FALLBACK_SHOPS: PetShop[] = [
  {
    id: "fallback-1",
    name: "Veterinaria Atlántica",
    type: "veterinary",
    address: "Av. Colón 3200, Mar del Plata",
    latitude: -38.0022,
    longitude: -57.5485,
  },
  {
    id: "fallback-2",
    name: "Clínica Vet del Sur",
    type: "veterinary",
    address: "Jujuy 1850, Mar del Plata",
    latitude: -38.0185,
    longitude: -57.532,
  },
  {
    id: "fallback-3",
    name: "Pet Shop Max",
    type: "petshop",
    address: "San Martín 2650, Mar del Plata",
    latitude: -38.008,
    longitude: -57.561,
  },
  {
    id: "fallback-4",
    name: "Huellas & Co.",
    type: "petshop",
    address: "Güemes 2800, Mar del Plata",
    latitude: -37.995,
    longitude: -57.539,
  },
  {
    id: "fallback-5",
    name: "Veterinaria Centro MDP",
    type: "veterinary",
    address: "Independencia 2100, Mar del Plata",
    latitude: -37.9995,
    longitude: -57.5565,
  },
];

const MDP_BOUNDS = {
  minLat: -38.04,
  maxLat: -37.97,
  minLng: -57.59,
  maxLng: -57.51,
};

function projectPin(lat: number, lng: number) {
  const x =
    ((lng - MDP_BOUNDS.minLng) / (MDP_BOUNDS.maxLng - MDP_BOUNDS.minLng)) * 100;
  const y =
    ((MDP_BOUNDS.maxLat - lat) / (MDP_BOUNDS.maxLat - MDP_BOUNDS.minLat)) * 100;
  return {
    left: `${Math.min(92, Math.max(8, x))}%`,
    top: `${Math.min(88, Math.max(12, y))}%`,
  };
}

function typeLabel(type: string) {
  return type === "veterinary" || type === "vet" ? "Veterinaria" : "Pet Shop";
}

export function ProtectionNetworkMap() {
  const [shops, setShops] = useState<PetShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/pet-shops");
        const data = (await res.json().catch(() => ({}))) as {
          petShops?: PetShop[];
        };
        const list = Array.isArray(data.petShops) ? data.petShops : [];
        const withCoords = list.filter(
          (s) =>
            typeof s.latitude === "number" &&
            typeof s.longitude === "number" &&
            Number.isFinite(s.latitude) &&
            Number.isFinite(s.longitude),
        );
        if (!cancelled) {
          setShops(withCoords.length > 0 ? withCoords : FALLBACK_SHOPS);
        }
      } catch {
        if (!cancelled) setShops(FALLBACK_SHOPS);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = useMemo(
    () => shops.find((s) => s.id === selectedId) ?? null,
    [shops, selectedId],
  );

  return (
    <section id="mapa-vivo" className="px-4 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.45 }}
          className="mb-8 text-center sm:mb-10 sm:text-left"
        >
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-honey">
            Red de protección
          </p>
          <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
            Red de protección en Mar del Plata
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:mx-0 sm:text-base">
            El mapa vivo de veterinarias y Pet Shops aliados. Escaneá una
            chapita cerca de estos puntos y activá la red de vecinos.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="relative overflow-hidden rounded-[24px] border border-border bg-card"
        >
          <div
            className="relative aspect-[4/5] w-full sm:aspect-[16/10]"
            style={{
              background:
                "radial-gradient(ellipse at 30% 20%, rgba(245,158,11,0.08), transparent 50%), linear-gradient(160deg, #0b1220 0%, #132033 45%, #0f172a 100%)",
            }}
          >
            {/* Costa / grilla sutil */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.14]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(148,163,184,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.35) 1px, transparent 1px)",
                backgroundSize: "48px 48px",
              }}
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -right-8 top-8 h-40 w-40 rounded-full border border-honey/20 sm:h-56 sm:w-56"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute bottom-10 left-6 max-w-[40%] text-[10px] font-semibold uppercase tracking-widest text-white/25 sm:text-xs"
              aria-hidden
            >
              Mar del Plata · Atlántico
            </div>

            {loading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-night/40">
                <p className="text-sm text-white/60">Cargando aliados…</p>
              </div>
            )}

            {shops.map((shop, index) => {
              if (shop.latitude == null || shop.longitude == null) return null;
              const pos = projectPin(shop.latitude, shop.longitude);
              const active = selectedId === shop.id;
              const isVet =
                shop.type === "veterinary" || shop.type === "vet";

              return (
                <motion.button
                  key={shop.id}
                  type="button"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.08 * index, type: "spring", stiffness: 320 }}
                  onClick={() =>
                    setSelectedId((id) => (id === shop.id ? null : shop.id))
                  }
                  className="absolute z-20 -translate-x-1/2 -translate-y-full focus:outline-none"
                  style={{ left: pos.left, top: pos.top }}
                  aria-label={`${shop.name} — ${typeLabel(shop.type)}`}
                >
                  <span
                    className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 shadow-lg transition ${
                      active
                        ? "scale-110 border-white bg-honey text-night"
                        : isVet
                          ? "border-honey/60 bg-night text-honey"
                          : "border-sky-400/50 bg-night text-sky-300"
                    }`}
                  >
                    {isVet ? (
                      <Stethoscope className="h-4 w-4" aria-hidden />
                    ) : (
                      <Store className="h-4 w-4" aria-hidden />
                    )}
                    <span className="absolute inset-0 animate-ping rounded-full bg-honey/30 opacity-40" />
                  </span>
                </motion.button>
              );
            })}

            <AnimatePresence>
              {selected && (
                <motion.div
                  key={selected.id}
                  initial={{ opacity: 0, y: 12, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.22 }}
                  className="absolute bottom-4 left-4 right-4 z-30 sm:bottom-6 sm:left-6 sm:right-auto sm:max-w-sm"
                >
                  <div className="rounded-2xl border border-honey/30 bg-night/95 p-4 shadow-honey backdrop-blur-md">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-honey">
                          {typeLabel(selected.type)}
                        </p>
                        <h3 className="mt-1 text-lg font-extrabold text-white">
                          {selected.name}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedId(null)}
                        className="rounded-full p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white"
                        aria-label="Cerrar"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="mt-2 flex items-start gap-2 text-sm text-muted">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-honey" />
                      <span>
                        {selected.address ||
                          "Mar del Plata · consultá en el local"}
                      </span>
                    </p>
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <a
                        href={
                          selected.latitude != null && selected.longitude != null
                            ? `https://www.google.com/maps/dir/?api=1&destination=${selected.latitude},${selected.longitude}`
                            : "https://www.google.com/maps/search/?api=1&query=Mar+del+Plata+veterinaria"
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-bold text-white transition hover:border-honey/40"
                      >
                        <Navigation className="h-4 w-4 text-honey" />
                        Cómo llegar
                      </a>
                      <PrimaryCta
                        label="Activá tu chapita"
                        className="!min-w-0 !flex-1 !px-4 !py-2.5 !text-sm"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-6">
            <p className="text-xs text-muted">
              {shops.length} aliados en la red · tocá un pin para ver detalle
            </p>
            <div className="flex items-center gap-4 text-[11px] text-white/60">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-honey" /> Veterinaria
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-sky-400" /> Pet Shop
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
