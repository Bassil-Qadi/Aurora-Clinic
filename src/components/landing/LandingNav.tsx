"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, LogIn } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Logo } from "@/components/Logo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";

const SECTIONS = [
  { href: "#features", key: "landing.nav.features" },
  { href: "#pricing", key: "landing.nav.pricing" },
];

export function LandingNav() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/70 backdrop-blur-lg dark:border-slate-800/60 dark:bg-slate-950/70">
      <nav className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo className="h-8 w-8 shrink-0" />
          <span className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {t("common.appName")}
          </span>
        </Link>

        {/* Desktop links */}
        <div className="ms-6 hidden items-center gap-6 md:flex">
          {SECTIONS.map((s) => (
            <a
              key={s.href}
              href={s.href}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400"
            >
              {t(s.key)}
            </a>
          ))}
          <Link
            href="/portal"
            className="text-sm font-medium text-slate-600 transition-colors hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400"
          >
            {t("landing.nav.portal")}
          </Link>
        </div>

        <div className="ms-auto flex items-center gap-2">
          <div className="hidden sm:flex sm:items-center sm:gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>

          <Link
            href="/login"
            className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-sky-600 sm:inline-flex dark:text-slate-400 dark:hover:text-sky-400"
          >
            <LogIn className="h-4 w-4" />
            <span>{t("landing.nav.staffLogin")}</span>
          </Link>

          <a href="#demo" className="btn-primary hidden md:inline-flex">
            {t("landing.nav.bookDemo")}
          </a>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={t("landing.nav.menu")}
            aria-expanded={open}
            className="inline-flex items-center justify-center rounded-full p-2 text-slate-600 transition-colors hover:bg-slate-100 md:hidden dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile panel */}
      {open && (
        <div className="border-t border-slate-200/60 bg-white/95 px-4 py-4 md:hidden dark:border-slate-800/60 dark:bg-slate-950/95">
          <div className="flex flex-col gap-1">
            {SECTIONS.map((s) => (
              <a
                key={s.href}
                href={s.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {t(s.key)}
              </a>
            ))}
            <Link
              href="/portal"
              onClick={() => setOpen(false)}
              className="rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {t("landing.nav.portal")}
            </Link>
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {t("landing.nav.staffLogin")}
            </Link>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>

          <a
            href="#demo"
            onClick={() => setOpen(false)}
            className="btn-primary mt-4 w-full"
          >
            {t("landing.nav.bookDemo")}
          </a>
        </div>
      )}
    </header>
  );
}
