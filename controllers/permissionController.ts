import { NextRequest, NextResponse } from "next/server";

import { requireSuperadmin } from "@/lib/authorization";
import { connectDB } from "@/lib/mongodb";
import {
  BUILT_IN_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  getKnownPermissionKeys,
} from "@/lib/permission-catalog";
import { createAuditLog } from "@/lib/audit";
import { MANAGED_ROLES } from "@/lib/roles";
import Admin from "@/models/Admin";
import CustomPermission from "@/models/CustomPermission";
import RolePermissions from "@/models/RolePermissions";

export async function getPermissionSettings(request: NextRequest) {
  const actor = await requireSuperadmin(request);
  if (actor instanceof Response) return actor;

  try {
    await connectDB();
    const [customPermissions, roleSettings] = await Promise.all([
      CustomPermission.find().sort({ name: 1 }).lean(),
      RolePermissions.find().lean(),
    ]);
    const configuredRoles = new Map(
      roleSettings.map((item) => [item.role, item.permissions]),
    );

    return NextResponse.json({
      success: true,
      data: {
        builtInPermissions: BUILT_IN_PERMISSIONS,
        customPermissions,
        roles: MANAGED_ROLES.map((role) => ({
          role,
          permissions:
            configuredRoles.get(role) ?? DEFAULT_ROLE_PERMISSIONS[role],
        })),
      },
    });
  } catch (error) {
    console.error("Load permission settings error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load permission settings" },
      { status: 500 },
    );
  }
}

export async function createCustomPermission(request: NextRequest) {
  const actor = await requireSuperadmin(request);
  if (actor instanceof Response) return actor;

  try {
    const data = await request.json();
    const key = typeof data.key === "string" ? data.key.trim().toLowerCase() : "";
    const name = typeof data.name === "string" ? data.name.trim() : "";
    const description =
      typeof data.description === "string" ? data.description.trim() : "";
    const grants = data.grants;
    const builtinKeys = BUILT_IN_PERMISSIONS.map((permission) => permission.key);

    if (
      !/^custom\.[a-z0-9-]{2,48}$/.test(key) ||
      !name ||
      name.length > 80 ||
      description.length > 240 ||
      !Array.isArray(grants) ||
      grants.length === 0 ||
      !grants.every(
        (grant: unknown) =>
          typeof grant === "string" && builtinKeys.includes(grant),
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Provide a custom key, name, and at least one valid permission to grant",
        },
        { status: 400 },
      );
    }

    await connectDB();
    const custom = await CustomPermission.create({
      key,
      name,
      description,
      grants: [...new Set(grants)],
    });
    await createAuditLog({
      actor,
      action: "CREATE",
      entity: "AUTH",
      description: `Permission "${custom.name}" was created`,
      after: { key: custom.key, grants: custom.grants },
    });

    return NextResponse.json(
      { success: true, message: "Permission created" },
      { status: 201 },
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        { success: false, message: "That permission key already exists" },
        { status: 409 },
      );
    }
    console.error("Create custom permission error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create permission" },
      { status: 500 },
    );
  }
}

export async function updateRolePermissions(request: NextRequest) {
  const actor = await requireSuperadmin(request);
  if (actor instanceof Response) return actor;

  try {
    const data = await request.json();
    const role = data.role;
    const permissions = data.permissions;

    if (
      !MANAGED_ROLES.includes(role) ||
      !Array.isArray(permissions) ||
      !permissions.every((permission) => typeof permission === "string")
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid role permission settings" },
        { status: 400 },
      );
    }

    await connectDB();
    const custom = await CustomPermission.find()
      .select("key")
      .lean();
    const knownKeys = getKnownPermissionKeys(custom.map((permission) => permission.key));

    if (!permissions.every((permission) => knownKeys.has(permission))) {
      return NextResponse.json(
        { success: false, message: "One or more permissions are invalid" },
        { status: 400 },
      );
    }

    await RolePermissions.findOneAndUpdate(
      { role },
      { $set: { role, permissions: [...new Set(permissions)] } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    await createAuditLog({
      actor,
      action: "UPDATE",
      entity: "AUTH",
      description: `Permissions for role "${role}" were updated`,
      after: { role, permissions },
    });

    return NextResponse.json({
      success: true,
      message: "Role permissions updated",
    });
  } catch (error) {
    console.error("Update role permissions error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update role permissions" },
      { status: 500 },
    );
  }
}

export async function deleteCustomPermission(
  request: NextRequest,
  key: string,
) {
  const actor = await requireSuperadmin(request);
  if (actor instanceof Response) return actor;

  try {
    await connectDB();
    const permission = await CustomPermission.findOneAndDelete({ key });

    if (!permission) {
      return NextResponse.json(
        { success: false, message: "Custom permission not found" },
        { status: 404 },
      );
    }

    await Promise.all([
      Admin.updateMany(
        { permissions: key },
        { $pull: { permissions: key } },
      ),
      RolePermissions.updateMany(
        { permissions: key },
        { $pull: { permissions: key } },
      ),
    ]);
    await createAuditLog({
      actor,
      action: "DELETE",
      entity: "AUTH",
      description: `Permission "${permission.name}" was deleted`,
      before: { key: permission.key, grants: permission.grants },
    });

    return NextResponse.json({
      success: true,
      message: "Permission deleted",
    });
  } catch (error) {
    console.error("Delete custom permission error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete permission" },
      { status: 500 },
    );
  }
}
