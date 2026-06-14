import { Bell, LayoutDashboard, MessageCircleOff } from "lucide-react";
import { Card } from "@/components/ui/card";

const BENEFITS = [
  {
    icon: MessageCircleOff,
    title: "Tu celular queda oculto.",
    body: "Recibís el aviso por chat interno. Cero WhatsApp de desconocidos.",
  },
  {
    icon: Bell,
    title: "Te enterás al toque.",
    body: "Aunque estés durmiendo o en el trabajo. Cada minuto cuenta cuando se escapa.",
  },
  {
    icon: LayoutDashboard,
    title: "Dejá de buscar en redes.",
    body: "Ubicación, chat y estado de tu mascota en un solo panel.",
  },
] as const;

export function BenefitsSection() {
  return (
    <section className="px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-2xl font-extrabold text-white sm:text-3xl">
          Lo que te quita el sueño, resuelto
        </h2>

        <div className="mt-8 flex flex-col gap-3 sm:gap-4">
          {BENEFITS.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.title}
                className="flex gap-4 border-border bg-card p-5 sm:items-start sm:p-6"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-honey/15 text-honey">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-white">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{item.body}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
