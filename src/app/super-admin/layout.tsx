"use client";

import { ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Activity,
  Building2,
  Users,
  CreditCard,
  FileText,
  ScrollText,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  LayoutDashboard,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo, LogoMark } from "@/components/Logo";

type Props = { children: ReactNode };

const NAV_ITEMS = [
  { href: "/super-admin", label: "Overview", icon: LayoutDashboard },
  { href: "/super-admin/clinics", label: "Clinics", icon: Building2 },
  { href: "/super-admin/users", label: "Users", icon: Users },
  { href: "/super-admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/super-admin/plans", label: "Plans", icon: FileText },
  { href: "/super-admin/audit-logs", label: "Audit Logs", icon: ScrollText },
];

export default function SuperAdminLayout({ children }: Props) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auth guard
  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      router.replace("/login");
      return;
    }
    if (session.user.role !== "super_admin") {
      router.replace("/dashboard");
    }
  }, [session, status, router]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (
    status === "loading" ||
    !session?.user ||
    session.user.role !== "super_admin"
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  const isActive = (href: string) => {
    if (href === "/super-admin") return pathname === "/super-admin";
    return pathname.startsWith(href);
  };

  const linkClass = (active: boolean) =>
    `rounded-xl px-3 py-2 transition-colors ${
      active
        ? "bg-indigo-50 text-indigo-700 font-medium dark:bg-indigo-950/50 dark:text-indigo-400"
        : "text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
    }`;

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/40">
          <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Super Admin
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            System Management
          </p>
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 text-sm overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={linkClass(isActive(item.href))}
            >
              <span className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
        <div className="mb-3 flex items-start justify-center flex-col gap-2">
          <div className="min-w-0 flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            <div>
              <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                {session.user.name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Super Admin
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <ThemeToggle />
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="btn-secondary w-full justify-center text-xs"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
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
          <ShieldCheck className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Super Admin
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
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
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
