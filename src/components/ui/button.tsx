import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-sm hover:brightness-110",
        outline:
          "rounded-xl border border-[var(--color-border)] bg-transparent hover:bg-[var(--color-surface-muted)] hover:shadow-sm",
        destructive:
          "rounded-xl bg-[var(--color-danger)] text-[var(--color-danger-foreground)] shadow-sm hover:brightness-110",
        ghost: "rounded-xl hover:bg-[var(--color-surface-muted)]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-xl px-8",
        icon: "h-9 w-9 rounded-xl p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { buttonVariants };
