"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  CreditCard,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Building2,
  Calendar,
  DollarSign,
  X,
  RefreshCw,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface Subscription {
  _id: string;
  clinicId: { _id: string; name: string };
  planId: { _id: string; name: string; price: number; currency: string; interval: string };
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelledAt?: string;
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
};

export default function SubscriptionsPage() {
  const { t } = useI18n();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchSubscriptions = useCallback(async (page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (statusFilter) params.set("status", statusFilter);
    if (search) params.set("search", search);

    try {
      const res = await fetch(`/api/super-admin/subscriptions?${params}`);
      const data = await res.json();
      setSubscriptions(data.subscriptions || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch {
      setMsg({ type: "error", text: t("superAdmin.subscriptions.loadFailed") });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, t]);

  useEffect(() => {
    fetchSubscriptions(1);
  }, [fetchSubscriptions]);

  const updateStatus = async (subId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/super-admin/subscriptions/${subId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setMsg({ type: "success", text: t("superAdmin.subscriptions.statusUpdated", { status: newStatus }) });
        fetchSubscriptions(pagination.page);
      } else {
        const err = await res.json();
        setMsg({ type: "error", text: err.error || t("superAdmin.subscriptions.updateFailed") });
      }
    } catch {
      setMsg({ type: "error", text: t("superAdmin.subscriptions.updateFailed") });
    }
  };

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString() : "—";

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">
            <CreditCard className="h-6 w-6 text-indigo-500" />
            <span>{t("superAdmin.subscriptions.title")}</span>
          </h1>
          <p className="page-subtitle mt-1">
            {t("superAdmin.subscriptions.subtitle", { count: String(pagination.total) })}
          </p>
        </div>
      </div>

      {msg && (
        <div className={msg.type === "success" ? "alert-success" : "alert-error"}>
          {msg.text}
          <button onClick={() => setMsg(null)} className="float-right"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input ps-10"
            placeholder={t("superAdmin.subscriptions.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-auto"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">{t("superAdmin.subscriptions.allStatuses")}</option>
          <option value="active">Active</option>
          <option value="trialing">Trialing</option>
          <option value="past_due">Past Due</option>
          <option value="suspended">Suspended</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card text-center py-10">
          <Loader2 className="h-6 w-6 mx-auto animate-spin text-indigo-500" />
          <p className="mt-2 text-sm text-slate-500">{t("superAdmin.subscriptions.loading")}</p>
        </div>
      ) : (
        <>
          <div className="table-container overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("superAdmin.subscriptions.clinic")}</th>
                  <th>{t("superAdmin.subscriptions.plan")}</th>
                  <th>{t("superAdmin.subscriptions.price")}</th>
                  <th>{t("superAdmin.subscriptions.status")}</th>
                  <th>{t("superAdmin.subscriptions.period")}</th>
                  <th>{t("superAdmin.subscriptions.created")}</th>
                  <th className="text-end">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-500">
                      {t("superAdmin.subscriptions.noSubscriptions")}
                    </td>
                  </tr>
                ) : (
                  subscriptions.map((sub) => (
                    <tr key={sub._id}>
                      <td>
                        {sub.clinicId ? (
                          <Link
                            href={`/super-admin/clinics/${sub.clinicId._id}`}
                            className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                          >
                            <Building2 className="h-3.5 w-3.5" />
                            {sub.clinicId.name}
                          </Link>
                        ) : (
                          <span className="text-slate-400">{t("superAdmin.common.unknown")}</span>
                        )}
                      </td>
                      <td className="font-medium text-slate-900 dark:text-slate-100">
                        {sub.planId?.name || "—"}
                      </td>
                      <td>
                        {sub.planId ? (
                          <span className="flex items-center gap-1 text-sm">
                            <DollarSign className="h-3 w-3 text-slate-400" />
                            {sub.planId.price}/{sub.planId.interval === "YEAR" ? t("superAdmin.common.year") : t("superAdmin.common.month")}
                          </span>
                        ) : "—"}
                      </td>
                      <td>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE[sub.status] || STATUS_BADGE.cancelled}`}>
                          {sub.status}
                        </span>
                      </td>
                      <td>
                        <div className="text-xs">
                          <span className="text-slate-600 dark:text-slate-400">
                            {formatDate(sub.currentPeriodStart)}
                          </span>
                          <span className="mx-1 text-slate-400">→</span>
                          <span className="text-slate-600 dark:text-slate-400">
                            {formatDate(sub.currentPeriodEnd)}
                          </span>
                        </div>
                      </td>
                      <td className="text-slate-500 text-xs">
                        {formatDate(sub.createdAt)}
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          {sub.status !== "active" && sub.status !== "cancelled" && (
                            <button
                              onClick={() => updateStatus(sub._id, "active")}
                              className="btn-ghost text-emerald-600 dark:text-emerald-400"
                              title={t("superAdmin.subscriptions.activate")}
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              <span className="text-xs">{t("superAdmin.subscriptions.activate")}</span>
                            </button>
                          )}
                          {sub.status === "active" && (
                            <button
                              onClick={() => updateStatus(sub._id, "suspended")}
                              className="btn-ghost text-amber-600 dark:text-amber-400"
                              title={t("superAdmin.subscriptions.suspend")}
                            >
                              <span className="text-xs">{t("superAdmin.subscriptions.suspend")}</span>
                            </button>
                          )}
                          {sub.status !== "cancelled" && (
                            <button
                              onClick={() => updateStatus(sub._id, "cancelled")}
                              className="btn-ghost text-rose-600 dark:text-rose-400"
                              title={t("superAdmin.subscriptions.cancelSub")}
                            >
                              <span className="text-xs">{t("superAdmin.subscriptions.cancelSub")}</span>
                            </button>
                          )}
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
                {t("superAdmin.subscriptions.page", { page: String(pagination.page), totalPages: String(pagination.totalPages), total: String(pagination.total) })}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchSubscriptions(pagination.page - 1)}
                  className="btn-secondary text-xs"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchSubscriptions(pagination.page + 1)}
                  className="btn-secondary text-xs"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
