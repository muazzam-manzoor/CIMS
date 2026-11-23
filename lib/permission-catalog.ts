import type { AdminRole } from "@/lib/roles";

export type PermissionDefinition = {
  key: string;
  name: string;
  description: string;
  defaultRoles: AdminRole[];
};

const EVERY_ROLE: AdminRole[] = [
  "OWNER",
  "MANAGER",
  "STAFF",
];
const MANAGERS: AdminRole[] = ["OWNER", "MANAGER"];

export const BUILT_IN_PERMISSIONS: PermissionDefinition[] = [
  { key: "dashboard.view", name: "View dashboard", description: "Open the business dashboard.", defaultRoles: EVERY_ROLE },
  { key: "inventory.view", name: "View inventory", description: "View vehicles and inventory details.", defaultRoles: EVERY_ROLE },
  { key: "inventory.create", name: "Add vehicles", description: "Create vehicle records.", defaultRoles: MANAGERS },
  { key: "inventory.update", name: "Edit vehicles", description: "Update vehicle records.", defaultRoles: MANAGERS },
  { key: "inventory.delete", name: "Delete vehicles", description: "Delete vehicle records.", defaultRoles: MANAGERS },
  { key: "sales.view", name: "View sales", description: "View sales and sale details.", defaultRoles: EVERY_ROLE },
  { key: "sales.create", name: "Create sales", description: "Create sales records.", defaultRoles: MANAGERS },
  { key: "sales.return", name: "Return sales", description: "Process sale returns.", defaultRoles: MANAGERS },
  { key: "vehicleExpenses.view", name: "View vehicle expenses", description: "View vehicle expenses.", defaultRoles: EVERY_ROLE },
  { key: "vehicleExpenses.create", name: "Add vehicle expenses", description: "Create vehicle expenses.", defaultRoles: MANAGERS },
  { key: "vehicleExpenses.update", name: "Edit vehicle expenses", description: "Update vehicle expenses.", defaultRoles: MANAGERS },
  { key: "vehicleExpenses.delete", name: "Delete vehicle expenses", description: "Delete vehicle expenses.", defaultRoles: MANAGERS },
  { key: "generalExpenses.view", name: "View general expenses", description: "View general expenses.", defaultRoles: EVERY_ROLE },
  { key: "generalExpenses.create", name: "Add general expenses", description: "Create general expenses.", defaultRoles: MANAGERS },
  { key: "generalExpenses.update", name: "Edit general expenses", description: "Update general expenses.", defaultRoles: MANAGERS },
  { key: "generalExpenses.delete", name: "Delete general expenses", description: "Delete general expenses.", defaultRoles: MANAGERS },
  { key: "payments.view", name: "View payments", description: "View payment records.", defaultRoles: EVERY_ROLE },
  { key: "payments.create", name: "Create payments", description: "Create payment records.", defaultRoles: MANAGERS },
  { key: "payments.update", name: "Edit payments", description: "Update payment records.", defaultRoles: MANAGERS },
  { key: "payments.delete", name: "Delete payments", description: "Delete payment records.", defaultRoles: MANAGERS },
  { key: "partners.view", name: "View partners", description: "View finance partners.", defaultRoles: EVERY_ROLE },
  { key: "partners.create", name: "Add partners", description: "Create finance partners.", defaultRoles: MANAGERS },
  { key: "partners.update", name: "Edit partners", description: "Update finance partners.", defaultRoles: MANAGERS },
  { key: "partners.delete", name: "Delete partners", description: "Delete finance partners.", defaultRoles: MANAGERS },
  { key: "loans.view", name: "View loans", description: "View loans.", defaultRoles: EVERY_ROLE },
  { key: "loans.create", name: "Add loans", description: "Create loans.", defaultRoles: MANAGERS },
  { key: "loans.update", name: "Edit loans", description: "Update loans.", defaultRoles: MANAGERS },
  { key: "loans.delete", name: "Delete loans", description: "Delete loans.", defaultRoles: MANAGERS },
  { key: "financeTransactions.view", name: "View finance transactions", description: "View finance transactions.", defaultRoles: EVERY_ROLE },
  { key: "financeTransactions.create", name: "Add finance transactions", description: "Create finance transactions.", defaultRoles: MANAGERS },
  { key: "financeTransactions.update", name: "Edit finance transactions", description: "Update finance transactions.", defaultRoles: MANAGERS },
  { key: "financeTransactions.delete", name: "Delete finance transactions", description: "Delete finance transactions.", defaultRoles: MANAGERS },
  { key: "financeOverview.view", name: "View finance overview", description: "View the finance overview.", defaultRoles: EVERY_ROLE },
  { key: "reports.view", name: "View reports", description: "View business reports.", defaultRoles: MANAGERS },
  { key: "upload.create", name: "Upload files", description: "Upload application files.", defaultRoles: MANAGERS },
  { key: "auditLogs.view", name: "View audit log", description: "View system-wide audit events.", defaultRoles: [] },
];

export const DEFAULT_ROLE_PERMISSIONS = Object.fromEntries(
  (["OWNER", "MANAGER", "STAFF"] as const).map((role) => [
    role,
    BUILT_IN_PERMISSIONS
      .filter((permission) => permission.defaultRoles.includes(role))
      .map((permission) => permission.key),
  ]),
) as Record<Exclude<AdminRole, "SUPERADMIN">, string[]>;

export function getKnownPermissionKeys(customKeys: string[] = []) {
  return new Set([
    ...BUILT_IN_PERMISSIONS.map((permission) => permission.key),
    ...customKeys,
  ]);
}
