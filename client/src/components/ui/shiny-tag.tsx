/**
 * ShinyTag — Flat-gradient rarity badge with subtle shine sweep
 * Tiers: S (Flat Gold) | A (Flat Purple) | B (Flat Blue) | C (Flat Green) | D (Flat Grey)
 * Shape: rounded-full pill, h-8, min-w-8
 * Effect: bg-position shift on hover + subtle white shine sweep on hover
 *
 * ⚠️  DO NOT change colors, border-radius, shadows, gradients, font-size, or spacing.
 *     If the runtime environment is missing tokens, fix Tailwind / globals.css first.
 */
import { type AlphaGrade } from "@/lib/mockData";

/* ── Per-tier class bundles — flat 3-stop gradients ── */
const TIER_CLASSES: Record<AlphaGrade, string> = {
  S: "border-[#E5C35A] text-[#6A4B00] bg-[linear-gradient(135deg,#E7C65B_0%,#F3DA84_50%,#E2BC45_100%)]",
  A: "border-[#9C86F8] text-white bg-[linear-gradient(135deg,#7B61FF_0%,#9B86FF_50%,#6B4FEA_100%)]",
  B: "border-[#69B2FF] text-white bg-[linear-gradient(135deg,#4B94F8_0%,#73B3FF_50%,#387FE0_100%)]",
  C: "border-[#72CB92] text-white bg-[linear-gradient(135deg,#43AF6D_0%,#72CB92_50%,#32935A_100%)]",
  D: "border-[#98A1AF] text-white bg-[linear-gradient(135deg,#7B8494_0%,#9EA6B4_50%,#687180_100%)]",
};

interface ShinyTagProps {
  tier: AlphaGrade;
  className?: string;
}

export default function ShinyTag({ tier, className = "" }: ShinyTagProps) {
  return (
    <div
      className={[
        "shiny-tag relative inline-flex h-8 min-w-8 select-none items-center justify-center overflow-hidden rounded-full px-3",
        "border text-sm font-semibold tracking-[0.04em]",
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
