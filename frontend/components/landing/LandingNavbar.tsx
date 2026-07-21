import Link from "next/link";
import { PrimaryCta } from "./PrimaryCta";

export function LandingNavbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-night/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <img
            src="/assets/honey-app-logo.png"
            alt="Logo Honey App"
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 object-contain"
            decoding="async"
          />
          <span className="hidden text-base font-extrabold tracking-tight text-white sm:inline">
            Honey App
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          <a
            href="/escaneo"
            className="hidden text-xs font-medium text-muted transition hover:text-white sm:inline"
          >
            Encontré una mascota
          </a>
          <PrimaryCta
            label="Activá chapita"
            className="!min-w-0 !px-4 !py-2.5 !text-sm sm:!px-5"
          />
        </nav>
      </div>
    </header>
  );
}
