"use client";

import { useEffect, useState } from "react";
import { Activity, Users, Calendar, Clipboard, Stethoscope, Clock, FileText, User, CalendarCheck, AlertCircle } from "lucide-react";
import {
  LineChart,
  PieChart,
  Pie,
  Cell,
  Legend,
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
  upcomingAppointments: [],
  recentVisits: [],
  appointmentStatus: []
}

export default function DashboardHome() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [chartData, setChartData] = useState([]);

  const pieChartData = stats?.appointmentStatus?.map((s: any) => ({
    name: s._id,
    value: s.count,
  }));

  const COLORS = ["#16a34a", "#eab308", "#ef4444"];

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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="card">
          <h2 className="card-title mb-4">Upcoming Appointments</h2>

          <div className="space-y-3">
            {stats?.upcomingAppointments?.map((appt: any) => {
              const appointmentDate = new Date(appt.date);
              const isToday = appointmentDate.toDateString() === new Date().toDateString();
              const isTomorrow = appointmentDate.toDateString() === new Date(Date.now() + 86400000).toDateString();
              
              return (
                <div
                  key={appt._id}
                  className="group relative overflow-hidden rounded-lg border border-slate-200 bg-gradient-to-br from-white to-slate-50/50 p-4 transition-all hover:border-emerald-300 hover:shadow-md"
                >
                  <div className="flex items-start gap-4">
                    {/* Calendar Icon Badge */}
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors group-hover:bg-emerald-200 ${
                      isToday ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"
                    }`}>
                      <CalendarCheck className="h-5 w-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <User className="h-4 w-4 text-slate-400 shrink-0" />
                          <p className="font-semibold text-slate-900 truncate">
                            {appt.patient?.firstName} {appt.patient?.lastName}
                          </p>
                        </div>
                        {/* Status Badge */}
                        {isToday && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 shrink-0">
                            <AlertCircle className="h-3 w-3" />
                            Today
                          </span>
                        )}
                        {isTomorrow && !isToday && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 shrink-0">
                            Tomorrow
                          </span>
                        )}
                      </div>

                      {/* Appointment Reason */}
                      {appt.reason && (
                        <div className="mb-2">
                          <div className="flex items-start gap-2">
                            <FileText className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                            <p className="text-sm text-slate-700 line-clamp-2">
                              <span className="font-medium text-slate-600">Reason:</span>{" "}
                              {appt.reason}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Doctor Name */}
                      {appt.doctor && (
                        <div className="mb-2">
                          <p className="text-xs text-slate-600">
                            <span className="font-medium">Dr.</span> {appt.doctor?.name || "Not assigned"}
                          </p>
                        </div>
                      )}

                      {/* Date and Time */}
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          {appointmentDate.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: appointmentDate.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
                            weekday: isToday || isTomorrow ? "short" : undefined,
                          })}
                          {" • "}
                          {appointmentDate.toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {(!stats?.upcomingAppointments || stats.upcomingAppointments.length === 0) && (
              <div className="py-8 text-center text-sm text-slate-500">
                <CalendarCheck className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p>No upcoming appointments</p>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="card-title mb-4">Recent Visits</h2>

          <div className="space-y-3">
            {stats?.recentVisits?.map((visit: any) => (
              <div
                key={visit._id}
                className="group relative overflow-hidden rounded-lg border border-slate-200 bg-gradient-to-br from-white to-slate-50/50 p-4 transition-all hover:border-sky-300 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  {/* Medical Icon Badge */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600 transition-colors group-hover:bg-sky-200">
                    <Stethoscope className="h-5 w-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <User className="h-4 w-4 text-slate-400 shrink-0" />
                        <p className="font-semibold text-slate-900 truncate">
                          {visit.patient?.firstName} {visit.patient?.lastName}
                        </p>
                      </div>
                    </div>

                    {/* Diagnosis */}
                    <div className="mb-2">
                      <div className="flex items-start gap-2">
                        <FileText className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                        <p className="text-sm text-slate-700 line-clamp-2">
                          <span className="font-medium text-slate-600">Diagnosis:</span>{" "}
                          {visit.diagnosis || "No diagnosis recorded"}
                        </p>
                      </div>
                    </div>

                    {/* Prescription indicator */}
                    {visit.prescription && (
                      <div className="mb-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          <Clipboard className="h-3 w-3" />
                          Prescription issued
                        </span>
                      </div>
                    )}

                    {/* Date and Time */}
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Clock className="h-3.5 w-3.5" />
                      <span>
                        {new Date(visit.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                        {" • "}
                        {new Date(visit.createdAt).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {(!stats?.recentVisits || stats.recentVisits.length === 0) && (
              <div className="py-8 text-center text-sm text-slate-500">
                <Stethoscope className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p>No recent visits recorded</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Appointments
            </h2>
            <span className="pill">Trend</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieChartData}
                dataKey="value"
                nameKey="name"
                innerRadius={70}
                outerRadius={100}
                paddingAngle={4}
              >
                {pieChartData?.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>

              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
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
