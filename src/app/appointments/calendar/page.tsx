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
import {
  AppointmentStatus,
  normalizeAppointmentStatus,
} from "@/lib/appointmentStatus";
import { useI18n } from "@/lib/i18n";
import { Breadcrumb } from "@/components/Breadcrumb";

function getStatusColor(status: string | null | undefined): string {
  const normalized = normalizeAppointmentStatus(status) ?? "scheduled";

  switch (normalized as AppointmentStatus) {
    case "scheduled":
      // Gray
      return "#9ca3af";
    case "waiting":
      // Yellow
      return "#eab308";
    case "in_progress":
      // Blue
      return "#3b82f6";
    case "completed":
      // Green
      return "#16a34a";
    case "cancelled":
      // Red
      return "#ef4444";
    case "no_show":
      // Orange
      return "#fb923c";
    default:
      return "#9ca3af";
  }
}

export default function AppointmentCalendar() {
  const { t } = useI18n();
  const [events, setEvents] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [open, setOpen] = useState(false);
  const [doctorsMenuOpen, setDoctorMenuOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [filterDoctor, setFilterDoctor] = useState<string>("all");


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
  }, [filterDoctor]);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    const res = await fetch("/api/users?role=doctor");
    const data = await res.json();
    setDoctors(data.users);
  };


  const fetchAppointments = async () => {
    let url = "/api/appointments";

    if (filterDoctor !== "all") {
      url += `?doctor=${filterDoctor}`;
    }

    const res = await fetch(url);
    const data = await res.json();

    const formatted = data.appointments.map((appt: any) => ({
      id: appt._id,
      title: `${appt.patient?.name || `${appt.patient?.firstName ?? ""} ${appt.patient?.lastName ?? ""}`.trim()}${appt.doctor ? ` - Dr. ${appt.doctor?.name}` : ""}`,
      start: appt.date,
      backgroundColor: getStatusColor(appt.status),
    }));

    setEvents(formatted);
  };


  return (
    <div className="space-y-6 p-8">
      <Breadcrumb
        items={[
          { label: t("nav.appointments"), href: "/appointments" },
          { label: t("nav.calendar") },
        ]}
      />
      <div className="bg-white p-6 rounded-2xl shadow-sm dark:bg-slate-900">
        <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold dark:text-slate-100">{t("calendar.title")}</h2>

        <select
          className="border rounded-lg px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          value={filterDoctor}
          onChange={(e) => setFilterDoctor(e.target.value)}
        >
          <option value="all">{t("calendar.allDoctors")}</option>
          {doctors.map((doctor) => (
            <option key={doctor._id} value={doctor._id}>
              {t("common.dr")} {doctor.name}
            </option>
          ))}
        </select>
      </div>
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
        <DialogContent aria-describedby="create-appointment-content">
          <DialogHeader>
            <DialogTitle>{t("calendar.createAppointment")}</DialogTitle>
          </DialogHeader>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                {selectedPatient
                  ? `${selectedPatient.firstName} ${selectedPatient.lastName}`
                  : t("appointments.selectPatient")}
              </Button>
            </PopoverTrigger>

            <PopoverContent className="p-0">
              <Command shouldFilter={true}>
                <CommandInput placeholder={t("calendar.searchPatients")} />
                <CommandEmpty>{t("calendar.noPatientFound")}</CommandEmpty>
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

          <Popover open={doctorsMenuOpen} onOpenChange={setDoctorMenuOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start mt-2">
                {selectedDoctor?.name || t("appointments.selectDoctor")}
              </Button>
            </PopoverTrigger>

            <PopoverContent className="p-0">
              <Command>
                <CommandInput placeholder={t("calendar.searchDoctors")} />
                <CommandEmpty>{t("calendar.noDoctorFound")}</CommandEmpty>
                <CommandGroup>
                  {doctors.map((doctor) => (
                    <CommandItem
                      key={doctor._id}
                      value={doctor.name?.toLowerCase()}
                      onSelect={() => {
                        setSelectedDoctor(doctor);
                        setDoctorMenuOpen(false);
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
            {t("common.save")}
          </Button>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
