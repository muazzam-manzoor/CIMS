import { NextRequest } from "next/server";
import { deleteCustomPermission } from "@/controllers/permissionController";

type RouteContext = {
  params: Promise<{ key: string }>;
};

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
) {
  const { key } = await context.params;
  return deleteCustomPermission(request, key);
}
