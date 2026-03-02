"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ScrollText,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Building2,
  User,
  Clock,
} from "lucide-react";

interface AuditLog {
  _id: string;
  action: string;
  entity: string;
  entityId: string;
  performedBy?: { _id: string; name: string; email: string };
  clinicId?: { _id: string; name: string };
  details?: Record<string, any>;
  timestamp: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  UPDATE: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  DELETE: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  STATUS_CHANGE: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  LOGIN: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 30, total: 0, totalPages: 0 });
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "30" });
    if (entityFilter) params.set("entity", entityFilter);
    if (actionFilter) params.set("action", actionFilter);

    try {
      const res = await fetch(`/api/super-admin/audit-logs?${params}`);
      const data = await res.json();
      setLogs(data.logs || []);
      setPagination(data.pagination || { page: 1, limit: 30, total: 0, totalPages: 0 });
    } catch {}
    setLoading(false);
  }, [entityFilter, actionFilter]);

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD}d ago`;
    return d.toLocaleDateString();
  };

  const formatDetails = (details?: Record<string, any>) => {
    if (!details) return null;
    // Try to extract a readable summary from the details object
    if (typeof details === "string") return details;
    const entries = Object.entries(details);
    if (entries.length === 0) return null;
    return entries
      .slice(0, 3)
      .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
      .join(", ");
  };

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="page-title">
          <ScrollText className="h-6 w-6 text-indigo-500" />
          <span>Audit Logs</span>
        </h1>
        <p className="page-subtitle mt-1">
          System-wide activity log ({pagination.total} entries)
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="input w-auto"
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
        >
          <option value="">All entities</option>
          <option value="Appointment">Appointment</option>
          <option value="Visit">Visit</option>
          <option value="Patient">Patient</option>
          <option value="User">User</option>
          <option value="Clinic">Clinic</option>
          <option value="Subscription">Subscription</option>
          <option value="Prescription">Prescription</option>
        </select>
        <select
          className="input w-auto"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
        >
          <option value="">All actions</option>
          <option value="CREATE">Create</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
          <option value="STATUS_CHANGE">Status Change</option>
        </select>
      </div>

      {/* Logs */}
      {loading ? (
        <div className="card text-center py-10">
          <Loader2 className="h-6 w-6 mx-auto animate-spin text-indigo-500" />
          <p className="mt-2 text-sm text-slate-500">Loading audit logs...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="card text-center py-10">
          <ScrollText className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600" />
          <p className="mt-2 text-sm text-slate-500">No audit logs found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div
              key={log._id}
              className="card !p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[log.action] || "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}>
                    {log.action}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    <span className="font-semibold capitalize">{log.entity}</span>
                    {log.entityId && (
                      <span className="text-xs text-slate-400 ml-1">({log.entityId.slice(-8)})</span>
                    )}
                    {log.details && (
                      <span className="text-slate-600 dark:text-slate-400 text-xs ml-2">
                        {formatDetails(log.details)}
                      </span>
                    )}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    {log.performedBy && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {log.performedBy.name}
                      </span>
                    )}
                    {log.clinicId && (
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {log.clinicId.name}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(log.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-xs text-slate-400 shrink-0 sm:text-right">
                {new Date(log.timestamp).toLocaleString()}
              </div>
            </div>
          ))}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm pt-4">
              <p className="text-slate-500">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchLogs(pagination.page - 1)}
                  className="btn-secondary text-xs"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchLogs(pagination.page + 1)}
                  className="btn-secondary text-xs"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
