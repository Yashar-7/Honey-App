import { z } from "zod";

const speciesValues = ["Perro", "Gato", "Otro"] as const;
const sexValues = ["Macho", "Hembra", "Desconocido"] as const;
const sizeValues = ["Pequeño", "Mediano", "Grande"] as const;

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
  medicalConditions: z.string().trim().max(500).optional(), // Ej: "Sufre de convulsiones"
  medications: z.string().trim().max(500).optional(),       // Ej: "Toma fenobarbital cada 12hs"
  allergies: z.string().trim().max(300).optional(),         // Ej: "Alérgico al pollo"
  behavioralNotes: z.string().trim().max(500).optional(),   // Ej: "Muy asustadizo con ruidos fuertes"
  
  // Mensaje público que lee el vecino (sin incluir datos privados de contacto)
  finderMessage: z
    .string()
    .trim()
    .min(1, "El mensaje para el vecino es obligatorio")
    .max(500),
});

export type CreatePetInput = z.infer<typeof createPetSchema>;