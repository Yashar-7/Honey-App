import { z } from "zod";

export const createLocationAlertSchema = z.object({
  qrToken: z.string().trim().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().positive().optional(),
});

export type CreateLocationAlertInput = z.infer<typeof createLocationAlertSchema>;
