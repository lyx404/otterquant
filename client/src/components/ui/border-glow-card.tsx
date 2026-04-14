import React, { useRef, useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface BorderGlowCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  /** Max distance (px) from element edge at which glow activates */
  activationDistance?: number;
}

export function BorderGlowCard({
  children,
  className,
  activationDistance = 200,
  ...props
}: BorderGlowCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const [sweepActive, setSweepActive] = useState(false);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const el = cardRef.current;
      if (!el) return;

      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        // Distance from cursor to nearest edge
        const dx = Math.max(0, Math.abs(e.clientX - cx) - rect.width / 2);
        const dy = Math.max(0, Math.abs(e.clientY - cy) - rect.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Proximity: 100 = on edge, 0 = far away
        const proximity = Math.max(
          0,
          Math.min(100, (1 - dist / activationDistance) * 100)
        );

        // Angle from center to cursor
        const angle =
          Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI) + 90;

        el.style.setProperty("--edge-proximity", String(proximity));
        el.style.setProperty("--cursor-angle", `${angle}deg`);
      });
    },
    [activationDistance]
  );

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, [handleMouseMove]);

  // Optional: run a one-time sweep animation on mount
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    setSweepActive(true);
    let frame = 0;
    const totalFrames = 60;
    const animate = () => {
      const progress = frame / totalFrames;
      const angle = progress * 360;
      const prox = Math.sin(progress * Math.PI) * 80 + 20;
      el.style.setProperty("--cursor-angle", `${angle}deg`);
      el.style.setProperty("--edge-proximity", String(prox));
      frame++;
      if (frame <= totalFrames) {
        requestAnimationFrame(animate);
      } else {
        el.style.setProperty("--edge-proximity", "0");
        setSweepActive(false);
      }
    };
    requestAnimationFrame(animate);
  }, []);

  return (
    <div
      ref={cardRef}
      className={cn(
        "border-glow-card",
        sweepActive && "sweep-active",
        className
      )}
      {...props}
    >
      <div className="edge-light" />
      <div className="border-glow-inner">{children}</div>
    </div>
  );
}
