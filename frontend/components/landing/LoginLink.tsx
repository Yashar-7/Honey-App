import { cn } from "@/lib/utils";
import { LOGIN_HREF } from "./constants";

type LoginLinkProps = {
  className?: string;
  label?: string;
};

export function LoginLink({
  className,
  label = "¿Ya tenés cuenta? Iniciá sesión",
}: LoginLinkProps) {
  return (
    <a
      href={LOGIN_HREF}
      className={cn(
        "text-sm text-muted transition hover:text-white/90 underline-offset-4 hover:underline",
        className,
      )}
    >
      {label}
    </a>
  );
}
