"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  ArrowLeft,
  Users,
  UserCheck,
  Calendar,
  Stethoscope,
  CreditCard,
  Shield,
  ClipboardList,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Save,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface ClinicDetail {
  _id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  address: string;
  isActive: boolean;
  subscriptionStatus: string;
  subscriptionPlanId?: { name: string; price: number; currency: string; interval: string };
  trialEndsAt?: string;
  settings: any;
  staff: { _id: string; name: string; email: string; role: string; isActive: boolean }[];
  patientCount: number;
  appointmentCount: number;
  visitCount: number;
  subscriptions: any[];
  createdAt: string;
}

const ROLE_ICONS: Record<string, string> = {
  admin: "text-violet-500",
  doctor: "text-sky-500",
  receptionist: "text-emerald-500",
};

const ROLE_BADGES: Record<string, string> = {
  admin: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-700",
  doctor: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-700",
  receptionist: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700",
};

const SUB_BADGE: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
  trialing: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
  past_due: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
  suspended: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400",
  cancelled: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  expired: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500",
  none: "bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-500",
};

export default function ClinicDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { t } = useI18n();
  const [clinic, setClinic] = useState<ClinicDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Editable fields
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");

  useEffect(() => {
    fetch(`/api/super-admin/clinics/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setClinic(d);
        setEditName(d.name || "");
        setEditEmail(d.email || "");
        setEditPhone(d.phone || "");
        setEditAddress(d.address || "");
      })
      .catch(() => setMsg({ type: "error", text: t("superAdmin.clinicDetail.loadFailed") }))
      .finally(() => setLoading(false));
  }, [id, t]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/super-admin/clinics/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, email: editEmail, phone: editPhone, address: editAddress }),
      });
      if (res.ok) {
        const updated = await res.json();
        setClinic((prev) => prev ? { ...prev, ...updated } : prev);
        setMsg({ type: "success", text: t("superAdmin.clinicDetail.clinicUpdated") });
      } else {
        const err = await res.json();
        setMsg({ type: "error", text: err.error || t("superAdmin.clinicDetail.updateFailed") });
      }
    } catch {
      setMsg({ type: "error", text: t("superAdmin.clinicDetail.updateFailed") });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    if (!clinic) return;
    try {
      const res = await fetch(`/api/super-admin/clinics/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !clinic.isActive }),
      });
      if (res.ok) {
        setClinic((prev) => prev ? { ...prev, isActive: !prev.isActive } : prev);
        setMsg({ type: "success", text: clinic.isActive ? t("superAdmin.clinicDetail.clinicDeactivated") : t("superAdmin.clinicDetail.clinicActivated") });
      }
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!clinic) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">{t("superAdmin.clinicDetail.clinicNotFound")}</p>
        <Link href="/super-admin/clinics" className="btn-secondary mt-4">
          <ArrowLeft className="h-4 w-4" /> {t("superAdmin.clinicDetail.backToClinics")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/super-admin/clinics" className="mb-2 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600">
            <ArrowLeft className="h-3 w-3" /> {t("superAdmin.clinicDetail.backToClinics")}
          </Link>
          <h1 className="page-title">
            <Building2 className="h-6 w-6 text-indigo-500" />
            <span>{clinic.name}</span>
          </h1>
          <p className="page-subtitle mt-1">{clinic.slug} · {t("superAdmin.clinics.created")} {new Date(clinic.createdAt).toLocaleDateString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleActive} className={clinic.isActive ? "btn-danger" : "btn-success"}>
            {clinic.isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
            <span>{clinic.isActive ? t("superAdmin.clinicDetail.deactivate") : t("superAdmin.clinicDetail.activate")}</span>
          </button>
        </div>
      </div>

      {msg && (
        <div className={msg.type === "success" ? "alert-success" : "alert-error"}>
          {msg.text}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("superAdmin.clinicDetail.staff")}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{clinic.staff.length}</p>
            </div>
            <Users className="h-5 w-5 text-indigo-500" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("superAdmin.clinicDetail.patients")}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{clinic.patientCount}</p>
            </div>
            <UserCheck className="h-5 w-5 text-emerald-500" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("superAdmin.clinicDetail.appointments")}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{clinic.appointmentCount}</p>
            </div>
            <Calendar className="h-5 w-5 text-sky-500" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("superAdmin.clinicDetail.visits")}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{clinic.visitCount}</p>
            </div>
            <Stethoscope className="h-5 w-5 text-emerald-500" />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Edit Clinic Info */}
        <div className="card space-y-4">
          <h2 className="card-title flex items-center gap-2">
            <Building2 className="h-4 w-4 text-indigo-500" />
            {t("superAdmin.clinicDetail.clinicInfo")}
          </h2>
          <div>
            <label className="form-label">{t("common.name")}</label>
            <input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} />
          </div>
          <div>
            <label className="form-label">{t("common.email")}</label>
            <input className="input" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
          </div>
          <div>
            <label className="form-label">{t("common.phone")}</label>
            <input className="input" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
          </div>
          <div>
            <label className="form-label">{t("common.address")}</label>
            <input className="input" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />
          </div>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            <Save className="h-4 w-4" />
            {saving ? t("common.saving") : t("common.saveChanges")}
          </button>
        </div>

        {/* Subscription */}
        <div className="space-y-6">
          <div className="card space-y-3">
            <h2 className="card-title flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-indigo-500" />
              {t("superAdmin.clinicDetail.subscription")}
            </h2>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${SUB_BADGE[clinic.subscriptionStatus] || SUB_BADGE.none}`}>
                {clinic.subscriptionStatus || t("superAdmin.common.none")}
              </span>
              {clinic.subscriptionPlanId && (
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {clinic.subscriptionPlanId.name} — ${clinic.subscriptionPlanId.price}/{clinic.subscriptionPlanId.interval === "YEAR" ? t("superAdmin.common.year") : t("superAdmin.common.month")}
                </span>
              )}
            </div>
            {clinic.trialEndsAt && (
              <p className="text-xs text-slate-500">
                {t("superAdmin.clinicDetail.trialEnds")} {new Date(clinic.trialEndsAt).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Subscription History */}
          {clinic.subscriptions.length > 0 && (
            <div className="card">
              <h2 className="card-title mb-3">{t("superAdmin.clinicDetail.subscriptionHistory")}</h2>
              <div className="space-y-2">
                {clinic.subscriptions.map((sub: any) => (
                  <div key={sub._id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3 dark:border-slate-800">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {sub.planId?.name || t("superAdmin.clinicDetail.unknownPlan")}
                      </p>
                      <p className="text-xs text-slate-500">
                        {sub.currentPeriodStart && new Date(sub.currentPeriodStart).toLocaleDateString()} — {sub.currentPeriodEnd && new Date(sub.currentPeriodEnd).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${SUB_BADGE[sub.status] || SUB_BADGE.none}`}>
                      {sub.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Staff Table */}
      <div className="card">
        <h2 className="card-title mb-4 flex items-center gap-2">
          <Users className="h-4 w-4 text-indigo-500" />
          {t("superAdmin.clinicDetail.staff")} ({clinic.staff.length})
        </h2>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>{t("common.name")}</th>
                <th>{t("common.email")}</th>
                <th>{t("common.role")}</th>
                <th>{t("common.status")}</th>
              </tr>
            </thead>
            <tbody>
              {clinic.staff.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-6 text-slate-500">{t("superAdmin.clinicDetail.noStaff")}</td></tr>
              ) : (
                clinic.staff.map((user) => (
                  <tr key={user._id}>
                    <td className="font-medium text-slate-900 dark:text-slate-100">{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${ROLE_BADGES[user.role] || ""}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                        user.isActive
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${user.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                        {user.isActive ? t("superAdmin.common.active") : t("superAdmin.common.inactive")}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
