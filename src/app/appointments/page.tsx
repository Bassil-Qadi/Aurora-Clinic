"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Calendar, Users, Search, Pencil, Trash2, Play, CheckCircle2, Clock3, XOctagon, EyeOff, User, Stethoscope, FileText, ChevronDown, Save } from "lucide-react";
import { AppointmentStatus, normalizeAppointmentStatus } from "@/lib/appointmentStatus";
import { AppointmentStatusBadge } from "@/components/AppointmentStatusBadge";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { Breadcrumb } from "@/components/Breadcrumb";

interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
}

interface Doctor {
  _id: string;
  name: string;
}

interface Appointment {
  _id: string;
  patient: Patient;
  doctor?: Doctor;
  date: string;
  reason: string;
  status: string;
}

export default function AppointmentsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const { data: session } = useSession();
  const userRole = session?.user?.role;

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    patient: "",
    date: "",
    reason: "",
    status: "scheduled",
    doctor: "",
  });

  useEffect(() => {
    fetchAppointments();
    fetchPatients();
    // Fetch doctors for admin/receptionist to pick from
    if (userRole && userRole !== "doctor") {
      fetchDoctors();
    }
  }, [page, search, userRole]);

  const fetchAppointments = async () => {
    const res = await fetch(
      `/api/appointments?page=${page}&limit=5&search=${search}`
    );
    const data = await res.json();
    setAppointments(data?.appointments);
    setTotalPages(data.pages);
  };

  const fetchPatients = async () => {
    const res = await fetch("/api/patients");
    const data = await res.json();
    setPatients(data.patients || data);
  };

  const fetchDoctors = async () => {
    try {
      const res = await fetch("/api/users?role=doctor");
      const data = await res.json();
      setDoctors(data.users || []);
    } catch {
      // ignore
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Build payload — only include doctor if admin/receptionist selected one
      const payload: Record<string, any> = {
        patient: form.patient,
        date: form.date,
        reason: form.reason,
        status: form.status,
      };
      if (userRole !== "doctor" && form.doctor) {
        payload.doctor = form.doctor;
      }

      const url = editingId
        ? `/api/appointments/${editingId}`
        : "/api/appointments";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let errorMessage = t("appointments.statusUpdateFailed");

      if (!res.ok) {
        try {
          const data = await res.json();
          errorMessage = data.error || errorMessage;
        } catch {
          // If JSON parsing fails, use the status text or default message
          errorMessage = res.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();

      // Success
      setForm({
        patient: "",
        date: "",
        reason: "",
        status: "scheduled",
        doctor: "",
      });

      setEditingId(null);
      fetchAppointments();

      toast({
        title: editingId
          ? t("appointments.updateAppointment")
          : t("appointments.appointmentBooked"),
        description: editingId
          ? t("appointments.appointmentUpdated")
          : t("appointments.appointmentScheduled"),
        variant: "success",
      });
    } catch (error: any) {
      toast({
        title: editingId
          ? t("appointments.statusUpdateFailed")
          : t("appointments.failedToBook"),
        description: error.message || t("appointments.unexpectedError"),
        variant: "destructive",
      });
    }
  };

  const handleEdit = (appointment: Appointment) => {
    setEditingId(appointment._id);

    setForm({
      patient: appointment.patient._id,
      date: appointment.date.slice(0, 16),
      reason: appointment.reason,
      status: appointment.status,
      doctor: appointment.doctor?._id || "",
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("appointments.deleteAppointment"))) return;

    await fetch(`/api/appointments/${id}`, {
      method: "DELETE",
    });

    fetchAppointments();
  };

  const updateStatus = async (
    appointmentId: string,
    nextStatus: AppointmentStatus
  ) => {
    try {
      setIsUpdatingId(appointmentId);
      const res = await fetch(`/api/appointments/${appointmentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error?.error || t("appointments.statusUpdateFailed"));
      }

      await fetchAppointments();
      toast({
        title: t("appointments.statusUpdated"),
        variant: "success",
      });
    } catch (error: any) {
      toast({
        title: t("appointments.statusUpdateFailed"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingId(null);
    }
  };

  const startVisit = async (appointment: Appointment) => {
    try {
      setIsUpdatingId(appointment._id);
      const res = await fetch(
        `/api/appointments/${appointment._id}/start-visit`,
        { method: "POST" }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || t("appointments.cannotStartVisit"));
      }

      router.push(`/visits/${data.visitId}`);
    } catch (error: any) {
      toast({
        title: t("appointments.cannotStartVisit"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingId(null);
    }
  };

  const getNormalizedStatus = (appointment: Appointment): AppointmentStatus => {
    return (
      (normalizeAppointmentStatus(appointment.status) as AppointmentStatus) ||
      "scheduled"
    );
  };

  return (
    <div className="space-y-6 p-8">
      <Breadcrumb items={[{ label: t("appointments.title") }]} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">
            <Calendar className="h-6 w-6 text-sky-500" />
            <span>{t("appointments.title")}</span>
          </h1>
          <p className="page-subtitle">
            {t("appointments.subtitle")}
          </p>
        </div>
        <span className="pill">
          <Users className="mr-1 h-3.5 w-3.5" />
          {t("common.total")}: {appointments.length}
        </span>
      </div>

      {/* Form */}
      <div className="card card-muted">
        <h2 className="mb-5 text-sm font-semibold text-slate-900 dark:text-slate-100">
          {editingId ? t("appointments.updateAppointment") : t("appointments.scheduleAppointment")}
        </h2>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-5 md:grid-cols-2"
        >
          {/* Patient */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
              <User className="h-3.5 w-3.5 text-sky-500" />
              {t("common.patient")} <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <select
                value={form.patient}
                onChange={(e) =>
                  setForm({ ...form, patient: e.target.value })
                }
                className="input appearance-none pe-9"
                required
              >
                <option value="">{t("appointments.selectPatient")}</option>
                {patients.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.firstName} {p.lastName}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* Date & Time */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
              <Calendar className="h-3.5 w-3.5 text-sky-500" />
              {t("common.date")} &amp; {t("common.time")} <span className="text-rose-400">*</span>
            </label>
            <input
              type="datetime-local"
              value={form.date}
              onChange={(e) =>
                setForm({ ...form, date: e.target.value })
              }
              className="input"
              required
            />
          </div>

          {/* Doctor selector – visible to admin & receptionist */}
          {userRole !== "doctor" && (
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                <Stethoscope className="h-3.5 w-3.5 text-sky-500" />
                {t("common.doctor")} <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <select
                  value={form.doctor}
                  onChange={(e) =>
                    setForm({ ...form, doctor: e.target.value })
                  }
                  className="input appearance-none pe-9"
                  required
                >
                  <option value="">{t("appointments.selectDoctor")}</option>
                  {doctors.map((d) => (
                    <option key={d._id} value={d._id}>
                      {t("common.dr")} {d.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
              <FileText className="h-3.5 w-3.5 text-sky-500" />
              {t("common.reason")} <span className="text-rose-400">*</span>
            </label>
            <input
              placeholder={t("appointments.reasonForVisit")}
              value={form.reason}
              onChange={(e) =>
                setForm({ ...form, reason: e.target.value })
              }
              className="input"
              required
            />
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
              <Clock3 className="h-3.5 w-3.5 text-sky-500" />
              {t("common.status")}
            </label>
            <div className="relative">
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value })
                }
                className="input appearance-none pe-9"
              >
                <option value="scheduled">{t("appointments.scheduled")}</option>
                <option value="completed">{t("appointments.completed")}</option>
                <option value="cancelled">{t("appointments.cancelled")}</option>
              </select>
              <ChevronDown className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* Submit */}
          <div className="md:col-span-2 flex items-center gap-3 pt-2">
            <button className="btn-primary justify-center gap-2">
              <Save className="h-4 w-4" />
              {editingId ? t("common.saveChanges") : t("appointments.scheduleAppointment")}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setForm({ patient: "", date: "", reason: "", status: "scheduled", doctor: "" });
                  setEditingId(null);
                }}
                className="btn-ghost"
              >
                {t("common.cancel")}
              </button>
            )}
          </div>

        </form>
      </div>

      <div className="flex justify-between gap-4">
        <div className="relative max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t("appointments.searchPlaceholder")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="input pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>{t("common.patient")}</th>
              <th>{t("common.doctor")}</th>
              <th>{t("common.date")}</th>
              <th>{t("common.reason")}</th>
              <th>{t("common.status")}</th>
              <th className="text-right">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((a) => (
              <tr key={a._id}>
                <td>
                  {a.patient?.firstName} {a.patient?.lastName}
                </td>
                <td className="text-slate-600 dark:text-slate-400">
                  {a.doctor?.name ? `${t("common.dr")} ${a.doctor.name}` : <span className="text-slate-400 italic">{t("common.unassigned")}</span>}
                </td>
                <td>{new Date(a.date).toLocaleString()}</td>
                <td>{a.reason}</td>
                <td>
                  <AppointmentStatusBadge status={a.status} />
                </td>
                <td className="space-x-2 text-right">
                  <button
                    onClick={() => handleEdit(a)}
                    className="btn-ghost"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span>{t("common.edit")}</span>
                  </button>
                  <button
                    onClick={() => handleDelete(a._id)}
                    className="btn-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{t("common.delete")}</span>
                  </button>
                  {/* Reception: Check-in / Cancel / No-show */}
                  {(() => {
                    const status = getNormalizedStatus(a);

                    if (status === "scheduled") {
                      return (
                        <>
                          <button
                            onClick={() => updateStatus(a._id, "waiting")}
                            disabled={isUpdatingId === a._id}
                            className="btn-secondary"
                          >
                            <Clock3 className="h-3.5 w-3.5" />
                            <span>{t("appointments.checkIn")}</span>
                          </button>
                          <button
                            onClick={() => updateStatus(a._id, "cancelled")}
                            disabled={isUpdatingId === a._id}
                            className="btn-ghost"
                          >
                            <XOctagon className="h-3.5 w-3.5" />
                            <span>{t("common.cancel")}</span>
                          </button>
                          <button
                            onClick={() => updateStatus(a._id, "no_show")}
                            disabled={isUpdatingId === a._id}
                            className="btn-ghost"
                          >
                            <EyeOff className="h-3.5 w-3.5" />
                            <span>{t("appointments.noShow")}</span>
                          </button>
                        </>
                      );
                    }

                    if (status === "waiting") {
                      return (
                        <>
                          <button
                            onClick={() => startVisit(a)}
                            disabled={isUpdatingId === a._id}
                            className="btn-success"
                          >
                            <Play className="h-3.5 w-3.5" />
                            <span>{t("appointments.startVisit")}</span>
                          </button>
                          <button
                            onClick={() => updateStatus(a._id, "cancelled")}
                            disabled={isUpdatingId === a._id}
                            className="btn-ghost"
                          >
                            <XOctagon className="h-3.5 w-3.5" />
                            <span>{t("common.cancel")}</span>
                          </button>
                        </>
                      );
                    }

                    if (status === "in_progress") {
                      return (
                        <button
                          onClick={() => startVisit(a)}
                          disabled={isUpdatingId === a._id}
                          className="btn-success"
                        >
                          <Play className="h-3.5 w-3.5" />
                          <span>{t("appointments.continueVisit")}</span>
                        </button>
                      );
                    }

                    if (status === "completed") {
                      return (
                        <span className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          {t("appointments.completed")}
                        </span>
                      );
                    }

                    if (status === "cancelled" || status === "no_show") {
                      return (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {t("common.noFurtherActions")}
                        </span>
                      );
                    }

                    return null;
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {appointments.length === 0 && (
          <p className="px-4 pb-4 pt-2 text-sm text-slate-500 dark:text-slate-400">
            {t("appointments.noAppointments")}
          </p>
        )}
      </div>

      <div className="mt-2 flex items-center justify-center gap-3 text-xs text-slate-600 dark:text-slate-400">
        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          className="btn-ghost disabled:opacity-50"
        >
          {t("common.prev")}
        </button>

        <span>
          {t("common.page")} {page} {t("common.of")} {totalPages}
        </span>

        <button
          disabled={page === totalPages}
          onClick={() => setPage(page + 1)}
          className="btn-ghost disabled:opacity-50"
        >
          {t("common.next")}
        </button>
      </div>
    </div>
  );
}
