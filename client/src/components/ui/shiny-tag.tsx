/**
 * ShinyTag — Rarity-tier badge with metallic gradient & shine sweep
 * Tiers: S (Metallic Gold) | A (Purple) | B (Blue) | C (Green) | D (Grey)
 * Shape: rounded-full pill, h-9, min-w-9
 * Effect: gradient background-position shift on hover + white shine sweep
 */
import { type AlphaGrade } from "@/lib/mockData";

/* ── Per-tier Tailwind class bundles ── */
const TIER_CLASSES: Record<AlphaGrade, string> = {
  S: "border-[#D4AF37] text-[#5B3D00] bg-[linear-gradient(135deg,#7A5310_0%,#C9971A_18%,#FFF1A8_34%,#F7D774_50%,#B97A0E_66%,#FFE89A_82%,#8A5B12_100%)]",
  A: "border-[#9A7CFF] text-white bg-[linear-gradient(135deg,#4C2A9C_0%,#7B4DFF_22%,#C7B6FF_48%,#8E63FF_68%,#5B35C8_100%)]",
  B: "border-[#5AA9FF] text-white bg-[linear-gradient(135deg,#0D4D9E_0%,#2F7BFF_22%,#9ED0FF_48%,#4C97FF_68%,#1C5FC8_100%)]",
  C: "border-[#62C28B] text-white bg-[linear-gradient(135deg,#1E6B43_0%,#2FA866_24%,#9AE6B4_48%,#46C37B_70%,#1F7A49_100%)]",
  D: "border-[#8C93A1] text-white bg-[linear-gradient(135deg,#4B5563_0%,#6B7280_24%,#C7CDD6_48%,#7B8494_70%,#525A68_100%)]",
};

interface ShinyTagProps {
  tier: AlphaGrade;
  className?: string;
}

export default function ShinyTag({ tier, className = "" }: ShinyTagProps) {
  return (
    <div
      className={[
        "shiny-tag relative inline-flex h-7 min-w-7 select-none items-center justify-center overflow-hidden rounded-full px-2.5",
        "border text-[11px] font-semibold tracking-[0.08em]",
        "bg-[size:220%_220%] transition-[background-position,transform] duration-700",
        "hover:bg-[position:100%_50%]",
        TIER_CLASSES[tier],
        className,
      ].join(" ")}
    >
      {/* Letter */}
      <span className="relative z-10">{tier}</span>

      {/* Shine sweep overlay */}
      <span
        aria-hidden="true"
        className="shiny-tag-shine pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent_20%,rgba(255,255,255,0.06)_38%,rgba(255,255,255,0.38)_50%,rgba(255,255,255,0.06)_62%,transparent_80%)] bg-[size:200%_100%]"
      />

      {/* Inner ring highlight */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-[1px] rounded-full ring-1 ring-inset ring-white/20"
      />
    </div>
  );
}
