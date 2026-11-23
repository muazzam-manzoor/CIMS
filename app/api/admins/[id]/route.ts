import { NextRequest } from "next/server";
import {
  deleteAdminAccount,
  updateAdminAccount,
} from "@/controllers/adminManagementController";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  const { id } = await context.params;
  return updateAdminAccount(request, id);
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
) {
  const { id } = await context.params;
  return deleteAdminAccount(request, id);
}
