"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { KeyRound, Lock, ArrowLeft, CheckCircle2, AlertTriangle } from "lucide-react";

function ResetPasswordForm() {
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
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!token) {
      setError("Reset token is missing. Please use the link from your email.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data.error || "Failed to reset password.");
      }
    } catch {
      setError("An unexpected error occurred.");
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
              Invalid Reset Link
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              This password reset link is invalid or has expired. Please request
              a new one.
            </p>
          </div>
          <Link
            href="/forgot-password"
            className="btn-primary w-full justify-center"
          >
            <KeyRound className="h-4 w-4" />
            Request New Link
          </Link>
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Login
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
              Password Reset Successfully
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Your password has been updated. You can now sign in with your new
              password.
            </p>
          </div>
          <Link
            href="/login"
            className="btn-primary w-full justify-center"
          >
            <Lock className="h-4 w-4" />
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="card w-full max-w-md space-y-5">
        <div className="space-y-2">
          <span className="pill">Account Recovery</span>
          <h2 className="page-title text-2xl">
            <KeyRound className="h-6 w-6 text-amber-500" />
            <span>Reset your password</span>
          </h2>
          <p className="page-subtitle">
            Enter your new password below. Make sure it&apos;s at least 6
            characters.
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
              New Password
            </label>
            <input
              className="input"
              type="password"
              placeholder="Min 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
              <Lock className="h-3 w-3 text-sky-500" />
              Confirm Password
            </label>
            <input
              className="input"
              type="password"
              placeholder="Re-enter password"
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
            {loading ? "Resetting…" : "Reset Password"}
          </button>

          <Link
            href="/login"
            className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Login
          </Link>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
