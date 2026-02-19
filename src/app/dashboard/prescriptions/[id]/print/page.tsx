"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function PrintPrescription() {
  const { id } = useParams();
  const [prescription, setPrescription] = useState<any>(null);
  const [clinic, setClinic] = useState<any>(null);

  useEffect(() => {
    fetch("/api/clinic")
      .then(res => res.json())
      .then(data => setClinic(data));
  }, []);

  useEffect(() => {
    fetch(`/api/prescriptions/${id}`)
      .then(res => res.json())
      .then(data => setPrescription(data));
  }, [id]);

  useEffect(() => {
    if (prescription) {
      setTimeout(() => window.print(), 500);
    }
  }, [prescription]);

  if (!prescription) return null;

  return (
    <div className="p-10 max-w-3xl mx-auto print:p-0">

      {/* Clinic Header */}
      <div className="text-center mb-6 border-b pb-4">
        {clinic?.logo && (
          <img
            src={clinic.logo}
            alt="Clinic Logo"
            className="h-16 mx-auto mb-2"
          />
        )}

        <h1 className="text-2xl font-bold">{clinic?.name}</h1>
        <p className="text-sm">
          {clinic?.address}
        </p>
        <p className="text-sm">
          {clinic?.phone} | {clinic?.email}
        </p>
      </div>


      {/* Patient Info */}
      <div className="mb-6 text-sm">
        <p><strong>Patient:</strong> {prescription.patient.firstName} {prescription.patient.lastName}</p>
        <p><strong>Date:</strong> {new Date(prescription.createdAt).toLocaleDateString()}</p>
      </div>

      {/* Medications */}
      <div className="mb-8">
        {prescription.medications.map((m: any, i: number) => (
          <div key={i} className="mb-3">
            <p className="font-semibold">{m.name}</p>
            <p className="text-sm">
              {m.dosage} | {m.frequency} | {m.duration}
            </p>
          </div>
        ))}
      </div>

      {/* Notes */}
      {prescription.notes && (
        <div className="mb-8 text-sm">
          <strong>Notes:</strong>
          <p>{prescription.notes}</p>
        </div>
      )}

      {/* Doctor Signature */}
      <div className="mt-16 text-right">
        {prescription.doctor.signature && (
          <img
            src={prescription.doctor.signature}
            alt="Signature"
            className="h-16 ml-auto mb-2"
          />
        )}

        <p className="text-sm font-semibold">
          Dr. {prescription.doctor.name}
        </p>
      </div>

    </div>
  );
}
