/**
 * ShinyTag — Flat-gradient rarity badge with subtle shine sweep
 * Tiers: S (Gold) | A (Pink) | B (Purple) | C (Green) | D (Blue) | F (Silver)
 * Shape: rounded-full pill, h-[22px], min-w-[22px]
 * Effect: bg-position shift on hover + subtle white shine sweep on hover
 *
 * ⚠️  DO NOT change colors, border-radius, shadows, gradients, font-size, or spacing.
 *     If the runtime environment is missing tokens, fix Tailwind / globals.css first.
 */
import { type AlphaGrade } from "@/lib/mockData";

/* ── Per-tier class bundles — gem-rank gradients ── */
const TIER_CLASSES: Record<AlphaGrade, string> = {
  S: "border-[#E5B63A] text-[#7A4B00] bg-[linear-gradient(135deg,#F8B22B_0%,#FBE38C_48%,#F97316_100%)]",
  A: "border-[#EC5FAF] text-white bg-[linear-gradient(135deg,#EC4899_0%,#F9A8D4_52%,#DB2777_100%)]",
  B: "border-[#9B6CFF] text-white bg-[linear-gradient(135deg,#7C3AED_0%,#C084FC_52%,#6D28D9_100%)]",
  C: "border-[#34D399] text-white bg-[linear-gradient(135deg,#10B981_0%,#A7F3D0_52%,#059669_100%)]",
  D: "border-[#38BDF8] text-white bg-[linear-gradient(135deg,#38BDF8_0%,#BAE6FD_52%,#0284C7_100%)]",
  F: "border-[#94A3B8] text-[#334155] bg-[linear-gradient(135deg,#CBD5E1_0%,#F8FAFC_52%,#94A3B8_100%)]",
};

interface ShinyTagProps {
  tier: AlphaGrade;
  className?: string;
}

export default function ShinyTag({ tier, className = "" }: ShinyTagProps) {
  return (
    <div
      className={[
        "shiny-tag relative inline-flex h-[22px] min-w-[22px] select-none items-center justify-center overflow-hidden rounded-full px-2.5",
        "border text-[10px] font-semibold tracking-[0.04em]",
        "bg-[size:200%_200%] transition-[background-position] duration-500",
        "hover:bg-[position:100%_50%]",
        TIER_CLASSES[tier],
        className,
      ].join(" ")}
    >
      {/* Letter */}
      <span className="relative z-10">{tier}</span>

      {/* Subtle shine sweep overlay (hover-triggered via CSS) */}
      <span
        aria-hidden="true"
        className="shiny-tag-shine pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent_30%,rgba(255,255,255,0.12)_50%,transparent_70%)] bg-[size:180%_100%]"
      />
    </div>
  );
}
