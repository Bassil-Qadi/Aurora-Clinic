"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Calendar,
  UserPlus,
  Stethoscope,
  ClipboardList,
  AlertCircle,
  X,
  Loader2,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

// ─── Types ──────────────────────────────────────────────────
interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

// ─── Icon mapping ───────────────────────────────────────────
const TYPE_ICONS: Record<string, typeof Bell> = {
  appointment_created: Calendar,
  appointment_cancelled: AlertCircle,
  appointment_status_changed: Calendar,
  appointment_no_show: AlertCircle,
  visit_completed: Stethoscope,
  portal_booking: Calendar,
  patient_registered: UserPlus,
  prescription_created: ClipboardList,
};

const TYPE_COLORS: Record<string, string> = {
  appointment_created: "text-sky-500",
  appointment_cancelled: "text-red-500",
  appointment_status_changed: "text-amber-500",
  appointment_no_show: "text-orange-500",
  visit_completed: "text-emerald-500",
  portal_booking: "text-indigo-500",
  patient_registered: "text-teal-500",
  prescription_created: "text-violet-500",
};

// ─── Relative time helper ───────────────────────────────────
function timeAgo(dateStr: string, t: (key: string, vars?: Record<string, string | number>) => string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t("notifications.justNow");
  if (mins < 60) return t("notifications.minutesAgo", { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t("notifications.hoursAgo", { count: hours });
  const days = Math.floor(hours / 24);
  return t("notifications.daysAgo", { count: days });
}

// ─── Component ──────────────────────────────────────────────
export function NotificationBell() {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // ─── Fetch unread count (lightweight, polls every 15s) ────
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/unread-count");
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 15000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // ─── Fetch full list when opened ──────────────────────────
  const fetchNotifications = useCallback(
    async (pageNum = 1, append = false) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/notifications?page=${pageNum}&limit=15`);
        if (res.ok) {
          const data = await res.json();
          setNotifications((prev) =>
            append ? [...prev, ...data.notifications] : data.notifications
          );
          setUnreadCount(data.unreadCount);
          setHasMore(pageNum < data.pages);
          setPage(pageNum);
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (open) fetchNotifications(1);
  }, [open, fetchNotifications]);

  // ─── Close on outside click ───────────────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // ─── Actions ──────────────────────────────────────────────
  const markAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    await fetch("/api/notifications/read", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: id }),
    });
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    await fetch("/api/notifications/read-all", { method: "PATCH" });
  };

  const deleteNotification = async (id: string) => {
    const wasUnread = notifications.find((n) => n._id === id && !n.isRead);
    setNotifications((prev) => prev.filter((n) => n._id !== id));
    if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
    await fetch(`/api/notifications/${id}`, { method: "DELETE" });
  };

  const handleClick = (n: Notification) => {
    if (!n.isRead) markAsRead(n._id);
    if (n.link) {
      setOpen(false);
      router.push(n.link);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* ─── Bell Button ─────────────────────────────────── */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        aria-label={t("notifications.title")}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -end-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* ─── Dropdown Panel ──────────────────────────────── */}
      {open && (
        <div className="absolute end-0 top-full z-50 mt-2 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-sky-500" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {t("notifications.title")}
              </h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  {unreadCount} {t("notifications.new")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="rounded-lg p-1.5 text-xs text-sky-600 transition-colors hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950/50"
                  title={t("notifications.markAllRead")}
                >
                  <CheckCheck className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 && !loading ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Bell className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t("notifications.empty")}
                </p>
              </div>
            ) : (
              <>
                {notifications.map((n) => {
                  const Icon = TYPE_ICONS[n.type] || Bell;
                  const iconColor = TYPE_COLORS[n.type] || "text-slate-500";

                  return (
                    <div
                      key={n._id}
                      className={`group relative flex gap-3 border-b border-slate-50 px-4 py-3 transition-colors last:border-b-0 dark:border-slate-800/50 ${
                        n.isRead
                          ? "bg-transparent"
                          : "bg-sky-50/50 dark:bg-sky-950/20"
                      } ${n.link ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50" : ""}`}
                      onClick={() => handleClick(n)}
                    >
                      {/* Icon */}
                      <div
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          n.isRead
                            ? "bg-slate-100 dark:bg-slate-800"
                            : "bg-sky-100 dark:bg-sky-900/40"
                        }`}
                      >
                        <Icon className={`h-4 w-4 ${iconColor}`} />
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm leading-snug ${
                            n.isRead
                              ? "text-slate-600 dark:text-slate-400"
                              : "font-medium text-slate-900 dark:text-slate-100"
                          }`}
                        >
                          {n.title}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500 line-clamp-2 dark:text-slate-500">
                          {n.message}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-600">
                          {timeAgo(n.createdAt, t)}
                        </p>
                      </div>

                      {/* Actions (on hover) */}
                      <div className="flex shrink-0 items-start gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        {!n.isRead && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(n._id);
                            }}
                            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-sky-600 dark:hover:bg-slate-800 dark:hover:text-sky-400"
                            title={t("notifications.markRead")}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(n._id);
                          }}
                          className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                          title={t("common.delete")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Unread dot */}
                      {!n.isRead && (
                        <span className="absolute start-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-sky-500" />
                      )}
                    </div>
                  );
                })}

                {/* Load more */}
                {hasMore && (
                  <button
                    onClick={() => fetchNotifications(page + 1, true)}
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 py-3 text-xs font-medium text-sky-600 transition-colors hover:bg-slate-50 dark:text-sky-400 dark:hover:bg-slate-800/50"
                  >
                    {loading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      t("notifications.loadMore")
                    )}
                  </button>
                )}

                {loading && notifications.length === 0 && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-sky-500" />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
