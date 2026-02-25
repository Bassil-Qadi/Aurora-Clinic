"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Users,
  Calendar,
  Stethoscope,
  TrendingUp,
  TrendingDown,
  UserPlus,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Download,
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
import jsPDF from "jspdf";

const PERIODS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last year" },
];

const STATUS_COLORS: Record<string, string> = {
  scheduled: "#94a3b8",
  waiting: "#eab308",
  in_progress: "#3b82f6",
  completed: "#10b981",
  cancelled: "#ef4444",
  no_show: "#f97316",
};

const PIE_COLORS = ["#0ea5e9", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4"];

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [period, setPeriod] = useState("30");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session && !["admin", "doctor"].includes(session.user?.role)) {
      router.push("/dashboard");
    }
  }, [session, router]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/dashboard/reports?period=${period}&type=overview`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [period]);

  const exportPDF = () => {
    if (!data) return;
    const doc = new jsPDF();
    const s = data.summary;

    doc.setFontSize(20);
    doc.text("Clinic Analytics Report", 20, 20);

    doc.setFontSize(10);
    doc.text(
      `Period: ${PERIODS.find((p) => p.value === period)?.label || period + " days"}`,
      20,
      30
    );
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 36);

    doc.setFontSize(14);
    doc.text("Summary", 20, 50);

    doc.setFontSize(10);
    const rows = [
      ["Total Patients", String(s.totalPatients)],
      ["New Patients", String(s.newPatients)],
      ["Total Appointments", String(s.totalAppointments)],
      ["Completed Visits", String(s.completedVisits)],
      ["Cancelled", String(s.cancelledAppointments)],
      ["No-Shows", String(s.noShowAppointments)],
      ["Completion Rate", `${s.completionRate}%`],
      ["Cancellation Rate", `${s.cancellationRate}%`],
    ];

    let y = 58;
    rows.forEach(([label, value]) => {
      doc.text(`${label}: ${value}`, 20, y);
      y += 7;
    });

    // Appointments by Doctor
    if (data.appointmentsByDoctor?.length) {
      y += 8;
      doc.setFontSize(14);
      doc.text("Appointments by Doctor", 20, y);
      y += 8;
      doc.setFontSize(10);
      data.appointmentsByDoctor.forEach((d: any) => {
        doc.text(`${d.name}: ${d.count}`, 20, y);
        y += 7;
      });
    }

    doc.save("clinic-analytics-report.pdf");
  };

  if (!["admin", "doctor"].includes(session?.user?.role || "")) return null;

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">
            <BarChart3 className="h-6 w-6 text-sky-500" />
            <span>Analytics & Reports</span>
          </h1>
          <p className="page-subtitle mt-1">
            Comprehensive clinic performance insights.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="input w-auto"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <button onClick={exportPDF} disabled={!data} className="btn-primary">
            <Download className="h-4 w-4" />
            Export PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card text-center py-10 text-sm text-slate-500 dark:text-slate-400">
          Loading analytics…
        </div>
      ) : data ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Total Patients
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                    {data.summary.totalPatients}
                  </p>
                </div>
                <Users className="h-5 w-5 text-sky-500" />
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs">
                <UserPlus className="h-3 w-3 text-emerald-500" />
                <span className="text-emerald-600 font-medium dark:text-emerald-400">
                  +{data.summary.newPatients}
                </span>
                <span className="text-slate-400">new</span>
              </div>
            </div>

            <div className="card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Appointments
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                    {data.summary.totalAppointments}
                  </p>
                </div>
                <Calendar className="h-5 w-5 text-sky-500" />
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                <span className="text-emerald-600 font-medium dark:text-emerald-400">
                  {data.summary.completionRate}%
                </span>
                <span className="text-slate-400">completion</span>
              </div>
            </div>

            <div className="card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Completed Visits
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                    {data.summary.completedVisits}
                  </p>
                </div>
                <Stethoscope className="h-5 w-5 text-emerald-500" />
              </div>
            </div>

            <div className="card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Cancellations
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                    {data.summary.cancelledAppointments}
                  </p>
                </div>
                <XCircle className="h-5 w-5 text-rose-500" />
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs">
                <AlertTriangle className="h-3 w-3 text-amber-500" />
                <span className="text-amber-600 font-medium dark:text-amber-400">
                  {data.summary.noShowAppointments}
                </span>
                <span className="text-slate-400">no-shows</span>
              </div>
            </div>
          </div>

          {/* Charts Row 1 */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Appointments by Status */}
            <div className="card">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
                Appointments by Status
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={data.appointmentsByStatus?.map((s: any) => ({
                      name: s._id,
                      value: s.count,
                    }))}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                  >
                    {data.appointmentsByStatus?.map((s: any, i: number) => (
                      <Cell
                        key={s._id}
                        fill={STATUS_COLORS[s._id] || PIE_COLORS[i % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Appointments by Day */}
            <div className="card">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
                Appointments by Day of Week
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.appointmentsByDay || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Appointments by Doctor */}
            <div className="card">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
                Appointments by Doctor
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={data.appointmentsByDoctor || []}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={120} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Patients by Gender & Age */}
            <div className="card">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
                Patient Demographics
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {/* Gender */}
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 text-center">
                    By Gender
                  </p>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={data.patientsByGender?.map((g: any) => ({
                          name: g._id,
                          value: g.count,
                        }))}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={30}
                        outerRadius={55}
                        paddingAngle={5}
                      >
                        {data.patientsByGender?.map((_: any, i: number) => (
                          <Cell
                            key={i}
                            fill={PIE_COLORS[i % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend
                        wrapperStyle={{ fontSize: "10px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Age */}
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 text-center">
                    By Age Range
                  </p>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={data.patientsByAge || []}>
                      <XAxis dataKey="range" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} />
                      <Tooltip />
                      <Bar
                        dataKey="count"
                        fill="#8b5cf6"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Visits by Doctor table */}
          {data.visitsByDoctor?.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
                Visits by Doctor
              </h3>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Doctor</th>
                      <th>Visits</th>
                      <th>% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.visitsByDoctor.map((d: any) => {
                      const totalVisits = data.visitsByDoctor.reduce(
                        (sum: number, v: any) => sum + v.count,
                        0
                      );
                      const pct =
                        totalVisits > 0
                          ? Math.round((d.count / totalVisits) * 100)
                          : 0;
                      return (
                        <tr key={d._id || "none"}>
                          <td className="font-medium">{d.name}</td>
                          <td>{d.count}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="h-2 flex-1 max-w-[100px] rounded-full bg-slate-100 dark:bg-slate-700">
                                <div
                                  className="h-2 rounded-full bg-emerald-500"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                {pct}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
