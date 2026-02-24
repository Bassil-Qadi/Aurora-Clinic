"use client";

import { useI18n, type Locale } from "@/lib/i18n";
import { Languages } from "lucide-react";

const LOCALES: { value: Locale; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "ar", label: "عر" },
];

export function LanguageToggle() {
  const { locale, setLocale } = useI18n();

  return (
    <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1 dark:bg-slate-800">
      {LOCALES.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => setLocale(value)}
          title={value === "en" ? "English" : "العربية"}
          className={`flex items-center justify-center rounded-full px-2 py-1 text-[10px] font-semibold transition-colors ${
            locale === value
              ? "bg-white text-sky-600 shadow-sm dark:bg-slate-700 dark:text-sky-400"
              : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
