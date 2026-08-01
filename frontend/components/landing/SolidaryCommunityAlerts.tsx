"use client";

import { FormEvent, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Camera, HeartHandshake, MapPin, Send } from "lucide-react";

type CommunityAlertCard = {
  id: string;
  species: string;
  zone: string;
  photoUrl: string;
  notes: string | null;
  createdAt: string;
};

const MDP_ZONES = [
  "Centro",
  "Güemes",
  "Constitución",
  "La Perla",
  "Puerto",
  "Batán",
  "Sierra de los Padres",
  "Playa Grande",
  "Otro / no sé",
] as const;

const MAX_EDGE_PX = 1280;
const WEBP_QUALITY = 0.72;

/** Comprime a WebP liviano en el cliente (fricción cero / menos costo de storage). */
async function compressImageToWebp(file: File): Promise<File> {
  if (typeof window === "undefined") return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/webp", WEBP_QUALITY),
  );

  if (!blob) return file;

  const base = file.name.replace(/\.[^.]+$/, "") || "callejero";
  return new File([blob], `${base}.webp`, { type: "image/webp" });
}

/**
 * Feed + formulario público: alertas solidarias sin registro ni chapita.
 */
export function SolidaryCommunityAlerts() {
  const [alerts, setAlerts] = useState<CommunityAlertCard[]>([]);
  const [species, setSpecies] = useState<"perro" | "gato">("perro");
  const [zone, setZone] = useState<string>(MDP_ZONES[0]);
  const [whatsapp, setWhatsapp] = useState("");
  const [notes, setNotes] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/community-alerts");
        const data = (await res.json().catch(() => ({}))) as {
          alerts?: CommunityAlertCard[];
        };
        if (!cancelled && Array.isArray(data.alerts)) {
          setAlerts(data.alerts);
        }
      } catch {
        /* silencioso */
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setOkMsg(null);

    if (!photoFile) {
      setError("Subí una foto del animal (obligatoria).");
      return;
    }

    setSubmitting(true);
    try {
      const compressed = await compressImageToWebp(photoFile);
      const form = new FormData();
      form.append("photo", compressed);
      form.append("species", species);
      form.append("zone", zone);
      form.append("whatsapp", whatsapp.trim());
      if (notes.trim()) form.append("notes", notes.trim());

      const res = await fetch("/api/community-alerts/free", {
        method: "POST",
        body: form,
        // Sin Authorization: endpoint público a propósito
      });

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        alert?: CommunityAlertCard;
      };

      if (!res.ok) {
        throw new Error(data.error || data.message || "No se pudo publicar la alerta");
      }

      if (data.alert) {
        setAlerts((prev) => [data.alert!, ...prev].slice(0, 16));
      }

      setWhatsapp("");
      setNotes("");
      setPhotoFile(null);
      setOkMsg(data.message || "Alerta publicada. Gracias por cuidar la calle.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar");
    } finally {
      setSubmitting(false);
    }
  }

  const fieldClass =
    "min-h-11 w-full rounded-xl border border-border bg-night/70 px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-mustard/60 focus:ring-2 focus:ring-mustard/20";

  return (
    <section id="alertas-solidarias" className="px-4 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.45 }}
          className="mb-8 text-center sm:mb-10 sm:text-left"
        >
          <p className="mb-2 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-honey">
            <HeartHandshake className="h-3.5 w-3.5" aria-hidden />
            Sin registro · Fricción cero
          </p>
          <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
            Alertas Solidarias de la Comunidad
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:mx-0 sm:text-base">
            ¿Viste un perro o gato de la calle en riesgo? Subí una foto, indicá la
            zona y tu WhatsApp. No hace falta cuenta ni chapita Honey.
          </p>
        </motion.div>

        <div className="grid gap-5 lg:grid-cols-5">
          <motion.form
            onSubmit={onSubmit}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-[24px] border border-mustard/35 bg-card p-5 shadow-mustard sm:p-6 lg:col-span-2"
          >
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-mustard">
              Reportar ahora
            </h3>

            <div className="mb-4">
              <p className="mb-2 text-xs font-semibold text-white/55">Animal</p>
              <div className="grid grid-cols-2 gap-2">
                {(["perro", "gato"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSpecies(s)}
                    className={`min-h-11 rounded-full text-sm font-bold capitalize transition ${
                      species === s
                        ? "bg-honey text-white shadow-honey"
                        : "border border-border bg-night/50 text-white/70 hover:border-mustard/40"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-semibold text-white/55" htmlFor="solidary-zone">
                Zona de Mar del Plata
              </label>
              <select
                id="solidary-zone"
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                className={fieldClass}
              >
                {MDP_ZONES.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-semibold text-white/55" htmlFor="solidary-wa">
                Tu WhatsApp
              </label>
              <input
                id="solidary-wa"
                required
                inputMode="tel"
                autoComplete="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="223 555 1234"
                className={fieldClass}
              />
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-semibold text-white/55" htmlFor="solidary-photo">
                Foto (se comprime a WebP en tu celular)
              </label>
              <label
                htmlFor="solidary-photo"
                className="flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-dashed border-mustard/40 bg-night/40 px-3 py-4 text-center transition hover:border-mustard/70"
              >
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Vista previa"
                    className="max-h-36 w-full rounded-xl object-cover"
                  />
                ) : (
                  <>
                    <Camera className="h-7 w-7 text-mustard" aria-hidden />
                    <span className="text-sm text-white/70">Tocá para subir foto</span>
                  </>
                )}
              </label>
              <input
                id="solidary-photo"
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setPhotoFile(f);
                }}
              />
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-semibold text-white/55" htmlFor="solidary-notes">
                Nota (opcional)
              </label>
              <textarea
                id="solidary-notes"
                rows={2}
                maxLength={500}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: herido, con collar, cerca de la plaza…"
                className="w-full rounded-xl border border-border bg-night/70 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-mustard/60"
              />
            </div>

            {error ? (
              <p role="alert" className="mb-3 rounded-xl border border-red-400/30 bg-red-950/35 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            ) : null}
            {okMsg ? (
              <p role="status" className="mb-3 rounded-xl border border-emerald-400/30 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">
                {okMsg}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-honey px-6 text-sm font-bold text-white shadow-honey transition hover:bg-honey-hover disabled:opacity-60"
            >
              <Send className="h-4 w-4" aria-hidden />
              {submitting ? "Comprimiendo y enviando…" : "Publicar alerta solidaria"}
            </button>
          </motion.form>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 }}
            className="rounded-[24px] border border-border bg-card p-5 sm:p-6 lg:col-span-3"
          >
            <h3 className="mb-4 text-sm font-bold text-white">Últimas alertas de la calle</h3>
            {alerts.length === 0 ? (
              <p className="text-sm text-muted">
                Todavía no hay reportes. Sé la primera persona en avisar.
              </p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {alerts.map((alert) => (
                  <li
                    key={alert.id}
                    className="overflow-hidden rounded-2xl border border-border/70 bg-night/50"
                  >
                    <div className="relative aspect-[16/10] bg-night">
                      <img
                        src={alert.photoUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      <span className="absolute left-2 top-2 rounded-full bg-night/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-honey">
                        {alert.species}
                      </span>
                    </div>
                    <div className="p-3">
                      <p className="flex items-center gap-1.5 text-xs text-white/70">
                        <MapPin className="h-3.5 w-3.5 text-mustard" aria-hidden />
                        {alert.zone}
                      </p>
                      {alert.notes ? (
                        <p className="mt-1 line-clamp-2 text-xs text-muted">{alert.notes}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
