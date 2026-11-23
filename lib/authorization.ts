import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import Admin from "@/models/Admin";
import CustomPermission from "@/models/CustomPermission";
import RolePermissions from "@/models/RolePermissions";
import {
  BUILT_IN_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
} from "@/lib/permission-catalog";
import type { AdminRole } from "@/lib/roles";
import {
  AUTH_COOKIE_NAME,
  getAuthFromRequest,
} from "@/lib/auth";

export const ALL_ROLES: AdminRole[] = [
  "OWNER",
  "MANAGER",
  "STAFF",
];

export const MANAGER_ROLES: AdminRole[] = [
  "OWNER",
  "MANAGER",
];

type AuthorizationContext = {
  userId: string;
  role: AdminRole;
  name: string;
};

async function loadAdmin(request: NextRequest) {
  const auth = await getAuthFromRequest(request);

  if (!auth || !mongoose.isValidObjectId(auth.userId)) {
    const response = NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
    response.cookies.delete(AUTH_COOKIE_NAME);
    return response;
  }

  await connectDB();
  const admin = await Admin.findOne({
    _id: auth.userId,
    isActive: true,
  }).select("_id name role permissions");

  if (!admin) {
    const response = NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
    response.cookies.delete(AUTH_COOKIE_NAME);
    return response;
  }

  return {
    admin,
    context: {
      userId: admin._id.toString(),
      role: admin.role,
      name: admin.name,
    } satisfies AuthorizationContext,
  };
}

export async function getEffectivePermissions(
  role: AdminRole,
  userPermissions: string[],
) {
  if (role === "SUPERADMIN") {
    return BUILT_IN_PERMISSIONS.map((permission) => permission.key);
  }

  const roleSettings = await RolePermissions.findOne({ role }).select(
    "permissions",
  );
  const assignedRolePermissions =
    roleSettings?.permissions ??
    DEFAULT_ROLE_PERMISSIONS[role];
  const assignedKeys = [
    ...new Set([...assignedRolePermissions, ...userPermissions]),
  ];
  const customKeys = assignedKeys.filter((key) => key.startsWith("custom."));

  if (customKeys.length === 0) {
    return assignedKeys;
  }

  const customPermissions = await CustomPermission.find({
    key: { $in: customKeys },
  })
    .select("grants")
    .lean();

  return [
    ...new Set([
      ...assignedKeys,
      ...customPermissions.flatMap((permission) => permission.grants),
    ]),
  ];
}

export async function requirePermission(
  request: NextRequest,
  permissionKey: string,
): Promise<AuthorizationContext | NextResponse> {
  const result = await loadAdmin(request);

  if (result instanceof NextResponse) {
    return result;
  }

  const permissions = await getEffectivePermissions(
    result.admin.role,
    result.admin.permissions ?? [],
  );

  if (!permissions.includes(permissionKey)) {
    return NextResponse.json(
      { success: false, message: "Forbidden" },
      { status: 403 },
    );
  }

  return result.context;
}

export async function requireSuperadmin(
  request: NextRequest,
): Promise<AuthorizationContext | NextResponse> {
  const result = await loadAdmin(request);

  if (result instanceof NextResponse) {
    return result;
  }

  if (result.admin.role !== "SUPERADMIN") {
    return NextResponse.json(
      { success: false, message: "Forbidden" },
      { status: 403 },
    );
  }

  return result.context;
}

function getRoutePermission(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const method = request.method.toUpperCase();

  if (/^\/api\/sales\/[^/]+\/return$/.test(pathname)) {
    return "sales.return";
  }

  const resources: Array<[string, string]> = [
    ["/api/vehicles", "inventory"],
    ["/api/sales", "sales"],
    ["/api/vehicle-expenses", "vehicleExpenses"],
    ["/api/general-expenses", "generalExpenses"],
    ["/api/payments", "payments"],
    ["/api/partners", "partners"],
    ["/api/loans", "loans"],
    ["/api/finance-transactions", "financeTransactions"],
  ];
  const resource = resources.find(([prefix]) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`),
  )?.[1];

  if (resource) {
    const action =
      method === "GET"
        ? "view"
        : method === "POST"
          ? "create"
          : method === "PUT" || method === "PATCH"
            ? "update"
            : method === "DELETE"
              ? "delete"
              : null;

    return action ? `${resource}.${action}` : null;
  }

  if (pathname === "/api/dashboard" && method === "GET") {
    return "dashboard.view";
  }
  if (pathname === "/api/finance/overview" && method === "GET") {
    return "financeOverview.view";
  }
  if (pathname === "/api/reports" && method === "GET") {
    return "reports.view";
  }
  if (pathname === "/api/upload" && method === "POST") {
    return "upload.create";
  }

  return null;
}

export async function requireRoles(
  request: NextRequest,
  allowedRoles: readonly AdminRole[],
) {
  void allowedRoles;
  const permissionKey = getRoutePermission(request);

  if (!permissionKey) {
    console.error(
      `No permission mapping for ${request.method} ${request.nextUrl.pathname}`,
    );
    return NextResponse.json(
      { success: false, message: "Permission is not configured for this endpoint" },
      { status: 500 },
    );
  }

  return requirePermission(request, permissionKey);
}
