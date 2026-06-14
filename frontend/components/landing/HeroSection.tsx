import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-16">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,183,0,0.12),transparent_55%)]"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 inline-flex rounded-full border border-mustard/30 bg-mustard/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-mustard">
            Seguridad inteligente para mascotas
          </p>

          <h1 className="text-3xl font-extrabold leading-tight text-white sm:text-5xl sm:leading-tight">
            Honey App: Seguridad Real para tu Mascota
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">
            Protegé a tu compañero con un sistema privado de reencuentro. Sin exponer tu
            teléfono, sin WhatsApp y con alertas directas cuando alguien escanea su chapita QR.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <a href="/registro">Registrar mi mascota</a>
            </Button>
            <Button variant="secondary" size="lg" asChild>
              <a href="/login">Ya tengo cuenta</a>
            </Button>
          </div>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-3">
          {[
            { value: "100%", label: "Chat interno y anónimo" },
            { value: "24/7", label: "Alertas en tiempo real" },
            { value: "1 QR", label: "Identificación instantánea" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-center backdrop-blur-sm"
            >
              <p className="text-2xl font-extrabold text-mustard">{stat.value}</p>
              <p className="mt-1 text-sm text-white/65">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
