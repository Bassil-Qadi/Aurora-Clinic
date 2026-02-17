"use client";

import { useEffect, useState } from "react";
import { Calendar, Users, Search, Pencil, Trash2 } from "lucide-react";

interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
}

interface Appointment {
  _id: string;
  patient: Patient;
  date: string;
  reason: string;
  status: string;
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    patient: "",
    date: "",
    reason: "",
    status: "scheduled",
  });

  useEffect(() => {
    fetchAppointments();
    fetchPatients();
  }, [page, search]);

  const fetchAppointments = async () => {
    const res = await fetch(`/api/appointments?page=${page}&limit=5&search=${search}`);
    const data = await res.json();
    setAppointments(data?.appointments);
    setTotalPages(data.pages);
  };

  const fetchPatients = async () => {
    const res = await fetch("/api/patients");
    const data = await res.json();
    setPatients(data.patients || data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingId) {
      await fetch(`/api/appointments/${editingId}`, {
        method: "PUT",
        body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/appointments", {
        method: "POST",
        body: JSON.stringify(form),
      });
    }

    setForm({
      patient: "",
      date: "",
      reason: "",
      status: "scheduled",
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
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this appointment?")) return;

    await fetch(`/api/appointments/${id}`, {
      method: "DELETE",
    });

    fetchAppointments();
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
        <h2 className="mb-4 text-sm font-semibold text-slate-900">
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
                <td>{new Date(a.date).toLocaleString()}</td>
                <td>{a.reason}</td>
                <td>
                  <span
                    className={
                      a.status === "completed"
                        ? "badge-status-completed"
                        : a.status === "cancelled"
                        ? "badge-status-cancelled"
                        : "badge-status-scheduled"
                    }
                  >
                    {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                  </span>
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {appointments.length === 0 && (
          <p className="px-4 pb-4 pt-2 text-sm text-slate-500">
            No appointments yet. Use the form above to schedule the first one.
          </p>
        )}
      </div>

      <div className="mt-2 flex items-center justify-center gap-3 text-xs text-slate-600">
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
