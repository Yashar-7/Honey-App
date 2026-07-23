"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Newspaper, PawPrint, Radio } from "lucide-react";
import { PrimaryCta } from "./PrimaryCta";

type AlertCard = {
  id: string;
  name: string;
  zone: string;
  status: "Buscado" | "Reencontrado";
  photoUrl: string;
  species?: string;
  preview?: boolean;
};

type NewsCard = {
  id: string;
  title: string;
  blurb: string;
  tag: string;
};

const PREVIEW_ALERTS: AlertCard[] = [
  {
    id: "prev-1",
    name: "Lola",
    zone: "Constitución",
    status: "Buscado",
    photoUrl: "/assets/hero-mascota-qr.png",
    species: "Perro",
    preview: true,
  },
  {
    id: "prev-2",
    name: "Mora",
    zone: "Güemes",
    status: "Reencontrado",
    photoUrl: "/assets/honey-app-logo.png",
    species: "Gato",
    preview: true,
  },
  {
    id: "prev-3",
    name: "Toby",
    zone: "Centro",
    status: "Buscado",
    photoUrl: "/assets/hero-mascota-qr.png",
    species: "Perro",
    preview: true,
  },
];

const NEWS: NewsCard[] = [
  {
    id: "n1",
    title: "Microchip + chapita QR: la dupla que salva vidas",
    blurb:
      "En Mar del Plata, los rescates más rápidos combinan identificación permanente y aviso instantáneo al dueño.",
    tag: "Cuidado",
  },
  {
    id: "n2",
    title: "Vecinos que escanean, mascotas que vuelven",
    blurb:
      "La red Honey App convierte cada paseo en una oportunidad de ayuda anónima, sin exponer WhatsApp.",
    tag: "Comunidad",
  },
  {
    id: "n3",
    title: "Calor de verano: hidratación y collar seguro",
    blurb:
      "Tips locales para que la chapita quede firme y tu mascota no se escape en la costa.",
    tag: "Prevención",
  },
];

function StatusPill({ status }: { status: AlertCard["status"] }) {
  const lost = status === "Buscado";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
        lost
          ? "bg-red-500/15 text-red-400"
          : "bg-emerald-500/15 text-emerald-400"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          lost ? "animate-pulse bg-red-400" : "animate-pulse bg-emerald-400"
        }`}
      />
      {status}
    </span>
  );
}

export function CommunityAlertsFeed() {
  const [alerts, setAlerts] = useState<AlertCard[]>(PREVIEW_ALERTS);
  const [liveCount, setLiveCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/alerts/active");
        const data = (await res.json().catch(() => ({}))) as {
          count?: number;
          alerts?: Array<{
            id: string;
            name: string;
            photoUrl?: string | null;
            species?: string | null;
            isLost?: boolean;
          }>;
        };

        if (cancelled) return;
        setLiveCount(typeof data.count === "number" ? data.count : 0);

        const live = (data.alerts ?? [])
          .filter((a) => a.isLost)
          .slice(0, 3)
          .map((a, i) => ({
            id: a.id,
            name: a.name,
            zone: ["Constitución", "Güemes", "Centro"][i % 3],
            status: "Buscado" as const,
            photoUrl: a.photoUrl || "/assets/hero-mascota-qr.png",
            species: a.species || undefined,
            preview: false,
          }));

        if (live.length > 0) {
          setAlerts([...live, ...PREVIEW_ALERTS.filter((p) => p.status === "Reencontrado")].slice(0, 4));
        }
      } catch {
        /* preview local */
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="comunidad" className="px-4 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.45 }}
          className="mb-8 text-center sm:mb-10 sm:text-left"
        >
          <p className="mb-2 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-honey">
            <Radio className="h-3.5 w-3.5" aria-hidden />
            En vivo
          </p>
          <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
            Comunidad y alertas en tiempo real
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:mx-0 sm:text-base">
            Previsualizá cómo se ve la red cuando una mascota necesita ayuda.
            {liveCount > 0
              ? ` Ahora mismo hay ${liveCount} alerta${liveCount === 1 ? "" : "s"} activa${liveCount === 1 ? "" : "s"} en la ciudad.`
              : " Las tarjetas combinan alertas reales y una vista previa educativa."}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-6 md:grid-rows-2 md:gap-5">
          {/* Feed principal de alertas */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="rounded-[24px] border border-border bg-card p-4 md:col-span-4 md:row-span-2 sm:p-5"
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                <PawPrint className="h-4 w-4 text-honey" aria-hidden />
                Alertas recientes
              </h3>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                Mar del Plata
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {alerts.map((alert, i) => (
                <motion.article
                  key={alert.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.05 * i }}
                  whileHover={{ y: -2 }}
                  className="overflow-hidden rounded-2xl border border-border/80 bg-night/60"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-night">
                    <img
                      src={alert.photoUrl}
                      alt=""
                      className="h-full w-full object-cover opacity-90"
                      loading="lazy"
                    />
                    <div className="absolute left-2 top-2">
                      <StatusPill status={alert.status} />
                    </div>
                    {alert.preview && (
                      <span className="absolute bottom-2 right-2 rounded-md bg-night/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/70">
                        Vista previa
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-extrabold text-white">{alert.name}</h4>
                      <span className="text-xs text-muted">{alert.zone}</span>
                    </div>
                    {alert.species && (
                      <p className="mt-0.5 text-xs text-white/45">{alert.species}</p>
                    )}
                    <button
                      type="button"
                      className={`mt-3 inline-flex min-h-9 w-full items-center justify-center rounded-full text-xs font-bold transition ${
                        alert.status === "Buscado"
                          ? "bg-red-500/20 text-red-300 hover:bg-red-500/30"
                          : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                      }`}
                    >
                      {alert.status === "Buscado"
                        ? "Ayudar en la búsqueda"
                        : "Historia de reencuentro"}
                    </button>
                  </div>
                </motion.article>
              ))}
            </div>
          </motion.div>

          {/* Noticias + CTA */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.08 }}
            className="flex flex-col gap-4 md:col-span-2 md:row-span-2"
          >
            <div className="flex-1 rounded-[24px] border border-border bg-card p-4 sm:p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
                <Newspaper className="h-4 w-4 text-honey" aria-hidden />
                Noticias locales
              </h3>
              <ul className="space-y-3">
                {NEWS.map((item, i) => (
                  <motion.li
                    key={item.id}
                    initial={{ opacity: 0, x: 8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.06 * i }}
                    className="rounded-xl border border-border/60 bg-night/40 p-3 transition hover:border-honey/30"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider text-honey">
                      {item.tag}
                    </span>
                    <p className="mt-1 text-sm font-semibold leading-snug text-white">
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted">
                      {item.blurb}
                    </p>
                  </motion.li>
                ))}
              </ul>
            </div>

            <div className="rounded-[24px] border border-honey/35 bg-gradient-to-br from-honey/15 to-card p-5 text-center">
              <p className="text-sm font-bold text-white">
                Unite a la red con tu chapita
              </p>
              <p className="mt-1 text-xs text-muted">
                El registro solo se activa escaneando tu chapita oficial.
              </p>
              <div className="mt-4 flex justify-center">
                <PrimaryCta
                  label="Activá tu chapita"
                  className="!min-w-0 !px-5 !py-3 !text-sm"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
