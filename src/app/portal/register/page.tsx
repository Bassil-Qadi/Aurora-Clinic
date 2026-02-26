"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Heart,
  Building2,
  User,
  Mail,
  Lock,
  Phone,
  Calendar,
  CheckCircle2,
  LogIn,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

type Clinic = { _id: string; name: string; slug: string };

export default function PatientRegisterPage() {
  const { t } = useI18n();
  const router = useRouter();

  // Clinic list
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [clinicsLoading, setClinicsLoading] = useState(true);

  // Form fields
  const [clinicId, setClinicId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI state
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Max DOB = today (no future dates)
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    fetch("/api/portal/clinics")
      .then((r) => r.json())
      .then((data) => setClinics(data.clinics || []))
      .catch(() => setClinics([]))
      .finally(() => setClinicsLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("portal.passwordsDoNotMatch"));
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/portal/self-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicId,
          firstName,
          lastName,
          dateOfBirth,
          gender,
          phone,
          email,
          password,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data.error || t("portal.registerError"));
      }
    } catch {
      setError(t("portal.unexpectedError"));
    } finally {
      setLoading(false);
    }
  }

  /* ── Success state ── */
  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="card max-w-md w-full text-center space-y-5 py-12 px-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 mx-auto dark:bg-emerald-900/30">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {t("portal.registerSuccessTitle")}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("portal.registerSuccessDesc")}
          </p>
          <button
            onClick={() => router.push("/portal/login")}
            className="inline-flex mx-auto items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:from-emerald-600 hover:to-teal-600"
          >
            <LogIn className="h-4 w-4" />
            {t("portal.goToSignIn")}
          </button>
        </div>
      </div>
    );
  }

  /* ── Registration form ── */
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="card grid w-full max-w-4xl grid-cols-1 gap-8 md:grid-cols-[1.1fr,0.9fr]">

        {/* Left panel — branding */}
        <div className="space-y-5">
          <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
            {t("portal.patientAccess")}
          </span>
          <h2 className="page-title text-2xl">
            <Heart className="h-6 w-6 text-emerald-500" />
            <span>{t("portal.registerTitle")}</span>
          </h2>
          <p className="page-subtitle">{t("portal.registerSubtitle")}</p>

          <ul className="mt-4 space-y-2 text-xs text-slate-500 dark:text-slate-400">
            <li>• {t("portal.portalFeature1")}</li>
            <li>• {t("portal.portalFeature2")}</li>
            <li>• {t("portal.portalFeature3")}</li>
          </ul>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("portal.alreadyHaveAccount")}{" "}
              <Link
                href="/portal/login"
                className="font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
              >
                {t("common.signIn")}
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

          {/* ── Clinic ── */}
          <div>
            <label className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
              <Building2 className="h-3 w-3 text-emerald-500" />
              {t("portal.selectClinic")}
            </label>
            <div className="relative">
              <select
                className="input appearance-none pr-8"
                value={clinicId}
                onChange={(e) => setClinicId(e.target.value)}
                required
                disabled={clinicsLoading}
              >
                <option value="">
                  {clinicsLoading
                    ? t("portal.loadingClinics")
                    : t("portal.selectClinicPlaceholder")}
                </option>
                {clinics.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>
            {!clinicsLoading && clinics.length === 0 && (
              <p className="mt-1 text-xs text-rose-500">{t("portal.noClinicsAvailable")}</p>
            )}
          </div>

          {/* ── Personal info ── */}
          <div className="border-t border-slate-100 pt-3 dark:border-slate-700" />
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            {t("portal.personalInfo")}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                <User className="h-3 w-3 text-emerald-500" />
                {t("patients.firstName")}
              </label>
              <input
                className="input"
                placeholder={t("portal.firstNamePlaceholder")}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                <User className="h-3 w-3 text-emerald-500" />
                {t("patients.lastName")}
              </label>
              <input
                className="input"
                placeholder={t("portal.lastNamePlaceholder")}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                <Calendar className="h-3 w-3 text-emerald-500" />
                {t("patients.dateOfBirth")}
              </label>
              <input
                className="input"
                type="date"
                max={today}
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                <User className="h-3 w-3 text-emerald-500" />
                {t("patients.gender")}
              </label>
              <select
                className="input"
                value={gender}
                onChange={(e) => setGender(e.target.value as "male" | "female")}
                required
              >
                <option value="">{t("common.selectGender")}</option>
                <option value="male">{t("common.male")}</option>
                <option value="female">{t("common.female")}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
              <Phone className="h-3 w-3 text-emerald-500" />
              {t("common.phone")}
            </label>
            <input
              className="input"
              type="tel"
              placeholder={t("portal.phonePlaceholder")}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          {/* ── Account info ── */}
          <div className="border-t border-slate-100 pt-3 dark:border-slate-700" />
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            {t("portal.accountInfo")}
          </p>

          <div>
            <label className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
              <Mail className="h-3 w-3 text-emerald-500" />
              {t("common.email")}
            </label>
            <input
              className="input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                <Lock className="h-3 w-3 text-emerald-500" />
                {t("common.password")}
              </label>
              <input
                className="input"
                type="password"
                placeholder={t("portal.passwordPlaceholder")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                <Lock className="h-3 w-3 text-emerald-500" />
                {t("portal.confirmPassword")}
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
            disabled={loading || clinicsLoading || clinics.length === 0}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:from-emerald-600 hover:to-teal-600 disabled:opacity-60 mt-2"
          >
            <ArrowRight className="h-4 w-4" />
            {loading ? t("portal.creatingAccount") : t("portal.createAccount")}
          </button>
        </form>
      </div>
    </div>
  );
}
