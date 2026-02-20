"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Clipboard, Pencil, Trash2, Eye, FileText, Search, Printer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
}

interface Doctor {
  _id: string;
  name: string;
}

interface Visit {
  _id: string;
  patient: Patient;
  prescription: string;
  doctor: {
    _id: string;
    name: string;
  };
  diagnosis: string;
  notes?: string;
  followUpDate?: string;
}

export default function VisitsPage() {

  const { data: session } = useSession();

  const [visits, setVisits] = useState<Visit[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [activeVisitForPrescription, setActiveVisitForPrescription] = useState<Visit | null>(null);
  const [visitPrescriptions, setVisitPrescriptions] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<string | null>(null);
  const [historyVersions, setHistoryVersions] = useState([]);

  const [medications, setMedications] = useState([
    { name: "", dosage: "", frequency: "", duration: "" },
  ]);

  const [notes, setNotes] = useState("");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");

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

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (!selectedVisit) return;

    fetchPrescriptions();
  }, [selectedVisit]);

  useEffect(() => {
    if (!historyTarget) return;

    fetch(`/api/prescriptions/${historyTarget}/history`)
      .then(res => res.json())
      .then(data => setHistoryVersions(data));
  }, [historyTarget]);

  const fetchPrescriptions = async () => {
    fetch(`/api/prescriptions?visit=${selectedVisit._id}`)
      .then(res => res.json())
      .then(data => setVisitPrescriptions(data?.prescriptions));
  };

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

  const fetchDoctors = async () => {
    const res = await fetch("/api/users?role=doctor");
    const data = await res.json();
    setDoctors(data.users || data || []);
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

  const savePrescription = async () => {
    if (!activeVisitForPrescription) return;
    if (!selectedDoctorId && !activeVisitForPrescription.doctor?._id) {
      alert("Please select a doctor for this prescription");
      return;
    }

    await fetch("/api/prescriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient: activeVisitForPrescription.patient._id,
        doctor: selectedDoctorId || activeVisitForPrescription.doctor?._id,
        visit: activeVisitForPrescription._id,
        medications,
        notes,
      }),
    });

    setShowPrescriptionModal(false);
    setActiveVisitForPrescription(null);
    setMedications([{ name: "", dosage: "", frequency: "", duration: "" }]);
    setNotes("");
    setSelectedDoctorId("");
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
                  {session?.user?.role === "doctor" && <button
                    onClick={() => {
                      setActiveVisitForPrescription(v);
                      setSelectedDoctorId(v.doctor?._id || "");
                      setShowPrescriptionModal(true);
                    }}
                    className="btn-secondary"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Add Prescription</span>
                  </button>}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 !mt-0">
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

              <div>
                <h3 className="text-lg font-semibold mt-4">Prescriptions</h3>

                {visitPrescriptions.length === 0 ? (
                  <p className="text-sm text-gray-500">No prescriptions for this visit.</p>
                ) : (
                  visitPrescriptions.map((p: any) => (
                    <div key={p._id} className="border p-3 rounded mb-2">
                      <p className="text-sm text-gray-500">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </p>

                      {p.medications.map((m: any, index: number) => (
                        <div key={index} className="text-sm">
                          • {m.name} — {m.dosage} — {m.frequency} — {m.duration}
                        </div>
                      ))}

                      {p.notes && (
                        <p className="text-sm mt-1 italic">Notes: {p.notes}</p>
                      )}

                      <div className="flex items-center gap-4 mt-4">
                        <Link
                          href={`/dashboard/prescriptions/${p._id}/print`}
                          target="_blank"
                          className="text-sm btn-primary"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          <span>Print</span>
                        </Link>

                        <button
                          onClick={() => {
                            setHistoryTarget(p._id);
                            setShowHistoryModal(true);
                          }}
                          className="text-sm btn-secondary"
                        >
                          View History
                        </button>

                        {session?.user?.role === "admin" && <button
                          onClick={() => {
                            setDeleteTarget(p._id);
                            setShowDeleteDialog(true);
                          }}
                          className="text-sm btn-danger py-3"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete</span>
                        </button>}
                      </div>
                    </div>
                  ))
                )}
              </div>
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

      {/* {showHistoryModal && (
        <div className="modal">
          <h3 className="text-lg font-semibold mb-4">
            Prescription Version History
          </h3>

          {historyVersions.map((v: any) => (
            <div
              key={v._id}
              className={`border p-3 rounded mb-3 ${v.isSuperseded ? "bg-gray-50" : "bg-green-50"
                }`}
            >
              <p className="text-sm font-semibold">
                Version {v.version}
                {!v.isSuperseded && (
                  <span className="ml-2 text-green-600">(Current)</span>
                )}
              </p>

              <p className="text-xs text-gray-500">
                {new Date(v.createdAt).toLocaleString()}
              </p>

              {v.medications.map((m: any, i: number) => (
                <div key={i} className="text-sm">
                  • {m.name} — {m.dosage} — {m.frequency} — {m.duration}
                </div>
              ))}
            </div>
          ))}

          <button onClick={() => setShowHistoryModal(false)}>
            Close
          </button>
        </div>
      )} */}

      <Dialog
        open={showHistoryModal}
        onOpenChange={setShowHistoryModal}
      >
        <DialogContent className="max-w-2xl" aria-describedby={'Prescription-Delete'}>
          <DialogHeader>
            <DialogTitle>Prescription Version History</DialogTitle>
          </DialogHeader>

          <div className="modal">
            <div className="flex items-center gap-4">
              {historyVersions.map((v: any) => (
                <div
                  key={v._id}
                  className={`w-full border p-3 rounded mb-3 ${v.isSuperseded ? "bg-gray-50" : "bg-green-50"
                    }`}
                >
                  <p className="text-sm font-semibold">
                    Version {v.version}
                    {!v.isSuperseded && (
                      <span className="ml-2 text-green-600">(Current)</span>
                    )}
                  </p>

                  <p className="text-xs text-gray-500">
                    {new Date(v.createdAt).toLocaleString()}
                  </p>

                  {v.medications.map((m: any, i: number) => (
                    <div key={i} className="text-sm">
                      • {m.name} — {m.dosage} — {m.frequency} — {m.duration}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
      >
        <DialogContent className="max-w-2xl" aria-describedby={'Prescription-Delete'}>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>

          <div className="modal">
            <p className="mb-4">Are you sure you want to delete this prescription?</p>

            <div className="flex items-center gap-4">
              <button
                onClick={async () => {
                  await fetch(`/api/prescriptions/${deleteTarget}`, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId: session?.user?.id }),
                  });

                  setDeleteTarget(null);
                  setShowDeleteDialog(false);
                  fetchPrescriptions();
                }}
                className="btn-danger"
              >
                Confirm Delete
              </button>

              <button
                className="btn-ghost"
                onClick={() => {
                  setDeleteTarget(null);
                  setShowDeleteDialog(false);
                }}>
                Cancel
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showPrescriptionModal}
        onOpenChange={setShowPrescriptionModal}
      >
        <DialogContent className="max-w-2xl" aria-describedby={'Prescription-Content'}>
          <DialogHeader>
            <DialogTitle>Create Prescription</DialogTitle>
          </DialogHeader>

          {medications.map((med, index) => (
            <div key={index} className="grid grid-cols-4 gap-2 mb-3">
              <Input
                placeholder="Medication Name"
                value={med.name}
                onChange={(e) => {
                  const updated = [...medications];
                  updated[index].name = e.target.value;
                  setMedications(updated);
                }}
              />

              <Input
                placeholder="Dosage"
                value={med.dosage}
                onChange={(e) => {
                  const updated = [...medications];
                  updated[index].dosage = e.target.value;
                  setMedications(updated);
                }}
              />

              <Input
                placeholder="Frequency"
                value={med.frequency}
                onChange={(e) => {
                  const updated = [...medications];
                  updated[index].frequency = e.target.value;
                  setMedications(updated);
                }}
              />

              <Input
                placeholder="Duration"
                value={med.duration}
                onChange={(e) => {
                  const updated = [...medications];
                  updated[index].duration = e.target.value;
                  setMedications(updated);
                }}
              />
            </div>
          ))}

          <Button
            variant="outline"
            onClick={() =>
              setMedications([
                ...medications,
                { name: "", dosage: "", frequency: "", duration: "" },
              ])
            }
          >
            + Add Medication
          </Button>

          <select
            className="w-full border rounded-lg p-2 mt-4"
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
          >
            <option value="">Select doctor</option>
            {doctors.map((doctor) => (
              <option key={doctor._id} value={doctor._id}>
                Dr. {doctor.name}
              </option>
            ))}
          </select>

          <textarea
            className="w-full border rounded-lg p-2 mt-4"
            placeholder="Additional Notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <Button onClick={savePrescription} className="mt-4">
            Save Prescription
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
