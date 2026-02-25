"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Settings,
  Building2,
  Clock,
  Save,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";

const DAYS = [
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
  { label: "Sun", value: 0 },
];

export default function ClinicSettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Clinic fields
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [logo, setLogo] = useState("");
  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd, setWorkEnd] = useState("17:00");
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [appointmentDuration, setAppointmentDuration] = useState(30);
  const [currency, setCurrency] = useState("USD");
  const [timezone, setTimezone] = useState("UTC");

  // Change password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (session && session.user?.role !== "admin") {
      router.push("/dashboard");
    }
  }, [session, router]);

  useEffect(() => {
    fetchClinic();
  }, []);

  const fetchClinic = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/clinic");
      if (res.ok) {
        const data = await res.json();
        setName(data.name || "");
        setAddress(data.address || "");
        setPhone(data.phone || "");
        setEmail(data.email || "");
        setLogo(data.logo || "");
        setWorkStart(data.settings?.workingHours?.start || "09:00");
        setWorkEnd(data.settings?.workingHours?.end || "17:00");
        setWorkingDays(data.settings?.workingDays || [1, 2, 3, 4, 5]);
        setAppointmentDuration(data.settings?.appointmentDuration || 30);
        setCurrency(data.settings?.currency || "USD");
        setTimezone(data.settings?.timezone || "UTC");
      }
    } catch {
      showMsg("error", "Failed to load clinic settings.");
    } finally {
      setLoading(false);
    }
  };

  const showMsg = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/clinic", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          address,
          phone,
          email,
          logo,
          settings: {
            workingHours: { start: workStart, end: workEnd },
            workingDays,
            appointmentDuration,
            currency,
            timezone,
          },
        }),
      });
      if (res.ok) {
        showMsg("success", "Clinic settings saved successfully.");
      } else {
        const data = await res.json();
        showMsg("error", data.error || "Failed to save settings.");
      }
    } catch {
      showMsg("error", "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setChangingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showMsg("success", "Password changed successfully.");
        setCurrentPassword("");
        setNewPassword("");
      } else {
        showMsg("error", data.error || "Failed to change password.");
      }
    } catch {
      showMsg("error", "Failed to change password.");
    } finally {
      setChangingPassword(false);
    }
  };

  const toggleDay = (day: number) => {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  if (session?.user?.role !== "admin") return null;

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="page-title">
          <Settings className="h-6 w-6 text-sky-500" />
          <span>Clinic Settings</span>
        </h1>
        <p className="page-subtitle mt-1">
          Configure your clinic details, working hours, and preferences.
        </p>
      </div>

      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-medium ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
              : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-700 dark:bg-rose-950/30 dark:text-rose-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="card text-center py-10 text-slate-500 dark:text-slate-400 text-sm">
          Loading settings…
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Clinic Information */}
          <div className="card space-y-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
              <Building2 className="h-5 w-5 text-sky-500" />
              Clinic Information
            </h2>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                Clinic Name
              </label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                Address
              </label>
              <input
                className="input"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Phone
                </label>
                <input
                  className="input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Email
                </label>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                Logo URL
              </label>
              <input
                className="input"
                placeholder="https://…"
                value={logo}
                onChange={(e) => setLogo(e.target.value)}
              />
            </div>
          </div>

          {/* Working Hours & Preferences */}
          <div className="card space-y-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
              <Clock className="h-5 w-5 text-sky-500" />
              Schedule & Preferences
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Work Start
                </label>
                <input
                  className="input"
                  type="time"
                  value={workStart}
                  onChange={(e) => setWorkStart(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Work End
                </label>
                <input
                  className="input"
                  type="time"
                  value={workEnd}
                  onChange={(e) => setWorkEnd(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                Working Days
              </label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => (
                  <button
                    key={day.value}
                    onClick={() => toggleDay(day.value)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      workingDays.includes(day.value)
                        ? "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-600 dark:bg-sky-900/30 dark:text-sky-400"
                        : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Apt. Duration (min)
                </label>
                <input
                  className="input"
                  type="number"
                  min={5}
                  max={120}
                  value={appointmentDuration}
                  onChange={(e) =>
                    setAppointmentDuration(Number(e.target.value))
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Currency
                </label>
                <select
                  className="input"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="SAR">SAR</option>
                  <option value="AED">AED</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Timezone
                </label>
                <select
                  className="input"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern</option>
                  <option value="America/Chicago">Central</option>
                  <option value="America/Denver">Mountain</option>
                  <option value="America/Los_Angeles">Pacific</option>
                  <option value="Europe/London">London</option>
                  <option value="Asia/Riyadh">Riyadh</option>
                  <option value="Asia/Dubai">Dubai</option>
                </select>
              </div>
            </div>
          </div>

          {/* Change Password */}
          <div className="card space-y-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
              <KeyRound className="h-5 w-5 text-amber-500" />
              Change Your Password
            </h2>

            <div className="relative">
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                Current Password
              </label>
              <input
                className="input pr-10"
                type={showPasswords ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="absolute right-3 top-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {showPasswords ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                New Password
              </label>
              <input
                className="input"
                type={showPasswords ? "text" : "password"}
                placeholder="Min 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <button
              onClick={handleChangePassword}
              disabled={
                changingPassword || !currentPassword || newPassword.length < 6
              }
              className="btn-primary"
            >
              {changingPassword ? "Changing…" : "Change Password"}
            </button>
          </div>
        </div>
      )}

      {/* Save Button */}
      {!loading && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save Settings"}
          </button>
        </div>
      )}
    </div>
  );
}
