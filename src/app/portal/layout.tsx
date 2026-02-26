"use client";

import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Calendar,
  ClipboardList,
  LogOut,
  User,
  CalendarPlus,
  Menu,
  X,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useI18n } from "@/lib/i18n";

type PatientCtx = {
  patient: any;
  setPatient: (p: any) => void;
  logout: () => void;
};

const PatientContext = createContext<PatientCtx>({
  patient: null,
  setPatient: () => {},
  logout: () => {},
});

export function usePatientPortal() {
  return useContext(PatientContext);
}

const NAV = [
  { href: "/portal/dashboard", tKey: "portal.myDashboard", icon: Activity },
  { href: "/portal/book", tKey: "portal.bookAppointment", icon: CalendarPlus },
];

export default function PortalLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t, dir } = useI18n();
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isPublicPage =
    pathname === "/portal/login" ||
    pathname === "/portal/register" ||
    pathname === "/portal/forgot-password" ||
    pathname === "/portal/reset-password";

  useEffect(() => {
    if (isPublicPage) {
      setLoading(false);
      return;
    }

    fetch("/api/portal/profile")
      .then((res) => {
        if (!res.ok) {
          router.push("/portal/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setPatient(data);
        setLoading(false);
      })
      .catch(() => {
        router.push("/portal/login");
        setLoading(false);
      });
  }, [isPublicPage, router]);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const logout = async () => {
    await fetch("/api/portal/logout", { method: "POST" });
    setPatient(null);
    router.push("/portal/login");
  };

  if (isPublicPage) {
    return (
      <PatientContext.Provider value={{ patient, setPatient, logout }}>
        {children}
      </PatientContext.Provider>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("common.loading")}</p>
      </div>
    );
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const linkClass = (active: boolean) =>
    `rounded-xl px-3 py-2 transition-colors ${
      active
        ? "bg-emerald-50 text-emerald-700 font-medium dark:bg-emerald-950/50 dark:text-emerald-400"
        : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-emerald-400"
    }`;

  const sidebarContent = (
    <>
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 font-semibold dark:bg-emerald-950 dark:text-emerald-400">
          <Activity className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {t("portal.title")}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t("portal.subtitle")}</p>
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-1 text-sm">
        {NAV.map((item) => {
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
      </nav>

      <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
        <div className="mb-3 flex items-center justify-between gap-2">
          {patient && (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                {patient.firstName} {patient.lastName}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t("common.patient")}</p>
            </div>
          )}
          <div className="flex shrink-0 items-center gap-1.5">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
        <button onClick={logout} className="btn-secondary w-full justify-center text-xs">
          <LogOut className="h-4 w-4" />
          <span>{t("common.logout")}</span>
        </button>
      </div>
    </>
  );

  return (
    <PatientContext.Provider value={{ patient, setPatient, logout }}>
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
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <Activity className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t("portal.title")}
            </span>
          </div>
          <div className="w-10" />
        </div>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 start-0 z-50 flex w-72 flex-col rounded-e-3xl bg-white/95 p-5 shadow-xl ring-1 ring-slate-100 backdrop-blur-md transition-transform duration-300 dark:bg-slate-900/95 dark:ring-slate-800 lg:static lg:z-auto lg:w-64 lg:translate-x-0 lg:rounded-3xl lg:shadow-sm ${
            sidebarOpen ? "translate-x-0" : dir === "rtl" ? "translate-x-full" : "-translate-x-full"
          }`}
        >
          {sidebarContent}
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-auto lg:ms-6">
          <div className="space-y-6 pb-10">{children}</div>
        </main>
      </div>
    </PatientContext.Provider>
  );
}
