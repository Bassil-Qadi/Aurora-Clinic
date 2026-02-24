"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarPlus,
  Stethoscope,
  Clock,
  FileText,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";

export default function BookAppointmentPage() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/portal/doctors")
      .then((r) => r.json())
      .then((data) => setDoctors(data.doctors || []));
  }, []);

  // Generate time slots
  const timeSlots = [];
  for (let h = 9; h < 17; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hour = h.toString().padStart(2, "0");
      const min = m.toString().padStart(2, "0");
      timeSlots.push(`${hour}:${min}`);
    }
  }

  // Get minimum date (today)
  const today = new Date().toISOString().split("T")[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!date || !time) {
      setError("Please select a date and time.");
      return;
    }

    setLoading(true);

    try {
      const dateTime = new Date(`${date}T${time}:00`);

      const res = await fetch("/api/portal/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: dateTime.toISOString(),
          reason,
          doctor: selectedDoctor || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data.error || "Failed to book appointment.");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-6 p-8">
        <div className="card max-w-lg mx-auto text-center space-y-4 py-10">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 mx-auto">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900">
            Appointment Booked!
          </h2>
          <p className="text-sm text-slate-500">
            Your appointment has been scheduled. You&apos;ll receive a
            confirmation and reminders.
          </p>
          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              onClick={() => router.push("/portal/dashboard")}
              className="btn-secondary"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </button>
            <button
              onClick={() => {
                setSuccess(false);
                setDate("");
                setTime("");
                setReason("");
                setSelectedDoctor("");
              }}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg"
            >
              <CalendarPlus className="h-4 w-4" />
              Book Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="page-title">
          <CalendarPlus className="h-6 w-6 text-emerald-500" />
          <span>Book an Appointment</span>
        </h1>
        <p className="page-subtitle mt-1">
          Choose your preferred doctor, date, and time.
        </p>
      </div>

      <div className="card max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {/* Doctor */}
          <div>
            <label className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-600">
              <Stethoscope className="h-3 w-3 text-emerald-500" />
              Doctor (optional)
            </label>
            <select
              className="input"
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
            >
              <option value="">Any available doctor</option>
              {doctors.map((doc) => (
                <option key={doc._id} value={doc._id}>
                  Dr. {doc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-600">
                <Clock className="h-3 w-3 text-emerald-500" />
                Date
              </label>
              <input
                className="input"
                type="date"
                min={today}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-600">
                <Clock className="h-3 w-3 text-emerald-500" />
                Time
              </label>
              <select
                className="input"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              >
                <option value="">Select time…</option>
                {timeSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-600">
              <FileText className="h-3 w-3 text-emerald-500" />
              Reason for Visit (optional)
            </label>
            <textarea
              className="input min-h-[100px] resize-y"
              placeholder="Describe your symptoms or reason for the visit…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => router.push("/portal/dashboard")}
              className="btn-secondary"
            >
              <ArrowLeft className="h-4 w-4" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !date || !time}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:from-emerald-600 hover:to-teal-600 disabled:opacity-60"
            >
              <CalendarPlus className="h-4 w-4" />
              {loading ? "Booking…" : "Book Appointment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
