"use client";

import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const DOCTOR_OPTIONS = [
  { value: "1", key: "landing.demo.doctors1" },
  { value: "2-5", key: "landing.demo.doctors2" },
  { value: "6-15", key: "landing.demo.doctors6" },
  { value: "16+", key: "landing.demo.doctors16" },
] as const;

const EMPTY = {
  name: "",
  clinicName: "",
  email: "",
  phone: "",
  country: "",
  doctorCount: "1",
  message: "",
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500";

export function DemoForm() {
  const { t, locale } = useI18n();
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState("");

  const set = (key: keyof typeof EMPTY) => (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name || !form.clinicName || !form.email || !form.phone) {
      setStatus("error");
      setErrorMsg(t("landing.demo.required"));
      return;
    }

    setStatus("sending");
    setErrorMsg("");

    try {
      const res = await fetch("/api/demo-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, locale }),
      });

      if (!res.ok) throw new Error("Request failed");

      setStatus("done");
      setForm(EMPTY);
    } catch {
      setStatus("error");
      setErrorMsg(t("landing.demo.error"));
    }
  }

  if (status === "done") {
    return (
      <div className="card flex flex-col items-center gap-3 py-12 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        <h3 className="section-heading">{t("landing.demo.successTitle")}</h3>
        <p className="page-subtitle max-w-sm">
          {t("landing.demo.successBody")}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="demo-name" className="form-label">
            {t("landing.demo.name")} *
          </label>
          <input
            id="demo-name"
            className={inputClass}
            value={form.name}
            onChange={set("name")}
            autoComplete="name"
            required
          />
        </div>

        <div>
          <label htmlFor="demo-clinic" className="form-label">
            {t("landing.demo.clinicName")} *
          </label>
          <input
            id="demo-clinic"
            className={inputClass}
            value={form.clinicName}
            onChange={set("clinicName")}
            autoComplete="organization"
            required
          />
        </div>

        <div>
          <label htmlFor="demo-email" className="form-label">
            {t("landing.demo.email")} *
          </label>
          <input
            id="demo-email"
            type="email"
            dir="ltr"
            className={`${inputClass} text-start`}
            value={form.email}
            onChange={set("email")}
            autoComplete="email"
            required
          />
        </div>

        <div>
          <label htmlFor="demo-phone" className="form-label">
            {t("landing.demo.phone")} *
          </label>
          <input
            id="demo-phone"
            type="tel"
            dir="ltr"
            className={`${inputClass} text-start`}
            value={form.phone}
            onChange={set("phone")}
            autoComplete="tel"
            required
          />
        </div>

        <div>
          <label htmlFor="demo-country" className="form-label">
            {t("landing.demo.country")}
          </label>
          <input
            id="demo-country"
            className={inputClass}
            value={form.country}
            onChange={set("country")}
            autoComplete="country-name"
          />
        </div>

        <div>
          <label htmlFor="demo-doctors" className="form-label">
            {t("landing.demo.doctors")}
          </label>
          <select
            id="demo-doctors"
            className={inputClass}
            value={form.doctorCount}
            onChange={set("doctorCount")}
          >
            {DOCTOR_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {t(o.key)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="demo-message" className="form-label">
          {t("landing.demo.message")}
        </label>
        <textarea
          id="demo-message"
          rows={3}
          className={inputClass}
          value={form.message}
          onChange={set("message")}
        />
      </div>

      {status === "error" && errorMsg && (
        <p className="alert-error">{errorMsg}</p>
      )}

      <button
        type="submit"
        className="btn-primary w-full"
        disabled={status === "sending"}
      >
        <Send className="h-4 w-4" />
        <span>
          {status === "sending"
            ? t("landing.demo.submitting")
            : t("landing.demo.submit")}
        </span>
      </button>
    </form>
  );
}
