/*
 * useKatanaColors — Theme-aware design tokens for Amber/Orange + Warm Beige Design System
 * Light: #FDFCF6 warm beige base, Amber-500 #F59E0B primary, Orange-500 #F97316 secondary
 * Dark: #020617 deep slate base, Amber-400 #FBBF24 primary, Orange-400 #FB923C secondary
 * Cards: #F5F1E1 beige in both modes
 *
 * NOTE: This hook is being phased out in favor of pure Tailwind classes.
 * New code should use Tailwind dark: variants instead.
 * Kept for backward compatibility during migration.
 */
import { useTheme } from "@/contexts/ThemeContext";

export interface KatanaColors {
  bg0: string;
  bg1: string;
  card: string;
  cardHover: string;
  popover: string;
  border: string;
  borderWeak: string;
  text1: string;
  text2: string;
  text3: string;
  primary: string;
  primaryLight: string;
  primaryDim: string;
  secondary: string;
  success: string;
  danger: string;
  accent: string;
  purple: string;
  orange: string;
  warning: string;
  isDark: boolean;
  gold: string;
  goldDim: string;
  silver: string;
  bronze: string;
}

export function useKatanaColors(): KatanaColors {
  const { theme } = useTheme();
  const dark = theme === "dark";

  return {
    isDark: dark,
    bg0: dark ? "#020617" : "#FDFCF6",
    bg1: dark ? "#0F172A" : "#F5F1E1",
    card: "#F5F1E1",
    cardHover: dark ? "#EDE8D8" : "#EDE8D8",
    popover: dark ? "#1E293B" : "#FFFFFF",
    border: dark ? "#334155" : "#DDD8C8",
    borderWeak: dark ? "rgba(148,163,184,0.1)" : "rgba(15,23,42,0.06)",
    text1: dark ? "#F8FAFC" : "#0F172A",
    text2: dark ? "#94A3B8" : "#64748B",
    text3: dark ? "#475569" : "#94A3B8",
    primary: dark ? "#FBBF24" : "#F59E0B",
    primaryLight: dark ? "#FDE68A" : "#FBBF24",
    primaryDim: dark ? "rgba(251,191,36,0.15)" : "rgba(245,158,11,0.1)",
    secondary: dark ? "#FB923C" : "#F97316",
    success: dark ? "#34D399" : "#10B981",
    danger: dark ? "#F87171" : "#EF4444",
    accent: dark ? "#FBBF24" : "#F59E0B",
    purple: dark ? "#C084FC" : "#A855F7",
    orange: dark ? "#FB923C" : "#F97316",
    warning: dark ? "#FBBF24" : "#F59E0B",
    gold: dark ? "#FBBF24" : "#F59E0B",
    goldDim: dark ? "rgba(251,191,36,0.15)" : "rgba(245,158,11,0.1)",
    silver: "#94A3B8",
    bronze: "#D97706",
  };
}

// Alias for backward compatibility
export const useC = useKatanaColors;
