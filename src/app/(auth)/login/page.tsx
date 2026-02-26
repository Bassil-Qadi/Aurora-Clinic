"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Mail, LogIn, KeyRound, Heart, Building2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function LoginPage() {
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
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.ok) {
        router.push("/dashboard");
      } else {
        setError("Invalid email or password. Please try again.");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="card grid w-full max-w-3xl grid-cols-1 gap-8 md:grid-cols-[1.1fr,0.9fr]">
        <div className="space-y-4">
          <span className="pill">{t("auth.staffAccess")}</span>
          <h2 className="page-title text-2xl">
            <Lock className="h-6 w-6 text-sky-500" />
            <span>{t("auth.signInSubtitle")}</span>
          </h2>
          <p className="page-subtitle">
            {t("auth.staffCredentials")}
          </p>

          <ul className="mt-4 space-y-2 text-xs text-slate-500 dark:text-slate-400">
            <li>• Role-based access to sensitive medical data.</li>
            <li>• Real-time overview of today&apos;s schedule.</li>
            <li>• Structured visits and follow-up planning.</li>
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
              <Mail className="h-3 w-3 text-sky-500" />
              <span>{t("common.email")}</span>
            </label>
            <input
              className="input"
              placeholder="you@clinic.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
              <Lock className="h-3 w-3 text-sky-500" />
              <span>{t("common.password")}</span>
            </label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center justify-end">
            <Link
              href="/forgot-password"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 transition-colors"
            >
              <KeyRound className="h-3 w-3" />
              {t("auth.forgotPassword")}
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center"
          >
            <LogIn className="h-4 w-4" />
            <span>{loading ? t("common.signingIn") : t("common.login")}</span>
          </button>

          <div className="border-t border-slate-100 pt-3 dark:border-slate-700 space-y-2">
            <Link
              href="/portal/login"
              className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 transition-colors"
            >
              <Heart className="h-3.5 w-3.5" />
              {t("portal.title")}
            </Link>
            <Link
              href="/register"
              className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 transition-colors"
            >
              <Building2 className="h-3.5 w-3.5" />
              {t("auth.registerClinic")}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
