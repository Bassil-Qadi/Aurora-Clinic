"use client";

import { ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const ITEMS = ["1", "2", "3", "4"];

export function FaqSection() {
  const { t } = useI18n();

  return (
    <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <h2 className="text-center text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl dark:text-slate-100">
        {t("landing.faq.title")}
      </h2>

      <div className="mt-10 space-y-3">
        {ITEMS.map((n) => (
          <details
            key={n}
            className="group card cursor-pointer p-0 [&[open]]:pb-5"
          >
            <summary className="flex list-none items-center justify-between gap-4 p-5 text-start font-medium text-slate-900 marker:content-none dark:text-slate-100">
              <span>{t(`landing.faq.q${n}`)}</span>
              <ChevronDown className="h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <p className="px-5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {t(`landing.faq.a${n}`)}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
