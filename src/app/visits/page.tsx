"use client";

import { useEffect, useState } from "react";
import { Clipboard, Pencil, Trash2, Eye, FileText, Search } from "lucide-react";

interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
}

interface Visit {
  _id: string;
  patient: Patient;
  diagnosis: string;
  prescription?: string;
  notes?: string;
  followUpDate?: string;
}

export default function VisitsPage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    patient: "",
    diagnosis: "",
    prescription: "",
    notes: "",
    followUpDate: "",
  });

  useEffect(() => {
    fetchVisits();
    fetchPatients();
  }, [page, search]);

  const fetchVisits = async () => {
    const res = await fetch(`/api/visits?page=${page}&limit=5&search=${search}`);
    const data = await res.json();
    setVisits(data.visits);
    setTotalPages(data.pages);
  };

  const fetchPatients = async () => {
    const res = await fetch(`/api/patients?page=${page}&limit=5&search=${search}`);
    const data = await res.json();
    setPatients(data.patients || data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingId) {
      await fetch(`/api/visits/${editingId}`, {
        method: "PUT",
        body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/visits", {
        method: "POST",
        body: JSON.stringify(form),
      });
    }

    setForm({
      patient: "",
      diagnosis: "",
      prescription: "",
      notes: "",
      followUpDate: "",
    });

    setEditingId(null);
    fetchVisits();
  };

  const handleEdit = (visit: Visit) => {
    setEditingId(visit._id);

    setForm({
      patient: visit.patient._id,
      diagnosis: visit.diagnosis,
      prescription: visit.prescription || "",
      notes: visit.notes || "",
      followUpDate: visit.followUpDate?.slice(0, 10) || "",
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this visit?")) return;

    await fetch(`/api/visits/${id}`, {
      method: "DELETE",
    });

    fetchVisits();
  };

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">
            <Clipboard className="h-6 w-6 text-sky-500" />
            <span>Visits / Medical records</span>
          </h1>
          <p className="page-subtitle">
            Document diagnoses, prescriptions, notes, and follow-up dates.
          </p>
        </div>
        <span className="pill">Total: {visits.length}</span>
      </div>

      {/* Form */}
      <div className="card card-muted">
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
            placeholder="Diagnosis"
            value={form.diagnosis}
            onChange={(e) =>
              setForm({ ...form, diagnosis: e.target.value })
            }
            className="input"
            required
          />

          <input
            placeholder="Prescription"
            value={form.prescription}
            onChange={(e) =>
              setForm({ ...form, prescription: e.target.value })
            }
            className="input md:col-span-2"
          />

          <textarea
            placeholder="Clinical notes"
            value={form.notes}
            onChange={(e) =>
              setForm({ ...form, notes: e.target.value })
            }
            className="input md:col-span-2"
          />

          <input
            type="date"
            value={form.followUpDate}
            onChange={(e) =>
              setForm({ ...form, followUpDate: e.target.value })
            }
            className="input md:max-w-xs"
          />

          <button className="btn-primary md:col-span-2 justify-center">
            {editingId ? "Update visit" : "Add visit"}
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
              <th>Diagnosis</th>
              <th>Follow up</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visits.map((v) => (
              <tr key={v._id}>
                <td>
                  {v.patient?.firstName} {v.patient?.lastName}
                </td>
                <td>{v.diagnosis}</td>
                <td>
                  {v.followUpDate
                    ? new Date(v.followUpDate).toLocaleDateString()
                    : "-"}
                </td>
                <td className="space-x-2 text-right">
                  <button
                    onClick={() => handleEdit(v)}
                    className="btn-ghost"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(v._id)}
                    className="btn-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </button>
                  <button
                    onClick={() => setSelectedVisit(v)}
                    className="btn-secondary"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>View</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {visits.length === 0 && (
          <p className="px-4 pb-4 pt-2 text-sm text-slate-500">
            No visits yet. Add your first visit using the form above.
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

      {selectedVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="card w-full max-w-md">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              <span className="inline-flex items-center gap-2">
                <FileText className="h-5 w-5 text-sky-500" />
                <span>Visit details</span>
              </span>
            </h2>

            <div className="space-y-3 text-sm text-slate-700">
              <div>
                <p className="text-xs font-semibold text-slate-500">
                  Patient
                </p>
                <p>
                  {selectedVisit.patient?.firstName}{" "}
                  {selectedVisit.patient?.lastName}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500">
                  Diagnosis
                </p>
                <p>{selectedVisit.diagnosis}</p>
              </div>

              {selectedVisit.prescription && (
                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    Prescription
                  </p>
                  <p>{selectedVisit.prescription}</p>
                </div>
              )}

              {selectedVisit.notes && (
                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    Notes
                  </p>
                  <p>{selectedVisit.notes}</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedVisit(null)}
              className="btn-primary mt-5 w-full justify-center"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
