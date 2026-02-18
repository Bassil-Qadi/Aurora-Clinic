"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { User, Phone, Mail, Calendar, Clipboard, Pencil, Trash2, Plus, X } from "lucide-react";

export default function PatientDetailsPage() {
  const params = useParams();
  const { data: session } = useSession();
  const id = params.id as string;

  const [data, setData] = useState<any>(null);
  const [patientPrescriptions, setPatientPrescriptions] = useState([]);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [diagnosis, setDiagnosis] = useState("");
  const [treatment, setTreatment] = useState("");

  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editGender, setEditGender] = useState("");


  useEffect(() => {
    fetchPatient();
  }, []);

  useEffect(() => {
    fetch(`/api/prescriptions?patient=${params.id}`)
      .then(res => res.json())
      .then(data => setPatientPrescriptions(data?.prescriptions));
  }, [params.id]);

  const fetchPatient = async () => {
    const res = await fetch(`/api/patients/${id}/details`);
    const result = await res.json();
    setData(result);
  };

  const createVisit = async () => {
    await fetch("/api/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient: id,
        diagnosis,
        treatment,
      }),
    });

    setShowVisitModal(false);
    setDiagnosis("");
    setTreatment("");
    fetchPatient();
  };

  const updatePatient = async () => {
    await fetch(`/api/patients/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: editName,
        email: editEmail,
        phone: editPhone,
        gender: editGender,
      }),
    });

    setShowEditModal(false);
    fetchPatient(); // refresh data
  };

  const deletePatient = async () => {
    if (!confirm("Are you sure?")) return;

    await fetch(`/api/patients/${id}`, {
      method: "DELETE",
    });

    window.location.href = "/dashboard/patients";
  };

  if (!data)
    return (
      <div className="space-y-4 p-8">
        <p className="page-title text-xl">Loading patient…</p>
        <p className="page-subtitle">Fetching patient details and history.</p>
      </div>
    );

  const { patient, appointments, visits } = data;

  return (
    <div className="space-y-8 p-8">
      <h1 className="page-title">
        <User className="h-6 w-6 text-sky-500" />
        <span>Patient Details</span>
      </h1>

      {/* Patient Info */}
      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <User className="h-5 w-5 text-sky-500" />
            <span>Patient Information</span>
          </h2>
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setEditName(`${patient.firstName} ${patient.lastName}`);
                setEditEmail(patient.email);
                setEditPhone(patient.phone);
                setEditGender(patient.gender);
                setShowEditModal(true);
              }}
              className="btn-ghost"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>Edit</span>
            </button>
            {session?.user?.role === "admin" && (
              <button
                onClick={deletePatient}
                className="btn-danger"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>
        <div className="mt-4 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
          <p>
            <span className="font-semibold">Name:</span>{" "}
            {patient.firstName} {patient.lastName}
          </p>
          <p className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-sky-500" />
            <span className="font-semibold">Email:</span>
            <span>{patient.email || "—"}</span>
          </p>
          <p className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-sky-500" />
            <span className="font-semibold">Phone:</span>
            <span>{patient.phone}</span>
          </p>
          <p>
            <span className="font-semibold">Gender:</span> {patient.gender}
          </p>
        </div>
      </div>
      {/* Prescriptions */}
      <div className="card">
        <h2 className="text-xl font-semibold">Prescription History</h2>

        {patientPrescriptions.length === 0 ? (
          <p className="text-sm text-gray-500">No prescriptions found.</p>
        ) : (
          patientPrescriptions.map((p: any) => (
            <div key={p._id} className="border p-4 rounded mb-3">
              <p className="text-sm text-gray-500">
                {new Date(p.createdAt).toLocaleDateString()}
              </p>

              {p.medications.map((m: any, index: number) => (
                <div key={index} className="text-sm">
                  • {m.name} — {m.dosage} — {m.frequency} — {m.duration}
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Appointments */}
      <div className="card">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Calendar className="h-5 w-5 text-sky-500" />
          <span>Appointment History</span>
        </h2>

        {appointments.length === 0 ? (
          <p>No appointments found.</p>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appt: any) => (
                  <tr key={appt._id}>
                    <td>{new Date(appt.date).toLocaleDateString()}</td>
                    <td>{appt.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Visits */}
      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Clipboard className="h-5 w-5 text-sky-500" />
            <span>Visit History</span>
          </h2>
          <button
            onClick={() => setShowVisitModal(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Visit</span>
          </button>
        </div>


        {visits.length === 0 ? (
          <p>No visits yet.</p>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Diagnosis</th>
                  <th>Treatment</th>
                </tr>
              </thead>
              <tbody>
                {visits.map((visit: any) => (
                  <tr key={visit._id}>
                    <td>
                      {new Date(visit.createdAt).toLocaleDateString()}
                    </td>
                    <td>{visit.diagnosis}</td>
                    <td>{visit.treatment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showVisitModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 !mt-0">
          <div className="card w-96 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Clipboard className="h-5 w-5 text-sky-500" />
              <span>New Visit</span>
            </h2>

            <textarea
              placeholder="Diagnosis"
              className="input"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
            />

            <textarea
              placeholder="Treatment"
              className="input"
              value={treatment}
              onChange={(e) => setTreatment(e.target.value)}
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowVisitModal(false)}
                className="btn-ghost"
              >
                <X className="h-3.5 w-3.5" />
                <span>Cancel</span>
              </button>

              <button
                onClick={createVisit}
                className="btn-primary"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 !mt-0">
          <div className="card w-96 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Edit Patient</h2>

            <input
              className="input"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Name"
            />

            <input
              className="input"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              placeholder="Email"
            />

            <input
              className="input"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              placeholder="Phone"
            />

            <select
              className="input"
              value={editGender}
              onChange={(e) => setEditGender(e.target.value)}
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowEditModal(false)}
                className="btn-ghost"
              >
                <X className="h-3.5 w-3.5" />
                <span>Cancel</span>
              </button>

              <button
                onClick={updatePatient}
                className="btn-primary"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
