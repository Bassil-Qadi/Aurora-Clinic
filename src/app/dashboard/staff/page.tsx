"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  Shield,
  Stethoscope,
  ClipboardList,
  ToggleLeft,
  ToggleRight,
  KeyRound,
  Pencil,
  Search,
  X,
  Users,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

type StaffMember = {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  admin: <Shield className="h-3.5 w-3.5 text-violet-500" />,
  doctor: <Stethoscope className="h-3.5 w-3.5 text-sky-500" />,
  receptionist: <ClipboardList className="h-3.5 w-3.5 text-emerald-500" />,
};

const ROLE_COLORS: Record<string, string> = {
  admin:
    "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-700",
  doctor:
    "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-700",
  receptionist:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700",
};

export default function StaffManagementPage() {
  const { t } = useI18n();
  const { data: session } = useSession();
  const router = useRouter();

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<StaffMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<string>("receptionist");
  const [resetPassword, setResetPassword] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Redirect non-admin
  useEffect(() => {
    if (session && session.user?.role !== "admin") {
      router.push("/dashboard");
    }
  }, [session, router]);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      setStaff(data.users || []);
    } catch {
      setMessage({ type: "error", text: t("staff.failedToLoad") });
    } finally {
      setLoading(false);
    }
  };

  const showMsg = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleAdd = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          password: formPassword,
          role: formRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showMsg("error", data.error || t("staff.failedToCreate"));
        return;
      }
      showMsg("success", t("staff.addedSuccess", { name: data.name, role: data.role }));
      setShowAddModal(false);
      resetForm();
      fetchStaff();
    } catch {
      showMsg("error", t("staff.failedToCreate"));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${selectedUser._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          role: formRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showMsg("error", data.error || t("staff.failedToUpdate"));
        return;
      }
      showMsg("success", t("staff.updatedSuccess"));
      setShowEditModal(false);
      resetForm();
      fetchStaff();
    } catch {
      showMsg("error", t("staff.failedToUpdate"));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (member: StaffMember) => {
    try {
      const res = await fetch(`/api/users/${member._id}`, {
        method: "PATCH",
      });
      if (!res.ok) {
        const data = await res.json();
        showMsg("error", data.error || t("staff.failedToToggle"));
        return;
      }
      showMsg(
        "success",
        member.isActive
          ? t("staff.deactivatedSuccess", { name: member.name })
          : t("staff.activatedSuccess", { name: member.name })
      );
      fetchStaff();
    } catch {
      showMsg("error", t("staff.failedToToggle"));
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${selectedUser._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        showMsg("error", data.error || t("staff.passwordResetFailed"));
        return;
      }
      showMsg("success", t("staff.passwordResetSuccess", { name: selectedUser.name }));
      setShowResetModal(false);
      setResetPassword("");
      setSelectedUser(null);
    } catch {
      showMsg("error", t("staff.passwordResetFailed"));
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormRole("receptionist");
    setSelectedUser(null);
  };

  const openEdit = (member: StaffMember) => {
    setSelectedUser(member);
    setFormName(member.name);
    setFormEmail(member.email);
    setFormRole(member.role);
    setShowEditModal(true);
  };

  const openResetPassword = (member: StaffMember) => {
    setSelectedUser(member);
    setResetPassword("");
    setShowResetModal(true);
  };

  const filteredStaff = staff.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.role.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleLabel = (role: string) => {
    const map: Record<string, string> = {
      admin: t("common.admin"),
      doctor: t("common.doctor"),
      receptionist: t("common.receptionist"),
    };
    return map[role] || role;
  };

  if (session?.user?.role !== "admin") return null;

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">
            <Users className="h-6 w-6 text-sky-500" />
            <span>{t("staff.title")}</span>
          </h1>
          <p className="page-subtitle mt-1">
            {t("staff.subtitle")}
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="btn-primary"
        >
          <UserPlus className="h-4 w-4" />
          <span>{t("staff.addStaff")}</span>
        </button>
      </div>

      {/* Message toast */}
      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-medium ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
              : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-700 dark:bg-rose-950/30 dark:text-rose-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-10"
          placeholder={t("staff.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Staff Table */}
      {loading ? (
        <div className="card text-center py-10 text-slate-500 dark:text-slate-400 text-sm">
          {t("staff.loadingStaff")}
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>{t("common.name")}</th>
                <th>{t("common.email")}</th>
                <th>{t("common.role")}</th>
                <th>{t("common.status")}</th>
                <th>{t("staff.joined")}</th>
                <th className="text-right">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500 dark:text-slate-400">
                    {t("staff.noStaff")}
                  </td>
                </tr>
              ) : (
                filteredStaff.map((member) => (
                  <tr key={member._id}>
                    <td className="font-medium text-slate-900 dark:text-slate-100">
                      {member.name}
                    </td>
                    <td>{member.email}</td>
                    <td>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                          ROLE_COLORS[member.role] || ""
                        }`}
                      >
                        {ROLE_ICONS[member.role]}
                        {getRoleLabel(member.role)}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                          member.isActive
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            member.isActive ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                        />
                        {member.isActive ? t("common.active") : t("common.inactive")}
                      </span>
                    </td>
                    <td className="text-slate-500 dark:text-slate-400">
                      {new Date(member.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(member)}
                          className="btn-ghost"
                          title={t("common.edit")}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => openResetPassword(member)}
                          className="btn-ghost"
                          title={t("staff.resetPassword")}
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(member)}
                          className="btn-ghost"
                          title={
                            member.isActive ? t("staff.deactivate") : t("staff.activate")
                          }
                        >
                          {member.isActive ? (
                            <ToggleRight className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <ToggleLeft className="h-4 w-4 text-slate-400" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm !mt-0">
          <div className="card w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-sky-500" />
                <span>{t("staff.addStaffMember")}</span>
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="btn-ghost"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                {t("staff.fullName")}
              </label>
              <input
                className="input"
                placeholder="Dr. Jane Smith"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                {t("common.email")}
              </label>
              <input
                className="input"
                type="email"
                placeholder="jane@clinic.com"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                {t("staff.temporaryPassword")}
              </label>
              <input
                className="input"
                type="password"
                placeholder={t("staff.minSixCharacters")}
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                {t("common.role")}
              </label>
              <select
                className="input"
                value={formRole}
                onChange={(e) => setFormRole(e.target.value)}
              >
                <option value="receptionist">{t("common.receptionist")}</option>
                <option value="doctor">{t("common.doctor")}</option>
                <option value="admin">{t("common.admin")}</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="btn-secondary"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleAdd}
                disabled={saving || !formName || !formEmail || !formPassword}
                className="btn-primary"
              >
                {saving ? t("staff.creating") : t("staff.createStaff")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm !mt-0">
          <div className="card w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Pencil className="h-5 w-5 text-sky-500" />
                <span>{t("staff.editStaffMember")}</span>
              </h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="btn-ghost"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                {t("staff.fullName")}
              </label>
              <input
                className="input"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                {t("common.email")}
              </label>
              <input
                className="input"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                {t("common.role")}
              </label>
              <select
                className="input"
                value={formRole}
                onChange={(e) => setFormRole(e.target.value)}
              >
                <option value="receptionist">{t("common.receptionist")}</option>
                <option value="doctor">{t("common.doctor")}</option>
                <option value="admin">{t("common.admin")}</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowEditModal(false)}
                className="btn-secondary"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleEdit}
                disabled={saving || !formName || !formEmail}
                className="btn-primary"
              >
                {saving ? t("staff.saving") : t("common.saveChanges")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm !mt-0">
          <div className="card w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-amber-500" />
                <span>{t("staff.resetPassword")}</span>
              </h2>
              <button
                onClick={() => setShowResetModal(false)}
                className="btn-ghost"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t("staff.setNewPasswordFor")}{" "}
              <span className="font-semibold">{selectedUser.name}</span> (
              {selectedUser.email}).
            </p>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                {t("staff.newPassword")}
              </label>
              <input
                className="input"
                type="password"
                placeholder={t("staff.minSixCharacters")}
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowResetModal(false)}
                className="btn-secondary"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleResetPassword}
                disabled={saving || resetPassword.length < 6}
                className="btn-primary"
              >
                {saving ? t("staff.resetting") : t("staff.resetPassword")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
