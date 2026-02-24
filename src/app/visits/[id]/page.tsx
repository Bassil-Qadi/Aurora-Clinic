"use client";

import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { useState } from "react";
import { AppointmentStatusBadge } from "@/components/AppointmentStatusBadge";
import { normalizeAppointmentStatus } from "@/lib/appointmentStatus";
import {
  Stethoscope,
  User,
  Heart,
  Thermometer,
  Activity,
  Wind,
  Droplets,
  Scale,
  Ruler,
  Gauge,
  AlertCircle,
  Save,
  CheckCircle2,
  ArrowLeft,
  FileText,
  Clipboard,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface VitalSigns {
  bloodPressureSystolic?: number | null;
  bloodPressureDiastolic?: number | null;
  heartRate?: number | null;
  temperature?: number | null;
  respiratoryRate?: number | null;
  oxygenSaturation?: number | null;
  weight?: number | null;
  height?: number | null;
  bmi?: number | null;
  bloodGlucose?: number | null;
  painLevel?: number | null;
}

const VITAL_FIELDS = [
  {
    key: "bloodPressureSystolic",
    label: "Systolic BP",
    unit: "mmHg",
    icon: Heart,
    color: "text-rose-500",
    bgColor: "bg-rose-50",
    placeholder: "120",
    min: 0,
    max: 300,
  },
  {
    key: "bloodPressureDiastolic",
    label: "Diastolic BP",
    unit: "mmHg",
    icon: Heart,
    color: "text-rose-500",
    bgColor: "bg-rose-50",
    placeholder: "80",
    min: 0,
    max: 200,
  },
  {
    key: "heartRate",
    label: "Heart Rate",
    unit: "bpm",
    icon: Activity,
    color: "text-red-500",
    bgColor: "bg-red-50",
    placeholder: "72",
    min: 0,
    max: 300,
  },
  {
    key: "temperature",
    label: "Temperature",
    unit: "°C",
    icon: Thermometer,
    color: "text-amber-500",
    bgColor: "bg-amber-50",
    placeholder: "36.6",
    min: 20,
    max: 50,
    step: 0.1,
  },
  {
    key: "respiratoryRate",
    label: "Respiratory Rate",
    unit: "breaths/min",
    icon: Wind,
    color: "text-sky-500",
    bgColor: "bg-sky-50",
    placeholder: "16",
    min: 0,
    max: 80,
  },
  {
    key: "oxygenSaturation",
    label: "SpO₂",
    unit: "%",
    icon: Droplets,
    color: "text-blue-500",
    bgColor: "bg-blue-50",
    placeholder: "98",
    min: 0,
    max: 100,
  },
  {
    key: "weight",
    label: "Weight",
    unit: "kg",
    icon: Scale,
    color: "text-emerald-500",
    bgColor: "bg-emerald-50",
    placeholder: "70",
    min: 0,
    max: 500,
    step: 0.1,
  },
  {
    key: "height",
    label: "Height",
    unit: "cm",
    icon: Ruler,
    color: "text-teal-500",
    bgColor: "bg-teal-50",
    placeholder: "170",
    min: 0,
    max: 300,
  },
  {
    key: "bloodGlucose",
    label: "Blood Glucose",
    unit: "mg/dL",
    icon: Gauge,
    color: "text-violet-500",
    bgColor: "bg-violet-50",
    placeholder: "100",
    min: 0,
    max: 700,
  },
  {
    key: "painLevel",
    label: "Pain Level",
    unit: "/ 10",
    icon: AlertCircle,
    color: "text-orange-500",
    bgColor: "bg-orange-50",
    placeholder: "0",
    min: 0,
    max: 10,
  },
];

function getVitalStatus(key: string, value: number | null | undefined) {
  if (value == null) return { status: "normal" as const, label: "" };

  const ranges: Record<string, { low: number; high: number; critical_low?: number; critical_high?: number }> = {
    bloodPressureSystolic: { low: 90, high: 140, critical_low: 70, critical_high: 180 },
    bloodPressureDiastolic: { low: 60, high: 90, critical_low: 40, critical_high: 120 },
    heartRate: { low: 60, high: 100, critical_low: 40, critical_high: 150 },
    temperature: { low: 36.1, high: 37.5, critical_low: 35, critical_high: 39 },
    oxygenSaturation: { low: 95, high: 100, critical_low: 90, critical_high: 101 },
    respiratoryRate: { low: 12, high: 20, critical_low: 8, critical_high: 30 },
  };

  const range = ranges[key];
  if (!range) return { status: "normal" as const, label: "" };

  if (range.critical_low && value < range.critical_low)
    return { status: "critical" as const, label: "Critical" };
  if (range.critical_high && value > range.critical_high)
    return { status: "critical" as const, label: "Critical" };
  if (value < range.low) return { status: "warning" as const, label: "Low" };
  if (value > range.high) return { status: "warning" as const, label: "High" };
  return { status: "normal" as const, label: "Normal" };
}

export default function VisitPage() {
  const params = useParams();
  const router = useRouter();
  const visitId = params.id as string;

  const { data: visit, mutate } = useSWR(`/api/visits/${visitId}`, fetcher);

  const [saving, setSaving] = useState(false);
  const [savingVitals, setSavingVitals] = useState(false);
  const [vitalSigns, setVitalSigns] = useState<VitalSigns>({});
  const [vitalsInitialized, setVitalsInitialized] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Initialize vitals from loaded visit data
  if (visit && !vitalsInitialized) {
    setVitalSigns(visit.vitalSigns || {});
    setVitalsInitialized(true);
  }

  const showMsg = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  if (!visit)
    return (
      <div className="space-y-4 p-8">
        <p className="page-title text-xl">Loading visit…</p>
        <p className="page-subtitle">Fetching visit details and vitals.</p>
      </div>
    );

  const updateVisit = async (field: string, value: string) => {
    setSaving(true);
    await fetch(`/api/visits/${visitId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    await mutate();
    setSaving(false);
  };

  const saveVitalSigns = async () => {
    setSavingVitals(true);
    try {
      // Clean null/undefined values
      const cleanVitals: Record<string, number | null> = {};
      for (const field of VITAL_FIELDS) {
        const val = vitalSigns[field.key as keyof VitalSigns];
        cleanVitals[field.key] = val != null && val !== (0 as never) ? Number(val) : null;
      }

      const res = await fetch(`/api/visits/${visitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vitalSigns: cleanVitals }),
      });

      if (res.ok) {
        await mutate();
        showMsg("success", "Vital signs saved successfully.");
      } else {
        showMsg("error", "Failed to save vital signs.");
      }
    } catch {
      showMsg("error", "Failed to save vital signs.");
    } finally {
      setSavingVitals(false);
    }
  };

  const completeVisit = async () => {
    setSaving(true);
    await fetch(`/api/visits/${visitId}/complete`, {
      method: "PATCH",
    });
    router.push("/visits");
  };

  const handleVitalChange = (key: string, value: string) => {
    setVitalSigns((prev) => ({
      ...prev,
      [key]: value === "" ? null : Number(value),
    }));
  };

  // Calculate BMI display
  const bmi =
    vitalSigns.weight && vitalSigns.height
      ? Math.round(
          (vitalSigns.weight / ((vitalSigns.height / 100) * (vitalSigns.height / 100))) * 10
        ) / 10
      : null;

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">
            <Stethoscope className="h-6 w-6 text-sky-500" />
            <span>Patient Visit</span>
          </h1>
          <p className="page-subtitle mt-1">
            Record diagnosis, vitals, and treatment details.
          </p>
        </div>
        <button
          onClick={() => router.back()}
          className="btn-secondary"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-medium ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Patient Info Card */}
      <div className="card">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
            <User className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-900">
              {visit.patient?.firstName} {visit.patient?.lastName}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-slate-500">
              {visit.doctor && (
                <span>
                  <span className="font-medium text-slate-700">Doctor:</span>{" "}
                  {visit.doctor?.name}
                </span>
              )}
              {visit.appointment?.status && (
                <span className="flex items-center gap-1.5">
                  <span className="font-medium text-slate-700">Status:</span>
                  <AppointmentStatusBadge
                    status={
                      normalizeAppointmentStatus(visit.appointment.status) ||
                      "scheduled"
                    }
                  />
                </span>
              )}
              {visit.completed && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" />
                  Completed
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Vital Signs */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Heart className="h-5 w-5 text-rose-500" />
            Vital Signs
          </h2>
          <button
            onClick={saveVitalSigns}
            disabled={savingVitals || visit.completed}
            className="btn-primary"
          >
            <Save className="h-4 w-4" />
            {savingVitals ? "Saving…" : "Save Vitals"}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {VITAL_FIELDS.map((field) => {
            const Icon = field.icon;
            const value = vitalSigns[field.key as keyof VitalSigns];
            const vitalStatus = getVitalStatus(field.key, value);

            return (
              <div
                key={field.key}
                className={`relative rounded-xl border p-3 transition-colors ${
                  vitalStatus.status === "critical"
                    ? "border-rose-300 bg-rose-50"
                    : vitalStatus.status === "warning"
                    ? "border-amber-300 bg-amber-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-lg ${field.bgColor}`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${field.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 truncate">
                      {field.label}
                    </p>
                  </div>
                </div>
                <div className="flex items-end gap-1">
                  <input
                    type="number"
                    className="w-full rounded-lg border border-slate-200 bg-white/80 px-2 py-1.5 text-sm font-semibold text-slate-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200 disabled:opacity-50"
                    placeholder={field.placeholder}
                    min={field.min}
                    max={field.max}
                    step={field.step || 1}
                    value={value ?? ""}
                    onChange={(e) => handleVitalChange(field.key, e.target.value)}
                    disabled={visit.completed}
                  />
                  <span className="shrink-0 text-[10px] font-medium text-slate-400 pb-1.5">
                    {field.unit}
                  </span>
                </div>
                {vitalStatus.label && (
                  <span
                    className={`absolute top-2 right-2 text-[9px] font-bold uppercase ${
                      vitalStatus.status === "critical"
                        ? "text-rose-600"
                        : "text-amber-600"
                    }`}
                  >
                    {vitalStatus.label}
                  </span>
                )}
              </div>
            );
          })}

          {/* BMI (auto-calculated, display only) */}
          {bmi && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100">
                  <Scale className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  BMI
                </p>
              </div>
              <p className="text-lg font-bold text-emerald-700">{bmi}</p>
              <p className="text-[10px] text-emerald-600">
                {bmi < 18.5
                  ? "Underweight"
                  : bmi < 25
                  ? "Normal"
                  : bmi < 30
                  ? "Overweight"
                  : "Obese"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Diagnosis */}
      <div className="card">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 mb-3">
          <FileText className="h-5 w-5 text-sky-500" />
          Diagnosis
        </h2>
        <textarea
          className="input min-h-[100px] w-full resize-y"
          placeholder="Enter diagnosis details…"
          defaultValue={visit.diagnosis}
          onBlur={(e) => updateVisit("diagnosis", e.target.value)}
          disabled={visit.completed}
        />
      </div>

      {/* Prescription */}
      <div className="card">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 mb-3">
          <Clipboard className="h-5 w-5 text-emerald-500" />
          Prescription
        </h2>
        <textarea
          className="input min-h-[100px] w-full resize-y"
          placeholder="Enter prescription…"
          defaultValue={visit.prescription}
          onBlur={(e) => updateVisit("prescription", e.target.value)}
          disabled={visit.completed}
        />
      </div>

      {/* Notes */}
      <div className="card">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 mb-3">
          <FileText className="h-5 w-5 text-violet-500" />
          Clinical Notes
        </h2>
        <textarea
          className="input min-h-[100px] w-full resize-y"
          placeholder="Additional notes…"
          defaultValue={visit.notes}
          onBlur={(e) => updateVisit("notes", e.target.value)}
          disabled={visit.completed}
        />
      </div>

      {/* Actions */}
      {!visit.completed && (
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={completeVisit}
            className="btn-primary"
            disabled={saving}
          >
            <CheckCircle2 className="h-4 w-4" />
            {saving ? "Completing…" : "Complete Visit"}
          </button>
        </div>
      )}
    </div>
  );
}