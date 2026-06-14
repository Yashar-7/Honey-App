export function LandingFooter() {
  return (
    <footer className="border-t border-white/10 px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
        <p className="text-sm text-white/50">
          Honey App · Mar del Plata · Comunidad que cuida mascotas
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
          <a href="/escaneo" className="text-mustard/80 transition hover:text-mustard">
            Encontré una mascota
          </a>
          <a href="/login" className="text-mustard/80 transition hover:text-mustard">
            Portal del dueño
          </a>
          <a href="/registro" className="text-mustard/80 transition hover:text-mustard">
            Registrar mascota
          </a>
        </div>
      </div>
    </footer>
  );
}
