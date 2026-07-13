import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
type ThemePreference = Theme | "system";

const THEME_DEFAULTS_VERSION = "2";
const THEME_DEFAULTS_VERSION_KEY = "otter_theme_defaults_version";

interface ThemeContextType {
  theme: Theme;
  themePreference: ThemePreference;
  setThemePreference?: (theme: ThemePreference) => void;
  toggleTheme?: () => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemePreference;
  switchable?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
  switchable = false,
}: ThemeProviderProps) {
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => {
    if (switchable) {
      const stored = localStorage.getItem("theme");
      return (stored as ThemePreference) || defaultTheme;
    }
    return defaultTheme;
  });
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const resolveTheme = () => (themePreference === "system" ? (mediaQuery.matches ? "dark" : "light") : themePreference);
    const applyTheme = () => setTheme(resolveTheme());

    applyTheme();

    const handleChange = () => {
      if (themePreference === "system") {
        applyTheme();
      }
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, [themePreference]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  useEffect(() => {
    if (switchable) {
      localStorage.setItem("theme", themePreference);
    }
  }, [themePreference, switchable]);

  useEffect(() => {
    if (!switchable || typeof window === "undefined") return;
    if (localStorage.getItem(THEME_DEFAULTS_VERSION_KEY) === THEME_DEFAULTS_VERSION) return;

    localStorage.setItem(THEME_DEFAULTS_VERSION_KEY, THEME_DEFAULTS_VERSION);
    setThemePreference(defaultTheme);
  }, [defaultTheme, switchable]);

  const toggleTheme = switchable
    ? () => {
        setThemePreference(theme === "dark" ? "light" : "dark");
      }
    : undefined;

  return (
    <ThemeContext.Provider value={{ theme, themePreference, setThemePreference, toggleTheme, switchable }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
