"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  KeyRound,
  Lock,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Heart,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

function PortalResetPasswordForm() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError(t("auth.passwordMinLength"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("auth.passwordsDoNotMatch"));
      return;
    }

    if (!token) {
      setError(t("auth.resetTokenMissing"));
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/portal/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data.error || t("auth.failedToResetPassword"));
      }
    } catch {
      setError(t("portal.unexpectedError"));
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="card w-full max-w-md space-y-5">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangle className="h-7 w-7 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              {t("auth.invalidResetLink")}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("auth.invalidResetLinkDesc")}
            </p>
          </div>
          <Link
            href="/portal/forgot-password"
            className="btn-primary w-full justify-center"
          >
            <KeyRound className="h-4 w-4" />
            {t("portal.requestResetLink")}
          </Link>
          <Link
            href="/portal/login"
            className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("portal.backToLogin")}
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="card w-full max-w-md space-y-5">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30">
              <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              {t("portal.passwordResetSuccess")}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("portal.passwordResetSuccessDesc")}
            </p>
          </div>
          <Link
            href="/portal/login"
            className="btn-primary w-full justify-center"
          >
            <Lock className="h-4 w-4" />
            {t("common.login")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="card w-full max-w-md space-y-5">
        <div className="space-y-2">
          <span className="pill">
            <Heart className="h-3 w-3" />
            {t("portal.title")}
          </span>
          <h2 className="page-title text-2xl">
            <KeyRound className="h-6 w-6 text-amber-500" />
            <span>{t("portal.setNewPassword")}</span>
          </h2>
          <p className="page-subtitle">
            {t("portal.enterNewPasswordDesc")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-700 dark:bg-rose-950/30 dark:text-rose-400">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
              <Lock className="h-3 w-3 text-sky-500" />
              {t("auth.newPasswordLabel")}
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
              <Lock className="h-3 w-3 text-sky-500" />
              {t("auth.confirmPasswordLabel")}
            </label>
            <input
              className="input"
              type="password"
              placeholder={t("auth.confirmPasswordLabel")}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading || password.length < 6}
            className="btn-primary w-full justify-center"
          >
            {loading ? t("auth.resetting") : t("auth.resetPassword")}
          </button>

          <Link
            href="/portal/login"
            className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("portal.backToLogin")}
          </Link>
        </form>
      </div>
    </div>
  );
}

export default function PortalResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Loading…
          </p>
        </div>
      }
    >
      <PortalResetPasswordForm />
    </Suspense>
  );
}
