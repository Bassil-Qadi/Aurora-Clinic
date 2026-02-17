"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Users, UserPlus, Search, Pencil, Trash2 } from "lucide-react";

const patientSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  dateOfBirth: z.string(),
  gender: z.enum(["male", "female"]),
  phone: z.string().min(6),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
});

type PatientFormData = z.infer<typeof patientSchema>;

interface Patient extends PatientFormData {
  _id: string;
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");


  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
  });

  useEffect(() => {
    fetchPatients();
  }, [page, search]);

  const fetchPatients = async () => {
    const res = await fetch(
      `/api/patients?page=${page}&limit=5&search=${search}`
    );
    const data = await res.json();

    setPatients(data.patients);
    setTotalPages(data.pages);
  };

  const onSubmit = async (data: PatientFormData) => {
    if (editingId) {
      await fetch(`/api/patients/${editingId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    } else {
      await fetch("/api/patients", {
        method: "POST",
        body: JSON.stringify(data),
      });
    }

    reset();
    setEditingId(null);
    fetchPatients();
  };

  const handleEdit = (patient: Patient) => {
    setEditingId(patient._id);
    reset(patient);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;

    await fetch(`/api/patients/${id}`, {
      method: "DELETE",
    });

    fetchPatients();
  };

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">
            <Users className="h-6 w-6 text-sky-500" />
            <span>Patients</span>
          </h1>
          <p className="page-subtitle">
            Create and manage patient demographics and contact details.
          </p>
        </div>
        <span className="pill">
          <UserPlus className="mr-1 h-3.5 w-3.5" />
          Total: {patients.length}
        </span>
      </div>

      {/* Form */}
      <div className="card card-muted">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">
          {editingId ? "Edit patient" : "Add new patient"}
        </h2>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <input
            {...register("firstName")}
            placeholder="First name"
            className="input"
          />
          <input
            {...register("lastName")}
            placeholder="Last name"
            className="input"
          />
          <input type="date" {...register("dateOfBirth")} className="input" />

          <select {...register("gender")} className="input">
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>

          <input {...register("phone")} placeholder="Phone" className="input" />
          <input
            {...register("email")}
            placeholder="Email (optional)"
            className="input"
          />
          <input
            {...register("address")}
            placeholder="Address (optional)"
            className="input md:col-span-2"
          />

          <button
            type="submit"
            className="btn-primary md:col-span-2 justify-center"
          >
            {editingId ? "Update patient" : "Add patient"}
          </button>
        </form>

        {/* Validation Errors */}
        <div className="mt-2 text-xs text-rose-600">
          {Object.values(errors).map((err, index) => (
            <p key={index}>{err?.message}</p>
          ))}
        </div>
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
              <th>Name</th>
              <th>Phone</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((p) => (
              <tr key={p._id}>
                <td>
                  <Link
                    href={`/dashboard/patients/${p._id}`}
                    className="font-medium text-sky-700 hover:underline"
                  >
                    {p.firstName} {p.lastName}
                  </Link>
                </td>
                <td>{p.phone}</td>
                <td className="space-x-2 text-right">
                  <button
                    onClick={() => handleEdit(p)}
                    className="btn-ghost"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(p._id)}
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

        {patients.length === 0 && (
          <p className="px-4 pb-4 pt-2 text-sm text-slate-500">
            No patients yet. Add your first patient using the form above.
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
