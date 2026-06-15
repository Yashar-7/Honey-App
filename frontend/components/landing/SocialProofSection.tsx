import { TestimonialsMarquee } from "./TestimonialsMarquee";

const PARTNER_LOGOS = ["Pet Shop MDP", "Vet Centro", "MDP Noticias"] as const;

export function SocialProofSection() {
  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
        <p className="text-4xl font-extrabold tracking-tight text-honey sm:text-5xl">2.847</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted sm:text-base">
          Mascotas protegidas en Mar del Plata. ¡Duerme tranquilo, La Feliz!
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
      </div>

      <TestimonialsMarquee />
    </section>
  );
}
