/**
 * ShineBorder — Animated shining border effect
 * Inspired by MagicUI's ShineBorder component
 * A border that shines with a rotating gradient, creating a flowing light effect.
 */
import { type CSSProperties, type ReactNode } from "react";

interface ShineBorderProps {
  /** Border radius in pixels */
  borderRadius?: number;
  /** Width of the shining border */
  borderWidth?: number;
  /** Duration of one full rotation in seconds */
  duration?: number;
  /** Colors used in the gradient. Supports theme-adaptive arrays */
  shineColor?: string[];
  /** Additional class names for the wrapper */
  className?: string;
  /** Content inside the border */
  children?: ReactNode;
}

export function ShineBorder({
  borderRadius = 24,
  borderWidth = 1.5,
  duration = 8,
  shineColor = ["#818cf8", "#a78bfa", "#93c5fd"],
  className,
  children,
}: ShineBorderProps) {
  const gradientColors = shineColor.join(", ");

  return (
    <div
      className={`relative ${className ?? ""}`}
      style={{
        borderRadius: `${borderRadius}px`,
        padding: `${borderWidth}px`,
        // The rotating conic gradient creates the shine effect
        background: `conic-gradient(from var(--shine-angle, 0deg), transparent 40%, ${gradientColors}, transparent 60%)`,
        animation: `shineBorderRotate ${duration}s linear infinite`,
        ["--shine-border-width" as string]: `${borderWidth}px`,
      } as CSSProperties}
    >
      {/* Inner container that masks the gradient, showing only the border */}
      <div
        style={{
          borderRadius: `${borderRadius - borderWidth}px`,
        }}
        className="relative h-full w-full bg-card"
      >
        {children}
      </div>

      <style>{`
        @property --shine-angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }

        @keyframes shineBorderRotate {
          from {
            --shine-angle: 0deg;
          }
          to {
            --shine-angle: 360deg;
          }
        }
      `}</style>
    </div>
  );
}

export default ShineBorder;
