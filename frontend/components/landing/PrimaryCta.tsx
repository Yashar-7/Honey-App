import { cn } from "@/lib/utils";
import { PRIMARY_CTA_CLASS, REGISTRO_HREF } from "./constants";

type PrimaryCtaProps = {
  label?: string;
  className?: string;
  href?: string;
};

export function PrimaryCta({
  label = "Registrar mi mascota",
  className,
  href = REGISTRO_HREF,
}: PrimaryCtaProps) {
  return (
    <a href={href} className={cn(PRIMARY_CTA_CLASS, className)}>
      {label}
    </a>
  );
}
