import React from "react";
import { cn } from "@/lib/utils";

interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  shimmerColor?: string;
  shimmerSize?: string;
  borderRadius?: string;
  shimmerDuration?: string;
  background?: string;
  className?: string;
  children?: React.ReactNode;
}

const ShimmerButton = React.forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  (
    {
      shimmerColor = "rgba(255, 255, 255, 0.15)",
      shimmerSize = "0.1em",
      shimmerDuration = "2.5s",
      borderRadius = "100px",
      background = "hsl(var(--primary))",
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          "group relative inline-flex h-10 items-center justify-center overflow-hidden whitespace-nowrap px-6 text-sm font-medium text-white transition-all",
          "hover:scale-[1.02] active:scale-[0.98]",
          className
        )}
        style={{
          borderRadius,
          background,
        }}
        {...props}
      >
        {/* Shimmer effect */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ borderRadius }}
        >
          <div
            className="absolute inset-0 animate-shimmer-slide"
            style={{
              background: `linear-gradient(120deg, transparent 25%, ${shimmerColor} 50%, transparent 75%)`,
              backgroundSize: "300% 100%",
            }}
          />
        </div>

        {/* Highlight on hover */}
        <div
          className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            borderRadius,
            background: "linear-gradient(120deg, transparent 20%, rgba(255,255,255,0.1) 50%, transparent 80%)",
          }}
        />

        {/* Content */}
        <span className="relative z-10 flex items-center gap-2">
          {children}
        </span>
      </button>
    );
  }
);

ShimmerButton.displayName = "ShimmerButton";

export { ShimmerButton };
