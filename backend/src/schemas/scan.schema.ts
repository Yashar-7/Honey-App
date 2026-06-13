import { z } from "zod";

export const createScanSchema = z.object({
  latitude: z
    .number()
    .min(-90, "Latitud debe estar entre -90 y 90")
    .max(90, "Latitud debe estar entre -90 y 90"),
  longitude: z
    .number()
    .min(-180, "Longitud debe estar entre -180 y 180")
    .max(180, "Longitud debe estar entre -180 y 180"),
  accuracy: z.number().positive().optional(),
});

export type CreateScanInput = z.infer<typeof createScanSchema>;
