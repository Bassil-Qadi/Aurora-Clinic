"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Building2,
  ToggleLeft,
  ToggleRight,
  Shield,
  X,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface UserItem {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  clinicId?: { _id: string; name: string };
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ROLE_BADGES: Record<string, string> = {
  admin: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-700",
  doctor: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-700",
  receptionist: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700",
  super_admin: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-700",
};

export default function UsersPage() {
  const { t } = useI18n();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("search", search);
    if (roleFilter) params.set("role", roleFilter);

    try {
      const res = await fetch(`/api/super-admin/users?${params}`);
      const data = await res.json();
      setUsers(data.users || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch {
      setMsg({ type: "error", text: t("superAdmin.users.loadFailed") });
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, t]);

  useEffect(() => {
    fetchUsers(1);
  }, [fetchUsers]);

  const toggleActive = async (user: UserItem) => {
    try {
      const res = await fetch(`/api/super-admin/users/${user._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (res.ok) {
        setMsg({ type: "success", text: user.isActive ? t("superAdmin.users.deactivated") : t("superAdmin.users.activated") });
        fetchUsers(pagination.page);
      }
    } catch {}
  };

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="page-title">
          <Users className="h-6 w-6 text-indigo-500" />
          <span>{t("superAdmin.users.title")}</span>
        </h1>
        <p className="page-subtitle mt-1">
          {t("superAdmin.users.subtitle", { count: String(pagination.total) })}
        </p>
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
            placeholder={t("superAdmin.users.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-auto"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">{t("superAdmin.users.allRoles")}</option>
          <option value="admin">{t("common.admin")}</option>
          <option value="doctor">{t("common.doctor")}</option>
          <option value="receptionist">{t("common.receptionist")}</option>
          <option value="super_admin">{t("superAdmin.title")}</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card text-center py-10">
          <Loader2 className="h-6 w-6 mx-auto animate-spin text-indigo-500" />
          <p className="mt-2 text-sm text-slate-500">{t("superAdmin.users.loading")}</p>
        </div>
      ) : (
        <>
          <div className="table-container overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("common.name")}</th>
                  <th>{t("common.email")}</th>
                  <th>{t("common.role")}</th>
                  <th>{t("superAdmin.users.clinic")}</th>
                  <th>{t("common.status")}</th>
                  <th>{t("superAdmin.users.joined")}</th>
                  <th className="text-end">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-500">
                      {t("superAdmin.users.noUsers")}
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user._id}>
                      <td className="font-medium text-slate-900 dark:text-slate-100">
                        {user.name}
                      </td>
                      <td className="text-slate-600 dark:text-slate-400">{user.email}</td>
                      <td>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${ROLE_BADGES[user.role] || ""}`}>
                          {user.role === "super_admin" && <Shield className="h-3 w-3" />}
                          {user.role.replace("_", " ")}
                        </span>
                      </td>
                      <td>
                        {user.clinicId ? (
                          <Link
                            href={`/super-admin/clinics/${user.clinicId._id}`}
                            className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline dark:text-indigo-400"
                          >
                            <Building2 className="h-3 w-3" />
                            {user.clinicId.name}
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
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
                      <td className="text-slate-500 text-xs">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <div className="flex items-center justify-end">
                          {user.role !== "super_admin" && (
                            <button
                              onClick={() => toggleActive(user)}
                              className="btn-ghost"
                              title={user.isActive ? t("superAdmin.clinicDetail.deactivate") : t("superAdmin.clinicDetail.activate")}
                            >
                              {user.isActive ? (
                                <ToggleRight className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <ToggleLeft className="h-4 w-4 text-slate-400" />
                              )}
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
                {t("superAdmin.users.page", { page: String(pagination.page), totalPages: String(pagination.totalPages), total: String(pagination.total) })}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchUsers(pagination.page - 1)}
                  className="btn-secondary text-xs"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchUsers(pagination.page + 1)}
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
