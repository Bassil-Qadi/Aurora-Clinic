"use client";

import Link from "next/link";
import { Home, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  const { t } = useI18n();

  return (
    <nav
      className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-4"
      aria-label="Breadcrumb"
    >
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-sky-50 hover:text-sky-700 dark:hover:bg-sky-950/30 dark:hover:text-sky-400"
      >
        <Home className="h-4 w-4" />
        <span className="font-medium">{t("nav.dashboard")}</span>
      </Link>

      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-500" />
          {item.href ? (
            <Link
              href={item.href}
              className="rounded-lg px-2.5 py-1.5 transition-colors hover:bg-sky-50 hover:text-sky-700 dark:hover:bg-sky-950/30 dark:hover:text-sky-400"
            >
              <span className="font-medium">{item.label}</span>
            </Link>
          ) : (
            <span className="px-2.5 py-1.5 font-semibold text-slate-900 dark:text-slate-100">
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
