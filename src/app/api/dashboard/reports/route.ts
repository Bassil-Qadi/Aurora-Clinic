import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Appointment from "@/models/Appointment";
import Visit from "@/models/Visit";
import Patient from "@/models/Patient";
import { User } from "@/models/User";
import { requireAuth } from "@/lib/apiAuth";

export async function GET(req: Request) {
  const auth = await requireAuth(["admin", "doctor"]);
  if (!auth.success) return auth.response;
  const { user } = auth;

  await connectDB();

  const url = new URL(req.url);
  const period = url.searchParams.get("period") || "30"; // days
  const type = url.searchParams.get("type") || "overview";

  const daysAgo = parseInt(period);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysAgo);
  startDate.setHours(0, 0, 0, 0);

  const clinicFilter = { clinicId: user.clinicId };
  const dateFilter = { ...clinicFilter, createdAt: { $gte: startDate } };

  if (type === "overview") {
    const [
      totalPatients,
      newPatients,
      totalAppointments,
      completedVisits,
      cancelledAppointments,
      noShowAppointments,
      appointmentsByStatus,
      appointmentsByDoctor,
      visitsByDoctor,
      appointmentsByDay,
      patientsByGender,
      patientsByAge,
    ] = await Promise.all([
      Patient.countDocuments(clinicFilter),
      Patient.countDocuments({ ...clinicFilter, createdAt: { $gte: startDate } }),
      Appointment.countDocuments({ ...clinicFilter, date: { $gte: startDate } }),
      Visit.countDocuments({ ...clinicFilter, completed: true, createdAt: { $gte: startDate } }),
      Appointment.countDocuments({
        ...clinicFilter,
        status: "cancelled",
        date: { $gte: startDate },
      }),
      Appointment.countDocuments({
        ...clinicFilter,
        status: "no_show",
        date: { $gte: startDate },
      }),
      // Appointments by status
      Appointment.aggregate([
        { $match: { ...clinicFilter, date: { $gte: startDate } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      // Appointments by doctor
      Appointment.aggregate([
        { $match: { ...clinicFilter, date: { $gte: startDate }, doctor: { $exists: true } } },
        { $group: { _id: "$doctor", count: { $sum: 1 } } },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "doctorInfo",
          },
        },
        { $unwind: { path: "$doctorInfo", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            name: { $ifNull: ["$doctorInfo.name", "Unassigned"] },
            count: 1,
          },
        },
        { $sort: { count: -1 } },
      ]),
      // Visits by doctor
      Visit.aggregate([
        { $match: { ...clinicFilter, createdAt: { $gte: startDate } } },
        { $group: { _id: "$doctor", count: { $sum: 1 } } },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "doctorInfo",
          },
        },
        { $unwind: { path: "$doctorInfo", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            name: { $ifNull: ["$doctorInfo.name", "Unassigned"] },
            count: 1,
          },
        },
        { $sort: { count: -1 } },
      ]),
      // Appointments by day of week
      Appointment.aggregate([
        { $match: { ...clinicFilter, date: { $gte: startDate } } },
        {
          $group: {
            _id: { $dayOfWeek: "$date" },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      // Patients by gender
      Patient.aggregate([
        { $match: clinicFilter },
        { $group: { _id: "$gender", count: { $sum: 1 } } },
      ]),
      // Patients by age range
      Patient.aggregate([
        { $match: clinicFilter },
        {
          $project: {
            age: {
              $floor: {
                $divide: [
                  { $subtract: [new Date(), "$dateOfBirth"] },
                  365.25 * 24 * 60 * 60 * 1000,
                ],
              },
            },
          },
        },
        {
          $bucket: {
            groupBy: "$age",
            boundaries: [0, 18, 30, 45, 60, 75, 120],
            default: "Other",
            output: { count: { $sum: 1 } },
          },
        },
      ]),
    ]);

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const appointmentsByDayFormatted = appointmentsByDay.map((d: any) => ({
      day: dayNames[d._id - 1] || "?",
      count: d.count,
    }));

    const ageLabels: Record<string, string> = {
      "0": "0–17",
      "18": "18–29",
      "30": "30–44",
      "45": "45–59",
      "60": "60–74",
      "75": "75+",
    };
    const patientsByAgeFormatted = patientsByAge.map((a: any) => ({
      range: ageLabels[String(a._id)] || String(a._id),
      count: a.count,
    }));

    return NextResponse.json({
      summary: {
        totalPatients,
        newPatients,
        totalAppointments,
        completedVisits,
        cancelledAppointments,
        noShowAppointments,
        completionRate:
          totalAppointments > 0
            ? Math.round((completedVisits / totalAppointments) * 100)
            : 0,
        cancellationRate:
          totalAppointments > 0
            ? Math.round((cancelledAppointments / totalAppointments) * 100)
            : 0,
      },
      appointmentsByStatus,
      appointmentsByDoctor,
      visitsByDoctor,
      appointmentsByDay: appointmentsByDayFormatted,
      patientsByGender,
      patientsByAge: patientsByAgeFormatted,
    });
  }

  // ─── Custom report type ──────────────────────────────────
  if (type === "custom") {
    const reportName = url.searchParams.get("report"); // appointmentList, visitList, patientList
    const doctorId = url.searchParams.get("doctorId");
    const startStr = url.searchParams.get("startDate");
    const endStr = url.searchParams.get("endDate");
    const status = url.searchParams.get("status");

    const from = startStr ? new Date(startStr) : startDate;
    const to = endStr ? new Date(endStr) : new Date();
    to.setHours(23, 59, 59, 999);

    switch (reportName) {
      case "appointmentList": {
        const query: any = {
          ...clinicFilter,
          date: { $gte: from, $lte: to },
        };
        if (doctorId) query.doctor = doctorId;
        if (status) query.status = status;

        const appointments = await Appointment.find(query)
          .populate("patient", "firstName lastName phone")
          .populate("doctor", "name")
          .sort({ date: -1 })
          .lean();

        return NextResponse.json({ report: "appointmentList", rows: appointments });
      }

      case "visitList": {
        const query: any = {
          ...clinicFilter,
          createdAt: { $gte: from, $lte: to },
        };
        if (doctorId) query.doctor = doctorId;

        const visits = await Visit.find(query)
          .populate("patient", "firstName lastName")
          .populate("doctor", "name")
          .sort({ createdAt: -1 })
          .lean();

        return NextResponse.json({ report: "visitList", rows: visits });
      }

      case "patientList": {
        const query: any = {
          ...clinicFilter,
          createdAt: { $gte: from, $lte: to },
        };

        const patients = await Patient.find(query)
          .select("firstName lastName phone email gender dateOfBirth createdAt")
          .sort({ createdAt: -1 })
          .lean();

        return NextResponse.json({ report: "patientList", rows: patients });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid report name. Use "appointmentList", "visitList", or "patientList".' },
          { status: 400 }
        );
    }
  }

  return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
}
