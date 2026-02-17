"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.ok) {
      router.push("/dashboard");
    } else {
      alert("Invalid credentials");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="card grid w-full max-w-3xl grid-cols-1 gap-8 md:grid-cols-[1.1fr,0.9fr]">
        <div className="space-y-4">
          <span className="pill">Staff Access</span>
          <h2 className="page-title text-2xl">
            <Lock className="h-6 w-6 text-sky-500" />
            <span>Sign in to your clinic workspace</span>
          </h2>
          <p className="page-subtitle">
            Use your staff account to manage patients, appointments, and medical
            records securely.
          </p>

          <ul className="mt-4 space-y-2 text-xs text-slate-500">
            <li>• Role-based access to sensitive medical data.</li>
            <li>• Real-time overview of today&apos;s schedule.</li>
            <li>• Structured visits and follow-up planning.</li>
          </ul>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-600">
              <Mail className="h-3 w-3 text-sky-500" />
              <span>Email</span>
            </label>
            <input
              className="input"
              placeholder="you@clinic.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-600">
              <Lock className="h-3 w-3 text-sky-500" />
              <span>Password</span>
            </label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-primary w-full justify-center">
            <LogIn className="h-4 w-4" />
            <span>Login</span>
          </button>
        </form>
      </div>
    </div>
  );
}
