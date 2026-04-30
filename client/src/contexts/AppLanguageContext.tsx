import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type UiLang = "en" | "zh";

interface AppLanguageContextType {
  uiLang: UiLang;
  setUiLang: (lang: UiLang) => void;
}

const AppLanguageContext = createContext<AppLanguageContextType | undefined>(undefined);

export function AppLanguageProvider({ children }: { children: React.ReactNode }) {
  const [uiLang, setUiLang] = useState<UiLang>(() => {
    if (typeof window === "undefined") return "en";
    return localStorage.getItem("otter_ui_lang") === "zh" ? "zh" : "en";
  });

  useEffect(() => {
    localStorage.setItem("otter_ui_lang", uiLang);
    if (typeof document !== "undefined") {
      document.documentElement.lang = uiLang === "zh" ? "zh-CN" : "en";
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
