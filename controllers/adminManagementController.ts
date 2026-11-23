import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

import { requireSuperadmin } from "@/lib/authorization";
import { connectDB } from "@/lib/mongodb";
import { BUILT_IN_PERMISSIONS } from "@/lib/permission-catalog";
import { createAuditLog } from "@/lib/audit";
import { MANAGED_ROLES } from "@/lib/roles";
import Admin from "@/models/Admin";
import AdminPasswordReset from "@/models/AdminPasswordReset";
import CustomPermission from "@/models/CustomPermission";

async function validatePermissions(value: unknown) {
  if (
    !Array.isArray(value) ||
    !value.every((permission) => typeof permission === "string")
  ) {
    return false;
  }

  const validKeys = new Set(
    BUILT_IN_PERMISSIONS.map((permission) => permission.key),
  );
  const custom = await CustomPermission.find({
    key: { $in: value },
  })
    .select("key")
    .lean();
  custom.forEach((permission) => validKeys.add(permission.key));

  return value.every((permission) => validKeys.has(permission));
}

export async function listAdminAccounts(request: NextRequest) {
  const actor = await requireSuperadmin(request);
  if (actor instanceof Response) return actor;

  try {
    await connectDB();
    const records = await Admin.find()
      .select("_id name email role isActive permissions createdAt updatedAt")
      .sort({ createdAt: -1 })
      .lean();
    const admins = records.map((admin) => ({
      ...admin,
      permissions: admin.permissions ?? [],
    }));

    return NextResponse.json({ success: true, data: admins });
  } catch (error) {
    console.error("List admin accounts error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load admin accounts" },
      { status: 500 },
    );
  }
}

export async function createAdminAccount(request: NextRequest) {
  const actor = await requireSuperadmin(request);
  if (actor instanceof Response) return actor;

  try {
    const data = await request.json();
    const name = typeof data.name === "string" ? data.name.trim() : "";
    const email =
      typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
    const password = typeof data.password === "string" ? data.password : "";
    const role = data.role;

    if (
      !name ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      password.length < 8 ||
      !MANAGED_ROLES.includes(role)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Enter a name, valid email, password of at least 8 characters, and a valid role",
        },
        { status: 400 },
      );
    }

    if (
      data.permissions !== undefined &&
      !(await validatePermissions(data.permissions))
    ) {
      return NextResponse.json(
        { success: false, message: "One or more permissions are invalid" },
        { status: 400 },
      );
    }

    await connectDB();
    const admin = await Admin.create({
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role,
      isActive: true,
      permissions: data.permissions ?? [],
    });

    await createAuditLog({
      actor,
      action: "CREATE",
      entity: "AUTH",
      entityId: admin._id.toString(),
      description: `Admin account "${admin.email}" was created`,
      after: { email: admin.email, role: admin.role },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Admin account created",
        data: {
          _id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          isActive: admin.isActive,
          permissions: admin.permissions,
        },
      },
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
        { success: false, message: "An admin with this email already exists" },
        { status: 409 },
      );
    }
    console.error("Create admin account error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create admin account" },
      { status: 500 },
    );
  }
}

export async function updateAdminAccount(
  request: NextRequest,
  adminId: string,
) {
  const actor = await requireSuperadmin(request);
  if (actor instanceof Response) return actor;

  try {
    if (!/^[a-f\d]{24}$/i.test(adminId)) {
      return NextResponse.json(
        { success: false, message: "Invalid admin ID" },
        { status: 400 },
      );
    }

    const data = await request.json();
    await connectDB();
    const admin = await Admin.findById(adminId);

    if (!admin || admin.role === "SUPERADMIN") {
      return NextResponse.json(
        { success: false, message: "Admin account not found" },
        { status: 404 },
      );
    }

    if (data.name !== undefined) {
      if (typeof data.name !== "string" || !data.name.trim()) {
        return NextResponse.json(
          { success: false, message: "Name is required" },
          { status: 400 },
        );
      }
      admin.name = data.name.trim();
    }
    if (data.email !== undefined) {
      if (
        typeof data.email !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())
      ) {
        return NextResponse.json(
          { success: false, message: "Enter a valid email address" },
          { status: 400 },
        );
      }
      admin.email = data.email.trim().toLowerCase();
    }
    if (data.role !== undefined) {
      if (!MANAGED_ROLES.includes(data.role)) {
        return NextResponse.json(
          { success: false, message: "Invalid role" },
          { status: 400 },
        );
      }
      admin.role = data.role;
    }
    if (data.isActive !== undefined) {
      if (typeof data.isActive !== "boolean") {
        return NextResponse.json(
          { success: false, message: "Invalid account status" },
          { status: 400 },
        );
      }
      admin.isActive = data.isActive;
    }
    if (data.permissions !== undefined) {
      if (!(await validatePermissions(data.permissions))) {
        return NextResponse.json(
          { success: false, message: "One or more permissions are invalid" },
          { status: 400 },
        );
      }
      admin.permissions = data.permissions;
    }

    await admin.save();
    await createAuditLog({
      actor,
      action: "UPDATE",
      entity: "AUTH",
      entityId: admin._id.toString(),
      description: `Admin account "${admin.email}" was updated`,
      after: {
        email: admin.email,
        role: admin.role,
        isActive: admin.isActive,
        permissions: admin.permissions,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Admin account updated",
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        { success: false, message: "An admin with this email already exists" },
        { status: 409 },
      );
    }
    console.error("Update admin account error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update admin account" },
      { status: 500 },
    );
  }
}

export async function deleteAdminAccount(
  request: NextRequest,
  adminId: string,
) {
  const actor = await requireSuperadmin(request);
  if (actor instanceof Response) return actor;

  try {
    if (!/^[a-f\d]{24}$/i.test(adminId)) {
      return NextResponse.json(
        { success: false, message: "Invalid admin ID" },
        { status: 400 },
      );
    }

    await connectDB();
    const admin = await Admin.findById(adminId);

    if (
      !admin ||
      admin.role === "SUPERADMIN" ||
      admin._id.toString() === actor.userId
    ) {
      return NextResponse.json(
        { success: false, message: "Admin account cannot be deleted" },
        { status: 400 },
      );
    }

    await createAuditLog({
      actor,
      action: "DELETE",
      entity: "AUTH",
      entityId: admin._id.toString(),
      description: `Admin account "${admin.email}" was deleted`,
      before: { email: admin.email, role: admin.role },
    });
    await AdminPasswordReset.deleteOne({ adminId: admin._id });
    await admin.deleteOne();

    return NextResponse.json({
      success: true,
      message: "Admin account deleted",
    });
  } catch (error) {
    console.error("Delete admin account error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete admin account" },
      { status: 500 },
    );
  }
}
