"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import PatientTimeline from "@/components/PatientTimeline";
import { useI18n } from "@/lib/i18n";
import {
  User,
  Phone,
  Mail,
  Calendar,
  Clipboard,
  Pencil,
  Trash2,
  Plus,
  X,
  LayoutDashboard,
  Heart,
  ShieldAlert,
  FileText,
  Upload,
  Download,
  Eye,
  Pill,
  Syringe,
  AlertTriangle,
  Save,
  UserPlus,
  CreditCard,
} from "lucide-react";

type MedicalDoc = {
  _id: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  category: string;
  description?: string;
  createdAt: string;
  uploadedBy?: { name: string };
};

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const CATEGORY_COLORS: Record<string, string> = {
  lab_result: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-700",
  imaging: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700",
  prescription: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700",
  referral: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700",
  consent: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600",
  insurance: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-700",
  other: "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600",
};

export default function PatientDetailsPage() {
  const { t } = useI18n();
  const params = useParams();
  const { data: session } = useSession();
  const id = params.id as string;

  const DOC_CATEGORIES = [
    { value: "lab_result", label: t("patients.labResult") },
    { value: "imaging", label: t("patients.imaging") },
    { value: "prescription", label: t("patients.prescriptionDoc") },
    { value: "referral", label: t("patients.referral") },
    { value: "consent", label: t("patients.consentForm") },
    { value: "insurance", label: t("patients.insurance") },
    { value: "other", label: t("patients.other") },
  ];

  const [data, setData] = useState<any>(null);
  const [patientPrescriptions, setPatientPrescriptions] = useState([]);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [diagnosis, setDiagnosis] = useState("");
  const [treatment, setTreatment] = useState("");

  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editGender, setEditGender] = useState("");

  // Medical history state
  const [medicalHistory, setMedicalHistory] = useState<any>({});
  const [emergencyContact, setEmergencyContact] = useState<any>({});
  const [insuranceInfo, setInsuranceInfo] = useState<any>({});
  const [savingMedical, setSavingMedical] = useState(false);
  const [medicalMessage, setMedicalMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Documents state
  const [documents, setDocuments] = useState<MedicalDoc[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState("other");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploading, setUploading] = useState(false);

  // Tag input helpers
  const [allergyInput, setAllergyInput] = useState("");
  const [conditionInput, setConditionInput] = useState("");
  const [familyInput, setFamilyInput] = useState("");
  const [medicationInput, setMedicationInput] = useState("");

  // Active tab
  const [activeTab, setActiveTab] = useState<"overview" | "medical" | "documents" | "timeline">("overview");

  const fetchPatient = useCallback(async () => {
    const res = await fetch(`/api/patients/${id}/details`);
    const result = await res.json();
    setData(result);
  }, [id]);

  const fetchMedicalHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/patients/${id}/medical-history`);
      if (res.ok) {
        const result = await res.json();
        setMedicalHistory(result.medicalHistory || {});
        setEmergencyContact(result.emergencyContact || {});
        setInsuranceInfo(result.insuranceInfo || {});
      }
    } catch {
      console.error("Failed to fetch medical history");
    }
  }, [id]);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch(`/api/patients/${id}/documents`);
      if (res.ok) {
        const result = await res.json();
        setDocuments(result.documents || []);
      }
    } catch {
      console.error("Failed to fetch documents");
    }
  }, [id]);

  useEffect(() => {
    fetchPatient();
    fetchMedicalHistory();
    fetchDocuments();
  }, [fetchPatient, fetchMedicalHistory, fetchDocuments]);

  useEffect(() => {
    fetch(`/api/prescriptions?patient=${params.id}`)
      .then((res) => res.json())
      .then((data) => setPatientPrescriptions(data?.prescriptions || []));
  }, [params.id]);

  const createVisit = async () => {
    await fetch("/api/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patient: id, diagnosis, treatment }),
    });
    setShowVisitModal(false);
    setDiagnosis("");
    setTreatment("");
    fetchPatient();
  };

  const updatePatient = async () => {
    await fetch(`/api/patients/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: editFirstName,
        lastName: editLastName,
        email: editEmail,
        phone: editPhone,
        gender: editGender,
      }),
    });
    setShowEditModal(false);
    fetchPatient();
  };

  const deletePatient = async () => {
    if (!confirm(t("patients.deletePatientConfirm"))) return;
    await fetch(`/api/patients/${id}`, { method: "DELETE" });
    window.location.href = "/patients";
  };

  const showMedMsg = (type: "success" | "error", text: string) => {
    setMedicalMessage({ type, text });
    setTimeout(() => setMedicalMessage(null), 3000);
  };

  const saveMedicalHistory = async () => {
    setSavingMedical(true);
    try {
      const res = await fetch(`/api/patients/${id}/medical-history`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medicalHistory, emergencyContact, insuranceInfo }),
      });
      if (res.ok) {
        showMedMsg("success", t("patients.medicalSaveSuccess"));
      } else {
        showMedMsg("error", t("patients.medicalSaveFailed"));
      }
    } catch {
      showMedMsg("error", t("patients.medicalSaveFailed"));
    } finally {
      setSavingMedical(false);
    }
  };

  const handleFileUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const res = await fetch(`/api/patients/${id}/documents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: uploadFile.name,
            mimeType: uploadFile.type,
            fileData: base64,
            category: uploadCategory,
            description: uploadDescription,
          }),
        });
        if (res.ok) {
          setShowUploadModal(false);
          setUploadFile(null);
          setUploadCategory("other");
          setUploadDescription("");
          fetchDocuments();
        } else {
          const data = await res.json();
          alert(data.error || t("patients.medicalSaveFailed"));
        }
        setUploading(false);
      };
      reader.readAsDataURL(uploadFile);
    } catch {
      alert(t("patients.medicalSaveFailed"));
      setUploading(false);
    }
  };

  const deleteDocument = async (docId: string) => {
    if (!confirm(t("patients.deleteDocumentConfirm"))) return;
    await fetch(`/api/documents/${docId}`, { method: "DELETE" });
    fetchDocuments();
  };

  const addTag = (
    list: string[],
    setter: (val: string[]) => void,
    input: string,
    inputSetter: (val: string) => void
  ) => {
    const trimmed = input.trim();
    if (trimmed && !list.includes(trimmed)) {
      setter([...list, trimmed]);
      inputSetter("");
    }
  };

  const removeTag = (list: string[], setter: (val: string[]) => void, index: number) => {
    setter(list.filter((_, i) => i !== index));
  };

  if (!data)
    return (
      <div className="space-y-4 p-8">
        <p className="page-title text-xl">{t("patients.loadingPatient")}</p>
        <p className="page-subtitle">{t("patients.fetchingPatient")}</p>
      </div>
    );

  const { patient, appointments, visits } = data;

  const TABS = [
    { key: "overview", label: t("patients.overview"), icon: User },
    { key: "medical", label: t("patients.medicalHistory"), icon: Heart },
    { key: "documents", label: t("patients.documents"), icon: FileText },
    { key: "timeline", label: t("patients.timeline"), icon: LayoutDashboard },
  ] as const;

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">
            <User className="h-6 w-6 text-sky-500" />
            <span>
              {patient.firstName} {patient.lastName}
            </span>
          </h1>
          <p className="page-subtitle mt-1">{t("patients.patientProfile")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditFirstName(patient.firstName);
              setEditLastName(patient.lastName);
              setEditEmail(patient.email || "");
              setEditPhone(patient.phone);
              setEditGender(patient.gender);
              setShowEditModal(true);
            }}
            className="btn-ghost"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>{t("common.edit")}</span>
          </button>
          {session?.user?.role === "admin" && (
            <button onClick={deletePatient} className="btn-danger">
              <Trash2 className="h-3.5 w-3.5" />
              <span>{t("common.delete")}</span>
            </button>
          )}
        </div>
      </div>

      {/* Patient Info Card */}
      <div className="card">
        <div className="grid gap-4 text-sm text-slate-700 dark:text-slate-300 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-sky-500" />
            <div>
              <p className="text-[10px] font-medium uppercase text-slate-400">{t("common.email")}</p>
              <p className="font-medium">{patient.email || "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-sky-500" />
            <div>
              <p className="text-[10px] font-medium uppercase text-slate-400">{t("common.phone")}</p>
              <p className="font-medium">{patient.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-sky-500" />
            <div>
              <p className="text-[10px] font-medium uppercase text-slate-400">{t("patients.dateOfBirth")}</p>
              <p className="font-medium">
                {patient.dateOfBirth
                  ? new Date(patient.dateOfBirth).toLocaleDateString()
                  : "—"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-sky-500" />
            <div>
              <p className="text-[10px] font-medium uppercase text-slate-400">{t("patients.gender")}</p>
              <p className="font-medium capitalize">{patient.gender}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-white text-sky-700 shadow-sm dark:bg-slate-700 dark:text-sky-400"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Prescriptions */}
          <div className="card">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              <Pill className="h-5 w-5 text-emerald-500" />
              {t("patients.prescriptionHistory")}
            </h2>
            {patientPrescriptions.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t("patients.noPrescriptions")}</p>
            ) : (
              <div className="space-y-3">
                {patientPrescriptions.map((p: any) => (
                  <div
                    key={p._id}
                    className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50"
                  >
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </p>
                    <div className="mt-2 space-y-1">
                      {p.medications?.map((m: any, idx: number) => (
                        <div key={idx} className="text-sm text-slate-700 dark:text-slate-300">
                          <span className="font-medium">{m.name}</span> — {m.dosage} —{" "}
                          {m.frequency} — {m.duration}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Appointments */}
          <div className="card">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              <Calendar className="h-5 w-5 text-sky-500" />
              {t("patients.appointmentHistory")}
            </h2>
            {appointments.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t("patients.noAppointmentsFound")}</p>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>{t("common.date")}</th>
                      <th>{t("common.reason")}</th>
                      <th>{t("common.status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((appt: any) => (
                      <tr key={appt._id}>
                        <td>{new Date(appt.date).toLocaleDateString()}</td>
                        <td>{appt.reason || "—"}</td>
                        <td>
                          <span className="capitalize">{appt.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Visits */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                <Clipboard className="h-5 w-5 text-sky-500" />
                {t("patients.visitHistory")}
              </h2>
              <button onClick={() => setShowVisitModal(true)} className="btn-primary">
                <Plus className="h-4 w-4" />
                <span>{t("patients.addVisit")}</span>
              </button>
            </div>
            {visits.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t("patients.noVisitsYet")}</p>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>{t("common.date")}</th>
                      <th>{t("visits.diagnosis")}</th>
                      <th>{t("common.status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visits.map((visit: any) => (
                      <tr key={visit._id}>
                        <td>{new Date(visit.createdAt).toLocaleDateString()}</td>
                        <td>{visit.diagnosis || "—"}</td>
                        <td>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                              visit.completed
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            }`}
                          >
                            {visit.completed ? t("visits.completed") : t("visits.inProgress")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "medical" && (
        <div className="space-y-6">
          {medicalMessage && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm font-medium ${
                medicalMessage.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                  : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-700 dark:bg-rose-950/30 dark:text-rose-400"
              }`}
            >
              {medicalMessage.text}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Medical History */}
            <div className="card space-y-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                <Heart className="h-5 w-5 text-rose-500" />
                {t("patients.medicalHistory")}
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    {t("patients.bloodType")}
                  </label>
                  <select
                    className="input"
                    value={medicalHistory.bloodType || ""}
                    onChange={(e) =>
                      setMedicalHistory({ ...medicalHistory, bloodType: e.target.value })
                    }
                  >
                    <option value="">{t("patients.select")}</option>
                    {BLOOD_TYPES.map((bt) => (
                      <option key={bt} value={bt}>
                        {bt}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    {t("patients.smokingStatus")}
                  </label>
                  <select
                    className="input"
                    value={medicalHistory.smokingStatus || ""}
                    onChange={(e) =>
                      setMedicalHistory({ ...medicalHistory, smokingStatus: e.target.value })
                    }
                  >
                    <option value="">{t("patients.select")}</option>
                    <option value="never">{t("patients.never")}</option>
                    <option value="former">{t("patients.former")}</option>
                    <option value="current">{t("patients.current")}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  {t("patients.alcoholUse")}
                </label>
                <select
                  className="input"
                  value={medicalHistory.alcoholUse || ""}
                  onChange={(e) =>
                    setMedicalHistory({ ...medicalHistory, alcoholUse: e.target.value })
                  }
                >
                  <option value="">{t("patients.select")}</option>
                  <option value="none">{t("patients.none")}</option>
                  <option value="occasional">{t("patients.occasional")}</option>
                  <option value="moderate">{t("patients.moderate")}</option>
                  <option value="heavy">{t("patients.heavy")}</option>
                </select>
              </div>

              {/* Allergies */}
              <div>
                <label className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                  {t("patients.allergies")}
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(medicalHistory.allergies || []).map((a: string, i: number) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    >
                      {a}
                      <button
                        onClick={() =>
                          removeTag(medicalHistory.allergies, (v) =>
                            setMedicalHistory({ ...medicalHistory, allergies: v }), i)
                        }
                        className="ml-0.5 hover:text-amber-900"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    className="input flex-1"
                    placeholder="e.g., Penicillin"
                    value={allergyInput}
                    onChange={(e) => setAllergyInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag(
                          medicalHistory.allergies || [],
                          (v) => setMedicalHistory({ ...medicalHistory, allergies: v }),
                          allergyInput,
                          setAllergyInput
                        );
                      }
                    }}
                  />
                  <button
                    onClick={() =>
                      addTag(
                        medicalHistory.allergies || [],
                        (v) => setMedicalHistory({ ...medicalHistory, allergies: v }),
                        allergyInput,
                        setAllergyInput
                      )
                    }
                    className="btn-ghost"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Chronic Conditions */}
              <div>
                <label className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                  <ShieldAlert className="h-3 w-3 text-rose-500" />
                  {t("patients.chronicConditions")}
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(medicalHistory.chronicConditions || []).map((c: string, i: number) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 dark:border-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                    >
                      {c}
                      <button
                        onClick={() =>
                          removeTag(medicalHistory.chronicConditions, (v) =>
                            setMedicalHistory({ ...medicalHistory, chronicConditions: v }), i)
                        }
                        className="ml-0.5 hover:text-rose-900"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    className="input flex-1"
                    placeholder="e.g., Diabetes Type 2"
                    value={conditionInput}
                    onChange={(e) => setConditionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag(
                          medicalHistory.chronicConditions || [],
                          (v) => setMedicalHistory({ ...medicalHistory, chronicConditions: v }),
                          conditionInput,
                          setConditionInput
                        );
                      }
                    }}
                  />
                  <button
                    onClick={() =>
                      addTag(
                        medicalHistory.chronicConditions || [],
                        (v) => setMedicalHistory({ ...medicalHistory, chronicConditions: v }),
                        conditionInput,
                        setConditionInput
                      )
                    }
                    className="btn-ghost"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Current Medications */}
              <div>
                <label className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                  <Pill className="h-3 w-3 text-emerald-500" />
                  {t("patients.currentMedications")}
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(medicalHistory.currentMedications || []).map((m: string, i: number) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    >
                      {m}
                      <button
                        onClick={() =>
                          removeTag(medicalHistory.currentMedications, (v) =>
                            setMedicalHistory({ ...medicalHistory, currentMedications: v }), i)
                        }
                        className="ml-0.5 hover:text-emerald-900"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    className="input flex-1"
                    placeholder="e.g., Metformin 500mg"
                    value={medicationInput}
                    onChange={(e) => setMedicationInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag(
                          medicalHistory.currentMedications || [],
                          (v) => setMedicalHistory({ ...medicalHistory, currentMedications: v }),
                          medicationInput,
                          setMedicationInput
                        );
                      }
                    }}
                  />
                  <button
                    onClick={() =>
                      addTag(
                        medicalHistory.currentMedications || [],
                        (v) => setMedicalHistory({ ...medicalHistory, currentMedications: v }),
                        medicationInput,
                        setMedicationInput
                      )
                    }
                    className="btn-ghost"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Family History */}
              <div>
                <label className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                  <Syringe className="h-3 w-3 text-violet-500" />
                  {t("patients.familyHistory")}
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(medicalHistory.familyHistory || []).map((f: string, i: number) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 dark:border-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                    >
                      {f}
                      <button
                        onClick={() =>
                          removeTag(medicalHistory.familyHistory, (v) =>
                            setMedicalHistory({ ...medicalHistory, familyHistory: v }), i)
                        }
                        className="ml-0.5 hover:text-violet-900"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    className="input flex-1"
                    placeholder="e.g., Father - Heart disease"
                    value={familyInput}
                    onChange={(e) => setFamilyInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag(
                          medicalHistory.familyHistory || [],
                          (v) => setMedicalHistory({ ...medicalHistory, familyHistory: v }),
                          familyInput,
                          setFamilyInput
                        );
                      }
                    }}
                  />
                  <button
                    onClick={() =>
                      addTag(
                        medicalHistory.familyHistory || [],
                        (v) => setMedicalHistory({ ...medicalHistory, familyHistory: v }),
                        familyInput,
                        setFamilyInput
                      )
                    }
                    className="btn-ghost"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  {t("patients.additionalNotes")}
                </label>
                <textarea
                  className="input min-h-[80px] resize-y"
                  placeholder={t("patients.additionalMedicalNotes")}
                  value={medicalHistory.notes || ""}
                  onChange={(e) =>
                    setMedicalHistory({ ...medicalHistory, notes: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Emergency Contact & Insurance */}
            <div className="space-y-6">
              <div className="card space-y-4">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  <UserPlus className="h-5 w-5 text-amber-500" />
                  {t("patients.emergencyContact")}
                </h2>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    {t("patients.contactName")}
                  </label>
                  <input
                    className="input"
                    placeholder={t("common.name")}
                    value={emergencyContact.name || ""}
                    onChange={(e) =>
                      setEmergencyContact({ ...emergencyContact, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    {t("patients.relationship")}
                  </label>
                  <input
                    className="input"
                    placeholder="e.g., Spouse, Parent"
                    value={emergencyContact.relationship || ""}
                    onChange={(e) =>
                      setEmergencyContact({ ...emergencyContact, relationship: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    {t("patients.phoneNumber")}
                  </label>
                  <input
                    className="input"
                    type="tel"
                    placeholder="+1 234 567 8900"
                    value={emergencyContact.phone || ""}
                    onChange={(e) =>
                      setEmergencyContact({ ...emergencyContact, phone: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="card space-y-4">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  <CreditCard className="h-5 w-5 text-cyan-500" />
                  {t("patients.insuranceInfo")}
                </h2>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    {t("patients.provider")}
                  </label>
                  <input
                    className="input"
                    placeholder={t("patients.insuranceProvider")}
                    value={insuranceInfo.provider || ""}
                    onChange={(e) =>
                      setInsuranceInfo({ ...insuranceInfo, provider: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    {t("patients.policyNumber")}
                  </label>
                  <input
                    className="input"
                    placeholder={t("patients.policyNumber")}
                    value={insuranceInfo.policyNumber || ""}
                    onChange={(e) =>
                      setInsuranceInfo({ ...insuranceInfo, policyNumber: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    {t("patients.groupNumber")}
                  </label>
                  <input
                    className="input"
                    placeholder={t("patients.groupNumber")}
                    value={insuranceInfo.groupNumber || ""}
                    onChange={(e) =>
                      setInsuranceInfo({ ...insuranceInfo, groupNumber: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={saveMedicalHistory}
              disabled={savingMedical}
              className="btn-primary"
            >
              <Save className="h-4 w-4" />
              {savingMedical ? t("common.saving") : t("patients.saveMedicalInfo")}
            </button>
          </div>
        </div>
      )}

      {activeTab === "documents" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
              <FileText className="h-5 w-5 text-sky-500" />
              {t("patients.documents")}
            </h2>
            <button onClick={() => setShowUploadModal(true)} className="btn-primary">
              <Upload className="h-4 w-4" />
              <span>{t("patients.uploadDocument")}</span>
            </button>
          </div>

          {documents.length === 0 ? (
            <div className="card text-center py-12">
              <FileText className="h-10 w-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500 dark:text-slate-400">{t("patients.noDocuments")}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                {t("patients.uploadDocDesc")}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {documents.map((doc) => (
                <div
                  key={doc._id}
                  className="card group flex flex-col gap-3 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {doc.originalName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {(doc.fileSize / 1024).toFixed(1)} KB •{" "}
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                        CATEGORY_COLORS[doc.category] || CATEGORY_COLORS.other
                      }`}
                    >
                      {DOC_CATEGORIES.find((c) => c.value === doc.category)?.label ||
                        doc.category}
                    </span>
                  </div>

                  {doc.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{doc.description}</p>
                  )}

                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-100 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400">
                      {t("patients.by")} {doc.uploadedBy?.name || t("common.unknown")}
                    </span>
                    <div className="flex gap-1">
                      <a
                        href={`/api/documents/${doc._id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-ghost"
                        title={t("common.view")}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </a>
                      <a
                        href={`/api/documents/${doc._id}`}
                        download={doc.originalName}
                        className="btn-ghost"
                        title={t("common.download")}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                      <button
                        onClick={() => deleteDocument(doc._id)}
                        className="btn-ghost text-rose-500 hover:text-rose-700"
                        title={t("common.delete")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "timeline" && (
        <div className="card">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
            <LayoutDashboard className="h-5 w-5 text-sky-500" />
            {t("patients.patientOverview")}
          </h2>
          <PatientTimeline patientId={String(params.id)} />
        </div>
      )}

      {/* Add Visit Modal */}
      {showVisitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm !mt-0">
          <div className="card w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Clipboard className="h-5 w-5 text-sky-500" />
                {t("patients.newVisit")}
              </h2>
              <button onClick={() => setShowVisitModal(false)} className="btn-ghost">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{t("visits.diagnosis")}</label>
              <textarea
                className="input min-h-[80px]"
                placeholder={t("patients.enterDiagnosis")}
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{t("patients.treatment")}</label>
              <textarea
                className="input min-h-[80px]"
                placeholder={t("patients.enterTreatment")}
                value={treatment}
                onChange={(e) => setTreatment(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowVisitModal(false)} className="btn-secondary">
                {t("common.cancel")}
              </button>
              <button onClick={createVisit} className="btn-primary">
                <Plus className="h-4 w-4" />
                {t("patients.saveVisit")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Patient Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm !mt-0">
          <div className="card w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Pencil className="h-5 w-5 text-sky-500" />
                {t("patients.editPatient")}
              </h2>
              <button onClick={() => setShowEditModal(false)} className="btn-ghost">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{t("patients.firstName")}</label>
                <input
                  className="input"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{t("patients.lastName")}</label>
                <input
                  className="input"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{t("common.email")}</label>
              <input
                className="input"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{t("common.phone")}</label>
              <input
                className="input"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{t("patients.gender")}</label>
              <select
                className="input"
                value={editGender}
                onChange={(e) => setEditGender(e.target.value)}
              >
                <option value="male">{t("common.male")}</option>
                <option value="female">{t("common.female")}</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowEditModal(false)} className="btn-secondary">
                {t("common.cancel")}
              </button>
              <button onClick={updatePatient} className="btn-primary">
                <Save className="h-4 w-4" />
                {t("common.saveChanges")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm !mt-0">
          <div className="card w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Upload className="h-5 w-5 text-sky-500" />
                {t("patients.uploadDocument")}
              </h2>
              <button onClick={() => setShowUploadModal(false)} className="btn-ghost">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{t("patients.file")}</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="input"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                {t("patients.maxFileSize")}
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{t("patients.category")}</label>
              <select
                className="input"
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
              >
                {DOC_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                {t("patients.descriptionOptional")}
              </label>
              <textarea
                className="input min-h-[60px]"
                placeholder={t("common.description")}
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowUploadModal(false)} className="btn-secondary">
                {t("common.cancel")}
              </button>
              <button
                onClick={handleFileUpload}
                disabled={uploading || !uploadFile}
                className="btn-primary"
              >
                <Upload className="h-4 w-4" />
                {uploading ? t("common.uploading") : t("common.upload")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
