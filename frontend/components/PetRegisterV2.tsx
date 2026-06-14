"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Confetti from "react-confetti";
import QRCode from "qrcode";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  HeartPulse,
  PawPrint,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  buildFinderMessage,
  COLOR_OPTIONS,
  type RegisterPetResponse,
  type Species,
  triggerHaptic,
} from "@/lib/utils";

type Step = 1 | 2 | 3 | "success";

export interface PetRegisterV2Props {
  authToken: string;
  ownerName: string;
  ownerEmail?: string;
  onLogout?: () => void;
}

const stepProgress: Record<Step, number> = {
  1: 33,
  2: 66,
  3: 100,
  success: 100,
};

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
};

export function PetRegisterV2({
  authToken,
  ownerName,
  ownerEmail,
  onLogout,
}: PetRegisterV2Props) {
  const [step, setStep] = useState<Step>(1);
  const [direction, setDirection] = useState(1);
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [species, setSpecies] = useState<Species | null>(null);
  const [colorId, setColorId] = useState<string | null>(null);
  const [customColor, setCustomColor] = useState("#FFB700");
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showPhotoCelebration, setShowPhotoCelebration] = useState(false);
  const [stepCheck, setStepCheck] = useState<number | null>(null);
  const [exitOpen, setExitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RegisterPetResponse | null>(null);
  const [qrPngUrl, setQrPngUrl] = useState<string | null>(null);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [showHealthForm, setShowHealthForm] = useState(false);
  const [healthObservations, setHealthObservations] = useState("");
  const [healthSaving, setHealthSaving] = useState(false);
  const [healthSaved, setHealthSaved] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoPreviewRef = useRef<string | null>(null);

  const displayName = name.trim() || "tu mascota";
  const nameValid = name.trim().length >= 2;
  const nameTooShort = nameTouched && name.trim().length === 1;
  const photoValid = Boolean(photoFile);
  const step1Ready = nameValid && photoValid;
  const step2Ready = Boolean(species) && Boolean(colorId);

  const resolvedColor = useMemo(() => {
    if (!colorId) return "";
    const preset = COLOR_OPTIONS.find((c) => c.id === colorId);
    if (!preset) return "";
    if (colorId === "personalizado") {
      return customColor;
    }
    return preset.value;
  }, [colorId, customColor]);

  useEffect(() => {
    const update = () =>
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (step !== "success" && (name.trim() || photoFile || species)) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [step, name, photoFile, species]);

  useEffect(() => {
    return () => {
      if (photoPreviewRef.current) {
        URL.revokeObjectURL(photoPreviewRef.current);
      }
    };
  }, []);

  const goToStep = useCallback((next: Step, dir = 1) => {
    setDirection(dir);
    setStep(next);
    setStepCheck(next === "success" ? null : (next as number) - 1);
    setTimeout(() => setStepCheck(null), 900);
  }, []);

  const handlePhotoChange = (file: File | null) => {
    if (!file) return;
    if (photoPreviewRef.current) {
      URL.revokeObjectURL(photoPreviewRef.current);
    }
    const url = URL.createObjectURL(file);
    photoPreviewRef.current = url;
    setPhotoFile(file);
    setPhotoPreview(url);
    setShowConfetti(true);
    setShowPhotoCelebration(true);
    triggerHaptic([30, 40, 30]);
    setTimeout(() => setShowConfetti(false), 3200);
    setTimeout(() => setShowPhotoCelebration(false), 2800);
  };

  const advanceFromStep1 = () => {
    if (!step1Ready) return;
    triggerHaptic(50);
    goToStep(2);
  };

  const advanceFromStep2 = () => {
    if (!step2Ready) return;
    triggerHaptic(50);
    goToStep(3);
  };

  const submitPet = async () => {
    if (!species || !photoFile || !nameValid) return;
    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("species", species);
    formData.append("color", resolvedColor);
    formData.append(
      "finderMessage",
      buildFinderMessage(name.trim(), ownerName),
    );
    formData.append("photo", photoFile);

    try {
      const res = await fetch("/api/pets", {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
        body: formData,
      });
      const data = (await res.json().catch(() => ({}))) as RegisterPetResponse & {
        error?: string;
        message?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || data.message || `Error ${res.status}`);
      }

      setResult(data);
      const scanUrl =
        data.scanUrl ||
        `${window.location.origin}/?token=${encodeURIComponent(data.qrToken)}`;

      const png = await QRCode.toDataURL(scanUrl, {
        width: 300,
        margin: 2,
        color: { dark: "#0A1628", light: "#FFFFFF" },
      });
      setQrPngUrl(png);
      triggerHaptic([40, 60, 40]);
      goToStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar");
    } finally {
      setSubmitting(false);
    }
  };

  const downloadPng = () => {
    if (!qrPngUrl) return;
    const link = document.createElement("a");
    link.href = qrPngUrl;
    link.download = `honey-${name.trim().toLowerCase().replace(/\s+/g, "-")}-qr.png`;
    link.click();
    triggerHaptic(30);
  };

  const shareWhatsApp = () => {
    const scanUrl =
      result?.scanUrl ||
      `${window.location.origin}/?token=${encodeURIComponent(result?.qrToken || "")}`;
    const text = `${name.trim()} ya está protegida con Honey App 🐾\nEscaneá su chapita acá: ${scanUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    triggerHaptic(30);
  };

  const saveHealthObservations = async () => {
    const petId = result?.pet?.id;
    if (!petId) return;

    setHealthSaving(true);
    setHealthError(null);

    try {
      const res = await fetch(`/api/pets/${encodeURIComponent(petId)}/health`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ healthObservations }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.message || `Error ${res.status}`);
      }
      setHealthSaved(true);
      triggerHaptic([30, 50, 30]);
    } catch (err) {
      setHealthError(
        err instanceof Error ? err.message : "No se pudieron guardar los datos",
      );
    } finally {
      setHealthSaving(false);
    }
  };

  const resetFlow = () => {
    setName("");
    setNameTouched(false);
    setPhotoFile(null);
    if (photoPreviewRef.current) {
      URL.revokeObjectURL(photoPreviewRef.current);
      photoPreviewRef.current = null;
    }
    setPhotoPreview(null);
    setSpecies(null);
    setColorId(null);
    setShowCustomPicker(false);
    setResult(null);
    setQrPngUrl(null);
    setError(null);
    setShowHealthForm(false);
    setHealthObservations("");
    setHealthSaved(false);
    setHealthError(null);
    goToStep(1, -1);
  };

  const handleExitAttempt = () => {
    if (step === "success" || (!name.trim() && !photoFile && !species)) {
      onLogout?.();
      return;
    }
    setExitOpen(true);
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      {showConfetti && windowSize.width > 0 && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={180}
          colors={["#FFB700", "#FFA500", "#112240", "#FFFFFF"]}
        />
      )}

      <header className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2 text-mustard">
          <PawPrint className="h-5 w-5" aria-hidden />
          <span className="text-xs font-bold uppercase tracking-widest">
            Mar del Plata · Honey App
          </span>
        </div>
        <button
          type="button"
          onClick={handleExitAttempt}
          className="text-xs text-white/50 underline-offset-2 hover:text-mustard hover:underline"
        >
          Salir
        </button>
      </header>

      <div className="space-y-2 px-1">
        <div className="flex items-center justify-between text-xs text-white/50">
          <span>Paso {step === "success" ? 3 : step} de 3</span>
          <span>{stepProgress[step]}%</span>
        </div>
        <Progress value={stepProgress[step]} aria-label="Progreso del registro" />
      </div>

      <motion.article
        layout
        className="relative overflow-hidden rounded-chapita border-2 border-mustard bg-card p-5 shadow-mustard"
      >
        <div className="mb-4 space-y-1 text-center">
          <h1 className="text-xl font-extrabold leading-tight text-white sm:text-2xl">
            Protegé a{" "}
            <span className="text-mustard">{displayName}</span> en 20 segundos 🐾
          </h1>
          <p className="text-sm leading-relaxed text-white/65">
            Si se pierde, cualquiera la escanea y te avisa al toque por chat
            anónimo
          </p>
        </div>

        <AnimatePresence mode="wait" custom={direction}>
          {step === 1 && (
            <motion.div
              key="step1"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="space-y-4"
            >
              <label
                htmlFor="pet-photo-input"
                className="relative flex h-[40vh] min-h-[220px] max-h-[320px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-mustard/40 bg-night/60 transition hover:border-mustard/70 hover:bg-night/80"
              >
                <input
                  ref={fileInputRef}
                  id="pet-photo-input"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    if (file) handlePhotoChange(file);
                    e.target.value = "";
                  }}
                />
                {photoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoPreview}
                    alt={`Foto de ${displayName}`}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 px-4 text-center">
                    <Camera className="h-10 w-10 text-mustard" aria-hidden />
                    <p className="text-base font-bold text-white">
                      📸 Subí foto de {displayName}
                    </p>
                    <p className="text-xs text-white/50">
                      Tocá acá · cámara o galería
                    </p>
                  </div>
                )}
                {photoPreview && (
                  <span className="absolute bottom-3 rounded-full bg-night/80 px-3 py-1 text-xs font-semibold text-mustard backdrop-blur">
                    Cambiar foto
                  </span>
                )}
              </label>

              {showPhotoCelebration && nameValid && (
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-sm font-bold text-mustard"
                >
                  Qué linda que es {name.trim()}!!
                </motion.p>
              )}

              <div className="space-y-2">
                <label htmlFor="pet-name" className="sr-only">
                  Nombre de la mascota
                </label>
                <input
                  id="pet-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => setNameTouched(true)}
                  maxLength={80}
                  autoComplete="off"
                  placeholder="¿Cómo se llama?"
                  className="h-12 w-full rounded-2xl border border-mustard/25 bg-night/70 px-4 text-base text-white placeholder:text-white/35 focus:border-mustard focus:outline-none focus:ring-2 focus:ring-mustard/20"
                />
                {nameTooShort && (
                  <p className="text-sm text-mustard" role="alert">
                    Poné el nombre completo capo 😅
                  </p>
                )}
                {nameValid && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="font-script text-lg text-mustard"
                  >
                    Hola {name.trim()} 👋
                  </motion.p>
                )}
              </div>

              <div className="relative">
                <Button
                  type="button"
                  size="lg"
                  className="w-full"
                  disabled={!step1Ready}
                  onClick={advanceFromStep1}
                  aria-describedby={!step1Ready ? "step1-hint" : undefined}
                >
                  Siguiente
                  <ArrowRight className="h-5 w-5" aria-hidden />
                </Button>
                {!step1Ready && (
                  <p
                    id="step1-hint"
                    className="mt-2 text-center text-xs text-white/45"
                  >
                    {!photoValid
                      ? "Subí una foto para protegerla mejor 😢"
                      : "Escribí el nombre completo"}
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="space-y-5"
            >
              <div>
                <p className="mb-3 text-sm font-semibold text-white/80">
                  ¿Qué es {name.trim()}?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {(
                    [
                      { value: "Perro" as Species, emoji: "🐶", label: "Perro" },
                      { value: "Gato" as Species, emoji: "🐱", label: "Gato" },
                    ] as const
                  ).map((opt) => {
                    const selected = species === opt.value;
                    return (
                      <motion.button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setSpecies(opt.value);
                          triggerHaptic(20);
                        }}
                        animate={{ scale: selected ? 1.2 : 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 18 }}
                        className={`flex min-h-[88px] flex-col items-center justify-center gap-1 rounded-2xl border-2 text-base font-extrabold transition ${
                          selected
                            ? "border-mustard bg-mustard/15 text-mustard shadow-mustard"
                            : "border-mustard/20 bg-night/50 text-white/80 hover:border-mustard/40"
                        }`}
                        aria-pressed={selected}
                      >
                        <span className="text-3xl" aria-hidden>
                          {opt.emoji}
                        </span>
                        {opt.label}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-semibold text-white/80">Color</p>
                <div
                  className="grid grid-cols-4 gap-2"
                  role="radiogroup"
                  aria-label="Color de la mascota"
                >
                  {COLOR_OPTIONS.map((color) => {
                    const selected = colorId === color.id;
                    return (
                      <button
                        key={color.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => {
                          setColorId(color.id);
                          setShowCustomPicker(color.id === "personalizado");
                          triggerHaptic(15);
                        }}
                        className={`flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-xl border-2 px-1 py-2 text-[10px] font-bold transition ${
                          selected
                            ? "border-mustard shadow-mustard"
                            : "border-white/10 hover:border-mustard/40"
                        }`}
                      >
                        <span
                          className="h-7 w-7 rounded-full border border-white/20"
                          style={{
                            background:
                              color.id === "personalizado"
                                ? customColor
                                : color.hex,
                          }}
                          aria-hidden
                        />
                        {color.label}
                      </button>
                    );
                  })}
                </div>
                {showCustomPicker && (
                  <div className="mt-3 flex items-center gap-3 rounded-xl border border-mustard/30 bg-night/60 p-3">
                    <label htmlFor="custom-color" className="text-xs text-white/70">
                      Tu color
                    </label>
                    <input
                      id="custom-color"
                      type="color"
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      className="h-12 w-16 cursor-pointer rounded-lg border-0 bg-transparent"
                    />
                    <span className="text-xs font-mono text-mustard">{customColor}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => goToStep(1, -1)}
                >
                  ← Atrás
                </Button>
                <Button
                  type="button"
                  size="lg"
                  className="flex-[2]"
                  disabled={!step2Ready}
                  onClick={advanceFromStep2}
                >
                  Siguiente
                  <ArrowRight className="h-5 w-5" aria-hidden />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="space-y-4"
            >
              <div className="flex items-start gap-3 rounded-2xl border border-mustard/25 bg-night/50 p-4">
                {photoPreview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoPreview}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-xl object-cover ring-2 ring-mustard/40"
                  />
                )}
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-extrabold text-mustard">{name.trim()}</p>
                  <p className="text-white/70">
                    {species} · {resolvedColor}
                  </p>
                  <p className="mt-2 flex items-center gap-1 text-xs text-white/50">
                    <ShieldCheck className="h-3.5 w-3.5 text-mustard" aria-hidden />
                    Chat anónimo activado para vecinos
                  </p>
                </div>
              </div>

              <p className="text-center text-sm text-white/60">
                Confirmá y generamos la chapita QR al instante
              </p>

              {error && (
                <p className="rounded-xl border border-red-400/30 bg-red-950/30 px-3 py-2 text-sm text-red-200" role="alert">
                  {error}
                </p>
              )}

              <Button
                type="button"
                size="lg"
                className="w-full shadow-mustard"
                disabled={submitting}
                onClick={submitPet}
              >
                <QrCode className="h-5 w-5" aria-hidden />
                {submitting ? "Generando chapita…" : "Generar chapita QR"}
                <ArrowRight className="h-5 w-5" aria-hidden />
              </Button>

              <button
                type="button"
                onClick={() => goToStep(2, -1)}
                className="w-full text-center text-xs text-white/40 underline-offset-2 hover:text-mustard hover:underline"
              >
                ← Volver a editar
              </button>
            </motion.div>
          )}

          {step === "success" && result && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20"
              >
                <CheckCircle2 className="h-7 w-7 text-emerald-400" aria-hidden />
              </motion.div>

              <h2 className="text-xl font-extrabold text-mustard">
                {name.trim()} ahora está a salvo ✅
              </h2>

              <div className="mx-auto flex items-center justify-center rounded-2xl bg-white p-4 shadow-lg">
                {qrPngUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrPngUrl}
                    alt={`QR de ${name.trim()}`}
                    width={300}
                    height={300}
                    className="h-[300px] w-[300px] max-w-full object-contain"
                  />
                ) : (
                  <div className="flex h-[300px] w-[300px] items-center justify-center text-night/40">
                    Generando QR…
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <Button type="button" size="lg" className="w-full" onClick={downloadPng}>
                  <QrCode className="h-5 w-5" aria-hidden />
                  Descargar PNG
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="secondary"
                  className="w-full"
                  onClick={shareWhatsApp}
                >
                  Enviar QR a mi WhatsApp
                </Button>
              </div>

              <p className="text-xs leading-relaxed text-white/55">
                Tip Burro: Imprimí el QR y pegalo en su collar. Gratis.
              </p>

              {!showHealthForm ? (
                <button
                  type="button"
                  onClick={() => setShowHealthForm(true)}
                  className="mx-auto flex items-center justify-center gap-2 text-sm font-semibold text-mustard/90 underline-offset-2 hover:text-mustard hover:underline"
                >
                  <HeartPulse className="h-4 w-4" aria-hidden />
                  Completar perfil de salud (opcional)
                </button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 rounded-2xl border border-mustard/30 bg-night/50 p-4 text-left"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <HeartPulse className="h-5 w-5 shrink-0 text-mustard" aria-hidden />
                    <h3 className="text-sm font-extrabold text-mustard">
                      Observaciones de salud
                    </h3>
                  </div>
                  <p
                    className="mb-3 text-xs leading-relaxed text-white/55"
                    title="Privacidad Honey App"
                  >
                    Esta información solo será visible si la mascota se pierde,
                    para ayudar a quien la encuentre a cuidarla mejor.
                  </p>
                  <label htmlFor="health-observations" className="sr-only">
                    Observaciones de salud de {name.trim()}
                  </label>
                  <textarea
                    id="health-observations"
                    value={healthObservations}
                    onChange={(e) => {
                      setHealthObservations(e.target.value);
                      setHealthSaved(false);
                    }}
                    maxLength={1000}
                    rows={4}
                    placeholder="Ej: Toma medicación cada 12 hs · Alérgico al pollo · Asustadizo con ruidos fuertes"
                    className="min-h-[120px] w-full resize-y rounded-xl border border-mustard/25 bg-[#0A1628] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-mustard focus:outline-none focus:ring-2 focus:ring-mustard/15"
                  />
                  {healthError && (
                    <p className="mt-2 text-xs text-red-300" role="alert">
                      {healthError}
                    </p>
                  )}
                  {healthSaved && (
                    <p className="mt-2 text-xs font-semibold text-emerald-400">
                      Guardado · {name.trim()} está aún más protegida ✅
                    </p>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-3 w-full"
                    disabled={healthSaving}
                    onClick={saveHealthObservations}
                  >
                    {healthSaving ? "Guardando…" : "Guardar observaciones"}
                  </Button>
                </motion.div>
              )}

              <a
                href="/dashboard.html"
                className="block text-xs text-mustard/80 underline-offset-2 hover:text-mustard hover:underline"
              >
                Agregar más datos después →
              </a>

              <button
                type="button"
                onClick={resetFlow}
                className="text-xs text-white/40 underline-offset-2 hover:text-white/70 hover:underline"
              >
                Registrar otra mascota
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {stepCheck !== null && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute right-4 top-4"
            >
              <CheckCircle2 className="h-7 w-7 text-emerald-400" aria-hidden />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.article>

      {ownerEmail && (
        <p className="text-center text-[11px] text-white/35">
          Sesión: {ownerEmail}
        </p>
      )}

      <Dialog open={exitOpen} onOpenChange={setExitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Seguro?</DialogTitle>
            <DialogDescription>
              {name.trim() || "Tu mascota"} va a quedar sin protección. Si salís
              ahora, perdés el progreso del registro.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2">
            <Button type="button" onClick={() => setExitOpen(false)}>
              Seguir protegiendo a {displayName}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setExitOpen(false);
                onLogout?.();
              }}
            >
              Salir igual
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PetRegisterV2;
