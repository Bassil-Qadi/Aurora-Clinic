"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Building2,
  Search,
  Plus,
  ExternalLink,
  ToggleLeft,
  ToggleRight,
  Users,
  UserCheck,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface Clinic {
  _id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  isActive: boolean;
  subscriptionStatus: string;
  subscriptionPlanId?: { name: string };
  userCount: number;
  patientCount: number;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
  trialing: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
  past_due: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
  suspended: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400",
  cancelled: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  expired: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500",
  none: "bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-500",
};

export default function ClinicsPage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Create form
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAddress, setFormAddress] = useState("");

  const fetchClinics = useCallback(async (page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("search", search);
    if (statusFilter) params.set("subscriptionStatus", statusFilter);

    try {
      const res = await fetch(`/api/super-admin/clinics?${params}`);
      const data = await res.json();
      setClinics(data.clinics || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch {
      setMsg({ type: "error", text: "Failed to load clinics." });
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchClinics(1);
  }, [fetchClinics]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/super-admin/clinics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName, email: formEmail, phone: formPhone, address: formAddress }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ type: "error", text: data.error || "Failed to create clinic." });
        return;
      }
      setMsg({ type: "success", text: `Clinic "${data.name}" created.` });
      setShowCreate(false);
      setFormName(""); setFormEmail(""); setFormPhone(""); setFormAddress("");
      fetchClinics(1);
    } catch {
      setMsg({ type: "error", text: "Failed to create clinic." });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (clinic: Clinic) => {
    try {
      const res = await fetch(`/api/super-admin/clinics/${clinic._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !clinic.isActive }),
      });
      if (res.ok) {
        setMsg({ type: "success", text: `Clinic ${clinic.isActive ? "deactivated" : "activated"}.` });
        fetchClinics(pagination.page);
      }
    } catch {}
  };

  const showMessage = msg && (
    <div className={msg.type === "success" ? "alert-success" : "alert-error"}>
      {msg.text}
      <button onClick={() => setMsg(null)} className="float-right"><X className="h-4 w-4" /></button>
    </div>
  );

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">
            <Building2 className="h-6 w-6 text-indigo-500" />
            <span>Clinics</span>
          </h1>
          <p className="page-subtitle mt-1">
            Manage all registered clinics ({pagination.total})
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="h-4 w-4" />
          <span>Add Clinic</span>
        </button>
      </div>

      {showMessage}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Search by name, email or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-auto"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All subscriptions</option>
          <option value="active">Active</option>
          <option value="trialing">Trialing</option>
          <option value="past_due">Past Due</option>
          <option value="suspended">Suspended</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
          <option value="none">None</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card text-center py-10">
          <Loader2 className="h-6 w-6 mx-auto animate-spin text-indigo-500" />
          <p className="mt-2 text-sm text-slate-500">Loading clinics...</p>
        </div>
      ) : (
        <>
          <div className="table-container overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Clinic</th>
                  <th>Subscription</th>
                  <th>Users</th>
                  <th>Patients</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clinics.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-500">
                      No clinics found.
                    </td>
                  </tr>
                ) : (
                  clinics.map((clinic) => (
                    <tr key={clinic._id}>
                      <td>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            {clinic.name}
                          </p>
                          <p className="text-xs text-slate-500">{clinic.slug}</p>
                        </div>
                      </td>
                      <td>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE[clinic.subscriptionStatus] || STATUS_BADGE.none}`}>
                          {clinic.subscriptionStatus || "none"}
                        </span>
                        {clinic.subscriptionPlanId && (
                          <p className="text-xs text-slate-500 mt-0.5">{clinic.subscriptionPlanId.name}</p>
                        )}
                      </td>
                      <td>
                        <span className="flex items-center gap-1 text-sm">
                          <Users className="h-3.5 w-3.5 text-slate-400" />
                          {clinic.userCount}
                        </span>
                      </td>
                      <td>
                        <span className="flex items-center gap-1 text-sm">
                          <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                          {clinic.patientCount}
                        </span>
                      </td>
                      <td>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                          clinic.isActive
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${clinic.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                          {clinic.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="text-slate-500 text-xs">
                        {new Date(clinic.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/super-admin/clinics/${clinic._id}`}
                            className="btn-ghost"
                            title="View detail"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                          <button
                            onClick={() => toggleActive(clinic)}
                            className="btn-ghost"
                            title={clinic.isActive ? "Deactivate" : "Activate"}
                          >
                            {clinic.isActive ? (
                              <ToggleRight className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <ToggleLeft className="h-4 w-4 text-slate-400" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <p className="text-slate-500">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} clinics)
              </p>
              <div className="flex gap-2">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchClinics(pagination.page - 1)}
                  className="btn-secondary text-xs"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchClinics(pagination.page + 1)}
                  className="btn-secondary text-xs"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm !mt-0">
          <div className="card w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-indigo-500" />
                New Clinic
              </h2>
              <button onClick={() => setShowCreate(false)} className="btn-ghost"><X className="h-4 w-4" /></button>
            </div>

            <div>
              <label className="form-label">Clinic Name *</label>
              <input className="input" placeholder="Aurora Medical Center" value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Email</label>
              <input className="input" type="email" placeholder="info@clinic.com" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Phone</label>
              <input className="input" placeholder="+1 234 567 890" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Address</label>
              <input className="input" placeholder="123 Medical Drive" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreate} disabled={saving || !formName} className="btn-primary">
                {saving ? "Creating..." : "Create Clinic"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
