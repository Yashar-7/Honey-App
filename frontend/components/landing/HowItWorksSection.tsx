import { Bell, ClipboardList, QrCode } from "lucide-react";

const STEPS = [
  { icon: ClipboardList, label: "Registrá a tu mascota" },
  { icon: QrCode, label: "Pegá la chapita QR" },
  { icon: Bell, label: "Recibí el aviso al toque" },
] as const;

export function HowItWorksSection() {
  return (
    <section id="como-funciona" className="px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-2xl font-extrabold text-white sm:text-3xl">
          En 3 pasos, volvé a abrazarlo
        </h2>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:gap-6">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.label} className="relative flex flex-1 flex-col items-center text-center">
                {index < STEPS.length - 1 && (
                  <span
                    className="absolute left-[calc(50%+2rem)] top-7 hidden h-px w-[calc(100%-4rem)] border-t border-dashed border-border sm:block"
                    aria-hidden="true"
                  />
                )}
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-honey bg-card text-honey">
                  <Icon className="h-7 w-7" aria-hidden="true" />
                </span>
                <p className="mt-1 text-xs font-bold text-honey/80">Paso {index + 1}</p>
                <p className="mt-2 text-base font-bold text-white">{step.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
