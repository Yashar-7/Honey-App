export function LandingFooter() {
  return (
    <footer className="border-t border-border px-4 py-8 pb-28 sm:px-6 sm:pb-10 md:pb-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
        <p className="text-sm text-muted/80">
          Honey App · Mar del Plata · Comunidad que cuida mascotas
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
          <a href="/escaneo" className="text-honey/80 transition hover:text-honey">
            Encontré una mascota
          </a>
          <a href="/login" className="text-honey/80 transition hover:text-honey">
            Portal del dueño
          </a>
          <a href="/registro" className="text-honey/80 transition hover:text-honey">
            Activá tu chapita
          </a>
        </div>
      </div>
    </footer>
  );
}
