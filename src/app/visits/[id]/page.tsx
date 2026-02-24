"use client";

import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { useState } from "react";
import { AppointmentStatusBadge } from "@/components/AppointmentStatusBadge";
import { normalizeAppointmentStatus } from "@/lib/appointmentStatus";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function VisitPage() {
  const params = useParams();
  const router = useRouter();
  const visitId = params.id as string;

  const { data: visit, mutate } = useSWR(
    `/api/visits/${visitId}`,
    fetcher
  );

  const [saving, setSaving] = useState(false);

  if (!visit) return <div>Loading visit...</div>;

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

  const completeVisit = async () => {
    setSaving(true);

    await fetch(`/api/visits/${visitId}/complete`, {
      method: "PATCH",
    });

    router.push("/visits");
  };

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-xl font-semibold">Patient Visit</h1>

      {/* Patient Info */}
      <div className="card">
        <p>
          <strong>Patient:</strong>{" "}
          {visit.patient?.firstName} {visit.patient?.lastName}
        </p>
        <p>
          <strong>Doctor:</strong> {visit.doctor?.name}
        </p>
        {visit.appointment?.status && (
          <p className="mt-2 flex items-center gap-2 text-sm">
            <span className="font-medium">Appointment status:</span>
            <AppointmentStatusBadge
              status={normalizeAppointmentStatus(visit.appointment.status) || "scheduled"}
            />
          </p>
        )}
      </div>

      {/* Diagnosis */}
      <div className="card">
        <label className="text-sm font-medium">Diagnosis</label>
        <textarea
          className="input mt-2 w-full"
          defaultValue={visit.diagnosis}
          onBlur={(e) => updateVisit("diagnosis", e.target.value)}
        />
      </div>

      {/* Prescription */}
      <div className="card">
        <label className="text-sm font-medium">Prescription</label>
        <textarea
          className="input mt-2 w-full"
          defaultValue={visit.prescription}
          onBlur={(e) => updateVisit("prescription", e.target.value)}
        />
      </div>

      {/* Notes */}
      <div className="card">
        <label className="text-sm font-medium">Notes</label>
        <textarea
          className="input mt-2 w-full"
          defaultValue={visit.notes}
          onBlur={(e) => updateVisit("notes", e.target.value)}
        />
      </div>

      {/* Finish Visit */}
      <div className="flex gap-4">
        <button
          onClick={completeVisit}
          className="btn btn-primary"
          disabled={saving}
        >
          Complete Visit
        </button>

        <button
          onClick={() => router.push("/dashboard/appointments")}
          className="btn"
        >
          Back
        </button>
      </div>
    </div>
  );
}