import { Card } from "@/components/ui/card";

const PARTNER_LOGOS = ["Pet Shop MDP", "Vet Centro", "MDP Noticias"] as const;

export function SocialProofSection() {
  return (
    <section className="px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-6xl text-center">
        <p className="text-4xl font-extrabold tracking-tight text-honey sm:text-5xl">2.847</p>
        <p className="mt-2 text-sm text-muted sm:text-base">
          mascotas protegidas en Argentina
        </p>
        <p className="mt-1 text-xs text-muted/80">
          Dueños que ya duermen más tranquilos
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          {PARTNER_LOGOS.map((name) => (
            <span
              key={name}
              className="text-xs font-semibold uppercase tracking-wider text-[#888888] sm:text-sm"
            >
              {name}
            </span>
          ))}
        </div>

        <Card className="mx-auto mt-6 max-w-xl border-border bg-card p-5 text-left sm:p-6">
          <div className="flex items-start gap-4">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-honey/15 text-lg font-bold text-honey"
              aria-hidden="true"
            >
              M
            </div>
            <div>
              <p className="text-sm leading-relaxed text-white/90">
                &ldquo;En 20 minutos me avisaron por el chat. Recuperé a Lola sin dar mi
                celular.&rdquo;
              </p>
              <p className="mt-2 text-xs font-semibold text-muted">
                Mariana · Palermo, CABA
              </p>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
