"use client";

import useSWR from "swr";
import { Check, Minus } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface PlanFeatures {
  maxDoctors: number;
  maxPatients: number;
  maxAppointmentsPerMonth: number;
  patientPortal: boolean;
  aiSummary: boolean;
  customBranding: boolean;
}

interface Plan {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  currency: string;
  interval: "MONTH" | "YEAR";
  features: PlanFeatures;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load plans");
  return res.json();
};

/**
 * Format a plan price.
 *
 * Always formatted in `en-US` with a narrow symbol ("$89"), even in Arabic:
 * the locale-aware form renders as "‏89 US$" with a bidi mark, which reads
 * worse than a plain figure. The value is wrapped in <bdi> at the call site
 * so RTL text around it cannot reorder the digits.
 */
function formatPrice(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

/**
 * Pick the plural bucket for a count.
 *
 * Arabic distinguishes five: one, two, 3–10, 11–99, and everything else.
 * "حتى 1 أطباء" is what you get without this.
 */
function pluralBucket(count: number, locale: string) {
  if (locale !== "ar") return count === 1 ? "One" : "Other";
  if (count === 1) return "One";
  if (count === 2) return "Two";
  const mod = count % 100;
  if (mod >= 3 && mod <= 10) return "Few";
  if (mod >= 11 && mod <= 99) return "Many";
  return "Other";
}

function FeatureRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-start gap-2.5 text-sm">
      {ok ? (
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
      ) : (
        <Minus className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
      )}
      <span
        className={
          ok
            ? "text-slate-700 dark:text-slate-300"
            : "text-slate-400 line-through dark:text-slate-600"
        }
      >
        {label}
      </span>
    </li>
  );
}

export function PricingSection() {
  const { t, locale } = useI18n();
  const { data, error, isLoading } = useSWR<Plan[]>(
    "/api/subscriptions/plans",
    fetcher
  );

  // Present tiers cheapest-first regardless of the stored sortOrder — a
  // pricing table that climbs is what readers expect, and it makes the
  // middle-card emphasis below meaningful.
  const plans = Array.isArray(data)
    ? [...data].sort((a, b) => a.price - b.price)
    : [];

  /** Render a numeric limit, or its "unlimited" wording when the limit is -1. */
  const limitLabel = (kind: string, value: number) =>
    value === -1
      ? t(`landing.pricing.${kind}Unlimited`)
      : t(`landing.pricing.${kind}${pluralBucket(value, locale)}`, {
          count: value,
        });

  return (
    <section id="pricing" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <span className="pill">{t("landing.nav.pricing")}</span>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl dark:text-slate-100">
          {t("landing.pricing.title")}
        </h2>
        <p className="mt-3 text-base text-slate-500 dark:text-slate-400">
          {t("landing.pricing.subtitle")}
        </p>
      </div>

      <div className="mt-12">
        {isLoading && (
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            {t("landing.pricing.loading")}
          </p>
        )}

        {error && (
          <div className="mx-auto max-w-lg">
            <p className="alert-info text-center">
              {t("landing.pricing.error")}
            </p>
          </div>
        )}

        {!isLoading && !error && plans.length === 0 && (
          <div className="mx-auto max-w-lg">
            <p className="alert-info text-center">
              {t("landing.pricing.empty")}
            </p>
          </div>
        )}

        {plans.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan, i) => {
              // With three or more tiers the middle one is the intended
              // default, so give it the visual weight.
              const featured = plans.length >= 3 && i === 1;
              const f = plan.features || ({} as PlanFeatures);

              return (
                <div
                  key={plan._id}
                  className={`card flex flex-col ${
                    featured
                      ? "ring-2 ring-sky-500 dark:ring-sky-400"
                      : ""
                  }`}
                >
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {plan.name}
                  </h3>

                  {plan.description && (
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {plan.description}
                    </p>
                  )}

                  <div className="mt-5 flex items-baseline gap-1.5">
                    <bdi className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                      {formatPrice(plan.price, plan.currency)}
                    </bdi>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {plan.interval === "YEAR"
                        ? t("landing.pricing.perYear")
                        : t("landing.pricing.perMonth")}
                    </span>
                  </div>

                  <ul className="mt-6 flex-1 space-y-3">
                    <FeatureRow
                      ok
                      label={limitLabel("doctors", f.maxDoctors)}
                    />
                    <FeatureRow
                      ok
                      label={limitLabel("patients", f.maxPatients)}
                    />
                    <FeatureRow
                      ok
                      label={limitLabel(
                        "appointments",
                        f.maxAppointmentsPerMonth
                      )}
                    />
                    <FeatureRow
                      ok={!!f.patientPortal}
                      label={t("landing.pricing.portal")}
                    />
                    <FeatureRow
                      ok={!!f.aiSummary}
                      label={t("landing.pricing.ai")}
                    />
                    <FeatureRow
                      ok={!!f.customBranding}
                      label={t("landing.pricing.branding")}
                    />
                  </ul>

                  <a
                    href="#demo"
                    className={`mt-8 w-full ${
                      featured ? "btn-primary" : "btn-secondary"
                    }`}
                  >
                    {t("landing.pricing.cta")}
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
