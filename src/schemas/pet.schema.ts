import { z } from "zod";

const speciesValues = ["Perro", "Gato", "Otro"] as const;
const sexValues = ["Macho", "Hembra", "Desconocido"] as const;
const sizeValues = ["Pequeño", "Mediano", "Grande"] as const;

const optionalIsoDate = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined))
  .refine((value) => !value || !Number.isNaN(Date.parse(value)), {
    message: "Fecha inválida",
  })
  .transform((value) => (value ? new Date(value) : undefined));

export const createPetSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(80),
  species: z.enum(speciesValues, {
    errorMap: () => ({ message: "Elegí Perro, Gato u Otro" }),
  }),
  breed: z.string().trim().max(80).optional(),
  age: z.string().trim().max(40).optional(),
  sex: z.enum(sexValues, {
    errorMap: () => ({ message: "Elegí Macho, Hembra o Desconocido" }),
  }).optional(),
  size: z.enum(sizeValues, {
    errorMap: () => ({ message: "Elegí Pequeño, Mediano o Grande" }),
  }).optional(),
  color: z.string().trim().max(80).optional(),
  distinguishingMarks: z.string().trim().max(500).optional(),
  zipCode: z.string().trim().max(12).optional(),
  neighborhood: z.string().trim().max(120).optional(),
  characteristics: z.string().trim().max(500).optional(),

  // --- CAMPOS DE FICHA MÉDICA AVANZADA ---
  medicalConditions: z.string().trim().max(500).optional(),
  medications: z.string().trim().max(500).optional(),
  allergies: z.string().trim().max(300).optional(),
  behavioralNotes: z.string().trim().max(500).optional(),

  // --- FIDELIZACIÓN VETERINARIA ---
  vetClinicId: z
    .string()
    .trim()
    .uuid("Veterinaria inválida")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  lastVaccinationDate: optionalIsoDate,
  lastDewormingDate: optionalIsoDate,

  finderMessage: z
    .string()
    .trim()
    .min(1, "El mensaje para el vecino es obligatorio")
    .max(500),
});

export const updateHealthObservationsSchema = z.object({
  healthObservations: z
    .string()
    .trim()
    .max(1000, "Máximo 1000 caracteres")
    .optional()
    .transform((v) => v ?? ""),
});

export type CreatePetInput = z.infer<typeof createPetSchema>;
export type UpdateHealthObservationsInput = z.infer<
  typeof updateHealthObservationsSchema
>;
