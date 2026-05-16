import { createContext, useContext, useMemo } from "react";
import { translate, LANGUAGES } from "./translations";

const LanguageContext = createContext({
  lang: "en",
  setLang: () => {},
  t: (key) => key,
});

export function LanguageProvider({ lang, setLang, children }) {
  const value = useMemo(() => ({
    lang,
    setLang,
    t: (key, vars) => translate(key, lang, vars),
  }), [lang, setLang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function useT() {
  return useContext(LanguageContext).t;
}

export { LANGUAGES };
