"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, KeyRound } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [resetUrl, setResetUrl] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setSent(true);
        // In dev mode, the API returns the reset URL
        if (data.resetUrl) {
          setResetUrl(data.resetUrl);
        }
      } else {
        setError(data.error || "Something went wrong.");
      }
    } catch {
      setError("Failed to send request.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="card w-full max-w-md space-y-5">
        <div className="space-y-2">
          <span className="pill">{t("auth.resetPassword")}</span>
          <h2 className="page-title text-2xl">
            <KeyRound className="h-6 w-6 text-amber-500" />
            <span>{t("auth.forgotPassword")}</span>
          </h2>
          <p className="page-subtitle">
            {t("auth.enterEmailForReset")}
          </p>
        </div>

        {sent ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
              {t("auth.resetSuccessDesc")}
            </div>

            {resetUrl && (
              <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm dark:border-sky-700 dark:bg-sky-950/30">
                <p className="font-medium text-sky-800 mb-1 dark:text-sky-300">
                  Development Mode — Reset Link:
                </p>
                <a
                  href={resetUrl}
                  className="text-sky-600 underline break-all text-xs dark:text-sky-400"
                >
                  {resetUrl}
                </a>
              </div>
            )}

            <Link
              href="/login"
              className="btn-secondary w-full justify-center"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("auth.backToLogin")}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-700 dark:bg-rose-950/30 dark:text-rose-400">
                {error}
              </div>
            )}

            <div>
              <label className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                <Mail className="h-3 w-3 text-sky-500" />
                {t("common.email")}
              </label>
              <input
                className="input"
                type="email"
                placeholder="you@clinic.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="btn-primary w-full justify-center"
            >
              {loading ? t("auth.requestingLink") : t("auth.requestResetLink")}
            </button>

            <Link
              href="/login"
              className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("auth.backToLogin")}
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
