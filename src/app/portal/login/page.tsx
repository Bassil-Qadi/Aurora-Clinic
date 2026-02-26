"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, Mail, Lock, LogIn, ArrowLeft, UserPlus, KeyRound } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function PortalLoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/portal/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push("/portal/dashboard");
      } else {
        setError(data.error || t("portal.loginFailed"));
      }
    } catch {
      setError(t("portal.unexpectedError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="card grid w-full max-w-3xl grid-cols-1 gap-8 md:grid-cols-[1.1fr,0.9fr]">
        <div className="space-y-4">
          <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
            {t("portal.patientAccess")}
          </span>
          <h2 className="page-title text-2xl">
            <Heart className="h-6 w-6 text-emerald-500" />
            <span>{t("portal.title")}</span>
          </h2>
          <p className="page-subtitle">
            {t("portal.portalDesc")}
          </p>

          <ul className="mt-4 space-y-2 text-xs text-slate-500 dark:text-slate-400">
            <li>• {t("portal.portalFeature1")}</li>
            <li>• {t("portal.portalFeature2")}</li>
            <li>• {t("portal.portalFeature3")}</li>
          </ul>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-700 dark:bg-rose-950/30 dark:text-rose-400">
              {error}
            </div>
          )}

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

          <div>
            <label className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
              <Lock className="h-3 w-3 text-emerald-500" />
              {t("common.password")}
            </label>
            <input
              className="input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:from-emerald-600 hover:to-teal-600 disabled:opacity-60"
          >
            <LogIn className="h-4 w-4" />
            {loading ? t("common.signingIn") : t("common.signIn")}
          </button>

          <div className="border-t border-slate-100 pt-3 dark:border-slate-700 space-y-2">
            <Link
              href="/portal/forgot-password"
              className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-emerald-600 transition-colors dark:text-slate-400 dark:hover:text-emerald-400"
            >
              <KeyRound className="h-3.5 w-3.5" />
              {t("portal.forgotPasswordLink")}
            </Link>
            <Link
              href="/portal/register"
              className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-emerald-600 transition-colors dark:text-slate-400 dark:hover:text-emerald-400"
            >
              <UserPlus className="h-3.5 w-3.5" />
              {t("portal.registerLink")}
            </Link>
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-emerald-600 transition-colors dark:text-slate-400 dark:hover:text-emerald-400"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("portal.staffLoginLink")}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
