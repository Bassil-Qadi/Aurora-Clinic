"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AppointmentCalendar() {
  const [events, setEvents] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [patientId, setPatientId] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const createAppointment = async () => {
    await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient: patientId,
        date: selectedDate,
        status: "Scheduled",
      }),
    });
  
    setShowModal(false);
    fetchAppointments();
  };  

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
        editable={true}
        select={(info) => {
          setSelectedDate(info.startStr);
          setShowModal(true);
        }}
        eventClick={(info) => {
          setSelectedEvent(info.event);
          setShowEditModal(true);
        }}
        eventDrop={async (info) => {
          await fetch(`/api/appointments/${info.event.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              date: info.event.start,
            }),
          });
        
          fetchAppointments();
        }}
      />
      <Dialog open={showModal} onOpenChange={setShowModal}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Create Appointment</DialogTitle>
    </DialogHeader>

    <Input
      placeholder="Patient ID"
      value={patientId}
      onChange={(e) => setPatientId(e.target.value)}
    />

    <Button onClick={createAppointment}>
      Save Appointment
    </Button>
  </DialogContent>
</Dialog>
    </div>
  );
}
