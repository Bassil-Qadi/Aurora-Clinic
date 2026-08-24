import VideoRoom from "@/models/VideoRoom";
import Appointment from "@/models/Appointment";
import type { PortalTokenPayload } from "@/lib/portalAuth";

/**
 * Resolve a video room for a portal patient.
 *
 * Scoping on clinicId alone is not enough: it lets any patient of a clinic
 * open (or claim the callee slot on) any other patient's consultation. A room
 * is addressable by a patient only when it is already theirs, or when it is
 * still unclaimed and hangs off an appointment booked for them.
 *
 * Returns null when the room does not exist or is not the patient's, so
 * callers can answer 404 without distinguishing the two.
 */
export async function findPortalRoom(
  roomId: string,
  patient: PortalTokenPayload
) {
  const room = await VideoRoom.findOne({
    _id: roomId,
    clinicId: patient.clinicId,
  });

  if (!room) return null;

  // Already claimed — only the patient who joined may come back to it.
  if (room.calleeId) {
    return String(room.calleeId) === String(patient.patientId) ? room : null;
  }

  // Unclaimed — the room must belong to an appointment booked for this patient.
  if (room.appointmentId) {
    const appointment = await Appointment.findOne({
      _id: room.appointmentId,
      clinicId: patient.clinicId,
      patient: patient.patientId,
    }).select("_id");

    return appointment ? room : null;
  }

  // Ad-hoc staff room with no appointment behind it — not patient-addressable.
  return null;
}
