import { ClipboardList, MessageCircle, QrCode } from "lucide-react";
import { Card } from "@/components/ui/card";

const STEPS = [
  {
    icon: ClipboardList,
    title: "Registrá tu perfil",
    description:
      "Creá la ficha de tu mascota con foto, datos clave y observaciones de salud en minutos.",
  },
  {
    icon: QrCode,
    title: "Generá tu QR",
    description:
      "Obtené una chapita digital única para que cualquier vecino pueda avisarte al instante.",
  },
  {
    icon: MessageCircle,
    title: "Recibí alertas privadas",
    description:
      "Cuando escanean el QR, recibís ubicación y chat seguro sin compartir tu número.",
  },
] as const;

export function HowItWorksSection() {
  return (
    <section id="como-funciona" className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-2xl font-extrabold text-white sm:text-3xl">Cómo funciona</h2>
          <p className="mt-3 text-sm text-white/65 sm:text-base">
            Tres pasos simples para que tu mascota vuelva a casa con total privacidad.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <Card key={step.title} className="flex flex-col gap-4 border-mustard/20">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-mustard/15 text-mustard">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="text-sm font-bold text-mustard/80">Paso {index + 1}</span>
                </div>
                <h3 className="text-lg font-bold text-white">{step.title}</h3>
                <p className="text-sm leading-relaxed text-white/65">{step.description}</p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
