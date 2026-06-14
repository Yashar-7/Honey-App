import * as React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-chapita border border-mustard/25 bg-card p-6 shadow-lg shadow-black/25",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

export { Card };
