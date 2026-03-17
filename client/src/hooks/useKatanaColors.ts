/*
 * useKatanaColors — Theme-aware design tokens for Katana Deep Navy / Light
 * All pages import this single hook to get the correct colors for current theme.
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
  isDark: boolean;
}

export function useKatanaColors(): KatanaColors {
  const { theme } = useTheme();
  const dark = theme === "dark";

  return {
    isDark: dark,
    bg0: dark ? "#0d111c" : "#f4f5f7",
    bg1: dark ? "#101631" : "#ffffff",
    card: dark ? "rgba(236,238,243,0.04)" : "rgba(0,0,0,0.03)",
    cardHover: dark ? "rgba(236,238,243,0.08)" : "rgba(0,0,0,0.06)",
    popover: dark ? "rgba(16,22,49,0.95)" : "rgba(255,255,255,0.95)",
    border: dark ? "rgba(236,238,243,0.12)" : "rgba(0,0,0,0.10)",
    borderWeak: dark ? "rgba(236,238,243,0.08)" : "rgba(0,0,0,0.06)",
    text1: dark ? "rgba(236,238,243,0.92)" : "rgba(13,17,28,0.92)",
    text2: dark ? "rgba(236,238,243,0.48)" : "rgba(13,17,28,0.48)",
    text3: dark ? "rgba(236,238,243,0.32)" : "rgba(13,17,28,0.32)",
    primary: "#0058ff",
    primaryLight: dark ? "#4d94ff" : "#0058ff",
    primaryDim: dark ? "rgba(0,88,255,0.12)" : "rgba(0,88,255,0.08)",
    success: "#00ffc2",
    danger: "#f12211",
    accent: "#d7ff00",
    purple: "#a268ff",
    orange: "#db5e05",
  };
}
