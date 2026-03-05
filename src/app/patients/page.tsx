"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Users, UserPlus, Search, Pencil, Trash2, User, CalendarDays, Phone, Mail, MapPin, Save, ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Breadcrumb } from "@/components/Breadcrumb";

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
  const { t } = useI18n();
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
    if (!confirm(t("common.areYouSure"))) return;

    await fetch(`/api/patients/${id}`, {
      method: "DELETE",
    });

    fetchPatients();
  };

  return (
    <div className="space-y-6 p-8">
      <Breadcrumb items={[{ label: t("nav.patients") }]} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">
            <Users className="h-6 w-6 text-sky-500" />
            <span>{t("patients.title")}</span>
          </h1>
          <p className="page-subtitle">
            {t("patients.subtitle")}
          </p>
        </div>
        <span className="pill">
          <UserPlus className="mr-1 h-3.5 w-3.5" />
          {t("common.total")}: {patients.length}
        </span>
      </div>

      {/* Form */}
      <div className="card card-muted">
        <h2 className="mb-5 text-sm font-semibold text-slate-900 dark:text-slate-100">
          {editingId ? t("patients.editPatient") : t("patients.addNewPatient")}
        </h2>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid grid-cols-1 gap-5 md:grid-cols-2"
        >
          {/* First Name */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
              <User className="h-3.5 w-3.5 text-sky-500" />
              {t("patients.firstName")} <span className="text-rose-400">*</span>
            </label>
            <input
              {...register("firstName")}
              placeholder={t("patients.firstNamePlaceholder")}
              className={`input ${errors.firstName ? "!border-rose-400 !ring-rose-200 dark:!ring-rose-900" : ""}`}
            />
            {errors.firstName && (
              <p className="text-xs text-rose-500 dark:text-rose-400">{errors.firstName.message}</p>
            )}
          </div>

          {/* Last Name */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
              <User className="h-3.5 w-3.5 text-sky-500" />
              {t("patients.lastName")} <span className="text-rose-400">*</span>
            </label>
            <input
              {...register("lastName")}
              placeholder={t("patients.lastNamePlaceholder")}
              className={`input ${errors.lastName ? "!border-rose-400 !ring-rose-200 dark:!ring-rose-900" : ""}`}
            />
            {errors.lastName && (
              <p className="text-xs text-rose-500 dark:text-rose-400">{errors.lastName.message}</p>
            )}
          </div>

          {/* Date of Birth */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
              <CalendarDays className="h-3.5 w-3.5 text-sky-500" />
              {t("patients.dateOfBirth")} <span className="text-rose-400">*</span>
            </label>
            <input
              type="date"
              {...register("dateOfBirth")}
              className={`input ${errors.dateOfBirth ? "!border-rose-400 !ring-rose-200 dark:!ring-rose-900" : ""}`}
            />
            {errors.dateOfBirth && (
              <p className="text-xs text-rose-500 dark:text-rose-400">{errors.dateOfBirth.message}</p>
            )}
          </div>

          {/* Gender */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
              <Users className="h-3.5 w-3.5 text-sky-500" />
              {t("patients.gender")} <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <select
                {...register("gender")}
                className={`input appearance-none pe-9 ${errors.gender ? "!border-rose-400 !ring-rose-200 dark:!ring-rose-900" : ""}`}
              >
                <option value="">{t("common.selectGender")}</option>
                <option value="male">{t("common.male")}</option>
                <option value="female">{t("common.female")}</option>
              </select>
              <ChevronDown className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
            {errors.gender && (
              <p className="text-xs text-rose-500 dark:text-rose-400">{errors.gender.message}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
              <Phone className="h-3.5 w-3.5 text-sky-500" />
              {t("common.phone")} <span className="text-rose-400">*</span>
            </label>
            <input
              {...register("phone")}
              placeholder={t("patients.phonePlaceholder")}
              className={`input ${errors.phone ? "!border-rose-400 !ring-rose-200 dark:!ring-rose-900" : ""}`}
            />
            {errors.phone && (
              <p className="text-xs text-rose-500 dark:text-rose-400">{errors.phone.message}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
              <Mail className="h-3.5 w-3.5 text-sky-500" />
              {t("common.email")} <span className="text-slate-400">({t("common.optional")})</span>
            </label>
            <input
              {...register("email")}
              placeholder={t("patients.emailPlaceholder")}
              className={`input ${errors.email ? "!border-rose-400 !ring-rose-200 dark:!ring-rose-900" : ""}`}
            />
            {errors.email && (
              <p className="text-xs text-rose-500 dark:text-rose-400">{errors.email.message}</p>
            )}
          </div>

          {/* Address */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
              <MapPin className="h-3.5 w-3.5 text-sky-500" />
              {t("common.address")} <span className="text-slate-400">({t("common.optional")})</span>
            </label>
            <input
              {...register("address")}
              placeholder={t("patients.addressPlaceholder")}
              className={`input ${errors.address ? "!border-rose-400 !ring-rose-200 dark:!ring-rose-900" : ""}`}
            />
          </div>

          {/* Submit */}
          <div className="md:col-span-2 flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="btn-primary justify-center gap-2"
            >
              <Save className="h-4 w-4" />
              {editingId ? t("patients.updatePatient") : t("patients.addPatient")}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => { reset(); setEditingId(null); }}
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
            placeholder={t("patients.searchPlaceholder")}
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
              <th>{t("common.name")}</th>
              <th>{t("common.phone")}</th>
              <th className="text-right">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((p) => (
              <tr key={p._id}>
                <td>
                  <Link
                    href={`/dashboard/patients/${p._id}`}
                    className="font-medium text-sky-700 hover:underline dark:text-sky-400"
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
                    <span>{t("common.edit")}</span>
                  </button>
                  <button
                    onClick={() => handleDelete(p._id)}
                    className="btn-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{t("common.delete")}</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {patients.length === 0 && (
          <p className="px-4 pb-4 pt-2 text-sm text-slate-500 dark:text-slate-400">
            {t("patients.noPatients")}
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
