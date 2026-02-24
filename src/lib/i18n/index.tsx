"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import en from "./locales/en.json";
import ar from "./locales/ar.json";

// ─── Types ──────────────────────────────────────────────────
export type Locale = "en" | "ar";

type Translations = typeof en;

const translations: Record<Locale, Translations> = { en, ar };

export const RTL_LOCALES: Locale[] = ["ar"];

// ─── Helpers ────────────────────────────────────────────────
/**
 * Resolve a dot-separated key like "nav.dashboard" from the translation tree.
 */
function resolve(obj: any, path: string): string {
  return path.split(".").reduce((acc, key) => acc?.[key], obj) ?? path;
}

// ─── Context ────────────────────────────────────────────────
interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  dir: "ltr" | "rtl";
}

const I18nContext = createContext<I18nContextValue>({
  locale: "en",
  setLocale: () => {},
  t: (k) => k,
  dir: "ltr",
});

// ─── Provider ───────────────────────────────────────────────
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  // Persist preference
  useEffect(() => {
    const stored = localStorage.getItem("locale") as Locale | null;
    if (stored && translations[stored]) {
      setLocaleState(stored);
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("locale", l);
  }, []);

  // Apply dir attribute to <html>
  const dir = RTL_LOCALES.includes(locale) ? "rtl" : "ltr";
  useEffect(() => {
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", locale);
  }, [dir, locale]);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      let str = resolve(translations[locale], key);
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          str = str.replace(new RegExp(`{{${k}}}`, "g"), String(v));
        });
      }
      return str;
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, dir }}>
      {children}
    </I18nContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────
export function useI18n() {
  return useContext(I18nContext);
}
