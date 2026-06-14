import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";

const TRUST_POINTS = [
  "Sin WhatsApp ni llamadas de desconocidos",
  "Sin exponer tu número de celular",
  "Chat 100% interno y anónimo",
] as const;

export function TrustSection() {
  return (
    <section className="px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <Card className="border-honey/40 bg-card p-6 sm:p-10">
          <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
            Privacidad total. Punto.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
            Sin WhatsApp. Sin números. Todo el contacto ocurre dentro de Honey App, con alertas
            discretas y trazabilidad profesional.
          </p>

          <ul className="mt-6 space-y-3">
            {TRUST_POINTS.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-white/90 sm:text-base">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-honey" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>

          <a
            href="#como-funciona"
            className="mt-6 inline-block text-sm font-semibold text-honey underline-offset-4 hover:underline"
          >
            Ver cómo funciona el chat →
          </a>
        </Card>
      </div>
    </section>
  );
}
