import { NextRequest } from "next/server";
import {
  createAdminAccount,
  listAdminAccounts,
} from "@/controllers/adminManagementController";

export async function GET(request: NextRequest) {
  return listAdminAccounts(request);
}

export async function POST(request: NextRequest) {
  return createAdminAccount(request);
}
