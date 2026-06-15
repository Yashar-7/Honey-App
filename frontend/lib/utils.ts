import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const STORAGE_KEY = "honey_owner_jwt";
export const EMAIL_KEY = "honey_owner_email";
export const NAME_KEY = "honey_owner_name";

export type Species = "Perro" | "Gato";

export const COLOR_OPTIONS = [
  { id: "negro", label: "Negro", value: "Negro", hex: "#1a1a1a" },
  { id: "blanco", label: "Blanco", value: "Blanco", hex: "#f5f5f5" },
  { id: "marron", label: "Marrón", value: "Marrón", hex: "#8B4513" },
  { id: "dorado", label: "Dorado", value: "Dorado", hex: "#DAA520" },
  { id: "gris", label: "Gris", value: "Gris", hex: "#808080" },
  { id: "atigrado", label: "Atigrado", value: "Atigrado", hex: "#C4A35A" },
  { id: "manchado", label: "Manchado", value: "Manchado", hex: "#4a4a4a" },
  { id: "personalizado", label: "Personalizado", value: "", hex: "#FFB700" },
] as const;

export function deriveOwnerNameFromEmail(email: string): string {
  const local = email.split("@")[0]?.trim() || "Dueño";
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export function persistOwnerSession(token: string, email: string, name: string) {
  sessionStorage.setItem(STORAGE_KEY, token);
  sessionStorage.setItem(EMAIL_KEY, email);
  sessionStorage.setItem(NAME_KEY, name);
}

export function buildFinderMessage(petName: string, ownerName: string): string {
  const owner = ownerName.trim() || "su dueño";
  return `¡${petName} se perdió! Tocá acá y avisale a ${owner} sin mostrar tu número`;
}

export function triggerHaptic(pattern: number | number[] = 50) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

export type RegisterPetResponse = {
  qrToken: string;
  scanUrl?: string;
  qrSvgUrl?: string;
  qrSvgDownloadUrl?: string;
  pet?: { id?: string; name?: string };
};
