"use client";

import { motion } from "framer-motion";
import { LoginLink } from "./LoginLink";
import { PrimaryCta } from "./PrimaryCta";

const HERO_IMAGE = "/assets/hero-mascota-qr.png";

const RADAR_RINGS = [
  { delay: "0s", size: "78%" },
  { delay: "1.05s", size: "92%" },
  { delay: "2.1s", size: "108%" },
] as const;

export function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 pb-12 pt-8 sm:px-6 sm:pb-16 sm:pt-12">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,193,7,0.1),transparent_55%)]"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-6xl lg:grid lg:grid-cols-2 lg:items-center lg:gap-12">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="text-center lg:text-left"
        >
          <p className="mb-3 inline-flex rounded-full border border-honey/30 bg-honey/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-honey">
            Si se escapa, cada minuto cuenta
          </p>

          <h1 className="text-[2.125rem] font-extrabold leading-[1.1] text-white sm:text-5xl lg:text-[3rem]">
            Honey App: que tu mascota vuelva a casa
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-muted lg:mx-0">
            El 90% de los perros y gatos que se pierden no regresan. Con una chapita QR en el
            collar, cualquier persona te avisa al instante — sin dar tu WhatsApp ni tu número.
          </p>

          <div className="mt-6 flex flex-col items-center gap-3 lg:items-start">
            <PrimaryCta />
            <p className="text-xs text-muted/90">Chapita física oficial · Activación por QR</p>
            <LoginLink />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.12, ease: "easeOut" }}
          className="relative mx-auto mt-10 w-full max-w-md lg:mt-0 lg:max-w-none"
        >
          {/* Radar 24/7 — detrás de la imagen (solo transform/opacity, GPU-friendly) */}
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 z-0 aspect-square w-[118%] -translate-x-1/2 -translate-y-1/2"
            aria-hidden="true"
          >
            <div className="absolute inset-[18%] rounded-full bg-honey/10 blur-2xl motion-reduce:hidden" />
            {RADAR_RINGS.map((ring) => (
              <div
                key={ring.delay}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div
                  className="rounded-full border border-honey/45 shadow-[0_0_24px_rgba(245,158,11,0.25)] motion-reduce:animate-none animate-radar-ring"
                  style={{
                    width: ring.size,
                    height: ring.size,
                    animationDelay: ring.delay,
                  }}
                />
              </div>
            ))}
            <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-honey shadow-[0_0_16px_rgba(245,158,11,0.9)] motion-safe:animate-pulse" />
          </div>

          <div className="relative z-10 overflow-hidden rounded-[20px] border border-honey/25 bg-card shadow-honey">
            <div className="relative aspect-[4/5] sm:aspect-[5/4]">
              <img
                src={HERO_IMAGE}
                alt="Perro con chapita QR Honey App en el collar"
                className="absolute inset-0 h-full w-full object-cover object-center"
                width={640}
                height={800}
                decoding="async"
                fetchPriority="high"
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-night via-night/45 to-transparent"
                aria-hidden="true"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-night/90 to-transparent p-5 sm:p-6">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-white drop-shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 motion-safe:animate-pulse" />
                  Escaneada → aviso instantáneo
                </p>
                <p className="mt-1 text-xs text-white/80 drop-shadow-sm">
                  Chapita QR en el collar · Rastreo activo 24/7
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
