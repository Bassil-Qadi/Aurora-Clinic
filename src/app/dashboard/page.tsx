"use client";

import { useEffect, useState } from "react";
import { Activity, Users, Calendar, Clipboard } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

interface Stats {
  totalPatients: number;
  totalAppointments: number;
  totalVisits: number;
  todayAppointments: number;
}

export default function DashboardHome() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [chartData, setChartData] = useState([]);

  const fetchChart = async () => {
    const res = await fetch("/api/dashboard/analytics");
    const data = await res.json();
    setChartData(data);
  };

  useEffect(() => {
    fetchStats();
    fetchChart();
  }, []);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const res = await fetch("/api/dashboard");
    const data = await res.json();
    setStats(data);
  };

  if (!stats)
    return (
      <div className="space-y-4">
        <p className="page-title text-xl">Loading dashboard…</p>
        <p className="page-subtitle">
          Fetching your clinic overview and activity.
        </p>
      </div>
    );

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">
            <Activity className="h-6 w-6 text-sky-500" />
            <span>Clinic overview</span>
          </h1>
          <p className="page-subtitle">
            Monitor patients, appointments, and visits at a glance.
          </p>
        </div>
        <span className="pill">Today&apos;s load: {stats.todayAppointments} appts</span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Total Patients
              </p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">
                {stats.totalPatients}
              </p>
            </div>
            <Users className="h-5 w-5 text-sky-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Total Appointments
              </p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">
                {stats.totalAppointments}
              </p>
            </div>
            <Calendar className="h-5 w-5 text-sky-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Today&apos;s Appointments
              </p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">
                {stats.todayAppointments}
              </p>
            </div>
            <Calendar className="h-5 w-5 text-emerald-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Total Visits
              </p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">
                {stats.totalVisits}
              </p>
            </div>
            <Clipboard className="h-5 w-5 text-sky-500" />
          </div>
        </div>
      </div>

      <div className="card card-muted">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Monthly appointments & visits
          </h2>
          <span className="pill">Trend</span>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="appointments"
              stroke="#0284c7"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="visits"
              stroke="#10b981"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
