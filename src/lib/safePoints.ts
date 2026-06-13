export type SafePoint = {
  id: string;
  type: "veterinary" | "petshop";
  name: string;
  latitude: number;
  longitude: number;
  emoji: string;
};

/** Puntos seguros demo — Mar del Plata (modo dueño) */
export const SAFE_POINTS_MAR_DEL_PLATA: SafePoint[] = [
  {
    id: "vet-atlantica",
    type: "veterinary",
    name: "Veterinaria Atlántica",
    latitude: -38.0022,
    longitude: -57.5485,
    emoji: "🏥",
  },
  {
    id: "vet-sur",
    type: "veterinary",
    name: "Clínica Vet del Sur",
    latitude: -38.0185,
    longitude: -57.532,
    emoji: "🏥",
  },
  {
    id: "pet-max",
    type: "petshop",
    name: "Pet Shop Max",
    latitude: -38.008,
    longitude: -57.561,
    emoji: "🛒",
  },
  {
    id: "pet-huellas",
    type: "petshop",
    name: "Huellas & Co.",
    latitude: -37.995,
    longitude: -57.539,
    emoji: "🛒",
  },
  {
    id: "vet-centro",
    type: "veterinary",
    name: "Veterinaria Centro MDP",
    latitude: -37.9995,
    longitude: -57.5565,
    emoji: "🏥",
  },
];

export function getSafePointsNear(
  _lat: number,
  _lng: number,
): SafePoint[] {
  return SAFE_POINTS_MAR_DEL_PLATA.map((point) => ({ ...point }));
}
