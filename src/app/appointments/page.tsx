"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Calendar, Users, Search, Pencil, Trash2, Play, CheckCircle2, Clock3, XOctagon, EyeOff } from "lucide-react";
import { AppointmentStatus, normalizeAppointmentStatus } from "@/lib/appointmentStatus";
import { AppointmentStatusBadge } from "@/components/AppointmentStatusBadge";
import { useToast } from "@/hooks/use-toast";

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

    if (editingId) {
      await fetch(`/api/appointments/${editingId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/appointments", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }

    setForm({
      patient: "",
      date: "",
      reason: "",
      status: "scheduled",
      doctor: "",
    });

    setEditingId(null);
    fetchAppointments();
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
    if (!confirm("Delete this appointment?")) return;

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
        throw new Error(error?.error || "Failed to update status");
      }

      await fetchAppointments();
      toast({
        title: "Status updated",
      });
    } catch (error: any) {
      toast({
        title: "Status update failed",
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
        throw new Error(data?.error || "Failed to start visit");
      }

      router.push(`/visits/${data.visitId}`);
    } catch (error: any) {
      toast({
        title: "Cannot start visit",
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">
            <Calendar className="h-6 w-6 text-sky-500" />
            <span>Appointments</span>
          </h1>
          <p className="page-subtitle">
            Schedule, review, and update upcoming patient appointments.
          </p>
        </div>
        <span className="pill">
          <Users className="mr-1 h-3.5 w-3.5" />
          Total: {appointments.length}
        </span>
      </div>

      {/* Form */}
      <div className="card card-muted">
        <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
          {editingId ? "Update appointment" : "Schedule appointment"}
        </h2>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <select
            value={form.patient}
            onChange={(e) =>
              setForm({ ...form, patient: e.target.value })
            }
            className="input"
            required
          >
            <option value="">Select patient</option>
            {patients.map((p) => (
              <option key={p._id} value={p._id}>
                {p.firstName} {p.lastName}
              </option>
            ))}
          </select>

          <input
            type="datetime-local"
            value={form.date}
            onChange={(e) =>
              setForm({ ...form, date: e.target.value })
            }
            className="input"
            required
          />

          {/* Doctor selector – visible to admin & receptionist */}
          {userRole !== "doctor" && (
            <select
              value={form.doctor}
              onChange={(e) =>
                setForm({ ...form, doctor: e.target.value })
              }
              className="input"
              required
            >
              <option value="">Select doctor</option>
              {doctors.map((d) => (
                <option key={d._id} value={d._id}>
                  Dr. {d.name}
                </option>
              ))}
            </select>
          )}

          <input
            placeholder="Reason for visit"
            value={form.reason}
            onChange={(e) =>
              setForm({ ...form, reason: e.target.value })
            }
            className="input md:col-span-2"
            required
          />

          <select
            value={form.status}
            onChange={(e) =>
              setForm({ ...form, status: e.target.value })
            }
            className="input md:max-w-xs"
          >
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <button className="btn-primary md:col-span-2 justify-center">
            {editingId ? "Save changes" : "Schedule appointment"}
          </button>
        </form>
      </div>

      <div className="flex justify-between gap-4">
        <div className="relative max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search patients…"
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
              <th>Patient</th>
              <th>Doctor</th>
              <th>Date</th>
              <th>Reason</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((a) => (
              <tr key={a._id}>
                <td>
                  {a.patient?.firstName} {a.patient?.lastName}
                </td>
                <td className="text-slate-600 dark:text-slate-400">
                  {a.doctor?.name ? `Dr. ${a.doctor.name}` : <span className="text-slate-400 italic">Unassigned</span>}
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
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(a._id)}
                    className="btn-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
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
                            <span>Check In</span>
                          </button>
                          <button
                            onClick={() => updateStatus(a._id, "cancelled")}
                            disabled={isUpdatingId === a._id}
                            className="btn-ghost"
                          >
                            <XOctagon className="h-3.5 w-3.5" />
                            <span>Cancel</span>
                          </button>
                          <button
                            onClick={() => updateStatus(a._id, "no_show")}
                            disabled={isUpdatingId === a._id}
                            className="btn-ghost"
                          >
                            <EyeOff className="h-3.5 w-3.5" />
                            <span>No Show</span>
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
                            <span>Start Visit</span>
                          </button>
                          <button
                            onClick={() => updateStatus(a._id, "cancelled")}
                            disabled={isUpdatingId === a._id}
                            className="btn-ghost"
                          >
                            <XOctagon className="h-3.5 w-3.5" />
                            <span>Cancel</span>
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
                          <span>Continue Visit</span>
                        </button>
                      );
                    }

                    if (status === "completed") {
                      return (
                        <span className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          Completed
                        </span>
                      );
                    }

                    if (status === "cancelled" || status === "no_show") {
                      return (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          No further actions
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
            No appointments yet. Use the form above to schedule the first one.
          </p>
        )}
      </div>

      <div className="mt-2 flex items-center justify-center gap-3 text-xs text-slate-600 dark:text-slate-400">
        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          className="btn-ghost disabled:opacity-50"
        >
          Prev
        </button>

        <span>
          Page {page} of {totalPages}
        </span>

        <button
          disabled={page === totalPages}
          onClick={() => setPage(page + 1)}
          className="btn-ghost disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
