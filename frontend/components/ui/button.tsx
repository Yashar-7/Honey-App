import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-honey disabled:pointer-events-none disabled:opacity-50 min-h-12 px-6",
  {
    variants: {
      variant: {
        default:
          "bg-honey text-night shadow-honey hover:bg-honey-hover active:scale-[0.98]",
        secondary:
          "border-2 border-honey/40 bg-transparent text-honey hover:bg-honey/10",
        ghost:
          "min-h-0 px-0 text-honey/80 underline-offset-4 hover:text-honey hover:underline",
      },
      size: {
        default: "h-12",
        lg: "h-14 text-base",
        icon: "h-12 w-12 rounded-2xl px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonVariantProps = VariantProps<typeof buttonVariants>;

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonVariantProps {
  asChild?: boolean;
  variant?: NonNullable<ButtonVariantProps["variant"]>;
  size?: NonNullable<ButtonVariantProps["size"]>;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
