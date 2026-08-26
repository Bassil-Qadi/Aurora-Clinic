import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDB } from "./db";
import Clinic from "../models/Clinic";
import { User } from "../models/User";
import Patient from "../models/Patient";
import Appointment from "../models/Appointment";
import Visit from "../models/Visit";

/**
 * Seeds a self-contained demo clinic used for marketing screenshots.
 *
 *   npm run demo:seed     — create (or recreate) the demo clinic
 *   npm run demo:clear    — remove it and everything attached to it
 *
 * Everything is scoped to a clinic with the slug below, so teardown is exact:
 * nothing outside that clinic is ever touched. Do not point this at a database
 * where the slug might collide with a real clinic.
 */
const DEMO_SLUG = "demo-screenshots";

export const DEMO_ADMIN_EMAIL = "demo.admin@aurora-demo.invalid";
export const DEMO_ADMIN_PASSWORD = "DemoScreens!2026";

const DOCTORS = [
  { name: "ليلى الحمصي", email: "demo.doc1@aurora-demo.invalid" },
  { name: "عمر الفاروق", email: "demo.doc2@aurora-demo.invalid" },
  { name: "رنا الخطيب", email: "demo.doc3@aurora-demo.invalid" },
];

const FIRST_M = ["أحمد", "محمد", "خالد", "يوسف", "عمر", "سامي", "طارق", "زياد", "بشار", "نادر", "فادي", "مروان"];
const FIRST_F = ["سارة", "ليلى", "نور", "هدى", "ريم", "مها", "دينا", "ياسمين", "لمى", "رغد", "سلمى", "جمانة"];
const LAST = ["العلي", "الحسن", "الخطيب", "درويش", "الشامي", "قاسم", "الحاج", "زيدان", "المصري", "عبد الله", "سليمان", "الناصر"];

const REASONS = [
  "فحص دوري",
  "متابعة ضغط الدم",
  "ألم في الظهر",
  "استشارة جلدية",
  "تحاليل مخبرية",
  "متابعة السكري",
  "صداع متكرر",
  "فحص ما قبل السفر",
];

const DIAGNOSES = [
  "التهاب الجيوب الأنفية",
  "ارتفاع ضغط الدم — مستقر",
  "فقر دم بعوز الحديد",
  "التهاب المفاصل الخفيف",
  "حساسية موسمية",
  "ارتجاع مريئي",
  "الصداع النصفي",
];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

/** Deterministic pseudo-random so repeated seeds produce the same screenshots. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

/** Midnight-anchored date N days from today. */
function dayOffset(days: number, hour = 9, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

export async function clearDemo() {
  await connectDB();

  const clinic = await Clinic.findOne({ slug: DEMO_SLUG });
  if (!clinic) {
    console.log("ℹ️  No demo clinic found — nothing to remove.");
    return;
  }

  const clinicId = clinic._id;

  const results = await Promise.all([
    Visit.deleteMany({ clinicId }),
    Appointment.deleteMany({ clinicId }),
    Patient.deleteMany({ clinicId }),
    User.deleteMany({ clinicId }),
  ]);

  await Clinic.deleteOne({ _id: clinicId });

  console.log(
    `🧹 Removed demo clinic — visits: ${results[0].deletedCount}, ` +
      `appointments: ${results[1].deletedCount}, patients: ${results[2].deletedCount}, ` +
      `users: ${results[3].deletedCount}`
  );
}

export async function seedDemo() {
  await connectDB();

  // Start clean so re-running never doubles the data.
  await clearDemo();

  const rand = rng(20260826);

  // ── Clinic ────────────────────────────────────────────
  const clinic = await Clinic.create({
    name: "مركز النور الطبي",
    slug: DEMO_SLUG,
    address: "شارع الملكة رانيا، عمّان",
    phone: "+962 6 555 0110",
    email: "info@aurora-demo.invalid",
    isActive: true,
    subscriptionStatus: "active",
    settings: {
      workingHours: { start: "09:00", end: "17:00" },
      workingDays: [0, 1, 2, 3, 4],
      appointmentDuration: 30,
      currency: "JOD",
      timezone: "Asia/Amman",
    },
  });

  const clinicId = clinic._id;
  const passwordHash = await bcrypt.hash(DEMO_ADMIN_PASSWORD, 10);

  // ── Staff ─────────────────────────────────────────────
  const admin = await User.create({
    clinicId,
    name: "أحمد العلي",
    email: DEMO_ADMIN_EMAIL,
    passwordHash,
    role: "admin",
    isActive: true,
  });

  const doctors = await User.create(
    DOCTORS.map((d) => ({
      clinicId,
      name: d.name,
      email: d.email,
      passwordHash,
      role: "doctor",
      isActive: true,
    }))
  );

  // ── Patients ──────────────────────────────────────────
  // Ages are spread deliberately so the demographics chart has real buckets.
  const AGE_BANDS = [8, 15, 22, 28, 34, 41, 47, 53, 59, 64, 71, 78];

  const patientDocs = Array.from({ length: 48 }, (_, i) => {
    const isMale = i % 2 === 0;
    const first = isMale ? pick(FIRST_M, i) : pick(FIRST_F, i + 3);
    const age = pick(AGE_BANDS, Math.floor(rand() * AGE_BANDS.length));
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - age);
    dob.setMonth(Math.floor(rand() * 12));

    return {
      clinicId,
      firstName: first,
      lastName: pick(LAST, i * 5 + 1),
      dateOfBirth: dob,
      gender: isMale ? "male" : "female",
      phone: `+9627${String(90000000 + i * 137).slice(0, 8)}`,
      email: `patient${i + 1}@aurora-demo.invalid`,
    };
  });

  const patients = await Patient.create(patientDocs);

  // ── Appointments ──────────────────────────────────────
  const appointments: Record<string, unknown>[] = [];

  // Past 30 days: a realistic status mix so the analytics charts have shape.
  const PAST_STATUS = [
    "completed", "completed", "completed", "completed", "completed",
    "completed", "completed", "completed", "cancelled", "no_show",
  ];

  for (let d = 30; d >= 1; d--) {
    const date = dayOffset(-d);
    // Fridays are quiet; the clinic works Sun–Thu.
    if (date.getDay() === 5) continue;

    const perDay = 3 + Math.floor(rand() * 4);
    for (let n = 0; n < perDay; n++) {
      const hour = 9 + Math.floor(rand() * 8);
      const minute = rand() > 0.5 ? 30 : 0;
      appointments.push({
        clinicId,
        patient: patients[Math.floor(rand() * patients.length)]._id,
        doctor: doctors[Math.floor(rand() * doctors.length)]._id,
        date: dayOffset(-d, hour, minute),
        type: rand() > 0.85 ? "video" : "in_person",
        reason: pick(REASONS, Math.floor(rand() * REASONS.length)),
        status: pick(PAST_STATUS, Math.floor(rand() * PAST_STATUS.length)),
      });
    }
  }

  // Current week: this is what the calendar screenshot shows, so fill business
  // hours densely enough to look like a working clinic.
  const today = new Date();
  const startOfWeek = -today.getDay(); // Sunday

  for (let offset = startOfWeek; offset < startOfWeek + 7; offset++) {
    const date = dayOffset(offset);
    if (date.getDay() === 5 || date.getDay() === 6) continue;

    // 09:00 → 16:30 in 30-minute slots, three doctors in parallel.
    for (let slot = 0; slot < 15; slot++) {
      const hour = 9 + Math.floor(slot / 2);
      const minute = slot % 2 === 0 ? 0 : 30;

      doctors.forEach((doc: { _id: unknown }, di: number) => {
        // Leave generous gaps: a wall-to-wall grid is unreadable, and event
        // labels need room to show the patient name.
        if (rand() > 0.26) return;

        const when = dayOffset(offset, hour, minute);
        let status = "scheduled";
        if (when < new Date()) {
          status = rand() > 0.07 ? "completed" : "no_show";
        } else if (offset === 0 && rand() > 0.7) {
          status = "waiting";
        }

        appointments.push({
          clinicId,
          patient: patients[Math.floor(rand() * patients.length)]._id,
          doctor: doc._id,
          date: when,
          type: rand() > 0.88 ? "video" : "in_person",
          reason: pick(REASONS, slot + di),
          status,
        });
      });
    }
  }

  const createdAppointments = await Appointment.create(appointments);

  // ── Visits ────────────────────────────────────────────
  // One visit per completed appointment, with vitals so the record looks real.
  const completed = createdAppointments.filter(
    (a: { status: string }) => a.status === "completed"
  );

  const visits = completed.map((a: any, i: number) => ({
    clinicId,
    patient: a.patient,
    appointment: a._id,
    doctor: a.doctor,
    diagnosis: pick(DIAGNOSES, i),
    prescription: "باراسيتامول 500mg — حبة كل 8 ساعات لمدة 5 أيام",
    notes: "تحسّن ملحوظ منذ الزيارة السابقة. يُنصح بمتابعة النظام الغذائي.",
    completed: true,
    followUpDate: dayOffset(14 + (i % 20)),
    vitalSigns: {
      bloodPressureSystolic: 110 + Math.floor(rand() * 30),
      bloodPressureDiastolic: 70 + Math.floor(rand() * 15),
      heartRate: 62 + Math.floor(rand() * 30),
      temperature: 36.4 + Math.round(rand() * 10) / 10,
      weight: 55 + Math.floor(rand() * 45),
      height: 155 + Math.floor(rand() * 35),
    },
  }));

  const createdVisits = await Visit.create(visits);

  console.log("✅ Demo clinic seeded");
  console.log(`   clinic:       ${clinic.name} (${clinicId})`);
  console.log(`   staff:        1 admin + ${doctors.length} doctors`);
  console.log(`   patients:     ${patients.length}`);
  console.log(`   appointments: ${createdAppointments.length}`);
  console.log(`   visits:       ${createdVisits.length}`);
  console.log(`   login:        ${DEMO_ADMIN_EMAIL} / ${DEMO_ADMIN_PASSWORD}`);

  return { clinicId, adminId: admin._id };
}

// ── CLI ─────────────────────────────────────────────────
const mode = process.argv[2];

if (mode === "clear") {
  clearDemo()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error("❌", e);
      process.exit(1);
    });
} else {
  seedDemo()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error("❌", e);
      process.exit(1);
    });
}
