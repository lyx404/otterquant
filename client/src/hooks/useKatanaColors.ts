/*
 * useC — Theme-aware design tokens for Modern Developer Tool Aesthetic
 * Light: #FFFFFF base, Zinc scale, Blue primary
 * Dark: #000000 base, Zinc scale, Blue primary
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
    bg0: dark ? "#000000" : "#FFFFFF",
    bg1: dark ? "#0A0A0A" : "#F4F4F5",
    card: dark ? "#0A0A0A" : "#F4F4F5",
    cardHover: dark ? "#121212" : "#E4E4E7",
    popover: dark ? "#0A0A0A" : "#FFFFFF",
    border: dark ? "#27272A" : "#E4E4E7",
    borderWeak: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    text1: dark ? "#FAFAFA" : "#09090B",
    text2: dark ? "#A1A1AA" : "#52525B",
    text3: dark ? "#52525B" : "#A1A1AA",
    primary: "#3B82F6",
    primaryLight: "#60A5FA",
    primaryDim: dark ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.1)",
    success: "#10B981",
    danger: "#EF4444",
    accent: "#8B5CF6",
    purple: "#8B5CF6",
    orange: "#F59E0B",
    warning: "#F59E0B",
    gold: "#F59E0B",
    goldDim: dark ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.1)",
    silver: "#A1A1AA",
    bronze: "#D97706",
  };
}

// Alias for backward compatibility
export const useC = useKatanaColors;
