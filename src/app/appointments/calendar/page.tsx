"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useEffect, useState } from "react";

export default function AppointmentCalendar() {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    const res = await fetch("/api/appointments");
    const data = await res.json();

    const formatted = data.appointments.map((appt: any) => ({
      id: appt._id,
      title: appt.patient?.name || "Appointment",
      start: appt.date,
      backgroundColor:
        appt.status === "Completed"
          ? "#16a34a"
          : "#eab308",
    }));

    setEvents(formatted);
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        events={events}
        selectable={true}
        select={(info) => {
          alert(`Create appointment at ${info.startStr}`);
        }}
      />
    </div>
  );
}
