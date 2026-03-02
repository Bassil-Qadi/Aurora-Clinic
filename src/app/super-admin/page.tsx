"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Users,
  UserCheck,
  Calendar,
  Stethoscope,
  DollarSign,
  TrendingUp,
  CreditCard,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface Stats {
  totalClinics: number;
  activeClinics: number;
  totalUsers: number;
  totalPatients: number;
  totalAppointments: number;
  totalVisits: number;
  activeSubscriptions: number;
  mrr: number;
  newClinicsThisMonth: number;
  clinicsTrend: { _id: { year: number; month: number }; count: number }[];
  subscriptionsByStatus: { _id: string; count: number }[];
  usersByRole: { _id: string; count: number }[];
  appointmentsToday: number;
}

const SUB_STATUS_COLORS: Record<string, string> = {
  active: "#10b981",
  trialing: "#3b82f6",
  past_due: "#f59e0b",
  suspended: "#ef4444",
  cancelled: "#6b7280",
  expired: "#9ca3af",
  none: "#d1d5db",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "#8b5cf6",
  doctor: "#0ea5e9",
  receptionist: "#10b981",
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function SuperAdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/super-admin/stats")
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Loading system overview...
          </p>
        </div>
      </div>
    );
  }

  const trendData = stats.clinicsTrend.map((t) => ({
    month: MONTH_NAMES[t._id.month - 1],
    clinics: t.count,
  }));

  const subData = stats.subscriptionsByStatus.map((s) => ({
    name: s._id || "none",
    value: s.count,
  }));

  const roleData = stats.usersByRole.map((r) => ({
    name: r._id,
    value: r.count,
  }));

  return (
    <div className="space-y-6 p-4 md:p-8">
      {/* Header */}
      <div>
        <h1 className="page-title">
          <TrendingUp className="h-6 w-6 text-indigo-500" />
          <span>System Overview</span>
        </h1>
        <p className="page-subtitle mt-1">
          Real-time metrics across all clinics
        </p>
      </div>

      {/* KPI Cards - Row 1 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Total Clinics
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                {stats.totalClinics}
              </p>
            </div>
            <Building2 className="h-5 w-5 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs">
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              {stats.activeClinics} active
            </span>
            <span className="text-slate-400">
              · +{stats.newClinicsThisMonth} this month
            </span>
          </div>
        </div>

        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Total Users
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                {stats.totalUsers}
              </p>
            </div>
            <Users className="h-5 w-5 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
            Staff across all clinics
          </div>
        </div>

        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Total Patients
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                {stats.totalPatients}
              </p>
            </div>
            <UserCheck className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
            Registered patients system-wide
          </div>
        </div>

        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Monthly Revenue
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                ${stats.mrr.toFixed(2)}
              </p>
            </div>
            <DollarSign className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs">
            <CreditCard className="h-3 w-3 text-indigo-500" />
            <span className="font-medium text-indigo-600 dark:text-indigo-400">
              {stats.activeSubscriptions}
            </span>
            <span className="text-slate-400">active subscriptions</span>
          </div>
        </div>
      </div>

      {/* KPI Cards - Row 2 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Total Appointments
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                {stats.totalAppointments}
              </p>
            </div>
            <Calendar className="h-5 w-5 text-sky-500" />
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs">
            <span className="font-medium text-sky-600 dark:text-sky-400">
              {stats.appointmentsToday} today
            </span>
          </div>
        </div>

        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Total Visits
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                {stats.totalVisits}
              </p>
            </div>
            <Stethoscope className="h-5 w-5 text-emerald-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Active Clinics
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                {stats.activeClinics}
              </p>
            </div>
            <Building2 className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
            {stats.totalClinics - stats.activeClinics} inactive
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Subscription status breakdown */}
        <div className="card">
          <h3 className="card-title mb-4">Subscription Status Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={subData}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
              >
                {subData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={SUB_STATUS_COLORS[entry.name] || "#d1d5db"}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* New clinics trend */}
        <div className="card">
          <h3 className="card-title mb-4">New Clinics (Last 6 Months)</h3>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="clinics" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[280px] items-center justify-center text-sm text-slate-400">
              No data yet
            </div>
          )}
        </div>
      </div>

      {/* Users by role */}
      <div className="card">
        <h3 className="card-title mb-4">Users by Role</h3>
        <div className="grid grid-cols-3 gap-4">
          {roleData.map((role) => (
            <div
              key={role.name}
              className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/50"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 capitalize">
                {role.name}s
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                {role.value}
              </p>
              <div
                className="mt-2 h-1.5 rounded-full"
                style={{ backgroundColor: ROLE_COLORS[role.name] || "#6b7280", opacity: 0.3 }}
              >
                <div
                  className="h-1.5 rounded-full"
                  style={{
                    backgroundColor: ROLE_COLORS[role.name] || "#6b7280",
                    width: `${Math.min(100, (role.value / Math.max(...roleData.map((r) => r.value))) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
