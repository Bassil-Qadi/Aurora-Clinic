import { z } from "zod";

// ─── Patient ──────────────────────────────────────────────

export const createPatientSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["male", "female"]),
  phone: z.string().min(6, "Phone must be at least 6 characters"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional(),
  medicalHistory: z.lazy(() => medicalHistorySchema).optional(),
  emergencyContact: z.lazy(() => emergencyContactSchema).optional(),
  insuranceInfo: z.lazy(() => insuranceInfoSchema).optional(),
});

export const updatePatientSchema = createPatientSchema.partial();

// ─── Appointment ──────────────────────────────────────────

export const createAppointmentSchema = z.object({
  patient: z.string().min(1, "Patient is required"),
  date: z.string().min(1, "Date is required"),
  reason: z.string().optional(),
  status: z
    .enum([
      "scheduled",
      "waiting",
      "in_progress",
      "completed",
      "cancelled",
      "no_show",
    ])
    .optional(),
  doctor: z.string().optional(),
});

export const updateAppointmentSchema = z.object({
  patient: z.string().optional(),
  date: z.string().optional(),
  reason: z.string().optional(),
  status: z
    .enum([
      "scheduled",
      "waiting",
      "in_progress",
      "completed",
      "cancelled",
      "no_show",
    ])
    .optional(),
  doctor: z.string().optional(),
});

// ─── Vital Signs ──────────────────────────────────────────

export const vitalSignsSchema = z.object({
  bloodPressureSystolic: z.number().min(0).optional().nullable(),
  bloodPressureDiastolic: z.number().min(0).optional().nullable(),
  heartRate: z.number().min(0).optional().nullable(),
  temperature: z.number().min(20).max(50).optional().nullable(),
  respiratoryRate: z.number().min(0).optional().nullable(),
  oxygenSaturation: z.number().min(0).max(100).optional().nullable(),
  weight: z.number().min(0).optional().nullable(),
  height: z.number().min(0).optional().nullable(),
  bloodGlucose: z.number().min(0).optional().nullable(),
  painLevel: z.number().min(0).max(10).optional().nullable(),
});

// ─── Visit ────────────────────────────────────────────────

export const createVisitSchema = z.object({
  patient: z.string().min(1, "Patient is required"),
  doctor: z.string().optional(),
  diagnosis: z.string().optional(),
  prescription: z.string().optional(),
  treatment: z.string().optional(),
  notes: z.string().optional(),
  followUpDate: z.string().optional(),
  appointment: z.string().optional(),
  vitalSigns: vitalSignsSchema.optional(),
});

export const updateVisitSchema = z.object({
  patient: z.string().optional(),
  doctor: z.string().optional(),
  diagnosis: z.string().optional(),
  prescription: z.string().optional(),
  notes: z.string().optional(),
  followUpDate: z.string().optional(),
  vitalSigns: vitalSignsSchema.optional(),
});

export const patchVisitSchema = z.object({
  diagnosis: z.string().optional(),
  prescription: z.string().optional(),
  notes: z.string().optional(),
  followUpDate: z.string().optional(),
  vitalSigns: vitalSignsSchema.optional(),
});

// ─── Prescription ─────────────────────────────────────────

export const medicationSchema = z.object({
  name: z.string().min(1, "Medication name is required"),
  dosage: z.string().min(1, "Dosage is required"),
  frequency: z.string().min(1, "Frequency is required"),
  duration: z.string().min(1, "Duration is required"),
});

export const createPrescriptionSchema = z.object({
  patient: z.string().min(1, "Patient is required"),
  doctor: z.string().min(1, "Doctor is required"),
  visit: z.string().optional(),
  medications: z
    .array(medicationSchema)
    .min(1, "At least one medication is required"),
  notes: z.string().optional(),
});

export const updatePrescriptionSchema = z.object({
  medications: z.array(medicationSchema).optional(),
  notes: z.string().optional(),
  userId: z.string().optional(),
});

// ─── Status Update ────────────────────────────────────────

export const statusUpdateSchema = z.object({
  status: z.string().min(1, "Status is required"),
});

// ─── User / Staff ─────────────────────────────────────────

export const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "doctor", "receptionist"]),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.enum(["admin", "doctor", "receptionist"]).optional(),
  isActive: z.boolean().optional(),
  signature: z.string().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// ─── Medical History ──────────────────────────────────────

export const medicalHistorySchema = z.object({
  bloodType: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", ""]).optional(),
  allergies: z.array(z.string()).optional(),
  chronicConditions: z.array(z.string()).optional(),
  pastSurgeries: z
    .array(
      z.object({
        name: z.string(),
        date: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .optional(),
  familyHistory: z.array(z.string()).optional(),
  currentMedications: z.array(z.string()).optional(),
  immunizations: z
    .array(
      z.object({
        name: z.string(),
        date: z.string().optional(),
      })
    )
    .optional(),
  smokingStatus: z.enum(["never", "former", "current", ""]).optional(),
  alcoholUse: z.enum(["none", "occasional", "moderate", "heavy", ""]).optional(),
  notes: z.string().optional(),
});

export const emergencyContactSchema = z.object({
  name: z.string().optional(),
  relationship: z.string().optional(),
  phone: z.string().optional(),
});

export const insuranceInfoSchema = z.object({
  provider: z.string().optional(),
  policyNumber: z.string().optional(),
  groupNumber: z.string().optional(),
});

// ─── Clinic ───────────────────────────────────────────────

export const updateClinicSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  logo: z.string().optional(),
  settings: z
    .object({
      workingHours: z
        .object({
          start: z.string().optional(),
          end: z.string().optional(),
        })
        .optional(),
      workingDays: z.array(z.number()).optional(),
      appointmentDuration: z.number().optional(),
      currency: z.string().optional(),
      timezone: z.string().optional(),
    })
    .optional(),
});
