import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type UiLang = "en" | "zh" | "ja" | "ko" | "es" | "fr";
export type UiCopy = Partial<Record<UiLang, string>>;

interface AppLanguageContextType {
  uiLang: UiLang;
  setUiLang: (lang: UiLang) => void;
}

const AppLanguageContext = createContext<AppLanguageContextType | undefined>(undefined);
const supportedLangs: UiLang[] = ["en", "zh", "ja", "ko", "es", "fr"];
const documentLangMap: Record<UiLang, string> = {
  en: "en",
  zh: "zh-CN",
  ja: "ja",
  ko: "ko",
  es: "es",
  fr: "fr",
};

export function AppLanguageProvider({ children }: { children: React.ReactNode }) {
  const [uiLang, setUiLang] = useState<UiLang>(() => {
    if (typeof window === "undefined") return "en";
    const stored = localStorage.getItem("otter_ui_lang");
    return supportedLangs.includes(stored as UiLang) ? (stored as UiLang) : "en";
  });

  useEffect(() => {
    localStorage.setItem("otter_ui_lang", uiLang);
    if (typeof document !== "undefined") {
      document.documentElement.lang = documentLangMap[uiLang];
    }
  }, [uiLang]);

  const value = useMemo(() => ({ uiLang, setUiLang }), [uiLang]);

  return (
    <AppLanguageContext.Provider value={value}>
      {children}
    </AppLanguageContext.Provider>
  );
}

export function useAppLanguage() {
  const context = useContext(AppLanguageContext);
  if (!context) {
    throw new Error("useAppLanguage must be used within AppLanguageProvider");
  }
  return context;
}

export function translateUi(uiLang: UiLang, en: string, zh: string, copy: UiCopy = {}) {
  return copy[uiLang] ?? (uiLang === "zh" ? zh : en);
}
