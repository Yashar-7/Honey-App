import { LoginLink } from "./LoginLink";
import { PrimaryCta } from "./PrimaryCta";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 pb-12 pt-8 sm:px-6 sm:pb-16 sm:pt-12">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,193,7,0.1),transparent_55%)]"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-6xl lg:grid lg:grid-cols-2 lg:items-center lg:gap-12">
        <div className="text-center lg:text-left">
          <p className="mb-3 inline-flex rounded-full border border-honey/30 bg-honey/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-honey">
            Si se escapa, cada minuto cuenta
          </p>

          <h1 className="text-[2.125rem] font-extrabold leading-[1.1] text-white sm:text-5xl lg:text-[3rem]">
            Honey App: que tu mascota vuelva a casa
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-muted lg:mx-0">
            El 90% de los perros y gatos que se pierden no regresan. Con una chapita QR en el
            collar, cualquier persona te avisa al instante — sin dar tu WhatsApp ni tu número.
          </p>

          <div className="mt-6 flex flex-col items-center gap-3 lg:items-start">
            <PrimaryCta />
            <p className="text-xs text-muted/90">Gratis empezar · 2 minutos · Chapita QR incluida</p>
            <LoginLink />
          </div>
        </div>

        <div className="relative mx-auto mt-10 w-full max-w-md lg:mt-0 lg:max-w-none">
          <div className="relative overflow-hidden rounded-[20px] border border-border bg-card">
            <div className="relative aspect-[4/5] sm:aspect-[5/4]">
              <img
                src="/assets/honey-app-logo.png"
                alt="Mascota con chapita QR Honey App"
                className="absolute inset-0 h-full w-full object-contain p-10 sm:p-12"
                decoding="async"
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-night via-night/20 to-transparent"
                aria-hidden="true"
              />
              <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
                <p className="text-sm font-semibold text-white">
                  Escaneada → aviso instantáneo
                </p>
                <p className="mt-1 text-xs text-muted">
                  Chapita QR en el collar · Privacidad total
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
