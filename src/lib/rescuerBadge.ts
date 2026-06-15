export type RescuerBadge = {
  level: "none" | "neighbor" | "rescuer" | "hero";
  label: string;
  score: number;
};

export function getRescuerBadge(score: number): RescuerBadge {
  if (score >= 6) {
    return { level: "hero", label: "Rescatista destacado", score };
  }
  if (score >= 3) {
    return { level: "rescuer", label: "Rescatista verificado", score };
  }
  if (score >= 1) {
    return { level: "neighbor", label: "Vecino colaborador", score };
  }
  return { level: "none", label: "Colaborador anónimo", score: 0 };
}
