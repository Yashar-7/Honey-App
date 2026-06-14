import { Lock, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";

export function TrustSection() {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <Card className="relative overflow-hidden border-mustard/35 bg-gradient-to-br from-card to-night p-8 sm:p-10">
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-mustard/10 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-mustard/15 text-mustard">
              <ShieldCheck className="h-8 w-8" aria-hidden="true" />
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-mustard">
                Confianza
              </p>
              <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
                Privacidad Total: Sin WhatsApp, sin números telefónicos, chat 100% interno
              </h2>
              <p className="max-w-3xl text-sm leading-relaxed text-white/70 sm:text-base">
                Honey App protege la identidad del dueño y del vecino colaborador. Toda la
                comunicación ocurre dentro de la plataforma, con alertas discretas y trazabilidad
                profesional para veterinarias y pet shops aliados.
              </p>
            </div>
          </div>

          <ul className="relative mt-8 grid gap-3 sm:grid-cols-3">
            {[
              "Sin exponer datos personales",
              "Canal seguro dueño ↔ vecino",
              "Historial centralizado en tu panel",
            ].map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-night/40 px-4 py-3 text-sm text-white/75"
              >
                <Lock className="h-4 w-4 shrink-0 text-mustard" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </section>
  );
}
