"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Clock3,
  KeyRound,
  Plus,
  ScrollText,
  Shield,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { translateUI, useLang } from "@/components/language-provider";
import type { AdminRole } from "@/lib/roles";

type ManagedRole = Exclude<AdminRole, "SUPERADMIN">;
type Tab = "admins" | "permissions" | "audit";

type AdminAccount = {
  _id: string;
  name: string;
  email: string;
  role: AdminRole;
  isActive: boolean;
  permissions: string[];
};

type Permission = {
  key: string;
  name: string;
  description: string;
  defaultRoles?: AdminRole[];
  grants?: string[];
};

type AuditEntry = {
  _id: string;
  createdAt: string;
  actorName?: string;
  actorRole?: AdminRole;
  action: string;
  entity: string;
  description: string;
};

type AuditPage = {
  items: AuditEntry[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type RoleSetting = {
  role: ManagedRole;
  permissions: string[];
};

type ApiResult<T> = {
  success: boolean;
  message?: string;
  data: T;
};

const ROLE_OPTIONS: ManagedRole[] = ["OWNER", "MANAGER", "STAFF"];

const ROLE_COPY: Record<ManagedRole, string> = {
  OWNER: "Full business access. You can adjust this role's access below.",
  MANAGER: "Manage daily operations and business records.",
  STAFF: "View business information and assigned areas.",
};

const GROUP_NAMES: Record<string, string> = {
  dashboard: "Dashboard",
  inventory: "Inventory",
  sales: "Sales",
  vehicleExpenses: "Vehicle expenses",
  generalExpenses: "General expenses",
  payments: "Payments",
  partners: "Partners",
  loans: "Loans",
  financeTransactions: "Finance transactions",
  financeOverview: "Finance overview",
  reports: "Reports",
  upload: "File uploads",
  auditLogs: "Audit log",
  custom: "Custom access",
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Created",
  UPDATE: "Updated",
  DELETE: "Deleted",
  DISCARD: "Discarded",
  SELL: "Sold",
  RETURN: "Sale returned",
  PAYMENT_CREATE: "Payment created",
  PAYMENT_UPDATE: "Payment updated",
  PAYMENT_DELETE: "Payment deleted",
  LOGIN: "Signed in",
  LOGOUT: "Signed out",
};

const ENTITY_LABELS: Record<string, string> = {
  VEHICLE: "Vehicle",
  VEHICLE_EXPENSE: "Vehicle expense",
  SALE: "Sale",
  PAYMENT: "Payment",
  GENERAL_EXPENSE: "General expense",
  PARTNER: "Partner",
  LOAN: "Loan",
  FINANCE_TRANSACTION: "Finance transaction",
  AUTH: "Account",
};

const INPUT_CLASS =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100";
const PRIMARY_BUTTON =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50";
const SECONDARY_BUTTON =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

async function getResult<T>(response: Response): Promise<ApiResult<T>> {
  return response.json();
}

function toggleValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

export default function SettingsPage() {
  useLang();

  const [activeTab, setActiveTab] = useState<Tab>("admins");
  const [loading, setLoading] = useState(true);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [canViewAudit, setCanViewAudit] = useState(false);
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [builtInPermissions, setBuiltInPermissions] = useState<Permission[]>([]);
  const [customPermissions, setCustomPermissions] = useState<Permission[]>([]);
  const [roleSettings, setRoleSettings] = useState<RoleSetting[]>([]);
  const [auditPage, setAuditPage] = useState<AuditPage>({
    items: [],
    pagination: { page: 1, pageSize: 50, total: 0, totalPages: 1 },
  });
  const [auditLoading, setAuditLoading] = useState(false);
  const [pageError, setPageError] = useState("");

  const allPermissions = useMemo(
    () => [...builtInPermissions, ...customPermissions],
    [builtInPermissions, customPermissions],
  );

  const loadAuditPage = useCallback(async (page: number) => {
    setAuditLoading(true);
    try {
      const response = await fetch(`/api/audit-logs?page=${page}`);
      if (response.status === 403) {
        setCanViewAudit(false);
        return false;
      }

      const result = await getResult<AuditPage>(response);
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to load activity");
      }

      setAuditPage(result.data);
      setCanViewAudit(true);
      return true;
    } catch (error) {
      console.error("Load audit log error:", error);
      setPageError(
        error instanceof Error ? error.message : "Unable to load activity",
      );
      return false;
    } finally {
      setAuditLoading(false);
    }
  }, []);

  const loadPage = useCallback(async (selectInitialTab = false) => {
    try {
      const currentResponse = await fetch("/api/auth/me");
      setPageError("");
      const current = await getResult<AdminAccount>(currentResponse);
      if (!currentResponse.ok || !current.success) {
        throw new Error(current.message || "Unable to load account");
      }

      const superadmin = current.data.role === "SUPERADMIN";
      setIsSuperadmin(superadmin);

      if (superadmin) {
        const [adminsResponse, permissionResponse] = await Promise.all([
          fetch("/api/admins"),
          fetch("/api/settings/permissions"),
        ]);
        const [adminsResult, permissionsResult] = await Promise.all([
          getResult<AdminAccount[]>(adminsResponse),
          getResult<{
            builtInPermissions: Permission[];
            customPermissions: Permission[];
            roles: RoleSetting[];
          }>(permissionResponse),
        ]);

        if (!adminsResponse.ok || !adminsResult.success) {
          throw new Error(adminsResult.message || "Unable to load admin accounts");
        }
        if (!permissionResponse.ok || !permissionsResult.success) {
          throw new Error(permissionsResult.message || "Unable to load permissions");
        }

        setAdmins(adminsResult.data);
        setBuiltInPermissions(permissionsResult.data.builtInPermissions);
        setCustomPermissions(permissionsResult.data.customPermissions);
        setRoleSettings(permissionsResult.data.roles);
      }

      const hasAuditAccess = await loadAuditPage(1);
      if (selectInitialTab) {
        if (hasAuditAccess) setActiveTab("audit");
        else if (superadmin) setActiveTab("admins");
      }
    } catch (error) {
      console.error("Load settings error:", error);
      setPageError(
        error instanceof Error ? error.message : "Unable to load settings",
      );
    } finally {
      setLoading(false);
    }
  }, [loadAuditPage]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) void loadPage(true);
    });
    return () => {
      active = false;
    };
  }, [loadPage]);

  const tabs = [
    ...(isSuperadmin
      ? [{ id: "admins" as const, label: "Admin users", icon: Users }]
      : []),
    ...(isSuperadmin
      ? [{ id: "permissions" as const, label: "Roles & access", icon: Shield }]
      : []),
    ...(canViewAudit
      ? [{ id: "audit" as const, label: "Audit activity", icon: ScrollText }]
      : []),
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-10">
      <header className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-6 py-7 text-white shadow-sm sm:px-8">
        <p className="text-xs font-semibold tracking-[0.18em] text-sky-300 uppercase">
          {translateUI("Workspace")}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          {translateUI("Settings")}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
          {translateUI("Manage your team, access, and account activity in one place.")}
        </p>
      </header>

      {pageError && <Feedback error={pageError} />}

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-sky-600" />
        </div>
      ) : tabs.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <Shield className="mx-auto h-9 w-9 text-slate-400" />
          <h2 className="mt-3 font-semibold text-slate-900">
            {translateUI("Settings are managed by your administrator")}
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            {translateUI("Ask a Superadmin to grant you access to the audit activity.")}
          </p>
        </div>
      ) : (
        <>
          <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    selected
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {translateUI(tab.label)}
                </button>
              );
            })}
          </nav>

          {activeTab === "admins" && isSuperadmin && (
            <AdminUsersPanel
              admins={admins}
              permissions={allPermissions}
              onChange={setAdmins}
              onRefresh={loadPage}
            />
          )}
          {activeTab === "permissions" && isSuperadmin && (
            <PermissionsPanel
              builtInPermissions={builtInPermissions}
              customPermissions={customPermissions}
              roles={roleSettings}
              onRolesChange={setRoleSettings}
              onCustomChange={setCustomPermissions}
            />
          )}
          {activeTab === "audit" && canViewAudit && (
            <AuditLogPanel
              page={auditPage}
              loading={auditLoading}
              onPageChange={loadAuditPage}
            />
          )}
        </>
      )}
    </div>
  );
}

function AdminUsersPanel({
  admins,
  permissions,
  onChange,
  onRefresh,
}: {
  admins: AdminAccount[];
  permissions: Permission[];
  onChange: (admins: AdminAccount[]) => void;
  onRefresh: (selectInitialTab?: boolean) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<AdminAccount | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const visibleAdmins = admins.filter((admin) =>
    `${admin.name} ${admin.email} ${admin.role}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );

  const saveAccount = async (account: AdminAccount, password?: string) => {
    const isNew = !account._id;
    const response = await fetch(
      isNew ? "/api/admins" : `/api/admins/${account._id}`,
      {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...account, ...(password ? { password } : {}) }),
      },
    );
    const result = await getResult<AdminAccount>(response);
    if (!response.ok || !result.success) {
      throw new Error(result.message || "Unable to save admin account");
    }

    if (isNew) {
      onChange([result.data, ...admins]);
    } else {
      onChange(admins.map((admin) => admin._id === account._id ? account : admin));
    }

    setCreating(false);
    setEditing(null);
    setError("");
  };

  const deleteAccount = async (account: AdminAccount) => {
    const response = await fetch(`/api/admins/${account._id}`, {
      method: "DELETE",
    });
    const result = await getResult<unknown>(response);
    if (!response.ok || !result.success) {
      throw new Error(result.message || "Unable to delete admin account");
    }
    onChange(admins.filter((item) => item._id !== account._id));
    setEditing(null);
    setError("");
  };

  const handleSave = async (account: AdminAccount, password?: string) => {
    try {
      setError("");
      await saveAccount(account, password);
      if (!account._id) await onRefresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save account");
      throw cause;
    }
  };

  const handleDelete = async (account: AdminAccount) => {
    try {
      setError("");
      await deleteAccount(account);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to delete account");
      throw cause;
    }
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {translateUI("Your team")}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {translateUI("Add team members and choose what they can access.")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setError("");
            setCreating(true);
          }}
          className={PRIMARY_BUTTON}
        >
          <Plus className="h-4 w-4" />
          {translateUI("Add team member")}
        </button>
      </div>

      {error && <Feedback error={error} />}

      <div className="relative">
        <UserRound className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={translateUI("Search by name, email, or role")}
          className="h-12 w-full rounded-2xl border border-slate-200 bg-white pr-4 pl-11 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
        />
      </div>

      {visibleAdmins.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Users className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-700">
            {admins.length === 0 ? translateUI("No team members yet") : translateUI("No matching team members")}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {translateUI("Add a team member to get started.")}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {visibleAdmins.map((admin) => (
            <article
              key={admin._id}
              className="flex min-w-0 items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-lg font-semibold text-white">
                {admin.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate font-semibold text-slate-900">{admin.name}</h3>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    admin.isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}>
                    {translateUI(admin.isActive ? "Active" : "Inactive")}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-sm text-slate-500">{admin.email}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {translateUI(admin.role)}
                  {admin.permissions.length > 0
                    ? ` · ${admin.permissions.length} ${translateUI("extra access grants")}`
                    : ""}
                </p>
              </div>
              {admin.role === "SUPERADMIN" ? (
                <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">
                  {translateUI("Protected")}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setEditing(admin);
                  }}
                  className={SECONDARY_BUTTON}
                >
                  {translateUI("Manage")}
                </button>
              )}
            </article>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <AdminEditor
          key={editing?._id ?? "new-admin"}
          admin={editing}
          permissions={permissions}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </section>
  );
}

function AdminEditor({
  admin,
  permissions,
  onClose,
  onSave,
  onDelete,
}: {
  admin: AdminAccount | null;
  permissions: Permission[];
  onClose: () => void;
  onSave: (account: AdminAccount, password?: string) => Promise<void>;
  onDelete: (account: AdminAccount) => Promise<void>;
}) {
  const [draft, setDraft] = useState<AdminAccount>(
    admin ?? {
      _id: "",
      name: "",
      email: "",
      role: "STAFF",
      isActive: true,
      permissions: [],
    },
  );
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const update = (changes: Partial<AdminAccount>) =>
    setDraft((current) => ({ ...current, ...changes }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSave(draft, password || undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save changes");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!admin || !window.confirm(`Remove ${admin.name} from the team?`)) return;
    setBusy(true);
    setError("");
    try {
      await onDelete(admin);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to remove account");
      setBusy(false);
    }
  };

  return (
    <Modal onClose={onClose} wide>
      <form onSubmit={submit} className="flex max-h-[90dvh] flex-col">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-7">
          <div>
            <p className="text-xs font-semibold tracking-wide text-sky-700 uppercase">
              {translateUI(admin ? "Team member" : "New account")}
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">
              {translateUI(admin ? "Manage team member" : "Add team member")}
            </h2>
          </div>
          <button type="button" onClick={onClose} className={ICON_BUTTON} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 overflow-y-auto px-5 py-5 sm:px-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Full name"
              value={draft.name}
              onChange={(value) => update({ name: value })}
              required
            />
            <TextField
              label="Email address"
              type="email"
              value={draft.email}
              onChange={(value) => update({ email: value })}
              required
            />
            {!admin && (
              <TextField
                label="Temporary password"
                type="password"
                value={password}
                onChange={setPassword}
                minLength={8}
                required
              />
            )}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                {translateUI("Role")}
              </label>
              <select
                value={draft.role}
                onChange={(event) => update({ role: event.target.value as ManagedRole })}
                className={INPUT_CLASS}
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>{translateUI(role)}</option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-slate-500">
                {translateUI(
                  draft.role === "SUPERADMIN"
                    ? "The Superadmin account has full access."
                    : ROLE_COPY[draft.role],
                )}
              </p>
            </div>
            {admin && (
              <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3">
                <span>
                  <span className="block text-sm font-medium text-slate-800">
                    {translateUI("Account active")}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {translateUI("Inactive users can no longer sign in.")}
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={(event) => update({ isActive: event.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-sky-600"
                />
              </label>
            )}
          </div>

          <div className="border-t border-slate-100 pt-5">
            <div className="mb-4">
              <h3 className="font-semibold text-slate-900">
                {translateUI("Extra access")}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {translateUI("These permissions add to the selected role.")}
              </p>
            </div>
            <PermissionSelector
              permissions={permissions}
              selected={draft.permissions}
              onChange={(selected) => update({ permissions: selected })}
            />
          </div>
          {error && <Feedback error={error} />}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 sm:px-7">
          <div>
            {admin && (
              <button
                type="button"
                onClick={remove}
                disabled={busy}
                className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {translateUI("Remove account")}
              </button>
            )}
          </div>
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={onClose} className={SECONDARY_BUTTON}>
              {translateUI("Cancel")}
            </button>
            <button type="submit" disabled={busy} className={PRIMARY_BUTTON}>
              {busy ? translateUI("Saving...") : translateUI(admin ? "Save changes" : "Create account")}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function PermissionsPanel({
  builtInPermissions,
  customPermissions,
  roles,
  onRolesChange,
  onCustomChange,
}: {
  builtInPermissions: Permission[];
  customPermissions: Permission[];
  roles: RoleSetting[];
  onRolesChange: (roles: RoleSetting[]) => void;
  onCustomChange: (permissions: Permission[]) => void;
}) {
  const [editingRole, setEditingRole] = useState<RoleSetting | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const saveRole = async (updated: RoleSetting) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/settings/permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      const result = await getResult<unknown>(response);
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to save role access");
      }
      onRolesChange(roles.map((item) => item.role === updated.role ? updated : item));
      setEditingRole(null);
      setNotice(result.message || "Role access saved");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save role access");
      throw cause;
    } finally {
      setBusy(false);
    }
  };

  const addCustomPermission = async (
    name: string,
    description: string,
    grants: string[],
  ) => {
    setBusy(true);
    setError("");
    try {
      const keyPart = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 38);
      const key = `custom.${keyPart.length >= 2 ? keyPart : "access"}-${Date.now().toString(36)}`;
      const response = await fetch("/api/settings/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, name, description, grants }),
      });
      const result = await getResult<unknown>(response);
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to create access group");
      }

      const refresh = await fetch("/api/settings/permissions");
      const refreshed = await getResult<{
        customPermissions: Permission[];
        roles: RoleSetting[];
      }>(refresh);
      if (!refresh.ok || !refreshed.success) {
        throw new Error(refreshed.message || "Access group created but settings could not refresh");
      }

      onCustomChange(refreshed.data.customPermissions);
      onRolesChange(refreshed.data.roles);
      setCreating(false);
      setNotice("Access group created. You can now assign it to a role or team member.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create access group");
      throw cause;
    } finally {
      setBusy(false);
    }
  };

  const removeCustomPermission = async (permission: Permission) => {
    if (!window.confirm(`Remove the "${permission.name}" access group?`)) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/settings/permissions/${encodeURIComponent(permission.key)}`,
        { method: "DELETE" },
      );
      const result = await getResult<unknown>(response);
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to remove access group");
      }
      onCustomChange(customPermissions.filter((item) => item.key !== permission.key));
      onRolesChange(
        roles.map((item) => ({
          ...item,
          permissions: item.permissions.filter((key) => key !== permission.key),
        })),
      );
      setNotice("Access group removed");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to remove access group");
    } finally {
      setBusy(false);
    }
  };

  const allPermissions = [...builtInPermissions, ...customPermissions];

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {translateUI("Access by role")}
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              {translateUI("Choose which areas each role can use. Changes apply to everyone with that role.")}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-violet-50 px-3 py-2 text-xs font-medium text-violet-800">
            <Shield className="h-4 w-4" />
            {translateUI("Superadmin always has full access")}
          </div>
        </div>

        {error && <Feedback error={error} />}
        {notice && <Feedback notice={notice} />}

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {roles.map((item) => (
            <RoleCard
              key={item.role}
              setting={item}
              permissions={allPermissions}
              onEdit={() => {
                setError("");
                setEditingRole(item);
              }}
            />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {translateUI("Custom access groups")}
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              {translateUI("Bundle a few permissions together, then assign that group to a role or person.")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setError("");
              setCreating(true);
            }}
            className={PRIMARY_BUTTON}
          >
            <Plus className="h-4 w-4" />
            {translateUI("Create access group")}
          </button>
        </div>

        {customPermissions.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <KeyRound className="mx-auto h-7 w-7 text-slate-300" />
            <p className="mt-2 text-sm font-medium text-slate-700">
              {translateUI("No custom access groups yet")}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {translateUI("Create a group to quickly assign the same access to several people.")}
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {customPermissions.map((permission) => (
              <article key={permission.key} className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-slate-900">{permission.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {permission.description || `${permission.grants?.length ?? 0} ${translateUI("access options included")}`}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    {permission.grants?.length ?? 0} {translateUI("permissions included")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeCustomPermission(permission)}
                  disabled={busy}
                  className={ICON_BUTTON}
                  aria-label={translateUI("Remove access group")}
                >
                  <Trash2 className="h-4 w-4 text-slate-400" />
                </button>
              </article>
            ))}
          </div>
        )}
      </div>

      {editingRole && (
        <RoleEditor
          key={editingRole.role}
          setting={editingRole}
          permissions={allPermissions}
          busy={busy}
          onClose={() => setEditingRole(null)}
          onSave={saveRole}
        />
      )}
      {creating && (
        <CustomPermissionEditor
          permissions={builtInPermissions}
          busy={busy}
          onClose={() => setCreating(false)}
          onSave={addCustomPermission}
        />
      )}
    </section>
  );
}

function RoleCard({
  setting,
  permissions,
  onEdit,
}: {
  setting: RoleSetting;
  permissions: Permission[];
  onEdit: () => void;
}) {
  const permissionMap = new Map(permissions.map((item) => [item.key, item]));
  const assigned = setting.permissions
    .map((key) => permissionMap.get(key))
    .filter((item): item is Permission => Boolean(item));
  const preview = assigned.slice(0, 3).map((item) => item.name);

  return (
    <article className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm">
          <Users className="h-5 w-5" />
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
          {assigned.length} {translateUI("access options")}
        </span>
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">
        {translateUI(setting.role)}
      </h3>
      <p className="mt-1 min-h-10 text-sm leading-5 text-slate-500">
        {translateUI(ROLE_COPY[setting.role])}
      </p>
      <div className="mt-4 min-h-16 space-y-1">
        {preview.length > 0 ? preview.map((name) => (
          <p key={name} className="flex items-center gap-2 text-xs text-slate-600">
            <Check className="h-3.5 w-3.5 text-emerald-600" />
            <span className="truncate">{name}</span>
          </p>
        )) : (
          <p className="text-xs text-slate-400">{translateUI("No access selected")}</p>
        )}
        {assigned.length > preview.length && (
          <p className="pl-5 text-xs text-slate-400">
            +{assigned.length - preview.length} {translateUI("more")}
          </p>
        )}
      </div>
      <button type="button" onClick={onEdit} className={`${SECONDARY_BUTTON} mt-5 w-full`}>
        {translateUI("Edit role access")}
      </button>
    </article>
  );
}

function RoleEditor({
  setting,
  permissions,
  busy,
  onClose,
  onSave,
}: {
  setting: RoleSetting;
  permissions: Permission[];
  busy: boolean;
  onClose: () => void;
  onSave: (setting: RoleSetting) => Promise<void>;
}) {
  const [selected, setSelected] = useState(setting.permissions);
  const [error, setError] = useState("");
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    try {
      await onSave({ role: setting.role, permissions: selected });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save access");
    }
  };

  return (
    <Modal onClose={onClose} wide>
      <form onSubmit={save} className="flex max-h-[90dvh] flex-col">
        <ModalHeader
          eyebrow={translateUI("Role access")}
          title={`${translateUI(setting.role)} ${translateUI("access")}`}
          onClose={onClose}
        />
        <div className="space-y-5 overflow-y-auto px-5 py-5 sm:px-7">
          <p className="rounded-xl bg-sky-50 px-4 py-3 text-sm leading-5 text-sky-900">
            {translateUI("These choices apply to every admin with this role.")}
          </p>
          <PermissionSelector
            permissions={permissions}
            selected={selected}
            onChange={setSelected}
          />
          {error && <Feedback error={error} />}
        </div>
        <ModalFooter onClose={onClose} busy={busy} saveLabel="Save role access" />
      </form>
    </Modal>
  );
}

function CustomPermissionEditor({
  permissions,
  busy,
  onClose,
  onSave,
}: {
  permissions: Permission[];
  busy: boolean;
  onClose: () => void;
  onSave: (name: string, description: string, grants: string[]) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    try {
      await onSave(name.trim(), description.trim(), selected);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create access group");
    }
  };

  return (
    <Modal onClose={onClose} wide>
      <form onSubmit={save} className="flex max-h-[90dvh] flex-col">
        <ModalHeader
          eyebrow={translateUI("Custom access")}
          title={translateUI("Create access group")}
          onClose={onClose}
        />
        <div className="space-y-5 overflow-y-auto px-5 py-5 sm:px-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Group name" value={name} onChange={setName} required />
            <TextField label="Short description" value={description} onChange={setDescription} />
          </div>
          <div>
            <h3 className="mb-1 text-sm font-semibold text-slate-900">
              {translateUI("Choose access")}
            </h3>
            <p className="mb-4 text-xs text-slate-500">
              {translateUI("Select the areas and actions included in this group.")}
            </p>
            <PermissionSelector
              permissions={permissions}
              selected={selected}
              onChange={setSelected}
            />
          </div>
          {error && <Feedback error={error} />}
        </div>
        <ModalFooter
          onClose={onClose}
          busy={busy}
          saveLabel="Create access group"
          disabled={selected.length === 0}
        />
      </form>
    </Modal>
  );
}

function PermissionSelector({
  permissions,
  selected,
  onChange,
}: {
  permissions: Permission[];
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  const groups = permissions.reduce<Record<string, Permission[]>>((result, permission) => {
    const group = permission.key.startsWith("custom.")
      ? "custom"
      : permission.key.split(".")[0];
    result[group] = [...(result[group] ?? []), permission];
    return result;
  }, {});
  const names = new Map(permissions.map((item) => [item.key, item.name]));

  return (
    <div className="space-y-3">
      {Object.entries(groups).map(([group, items]) => (
        <details key={group} open={group === "inventory" || group === "dashboard"} className="group rounded-xl border border-slate-200 bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
            <span className="text-sm font-semibold text-slate-800">
              {translateUI(GROUP_NAMES[group] ?? group)}
              <span className="ml-2 text-xs font-normal text-slate-400">
                {items.filter((item) => selected.includes(item.key)).length}/{items.length}
              </span>
            </span>
            <ChevronDown className="h-4 w-4 text-slate-400 transition group-open:rotate-180" />
          </summary>
          <div className="grid gap-2 border-t border-slate-100 p-3 sm:grid-cols-2">
            {items.map((permission) => {
              const customGrantNames = permission.grants
                ?.map((key) => names.get(key))
                .filter(Boolean)
                .join(", ");
              return (
                <label
                  key={permission.key}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                    selected.includes(permission.key)
                      ? "border-sky-200 bg-sky-50/70"
                      : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(permission.key)}
                    onChange={() => onChange(toggleValue(selected, permission.key))}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-800">
                      {permission.name}
                    </span>
                    <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                      {permission.description || customGrantNames || translateUI("Additional access")}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </details>
      ))}
    </div>
  );
}

function AuditLogPanel({
  page,
  loading,
  onPageChange,
}: {
  page: AuditPage;
  loading: boolean;
  onPageChange: (page: number) => Promise<boolean>;
}) {
  const { items, pagination } = page;
  const firstItem = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const lastItem = Math.min(pagination.page * pagination.pageSize, pagination.total);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
            <Clock3 className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-semibold text-slate-900">
              {translateUI("Audit activity")}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {translateUI("A record of recent changes and sign-ins.")}
            </p>
          </div>
        </div>
        <span className="self-start rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 sm:self-auto">
          {pagination.total} {translateUI("total events")}
        </span>
      </div>

      {items.length === 0 && !loading ? (
        <div className="p-10 text-center">
          <ScrollText className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-700">
            {translateUI("No activity to show")}
          </p>
        </div>
      ) : (
        <div className={`overflow-x-auto transition-opacity ${loading ? "opacity-50" : ""}`}>
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-5 py-3">{translateUI("When")}</th>
                <th className="px-5 py-3">{translateUI("Person")}</th>
                <th className="px-5 py-3">{translateUI("Activity")}</th>
                <th className="px-5 py-3">{translateUI("Details")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((entry) => (
                <tr key={entry._id} className="align-top text-slate-600">
                  <td className="whitespace-nowrap px-5 py-4 text-xs">
                    {new Date(entry.createdAt).toLocaleString()}
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-800">
                      {entry.actorName || translateUI("System")}
                    </p>
                    {entry.actorRole && (
                      <p className="mt-0.5 text-xs text-slate-400">
                        {translateUI(entry.actorRole)}
                      </p>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {translateUI(ACTION_LABELS[entry.action] ?? entry.action)}
                    </span>
                    <p className="mt-1 text-xs text-slate-400">
                      {translateUI(ENTITY_LABELS[entry.entity] ?? entry.entity)}
                    </p>
                  </td>
                  <td className="max-w-md px-5 py-4 leading-5 text-slate-600">
                    {entry.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <footer className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">
          {translateUI("Showing")} {firstItem}–{lastItem} {translateUI("of")} {pagination.total}
        </p>
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <span className="mr-2 text-xs font-medium text-slate-500">
            {translateUI("Page")} {pagination.page} {translateUI("of")} {pagination.totalPages}
          </span>
          <button
            type="button"
            disabled={loading || pagination.page <= 1}
            onClick={() => void onPageChange(pagination.page - 1)}
            className={SECONDARY_BUTTON}
          >
            <ArrowLeft className="h-4 w-4" />
            {translateUI("Previous")}
          </button>
          <button
            type="button"
            disabled={loading || pagination.page >= pagination.totalPages}
            onClick={() => void onPageChange(pagination.page + 1)}
            className={SECONDARY_BUTTON}
          >
            {translateUI("Next")}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </footer>
    </section>
  );
}

function Modal({
  children,
  onClose,
  wide = false,
}: {
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        aria-label={translateUI("Close")}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative z-10 w-full overflow-hidden rounded-2xl bg-white shadow-2xl ${
          wide ? "max-w-4xl" : "max-w-xl"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function ModalHeader({
  eyebrow,
  title,
  onClose,
}: {
  eyebrow: string;
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-7">
      <div>
        <p className="text-xs font-semibold tracking-wide text-sky-700 uppercase">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-xl font-bold text-slate-900">{title}</h2>
      </div>
      <button type="button" onClick={onClose} className={ICON_BUTTON} aria-label={translateUI("Close")}>
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

function ModalFooter({
  onClose,
  busy,
  saveLabel,
  disabled = false,
}: {
  onClose: () => void;
  busy: boolean;
  saveLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4 sm:px-7">
      <button type="button" onClick={onClose} className={SECONDARY_BUTTON}>
        {translateUI("Cancel")}
      </button>
      <button type="submit" disabled={busy || disabled} className={PRIMARY_BUTTON}>
        {busy ? translateUI("Saving...") : translateUI(saveLabel)}
      </button>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  minLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {translateUI(label)}
      </label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        minLength={minLength}
        className={INPUT_CLASS}
      />
    </div>
  );
}

function Feedback({
  error,
  notice,
}: {
  error?: string;
  notice?: string;
}) {
  if (!error && !notice) return null;
  return (
    <p
      role={error ? "alert" : "status"}
      className={`rounded-xl px-4 py-3 text-sm ${
        error
          ? "border border-red-200 bg-red-50 text-red-700"
          : "border border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      {translateUI(error || notice || "")}
    </p>
  );
}

const ICON_BUTTON =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900";
