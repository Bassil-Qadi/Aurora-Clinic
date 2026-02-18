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

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";

export default function AppointmentCalendar() {
  const [events, setEvents] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);


  const createAppointment = async () => {
    if (!selectedPatient || !selectedDoctor)
      return alert("Select patient and doctor");

    await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient: selectedPatient._id,
        doctor: selectedDoctor._id,
        date: selectedDate,
        status: "scheduled",
      }),
    });

    setShowModal(false);
    setSelectedPatient(null);
    setSelectedDoctor(null);
    fetchAppointments();
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    const res = await fetch("/api/patients?limit=100");
    const data = await res.json();
    setPatients(data.patients);
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    const res = await fetch("/api/users?role=doctor");
    const data = await res.json();
    console.log("data", data);
    setDoctors(data.users);
  };


  const fetchAppointments = async () => {
    const res = await fetch("/api/appointments");
    const data = await res.json();
  
    const formatted = data.appointments.map((appt: any) => ({
      id: appt._id,
      title: `${appt.patient?.firstName} - Dr. ${appt.doctor?.firstName}`,
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
          setSelectedPatient(null);
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
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                {selectedPatient
                  ? `${selectedPatient.firstName} ${selectedPatient.lastName}`
                  : "Select patient..."}
              </Button>
            </PopoverTrigger>

            <PopoverContent className="p-0">
              <Command shouldFilter={true}>
                <CommandInput placeholder="Search patient..." />
                <CommandEmpty>No patient found.</CommandEmpty>
                <CommandGroup>
                  {patients.map((patient) => {
                    const fullName = `${patient.firstName} ${patient.lastName}`;
                    return (
                      <CommandItem
                        key={patient._id}
                        value={fullName.toLowerCase()}
                        onSelect={() => {
                          setSelectedPatient(patient);
                          setOpen(false);
                        }}
                      >
                        {fullName}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start mt-2">
                {selectedDoctor?.name || "Select doctor..."}
              </Button>
            </PopoverTrigger>

            <PopoverContent className="p-0">
              <Command>
                <CommandInput placeholder="Search doctor..." />
                <CommandEmpty>No doctor found.</CommandEmpty>
                <CommandGroup>
                  {doctors.map((doctor) => (
                    <CommandItem
                      key={doctor._id}
                      value={doctor.name?.toLowerCase()}
                      onSelect={() => {
                        setSelectedDoctor(doctor);
                      }}
                    >
                      {doctor.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>

          <Button
            onClick={createAppointment}
            disabled={!selectedPatient}
          >
            Save Appointment
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
