import { NextRequest } from "next/server";
import {
  createCustomPermission,
  getPermissionSettings,
  updateRolePermissions,
} from "@/controllers/permissionController";

export async function GET(request: NextRequest) {
  return getPermissionSettings(request);
}

export async function POST(request: NextRequest) {
  return createCustomPermission(request);
}

export async function PUT(request: NextRequest) {
  return updateRolePermissions(request);
}
