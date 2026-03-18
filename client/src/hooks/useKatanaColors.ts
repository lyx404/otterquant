/*
 * useKatanaColors — Theme-aware design tokens for Indigo/Sky + Slate Design System
 * Light: Slate-50 #F8FAFC base, Indigo-600 #4F46E5 primary, Sky-500 #0EA5E9 secondary
 * Dark: Slate-950 #020617 base, Indigo-400 #818CF8 primary, Sky-400 #38BDF8 secondary
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
    bg0: dark ? "#020617" : "#F8FAFC",
    bg1: dark ? "#0F172A" : "#FFFFFF",
    card: dark ? "#0F172A" : "#FFFFFF",
    cardHover: dark ? "#1E293B" : "#F1F5F9",
    popover: dark ? "#0F172A" : "#FFFFFF",
    border: dark ? "#1E293B" : "#E2E8F0",
    borderWeak: dark ? "rgba(148,163,184,0.1)" : "rgba(15,23,42,0.06)",
    text1: dark ? "#F8FAFC" : "#0F172A",
    text2: dark ? "#94A3B8" : "#64748B",
    text3: dark ? "#475569" : "#94A3B8",
    primary: dark ? "#818CF8" : "#4F46E5",
    primaryLight: dark ? "#A5B4FC" : "#6366F1",
    primaryDim: dark ? "rgba(129,140,248,0.15)" : "rgba(79,70,229,0.1)",
    secondary: dark ? "#38BDF8" : "#0EA5E9",
    success: dark ? "#34D399" : "#10B981",
    danger: dark ? "#F87171" : "#EF4444",
    accent: dark ? "#818CF8" : "#4F46E5",
    purple: dark ? "#C084FC" : "#A855F7",
    orange: dark ? "#FBBF24" : "#F59E0B",
    warning: dark ? "#FBBF24" : "#F59E0B",
    gold: dark ? "#FBBF24" : "#F59E0B",
    goldDim: dark ? "rgba(251,191,36,0.15)" : "rgba(245,158,11,0.1)",
    silver: "#94A3B8",
    bronze: "#D97706",
  };
}

// Alias for backward compatibility
export const useC = useKatanaColors;
