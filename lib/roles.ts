export type AdminRole =
  | "SUPERADMIN"
  | "OWNER"
  | "MANAGER"
  | "STAFF";

export const MANAGED_ROLES: Exclude<AdminRole, "SUPERADMIN">[] = [
  "OWNER",
  "MANAGER",
  "STAFF",
];
