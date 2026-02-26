"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  User,
  Mail,
  Lock,
  Phone,
  MapPin,
  CheckCircle2,
  LogIn,
  ArrowRight,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Logo } from "@/components/Logo";

export default function RegisterClinicPage() {
  const { t } = useI18n();
  const router = useRouter();

  // Clinic fields
  const [clinicName, setClinicName] = useState("");
  const [clinicPhone, setClinicPhone] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");

  // Admin fields
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (adminPassword !== confirmPassword) {
      setError(t("register.passwordsDoNotMatch"));
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register-clinic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicName,
          clinicPhone,
          clinicAddress,
          adminName,
          adminEmail,
          adminPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data.error || t("register.errorDefault"));
      }
    } catch {
      setError(t("register.errorDefault"));
    } finally {
      setLoading(false);
    }
  }

  /* ── Success state ── */
  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="card max-w-lg w-full text-center space-y-5 py-12 px-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100 mx-auto dark:bg-sky-900/30">
            <CheckCircle2 className="h-8 w-8 text-sky-600 dark:text-sky-400" />
          </div>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {t("register.successTitle")}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("register.successDesc")}
          </p>
          <button
            onClick={() => router.push("/login")}
            className="btn-primary mx-auto"
          >
            <LogIn className="h-4 w-4" />
            {t("register.goToLogin")}
          </button>
        </div>
      </div>
    );
  }

  /* ── Form ── */
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="card grid w-full max-w-4xl grid-cols-1 gap-8 md:grid-cols-[1.1fr,0.9fr]">

        {/* Left panel — marketing copy */}
        <div className="space-y-5">
          <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400">
            {t("register.new")}
          </span>
          <h2 className="page-title text-2xl">
            <Logo className="h-7 w-7" />
            <span>{t("register.title")}</span>
          </h2>
          <p className="page-subtitle">{t("register.subtitle")}</p>

          <ul className="mt-4 space-y-2 text-xs text-slate-500 dark:text-slate-400">
            <li>• {t("register.feature1")}</li>
            <li>• {t("register.feature2")}</li>
            <li>• {t("register.feature3")}</li>
          </ul>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("register.alreadyHaveAccount")}{" "}
              <Link
                href="/login"
                className="font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 transition-colors"
              >
                {t("register.signIn")}
              </Link>
            </p>
          </div>
        </div>

        {/* Right panel — form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-700 dark:bg-rose-950/30 dark:text-rose-400">
              {error}
            </div>
          )}

          {/* ── Clinic Details ── */}
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            {t("register.clinicDetails")}
          </p>

          <div>
            <label className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
              <Building2 className="h-3 w-3 text-sky-500" />
              {t("register.clinicName")}
            </label>
            <input
              className="input"
              placeholder={t("register.clinicNamePlaceholder")}
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                <Phone className="h-3 w-3 text-sky-500" />
                {t("register.clinicPhone")}
              </label>
              <input
                className="input"
                placeholder={t("register.clinicPhonePlaceholder")}
                value={clinicPhone}
                onChange={(e) => setClinicPhone(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                <MapPin className="h-3 w-3 text-sky-500" />
                {t("register.clinicAddress")}
              </label>
              <input
                className="input"
                placeholder={t("register.clinicAddressPlaceholder")}
                value={clinicAddress}
                onChange={(e) => setClinicAddress(e.target.value)}
              />
            </div>
          </div>

          {/* ── Admin Account ── */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700" />
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            {t("register.adminAccount")}
          </p>

          <div>
            <label className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
              <User className="h-3 w-3 text-sky-500" />
              {t("register.adminName")}
            </label>
            <input
              className="input"
              placeholder={t("register.adminNamePlaceholder")}
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
              <Mail className="h-3 w-3 text-sky-500" />
              {t("register.adminEmail")}
            </label>
            <input
              className="input"
              type="email"
              placeholder={t("register.adminEmailPlaceholder")}
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                <Lock className="h-3 w-3 text-sky-500" />
                {t("register.adminPassword")}
              </label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                <Lock className="h-3 w-3 text-sky-500" />
                {t("register.confirmPassword")}
              </label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center mt-2"
          >
            <ArrowRight className="h-4 w-4" />
            {loading ? t("register.registering") : t("register.register")}
          </button>
        </form>
      </div>
    </div>
  );
}
