import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type AlphaViewMode = "beginner" | "pro";

type AlphaViewModeContextValue = {
  alphaViewMode: AlphaViewMode;
  setAlphaViewMode: (mode: AlphaViewMode) => void;
};

const STORAGE_KEY = "alphaforge_view_mode";

const AlphaViewModeContext = createContext<AlphaViewModeContextValue | null>(null);

export function getAlphaDisplayName(mode: AlphaViewMode) {
  return mode === "beginner" ? "Signal" : "Factor";
}

export function getAlphaDisplayNamePlural(mode: AlphaViewMode) {
  return mode === "beginner" ? "Signals" : "Factors";
}

export function replaceAlphaTerms(text: string, mode: AlphaViewMode) {
  const singular = getAlphaDisplayName(mode);
  const plural = getAlphaDisplayNamePlural(mode);

  return text.replace(/\bAlphas?\b/gi, (match) => {
    const normalized = match.toLowerCase();
    const replacement = normalized === "alpha" ? singular : plural;

    if (match === match.toUpperCase()) return replacement.toUpperCase();
    if (match[0] === match[0]?.toUpperCase()) return replacement;
    return replacement.toLowerCase();
  });
}

export function useAlphaCopy() {
  const { alphaViewMode } = useAlphaViewMode();
  return {
    alphaViewMode,
    alphaLabel: getAlphaDisplayName(alphaViewMode),
    alphaLabels: getAlphaDisplayNamePlural(alphaViewMode),
    copyAlphaText: (text: string) => replaceAlphaTerms(text, alphaViewMode),
  };
}

function getInitialAlphaViewMode(): AlphaViewMode {
  if (typeof window === "undefined") return "pro";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved === "beginner" || saved === "pro" ? saved : "pro";
}

export function AlphaViewModeProvider({ children }: { children: ReactNode }) {
  const [alphaViewMode, setAlphaViewMode] = useState<AlphaViewMode>(getInitialAlphaViewMode);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, alphaViewMode);
    window.dispatchEvent(new CustomEvent("alphaforge-view-mode-change", { detail: alphaViewMode }));
  }, [alphaViewMode]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const next = event.newValue;
      if (next === "beginner" || next === "pro") {
        setAlphaViewMode(next);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
    <AlphaViewModeContext.Provider value={{ alphaViewMode, setAlphaViewMode }}>
      {children}
    </AlphaViewModeContext.Provider>
  );
}

export function useAlphaViewMode() {
  const context = useContext(AlphaViewModeContext);
  if (!context) {
    throw new Error("useAlphaViewMode must be used within AlphaViewModeProvider");
  }
  return context;
}
