"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  Plus,
  Pencil,
  Loader2,
  X,
  Save,
  Check,
  Users as UsersIcon,
  UserCheck,
  Calendar,
  Palette,
  Sparkles,
  Globe,
} from "lucide-react";

interface PlanFeatures {
  maxDoctors: number;
  maxPatients: number;
  maxAppointmentsPerMonth: number;
  patientPortal: boolean;
  aiSummary: boolean;
  customBranding: boolean;
}

interface Plan {
  _id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  currency: string;
  interval: string; // "MONTH" | "YEAR"
  features: PlanFeatures;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

const DEFAULT_FEATURES: PlanFeatures = {
  maxDoctors: 1,
  maxPatients: 50,
  maxAppointmentsPerMonth: 100,
  patientPortal: false,
  aiSummary: false,
  customBranding: false,
};

const EMPTY_FORM = {
  name: "",
  slug: "",
  description: "",
  price: 0,
  currency: "USD",
  interval: "MONTH" as string,
  features: { ...DEFAULT_FEATURES },
  sortOrder: 0,
  isActive: true,
};

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/plans?includeInactive=true");
      const data = await res.json();
      setPlans(data.plans || []);
    } catch {
      setMsg({ type: "error", text: "Failed to load plans." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (plan: Plan) => {
    setEditId(plan._id);
    setForm({
      name: plan.name,
      slug: plan.slug,
      description: plan.description || "",
      price: plan.price,
      currency: plan.currency || "USD",
      interval: plan.interval || "MONTH",
      features: plan.features || { ...DEFAULT_FEATURES },
      sortOrder: plan.sortOrder || 0,
      isActive: plan.isActive,
    });
    setShowForm(true);
  };

  const handleNameChange = (name: string) => {
    setForm((prev) => ({
      ...prev,
      name,
      // Auto-generate slug from name if creating
      ...(!editId ? { slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") } : {}),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = editId
        ? `/api/super-admin/plans/${editId}`
        : "/api/super-admin/plans";
      const method = editId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setMsg({ type: "success", text: editId ? "Plan updated." : "Plan created." });
        setShowForm(false);
        fetchPlans();
      } else {
        const err = await res.json();
        setMsg({ type: "error", text: err.error || "Failed to save plan." });
      }
    } catch {
      setMsg({ type: "error", text: "Failed to save plan." });
    } finally {
      setSaving(false);
    }
  };

  const intervalLabel = (interval: string) => interval === "YEAR" ? "year" : "month";

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">
            <FileText className="h-6 w-6 text-indigo-500" />
            <span>Subscription Plans</span>
          </h1>
          <p className="page-subtitle mt-1">
            Define the plans clinics can subscribe to
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="h-4 w-4" />
          <span>Create Plan</span>
        </button>
      </div>

      {msg && (
        <div className={msg.type === "success" ? "alert-success" : "alert-error"}>
          {msg.text}
          <button onClick={() => setMsg(null)} className="float-right"><X className="h-4 w-4" /></button>
        </div>
      )}

      {loading ? (
        <div className="card text-center py-10">
          <Loader2 className="h-6 w-6 mx-auto animate-spin text-indigo-500" />
          <p className="mt-2 text-sm text-slate-500">Loading plans...</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.length === 0 ? (
            <div className="col-span-full card text-center py-10">
              <FileText className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="mt-2 text-sm text-slate-500">No plans yet. Create one to get started.</p>
            </div>
          ) : (
            plans.map((plan) => (
              <div
                key={plan._id}
                className={`card flex flex-col justify-between ${!plan.isActive ? "opacity-60" : ""}`}
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {plan.name}
                      </h3>
                      {plan.description && (
                        <p className="text-xs text-slate-500 mt-0.5">{plan.description}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-0.5">slug: {plan.slug}</p>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      plan.isActive
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500"
                    }`}>
                      {plan.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {/* Price */}
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                      ${plan.price}
                    </span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      /{intervalLabel(plan.interval)}
                    </span>
                  </div>

                  {/* Feature limits */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <UsersIcon className="h-3.5 w-3.5 text-indigo-500" />
                      {plan.features.maxDoctors === -1 ? "Unlimited" : plan.features.maxDoctors} doctors
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <UserCheck className="h-3.5 w-3.5 text-indigo-500" />
                      {plan.features.maxPatients === -1 ? "Unlimited" : plan.features.maxPatients} patients
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                      {plan.features.maxAppointmentsPerMonth === -1 ? "Unlimited" : plan.features.maxAppointmentsPerMonth} appointments/mo
                    </div>
                  </div>

                  {/* Feature flags */}
                  <div className="space-y-1.5 mb-4">
                    <FeatureFlag enabled={plan.features.patientPortal} label="Patient Portal" icon={<Globe className="h-3.5 w-3.5" />} />
                    <FeatureFlag enabled={plan.features.aiSummary} label="AI Summary" icon={<Sparkles className="h-3.5 w-3.5" />} />
                    <FeatureFlag enabled={plan.features.customBranding} label="Custom Branding" icon={<Palette className="h-3.5 w-3.5" />} />
                  </div>
                </div>

                <div className="flex items-center justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button onClick={() => openEdit(plan)} className="btn-ghost">
                    <Pencil className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm !mt-0">
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {editId ? "Edit Plan" : "New Plan"}
              </h2>
              <button onClick={() => setShowForm(false)} className="btn-ghost"><X className="h-4 w-4" /></button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="form-label">Plan Name *</label>
                <input className="input" placeholder="Professional" value={form.name} onChange={(e) => handleNameChange(e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="form-label">Slug *</label>
                <input className="input" placeholder="professional" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="form-label">Description</label>
                <input className="input" placeholder="Best for mid-size clinics" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <label className="form-label">Price ({form.currency})</label>
                <input className="input" type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="form-label">Billing Interval</label>
                <select className="input" value={form.interval} onChange={(e) => setForm({ ...form, interval: e.target.value })}>
                  <option value="MONTH">Monthly</option>
                  <option value="YEAR">Yearly</option>
                </select>
              </div>
            </div>

            {/* Feature limits */}
            <div>
              <p className="form-label mb-2">Feature Limits</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-500">Max Doctors</label>
                  <input className="input" type="number" value={form.features.maxDoctors} onChange={(e) => setForm({ ...form, features: { ...form.features, maxDoctors: parseInt(e.target.value) || 0 } })} />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Max Patients</label>
                  <input className="input" type="number" value={form.features.maxPatients} onChange={(e) => setForm({ ...form, features: { ...form.features, maxPatients: parseInt(e.target.value) || 0 } })} />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Appts/Month</label>
                  <input className="input" type="number" value={form.features.maxAppointmentsPerMonth} onChange={(e) => setForm({ ...form, features: { ...form.features, maxAppointmentsPerMonth: parseInt(e.target.value) || 0 } })} />
                </div>
              </div>
            </div>

            {/* Feature toggles */}
            <div>
              <p className="form-label mb-2">Feature Flags</p>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input type="checkbox" checked={form.features.patientPortal} onChange={(e) => setForm({ ...form, features: { ...form.features, patientPortal: e.target.checked } })} className="h-4 w-4 rounded border-slate-300" />
                  Patient Portal
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input type="checkbox" checked={form.features.aiSummary} onChange={(e) => setForm({ ...form, features: { ...form.features, aiSummary: e.target.checked } })} className="h-4 w-4 rounded border-slate-300" />
                  AI Summary
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input type="checkbox" checked={form.features.customBranding} onChange={(e) => setForm({ ...form, features: { ...form.features, customBranding: e.target.checked } })} className="h-4 w-4 rounded border-slate-300" />
                  Custom Branding
                </label>
              </div>
            </div>

            {/* Sort & Active */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Sort Order</label>
                <input className="input" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4 rounded border-slate-300" />
                  Active
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.name || !form.slug} className="btn-primary">
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : editId ? "Update Plan" : "Create Plan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FeatureFlag({ enabled, label, icon }: { enabled: boolean; label: string; icon: React.ReactNode }) {
  return (
    <div className={`flex items-center gap-2 text-sm ${enabled ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-600"}`}>
      {enabled ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
      {icon}
      {label}
    </div>
  );
}
