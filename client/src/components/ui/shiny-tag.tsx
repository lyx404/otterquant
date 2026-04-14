/**
 * ShinyTag — Animated grade badge with shimmer effect
 * Design: Compact pill with gradient border, glow, and sweeping shine animation
 * Tiers: S (Gold) | A (Indigo) | B (Emerald) | C (Amber) | D (Red)
 */
import { type AlphaGrade, GRADE_CONFIG } from "@/lib/mockData";

/* ── Tier-specific gradient and shine configs ── */
const TIER_STYLES: Record<
  AlphaGrade,
  {
    gradient: string;
    borderGradient: string;
    textColor: string;
    glowColor: string;
    shineColor: string;
  }
> = {
  S: {
    gradient: "linear-gradient(135deg, rgba(255,215,0,0.18) 0%, rgba(255,180,0,0.08) 50%, rgba(255,215,0,0.18) 100%)",
    borderGradient: "linear-gradient(135deg, #FFD700, #FFA500, #FFD700)",
    textColor: "#FFD700",
    glowColor: "rgba(255, 215, 0, 0.35)",
    shineColor: "rgba(255, 255, 200, 0.6)",
  },
  A: {
    gradient: "linear-gradient(135deg, rgba(129,140,248,0.18) 0%, rgba(99,102,241,0.08) 50%, rgba(129,140,248,0.18) 100%)",
    borderGradient: "linear-gradient(135deg, #818CF8, #6366F1, #818CF8)",
    textColor: "#818CF8",
    glowColor: "rgba(129, 140, 248, 0.3)",
    shineColor: "rgba(200, 200, 255, 0.5)",
  },
  B: {
    gradient: "linear-gradient(135deg, rgba(52,211,153,0.18) 0%, rgba(16,185,129,0.08) 50%, rgba(52,211,153,0.18) 100%)",
    borderGradient: "linear-gradient(135deg, #34D399, #10B981, #34D399)",
    textColor: "#34D399",
    glowColor: "rgba(52, 211, 153, 0.25)",
    shineColor: "rgba(200, 255, 220, 0.5)",
  },
  C: {
    gradient: "linear-gradient(135deg, rgba(251,191,36,0.18) 0%, rgba(245,158,11,0.08) 50%, rgba(251,191,36,0.18) 100%)",
    borderGradient: "linear-gradient(135deg, #FBBF24, #F59E0B, #FBBF24)",
    textColor: "#FBBF24",
    glowColor: "rgba(251, 191, 36, 0.25)",
    shineColor: "rgba(255, 240, 180, 0.5)",
  },
  D: {
    gradient: "linear-gradient(135deg, rgba(248,113,113,0.18) 0%, rgba(239,68,68,0.08) 50%, rgba(248,113,113,0.18) 100%)",
    borderGradient: "linear-gradient(135deg, #F87171, #EF4444, #F87171)",
    textColor: "#F87171",
    glowColor: "rgba(248, 113, 113, 0.2)",
    shineColor: "rgba(255, 200, 200, 0.4)",
  },
};

interface ShinyTagProps {
  tier: AlphaGrade;
  className?: string;
}

export default function ShinyTag({ tier, className = "" }: ShinyTagProps) {
  const style = TIER_STYLES[tier];
  const config = GRADE_CONFIG[tier];

  return (
    <span
      className={`shiny-tag relative inline-flex items-center justify-center overflow-hidden font-mono text-[10px] font-bold tracking-wider whitespace-nowrap ${className}`}
      style={{
        /* Outer wrapper with gradient border via background trick */
        padding: "1px",
        borderRadius: "6px",
        background: style.borderGradient,
        boxShadow: `0 0 8px ${style.glowColor}, inset 0 0 4px ${style.glowColor}`,
      }}
    >
      {/* Inner content */}
      <span
        className="relative z-[1] inline-flex items-center justify-center px-2.5 py-[3px]"
        style={{
          borderRadius: "5px",
          background: style.gradient,
          color: style.textColor,
          minWidth: "26px",
        }}
      >
        {/* Shine sweep overlay */}
        <span
          className="shiny-tag-shine absolute inset-0 z-[2] pointer-events-none"
          style={{
            borderRadius: "5px",
            background: `linear-gradient(105deg, transparent 40%, ${style.shineColor} 50%, transparent 60%)`,
            backgroundSize: "200% 100%",
          }}
        />
        {/* Letter */}
        <span className="relative z-[3]">{tier}</span>
      </span>
    </span>
  );
}
