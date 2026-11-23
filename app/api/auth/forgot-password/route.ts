import { NextRequest } from "next/server";
import { sendPasswordResetCode } from "@/controllers/passwordController";

export async function POST(request: NextRequest) {
  try {
    return await sendPasswordResetCode(request);
  } catch (error) {
    console.error("Forgot password request error:", error);

    return Response.json(
      { success: false, message: "Invalid request data" },
      { status: 400 },
    );
  }
}
