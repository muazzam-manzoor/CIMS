import { NextRequest } from "next/server";
import { resetAdminPassword } from "@/controllers/passwordController";

export async function POST(request: NextRequest) {
  try {
    return await resetAdminPassword(request);
  } catch (error) {
    console.error("Password reset request error:", error);

    return Response.json(
      { success: false, message: "Invalid request data" },
      { status: 400 },
    );
  }
}
