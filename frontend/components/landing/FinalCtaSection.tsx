import { PrimaryCta } from "./PrimaryCta";

export function FinalCtaSection() {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl rounded-[20px] border border-border bg-card px-6 py-12 text-center sm:px-12 sm:py-16">
        <h2 className="text-2xl font-extrabold text-white sm:text-3xl">No esperes a que pase.</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-muted sm:text-base">
          Registrá a tu mascota hoy. Mañana puede ser tarde.
        </p>

        <div className="mt-8 flex justify-center">
          <PrimaryCta label="Activá tu chapita oficial" />
        </div>

        <div className="mt-10 border-t border-border pt-8">
          <p className="text-sm text-muted">
            ¿Sos pet shop o veterinaria?{" "}
            <a
              href="#mapa-vivo"
              className="font-semibold text-honey underline-offset-4 hover:underline"
            >
              Mirá la red de aliados →
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
