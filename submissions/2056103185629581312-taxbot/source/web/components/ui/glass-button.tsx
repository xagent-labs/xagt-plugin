import * as React from "react"
import { cn } from "@/lib/utils"

export const GlassButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { size?: "sm" | "default" | "lg" }
>(({ className, size = "default", children, ...props }, ref) => {
  const sizes = { sm: "px-4 py-2 text-sm", default: "px-6 py-3.5 text-base", lg: "px-8 py-4 text-lg" }
  return (
    <button
      ref={ref}
      className={cn(
        "relative inline-flex items-center justify-center gap-2 rounded-full font-medium transition-transform duration-300 hover:scale-[1.03] active:scale-[0.96] disabled:opacity-50 focus-visible:outline-none",
        sizes[size],
        className
      )}
      style={{
        color: "#f7f9fa",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        background: "rgba(255,255,255,0.06)",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12), inset 1.8px 3px 0px -2px rgba(255,255,255,0.7), 0px 6px 16px rgba(0,0,0,0.3)",
      }}
      {...props}
    >
      {children}
    </button>
  )
})
GlassButton.displayName = "GlassButton"
