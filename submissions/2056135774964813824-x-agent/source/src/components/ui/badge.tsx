import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-electric/30 bg-electric/10 text-electric",
        secondary:
          "border-border bg-secondary/60 text-secondary-foreground",
        outline:
          "border-border text-muted-foreground",
        success:
          "border-success/30 bg-success/10 text-success",
        warning:
          "border-warning/30 bg-warning/10 text-warning",
        danger:
          "border-destructive/30 bg-destructive/10 text-destructive",
        plasma:
          "border-plasma/30 bg-plasma/10 text-plasma",
        cyan:
          "border-cyan/30 bg-cyan/10 text-cyan",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
