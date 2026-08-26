"use client";

import Link from "next/link";
import Image, { type StaticImageData } from "next/image";
import {
  CalendarDays,
  Users,
  FileText,
  Smartphone,
  MessageCircle,
  Video,
  BarChart3,
  ShieldCheck,
  Languages,
  MonitorSmartphone,
  Check,
  LogIn,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Logo } from "@/components/Logo";
import calendarAr from "@/assets/shot-calendar-ar.webp";
import calendarEn from "@/assets/shot-calendar-en.webp";
import analyticsAr from "@/assets/shot-analytics-ar.webp";
import analyticsEn from "@/assets/shot-analytics-en.webp";
import { LandingNav } from "@/components/landing/LandingNav";
import { PricingSection } from "@/components/landing/PricingSection";
import { DemoForm } from "@/components/landing/DemoForm";
import { FaqSection } from "@/components/landing/FaqSection";

const TRUST = [
  { icon: Languages, title: "bilingualTitle", body: "bilingualBody" },
  { icon: MessageCircle, title: "remindersTitle", body: "remindersBody" },
  { icon: MonitorSmartphone, title: "anywhereTitle", body: "anywhereBody" },
];

const FEATURES = [
  { icon: CalendarDays, key: "scheduling" },
  { icon: Users, key: "records" },
  { icon: FileText, key: "prescriptions" },
  { icon: Smartphone, key: "portal" },
  { icon: MessageCircle, key: "reminders" },
  { icon: Video, key: "telehealth" },
  { icon: BarChart3, key: "analytics" },
  { icon: ShieldCheck, key: "roles" },
];

function Spotlight({
  badge,
  title,
  body,
  points,
  image,
  imageAlt,
  reverse,
}: {
  badge: string;
  title: string;
  body: string;
  points: string[];
  image: StaticImageData;
  imageAlt: string;
  reverse?: boolean;
}) {
  return (
    <div className="grid items-center gap-10 md:grid-cols-2">
      <div className={reverse ? "md:order-2" : undefined}>
        <span className="pill">{badge}</span>
        <h3 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-100">
          {title}
        </h3>
        <p className="mt-3 text-base leading-relaxed text-slate-600 dark:text-slate-400">
          {body}
        </p>
        <ul className="mt-6 space-y-3">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
                <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              </span>
              <span className="text-sm text-slate-700 dark:text-slate-300">
                {p}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Product screenshot. Images are pre-sized to 1400px and served as-is —
          next.config sets images.unoptimized for the Netlify deploy. */}
      <div
        className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:shadow-slate-950/40 ${
          reverse ? "md:order-1" : ""
        }`}
      >
        <Image
          src={image}
          alt={imageAlt}
          sizes="(min-width: 768px) 50vw, 100vw"
          className="h-auto w-full"
        />
      </div>
    </div>
  );
}

export default function HomePage() {
  const { t, locale } = useI18n();

  // The screenshots show the real UI, so they have to follow the reader's
  // language — an Arabic dashboard beside English copy reads as a mock-up.
  const shots =
    locale === "ar"
      ? { calendar: calendarAr, analytics: analyticsAr }
      : { calendar: calendarEn, analytics: analyticsEn };

  return (
    <div className="min-h-screen">
      <LandingNav />

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="pill">{t("landing.hero.badge")}</span>

          <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-5xl md:text-6xl dark:text-slate-100">
            {t("landing.hero.title")}{" "}
            <span className="bg-gradient-to-r from-sky-500 to-cyan-500 bg-clip-text text-transparent dark:from-sky-400 dark:to-cyan-400">
              {t("landing.hero.titleHighlight")}
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-400">
            {t("landing.hero.subtitle")}
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <a href="#demo" className="btn-primary">
              {t("landing.hero.ctaPrimary")}
            </a>
            <Link href="/login" className="btn-secondary">
              <LogIn className="h-4 w-4" />
              <span>{t("landing.hero.ctaSecondary")}</span>
            </Link>
          </div>

          <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">
            {t("landing.hero.note")}
          </p>
        </div>

        {/* Trust strip */}
        <div className="mt-16 grid gap-5 sm:grid-cols-3">
          {TRUST.map(({ icon: Icon, title, body }) => (
            <div key={title} className="card">
              <Icon className="h-6 w-6 text-sky-500 dark:text-sky-400" />
              <h3 className="mt-3 font-semibold text-slate-900 dark:text-slate-100">
                {t(`landing.trust.${title}`)}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {t(`landing.trust.${body}`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────── */}
      <section
        id="features"
        className="mx-auto max-w-6xl px-4 py-20 sm:px-6"
      >
        <div className="mx-auto max-w-2xl text-center">
          <span className="pill">{t("landing.nav.features")}</span>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl dark:text-slate-100">
            {t("landing.features.title")}
          </h2>
          <p className="mt-3 text-base text-slate-500 dark:text-slate-400">
            {t("landing.features.subtitle")}
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, key }) => (
            <div key={key} className="card">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-950/50">
                <Icon className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              </span>
              <h3 className="mt-4 font-semibold text-slate-900 dark:text-slate-100">
                {t(`landing.features.${key}Title`)}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {t(`landing.features.${key}Body`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Spotlights ───────────────────────────────────── */}
      <section className="mx-auto max-w-6xl space-y-20 px-4 py-10 sm:px-6">
        <Spotlight
          badge={t("landing.spotlight.portalBadge")}
          title={t("landing.spotlight.portalTitle")}
          body={t("landing.spotlight.portalBody")}
          points={[
            t("landing.spotlight.portalPoint1"),
            t("landing.spotlight.portalPoint2"),
            t("landing.spotlight.portalPoint3"),
          ]}
          image={shots.calendar}
          imageAlt={t("landing.spotlight.portalAlt")}
        />
        <Spotlight
          reverse
          badge={t("landing.spotlight.clinicBadge")}
          title={t("landing.spotlight.clinicTitle")}
          body={t("landing.spotlight.clinicBody")}
          points={[
            t("landing.spotlight.clinicPoint1"),
            t("landing.spotlight.clinicPoint2"),
            t("landing.spotlight.clinicPoint3"),
          ]}
          image={shots.analytics}
          imageAlt={t("landing.spotlight.clinicAlt")}
        />
      </section>

      {/* ── Pricing ──────────────────────────────────────── */}
      <PricingSection />

      {/* ── Demo request ─────────────────────────────────── */}
      <section id="demo" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid items-start gap-10 md:grid-cols-2">
          <div>
            <span className="pill">{t("landing.nav.bookDemo")}</span>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl dark:text-slate-100">
              {t("landing.demo.title")}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-600 dark:text-slate-400">
              {t("landing.demo.subtitle")}
            </p>
            <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
              {t("landing.hero.note")}
            </p>
          </div>

          <DemoForm />
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────── */}
      <FaqSection />

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="border-t border-slate-200/60 dark:border-slate-800/60">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5">
                <Logo className="h-8 w-8" />
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {t("common.appName")}
                </span>
              </div>
              <p className="mt-3 max-w-xs text-sm text-slate-500 dark:text-slate-400">
                {t("landing.footer.tagline")}
              </p>
            </div>

            <div>
              <h4 className="card-title">{t("landing.footer.product")}</h4>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <a
                    href="#features"
                    className="text-slate-500 transition-colors hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400"
                  >
                    {t("landing.nav.features")}
                  </a>
                </li>
                <li>
                  <a
                    href="#pricing"
                    className="text-slate-500 transition-colors hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400"
                  >
                    {t("landing.nav.pricing")}
                  </a>
                </li>
                <li>
                  <Link
                    href="/login"
                    className="text-slate-500 transition-colors hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400"
                  >
                    {t("landing.nav.staffLogin")}
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="card-title">{t("landing.footer.forPatients")}</h4>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link
                    href="/portal"
                    className="text-slate-500 transition-colors hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400"
                  >
                    {t("landing.nav.portal")}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/portal/register"
                    className="text-slate-500 transition-colors hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400"
                  >
                    {t("landing.footer.patientRegister")}
                  </Link>
                </li>
                <li>
                  <a
                    href="#demo"
                    className="text-slate-500 transition-colors hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400"
                  >
                    {t("landing.footer.company")}
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <p className="mt-10 border-t border-slate-200/60 pt-6 text-center text-xs text-slate-400 dark:border-slate-800/60 dark:text-slate-500">
            © {new Date().getFullYear()} {t("common.appName")} —{" "}
            {t("landing.footer.rights")}
          </p>
        </div>
      </footer>
    </div>
  );
}
