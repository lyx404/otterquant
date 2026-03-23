/**
 * Aurora — Animated gradient background using CSS animations
 * Lightweight alternative to WebGL aurora effects
 * Props: colorStops (3 colors), blend (opacity 0-1), amplitude, speed
 */
import { useMemo } from "react";

interface AuroraProps {
  colorStops?: [string, string, string];
  blend?: number;
  amplitude?: number;
  speed?: number;
  className?: string;
}

export default function Aurora({
  colorStops = ["#6678ff", "#B19EEF", "#5227FF"],
  blend = 0.5,
  amplitude = 1.0,
  speed = 0.5,
  className = "",
}: AuroraProps) {
  const duration = useMemo(() => Math.max(4, 12 / speed), [speed]);
  const scale = useMemo(() => 1 + amplitude * 0.3, [amplitude]);

  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}
      style={{ opacity: blend }}
    >
      {/* Primary aurora band */}
      <div
        className="absolute w-[200%] h-[60%] top-[20%] -left-[50%] rounded-full blur-3xl"
        style={{
          background: `linear-gradient(90deg, ${colorStops[0]}40, ${colorStops[1]}50, ${colorStops[2]}40, ${colorStops[0]}40)`,
          animation: `aurora-drift ${duration}s ease-in-out infinite`,
          transform: `scaleY(${scale})`,
        }}
      />
      {/* Secondary aurora band — offset timing */}
      <div
        className="absolute w-[180%] h-[40%] top-[35%] -left-[40%] rounded-full blur-[60px]"
        style={{
          background: `linear-gradient(90deg, ${colorStops[2]}30, ${colorStops[0]}40, ${colorStops[1]}30, ${colorStops[2]}30)`,
          animation: `aurora-drift ${duration * 1.3}s ease-in-out infinite reverse`,
          transform: `scaleY(${scale * 0.8})`,
        }}
      />
      {/* Tertiary subtle glow */}
      <div
        className="absolute w-[150%] h-[30%] top-[40%] -left-[25%] rounded-full blur-[80px]"
        style={{
          background: `radial-gradient(ellipse, ${colorStops[1]}25, transparent 70%)`,
          animation: `aurora-pulse ${duration * 0.8}s ease-in-out infinite`,
        }}
      />
      {/* Noise texture overlay for organic feel */}
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E")`,
          backgroundSize: "128px 128px",
        }}
      />
    </div>
  );
}
