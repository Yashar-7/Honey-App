import Link from "next/link";
import { Button } from "@/components/ui/button";

export function LandingNavbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-night/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <img
            src="/assets/honey-app-logo.png"
            alt="Honey App — perro y mariposa"
            width={44}
            height={44}
            className="h-11 w-11 rounded-xl object-contain"
            decoding="async"
          />
          <span className="hidden text-lg font-extrabold tracking-tight text-white sm:inline">
            Honey App
          </span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="default" className="min-h-10 px-3 text-sm sm:px-4" asChild>
            <a href="/escaneo">Encontré una mascota</a>
          </Button>
          <Button variant="secondary" size="default" className="min-h-10 px-4 text-sm" asChild>
            <a href="/login">Iniciar sesión</a>
          </Button>
        </nav>
      </div>
    </header>
  );
}
