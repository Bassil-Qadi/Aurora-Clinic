"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Download,
  Filter,
  Calendar,
  Stethoscope,
  Users,
  ClipboardList,
  Search,
  Printer,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useI18n } from "@/lib/i18n";

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(d: string | Date) {
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ReportsPage() {
  const { t } = useI18n();
  const { data: session } = useSession();
  const router = useRouter();

  const REPORT_TYPES = [
    {
      value: "appointmentList",
      label: t("reports.appointmentList"),
      icon: Calendar,
      description: t("reports.appointmentListDesc"),
    },
    {
      value: "visitList",
      label: t("reports.visitList"),
      icon: Stethoscope,
      description: t("reports.visitListDesc"),
    },
    {
      value: "patientList",
      label: t("reports.patientList"),
      icon: Users,
      description: t("reports.patientListDesc"),
    },
  ];

  const STATUS_OPTIONS = [
    { value: "", label: t("appointments.allStatuses") },
    { value: "scheduled", label: t("appointments.scheduled") },
    { value: "waiting", label: t("appointments.waiting") },
    { value: "in_progress", label: t("appointments.inProgress") },
    { value: "completed", label: t("appointments.completed") },
    { value: "cancelled", label: t("appointments.cancelled") },
    { value: "no_show", label: t("appointments.noShow") },
  ];

  // Filters
  const [reportType, setReportType] = useState("appointmentList");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() =>
    new Date().toISOString().split("T")[0]
  );
  const [doctorId, setDoctorId] = useState("");
  const [status, setStatus] = useState("");

  // Data
  const [doctors, setDoctors] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (session && session.user?.role !== "admin") {
      router.push("/dashboard");
    }
  }, [session, router]);

  // Fetch doctors for filter
  useEffect(() => {
    fetch("/api/users?role=doctor")
      .then((r) => r.json())
      .then((d) => setDoctors(d.users || d || []))
      .catch(() => {});
  }, []);

  const runReport = useCallback(async () => {
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams({
        type: "custom",
        report: reportType,
        startDate,
        endDate,
      });
      if (doctorId) params.set("doctorId", doctorId);
      if (status && reportType === "appointmentList")
        params.set("status", status);

      const res = await fetch(`/api/dashboard/reports?${params.toString()}`);
      const data = await res.json();
      setRows(data.rows || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [reportType, startDate, endDate, doctorId, status]);

  const exportPDF = () => {
    if (!rows.length) return;

    const doc = new jsPDF({ orientation: "landscape" });
    const currentReport = REPORT_TYPES.find((r) => r.value === reportType);

    // Title
    doc.setFontSize(18);
    doc.text(currentReport?.label || t("reports.title"), 14, 18);

    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `${formatDate(startDate)} – ${formatDate(endDate)}  |  ${formatDateTime(new Date())}`,
      14,
      25
    );
    doc.text(`${t("reports.records")}: ${rows.length}`, 14, 30);
    doc.setTextColor(0, 0, 0);

    if (reportType === "appointmentList") {
      autoTable(doc, {
        startY: 36,
        head: [[t("reports.date"), t("reports.patient"), t("reports.phone"), t("reports.doctor"), t("reports.reason"), t("reports.status")]],
        body: rows.map((r: any) => [
          formatDateTime(r.date),
          r.patient
            ? `${r.patient.firstName} ${r.patient.lastName}`
            : t("reports.unknown"),
          r.patient?.phone || "-",
          r.doctor?.name || t("reports.unassigned"),
          r.reason || "-",
          r.status,
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [14, 165, 233] },
      });
    } else if (reportType === "visitList") {
      autoTable(doc, {
        startY: 36,
        head: [[t("reports.date"), t("reports.patient"), t("reports.doctor"), t("reports.diagnosis"), t("reports.status")]],
        body: rows.map((r: any) => [
          formatDate(r.createdAt),
          r.patient
            ? `${r.patient.firstName} ${r.patient.lastName}`
            : t("reports.unknown"),
          r.doctor?.name || t("reports.unassigned"),
          r.diagnosis || "-",
          r.completed ? t("visits.completed") : t("visits.inProgress"),
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [16, 185, 129] },
      });
    } else if (reportType === "patientList") {
      autoTable(doc, {
        startY: 36,
        head: [[t("reports.name"), t("reports.gender"), t("reports.dateOfBirth"), t("reports.phone"), t("reports.email"), t("reports.registered")]],
        body: rows.map((r: any) => [
          `${r.firstName} ${r.lastName}`,
          r.gender,
          r.dateOfBirth ? formatDate(r.dateOfBirth) : "-",
          r.phone || "-",
          r.email || "-",
          formatDate(r.createdAt),
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [139, 92, 246] },
      });
    }

    doc.save(
      `${(currentReport?.label || "report").replace(/\s+/g, "_")}_${startDate}_${endDate}.pdf`
    );
  };

  if (session?.user?.role !== "admin") return null;

  const currentReport = REPORT_TYPES.find((r) => r.value === reportType);

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">
            <ClipboardList className="h-6 w-6 text-sky-500" />
            <span>{t("reports.title")}</span>
          </h1>
          <p className="page-subtitle mt-1">
            {t("reports.subtitle")}
          </p>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="grid gap-3 md:grid-cols-3">
        {REPORT_TYPES.map((rt) => {
          const Icon = rt.icon;
          const active = reportType === rt.value;
          return (
            <button
              key={rt.value}
              onClick={() => {
                setReportType(rt.value);
                setSearched(false);
                setRows([]);
              }}
              className={`card text-left transition-all ${
                active
                  ? "ring-2 ring-sky-400 bg-sky-50/50 dark:bg-sky-900/20"
                  : "hover:ring-1 hover:ring-slate-200 dark:hover:ring-slate-600"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    active
                      ? "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {rt.label}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{rt.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("reports.filters")}</h3>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 text-xs font-medium text-slate-600 dark:text-slate-400 block">
              {t("reports.fromDate")}
            </label>
            <input
              type="date"
              className="input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 text-xs font-medium text-slate-600 dark:text-slate-400 block">
              {t("reports.toDate")}
            </label>
            <input
              type="date"
              className="input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          {reportType !== "patientList" && (
            <div>
              <label className="mb-1 text-xs font-medium text-slate-600 dark:text-slate-400 block">
                {t("reports.doctor")}
              </label>
              <select
                className="input"
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
              >
                <option value="">{t("reports.allDoctors")}</option>
                {doctors.map((d: any) => (
                  <option key={d._id} value={d._id}>
                    {t("common.dr")} {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {reportType === "appointmentList" && (
            <div>
              <label className="mb-1 text-xs font-medium text-slate-600 dark:text-slate-400 block">
                {t("reports.status")}
              </label>
              <select
                className="input"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button onClick={runReport} className="btn-primary">
            <Search className="h-4 w-4" />
            <span>{t("reports.generateReport")}</span>
          </button>
          {rows.length > 0 && (
            <button onClick={exportPDF} className="btn-secondary">
              <Download className="h-4 w-4" />
              <span>{t("reports.exportPDF")}</span>
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="card py-10 text-center text-sm text-slate-500 dark:text-slate-400">
          {t("reports.generatingReport")}
        </div>
      ) : searched ? (
        rows.length === 0 ? (
          <div className="card py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            <p>{t("reports.noRecords")}</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {currentReport?.label} — {rows.length}{" "}
                {rows.length !== 1 ? t("reports.records") : t("reports.record")}
              </h3>
              <button
                onClick={() => window.print()}
                className="btn-ghost text-xs"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>{t("reports.printReport")}</span>
              </button>
            </div>

            <div className="table-container">
              {reportType === "appointmentList" && (
                <table className="table">
                  <thead>
                    <tr>
                      <th>{t("reports.date")}</th>
                      <th>{t("reports.patient")}</th>
                      <th>{t("reports.phone")}</th>
                      <th>{t("reports.doctor")}</th>
                      <th>{t("reports.reason")}</th>
                      <th>{t("reports.status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r: any) => (
                      <tr key={r._id}>
                        <td className="whitespace-nowrap">
                          {formatDateTime(r.date)}
                        </td>
                        <td className="font-medium">
                          {r.patient
                            ? `${r.patient.firstName} ${r.patient.lastName}`
                            : t("reports.unknown")}
                        </td>
                        <td>{r.patient?.phone || "-"}</td>
                        <td>{r.doctor?.name || t("reports.unassigned")}</td>
                        <td className="max-w-[200px] truncate">
                          {r.reason || "-"}
                        </td>
                        <td>
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              r.status === "completed"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : r.status === "cancelled"
                                ? "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                                : r.status === "no_show"
                                ? "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                                : r.status === "in_progress"
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                : r.status === "waiting"
                                ? "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                : "bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {reportType === "visitList" && (
                <table className="table">
                  <thead>
                    <tr>
                      <th>{t("reports.date")}</th>
                      <th>{t("reports.patient")}</th>
                      <th>{t("reports.doctor")}</th>
                      <th>{t("reports.diagnosis")}</th>
                      <th>{t("reports.status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r: any) => (
                      <tr key={r._id}>
                        <td className="whitespace-nowrap">
                          {formatDate(r.createdAt)}
                        </td>
                        <td className="font-medium">
                          {r.patient
                            ? `${r.patient.firstName} ${r.patient.lastName}`
                            : t("reports.unknown")}
                        </td>
                        <td>{r.doctor?.name || t("reports.unassigned")}</td>
                        <td className="max-w-[300px] truncate">
                          {r.diagnosis || "-"}
                        </td>
                        <td>
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              r.completed
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            }`}
                          >
                            {r.completed ? t("visits.completed") : t("visits.inProgress")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {reportType === "patientList" && (
                <table className="table">
                  <thead>
                    <tr>
                      <th>{t("reports.name")}</th>
                      <th>{t("reports.gender")}</th>
                      <th>{t("reports.dateOfBirth")}</th>
                      <th>{t("reports.phone")}</th>
                      <th>{t("reports.email")}</th>
                      <th>{t("reports.registered")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r: any) => (
                      <tr key={r._id}>
                        <td className="font-medium">
                          {r.firstName} {r.lastName}
                        </td>
                        <td className="capitalize">{r.gender}</td>
                        <td>
                          {r.dateOfBirth ? formatDate(r.dateOfBirth) : "-"}
                        </td>
                        <td>{r.phone || "-"}</td>
                        <td>{r.email || "-"}</td>
                        <td className="whitespace-nowrap">
                          {formatDate(r.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )
      ) : null}
    </div>
  );
}
