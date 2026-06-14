import { Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function FinalCtaSection() {
  return (
    <section className="px-4 pb-20 pt-4 sm:px-6 sm:pb-24">
      <div className="mx-auto max-w-6xl">
        <Card className="border-mustard/30 bg-gradient-to-r from-card via-card to-night/80 p-8 text-center sm:p-12">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-mustard/15 text-mustard">
            <Store className="h-7 w-7" aria-hidden="true" />
          </div>

          <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
            ¿Sos un Pet Shop? Sumá a Honey App a tus servicios
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
            Ofrecé chapitas QR inteligentes, seguimiento de mascotas perdidas y un canal de
            confianza para tus clientes. Posicioná tu negocio como aliado en seguridad animal.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <a href="/registro">Empezar con Honey App</a>
            </Button>
            <Button variant="secondary" size="lg" asChild>
              <a href="/login">Acceder al panel dueño</a>
            </Button>
          </div>
        </Card>
      </div>
    </section>
  );
}
