"use client";

import { ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Activity,
  Users,
  Calendar,
  Clipboard,
  CalendarDays,
  UserCog,
  Settings,
  LogOut,
  BarChart3,
  ClipboardList,
  Menu,
  X,
  ShieldCheck,
  Stethoscope,
  UserRound,
  CreditCard,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Logo, LogoMark } from "@/components/Logo";
import { useI18n } from "@/lib/i18n";
type Props = {
  children: ReactNode;
};

const NAV_ITEMS = [
  { href: "/dashboard", tKey: "nav.dashboard", icon: Activity },
  { href: "/patients", tKey: "nav.patients", icon: Users },
  { href: "/appointments", tKey: "nav.appointments", icon: Calendar },
  { href: "/visits", tKey: "nav.visits", icon: Clipboard },
  { href: "/appointments/calendar", tKey: "nav.calendar", icon: CalendarDays },
];

const ADMIN_NAV_ITEMS = [
  { href: "/dashboard/analytics", tKey: "nav.analytics", icon: BarChart3 },
  { href: "/dashboard/staff", tKey: "nav.staffManagement", icon: UserCog },
  { href: "/dashboard/settings", tKey: "nav.clinicSettings", icon: Settings },
  { href: "/dashboard/subscription", tKey: "nav.subscription", icon: CreditCard },
];

export default function DashboardLayout({ children }: Props) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const { t, dir } = useI18n();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [clinicName, setClinicName] = useState<string | null>(null);

  // Redirect super_admin to their own dashboard
  useEffect(() => {
    if (session?.user?.role === "super_admin") {
      router.replace("/super-admin");
    }
  }, [session?.user?.role, router]);

  // Fetch clinic name once the session is available
  useEffect(() => {
    if (session?.user?.clinicId) {
      fetch("/api/clinic")
        .then((r) => r.ok ? r.json() : null)
        .then((data) => { if (data?.name) setClinicName(data.name); })
        .catch(() => {/* silently ignore */});
    }
  }, [session?.user?.clinicId]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const linkClass = (active: boolean) =>
    `rounded-xl px-3 py-2 transition-colors ${
      active
        ? "bg-sky-50 text-sky-700 font-medium dark:bg-sky-950/50 dark:text-sky-400"
        : "text-slate-700 hover:bg-sky-50 hover:text-sky-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-sky-400"
    }`;

  /* ─── Sidebar content (shared desktop / mobile) ──────────── */
  const sidebarContent = (
    <>
      <div className="mb-8 flex items-center gap-3">
        <Logo className="h-10 w-10 shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {clinicName ?? t("common.appName")}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t("common.medicalDashboard")}
          </p>
        </div>
        {/* Close button – mobile only */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-1 text-sm overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={linkClass(isActive(item.href))}>
              <span className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span>{t(item.tKey)}</span>
              </span>
            </Link>
          );
        })}

        {/* Analytics – admin & doctor */}
        {(session?.user?.role === "admin" || session?.user?.role === "doctor") && (
          <>
            <div className="my-3 border-t border-slate-100 dark:border-slate-800" />
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              {t("nav.insights")}
            </p>
            <Link href="/dashboard/analytics" className={linkClass(isActive("/dashboard/analytics"))}>
              <span className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span>{t("nav.analytics")}</span>
              </span>
            </Link>
            {session?.user?.role === "admin" && (
              <Link href="/dashboard/reports" className={linkClass(isActive("/dashboard/reports"))}>
                <span className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  <span>{t("nav.reports")}</span>
                </span>
              </Link>
            )}
          </>
        )}

        {/* Admin-only */}
        {session?.user?.role === "admin" && (
          <>
            <div className="my-3 border-t border-slate-100 dark:border-slate-800" />
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              {t("common.admin")}
            </p>
            {ADMIN_NAV_ITEMS.filter((i) => i.href !== "/dashboard/analytics").map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className={linkClass(isActive(item.href))}>
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span>{t(item.tKey)}</span>
                  </span>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
        <div className="mb-3 flex items-start justify-center flex-col gap-2">
          {session?.user && (
            <div className="min-w-0 flex items-center gap-2">
              {session?.user?.role === "admin" ? (
                <ShieldCheck className="h-8 w-8 text-indigo-700" />
              ) : session?.user?.role === "doctor" ? (
                <Stethoscope className="h-8 w-8 text-sky-700" />
              ) : session?.user?.role === "receptionist" ? (
                <UserRound className="h-8 w-8 text-green-700" />
              ) : null}
              <div>
              <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200 capitalize">
                {session.user.name}
              </p>
              <p className="text-xs capitalize text-slate-500 dark:text-slate-400 capitalize">
                {session.user.role}
              </p>
              </div>
            </div>
          )}
          <div className="flex shrink-0 items-center gap-1.5">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="btn-secondary w-full justify-center text-xs"
        >
          <LogOut className="h-4 w-4" />
          <span>{t("common.logout")}</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen flex-col lg:flex-row px-3 py-4 md:px-6 md:py-6 lg:px-10">
      {/* Mobile top bar */}
      <div className="flex items-center justify-between lg:hidden mb-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="flex items-center gap-2">
          <LogoMark className="h-8 w-8 shrink-0" />
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {clinicName ?? t("common.appName")}
          </span>
        </div>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar – mobile slide-out */}
      <aside
        className={`fixed inset-y-0 start-0 z-50 flex w-72 flex-col rounded-e-3xl bg-white/95 p-5 shadow-xl ring-1 ring-slate-100 backdrop-blur-md transition-transform duration-300 dark:bg-slate-900/95 dark:ring-slate-800 lg:static lg:z-auto lg:w-64 lg:translate-x-0 lg:rounded-3xl lg:shadow-sm ${
          sidebarOpen ? "translate-x-0" : dir === "rtl" ? "translate-x-full" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto lg:ms-6">
        <div className="space-y-6 pb-10">{children}</div>
      </main>
    </div>
  );
}
