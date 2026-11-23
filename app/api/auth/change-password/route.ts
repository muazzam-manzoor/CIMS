import { NextRequest } from "next/server";
import { changeAdminPassword } from "@/controllers/passwordController";

export async function POST(request: NextRequest) {
  return changeAdminPassword(request);
}
