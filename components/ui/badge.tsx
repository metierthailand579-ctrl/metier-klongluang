import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[12px] font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-metier-orange text-white",
        outline: "border-[color:var(--color-border)] text-fg",
        muted:
          "border-transparent bg-[color:var(--color-subtle)] text-[color:var(--color-muted-fg)]",
        success: "border-transparent bg-emerald-500/15 text-emerald-700",
        warning: "border-transparent bg-amber-500/15 text-amber-700",
      },
    },
    defaultVariants: { variant: "outline" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
