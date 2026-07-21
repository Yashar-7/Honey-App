"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { REGISTRO_HREF } from "./constants";

export function StickyMobileCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 border-t border-border bg-night/95 backdrop-blur-md transition-transform duration-300 md:hidden",
        visible ? "translate-y-0" : "translate-y-full pointer-events-none",
      )}
      role="complementary"
      aria-label="Acción rápida de registro"
    >
      <div className="mx-auto max-w-lg px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <a
          href={REGISTRO_HREF}
          className="flex h-14 w-full items-center justify-center rounded-[14px] bg-honey text-[16px] font-bold text-white shadow-honey transition hover:bg-honey-hover active:scale-[0.98]"
        >
          Activá tu chapita oficial
        </a>
      </div>
    </div>
  );
}
