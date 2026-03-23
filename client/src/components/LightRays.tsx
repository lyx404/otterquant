/**
 * LightRays — Animated light rays shining from above
 * Inspired by MagicUI's LightRays component
 * Pure CSS implementation with configurable colors, count, blur, opacity, speed
 */
import { useMemo } from "react";

interface LightRaysProps {
  /** Total number of animated rays */
  count?: number;
  /** Base colour used for the gradients */
  color?: string;
  /** Pixel radius applied to the blur filter */
  blur?: number;
  /** Maximum opacity that rays reach (0–1) */
  opacity?: number;
  /** Average seconds each ray takes to complete a cycle */
  speed?: number;
  /** CSS length for the ray height */
  length?: string | number;
  /** Additional class names */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
}

export function LightRays({
  count = 7,
  color = "rgba(160, 210, 255, 0.2)",
  blur = 36,
  opacity = 0.65,
  speed = 14,
  length = "70vh",
  className,
  style,
}: LightRaysProps) {
  const rays = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const seed = i / count;
      // Distribute rays across the width with some randomness
      const left = 10 + seed * 80 + (Math.sin(seed * 17.3) * 8);
      // Vary width, delay, duration for organic feel
      const width = 30 + Math.sin(seed * 13.7) * 20 + 15;
      const delay = -(seed * speed + Math.sin(seed * 7.1) * 2);
      const duration = speed + Math.sin(seed * 11.3) * 4;
      const rotateAngle = -15 + seed * 30 + Math.sin(seed * 19.1) * 5;
      const rayOpacity = opacity * (0.5 + Math.sin(seed * 23.7) * 0.3 + 0.2);

      return {
        id: i,
        left,
        width,
        delay,
        duration,
        rotateAngle,
        rayOpacity,
      };
    });
  }, [count, speed, opacity]);

  const lengthValue = typeof length === "number" ? `${length}px` : length;

  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className ?? ""}`}
      style={{
        filter: `blur(${blur}px)`,
        ...style,
      }}
    >
      {rays.map((ray) => (
        <div
          key={ray.id}
          style={{
            position: "absolute",
            top: "-10%",
            left: `${ray.left}%`,
            width: `${ray.width}px`,
            height: lengthValue,
            background: `linear-gradient(180deg, ${color} 0%, transparent 100%)`,
            opacity: 0,
            transform: `rotate(${ray.rotateAngle}deg)`,
            transformOrigin: "top center",
            animation: `lightRayPulse ${ray.duration}s ease-in-out ${ray.delay}s infinite`,
            willChange: "opacity",
            // Use CSS custom properties for per-ray max opacity
            ["--ray-max-opacity" as string]: ray.rayOpacity,
          }}
        />
      ))}

      {/* Keyframes injected via style tag */}
      <style>{`
        @keyframes lightRayPulse {
          0%, 100% {
            opacity: 0;
          }
          30%, 70% {
            opacity: var(--ray-max-opacity, ${opacity});
          }
        }
      `}</style>
    </div>
  );
}

export default LightRays;
