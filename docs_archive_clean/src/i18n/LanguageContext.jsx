import { createContext, useContext, useState, useCallback } from "react";
import pt from "./locales/pt.json";
import en from "./locales/en.json";
import es from "./locales/es.json";

const LOCALES = { pt, en, es };
const STORAGE_KEY = "appLanguage";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && LOCALES[saved]) return saved;
    } catch {/* ignore */}
    return "pt";
  });

  const setLanguage = useCallback((lang) => {
    if (!LOCALES[lang]) return;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch {/* ignore */}
    setLanguageState(lang);
  }, []);

  const locale = LOCALES[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, locale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}
