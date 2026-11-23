import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import {
  AUTH_COOKIE_NAME,
  getAuthFromRequest,
} from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import Admin from "@/models/Admin";
import AdminPasswordReset from "@/models/AdminPasswordReset";

const RESET_CODE_TTL_MS = 10 * 60 * 1000;
const RESET_CODE_RESEND_DELAY_MS = 60 * 1000;
const MAX_RESET_ATTEMPTS = 5;

function hashResetCode(code: string) {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("AUTH_SECRET is missing from environment variables");
  }

  return createHmac("sha256", secret).update(code).digest("hex");
}

function passwordsMatch(left: string, right: string) {
  const leftHash = Buffer.from(left, "hex");
  const rightHash = Buffer.from(right, "hex");

  return (
    leftHash.length === rightHash.length &&
    timingSafeEqual(leftHash, rightHash)
  );
}

function getMailer() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    throw new Error("EMAIL_USER and EMAIL_PASS are required to send password reset codes");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

export async function changeAdminPassword(
  request: NextRequest,
) {
  try {
    const auth = await getAuthFromRequest(request);

    if (!auth) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const data = await request.json();
    const { currentPassword, newPassword } = data;

    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      !currentPassword ||
      newPassword.length < 8
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Enter your current password and a new password of at least 8 characters",
        },
        { status: 400 },
      );
    }

    await connectDB();
    const admin = await Admin.findOne({
      _id: auth.userId,
      isActive: true,
    });

    if (!admin) {
      const response = NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
      response.cookies.delete(AUTH_COOKIE_NAME);
      return response;
    }

    if (!(await bcrypt.compare(currentPassword, admin.passwordHash))) {
      return NextResponse.json(
        { success: false, message: "Current password is incorrect" },
        { status: 400 },
      );
    }

    admin.passwordHash = await bcrypt.hash(newPassword, 12);
    await admin.save();

    await createAuditLog({
      actor: {
        userId: admin._id.toString(),
        name: admin.name,
        role: admin.role,
      },
      action: "UPDATE",
      entity: "AUTH",
      entityId: admin._id.toString(),
      description: `Admin "${admin.name}" changed their password`,
    });

    return NextResponse.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change admin password error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to change password" },
      { status: 500 },
    );
  }
}

export async function sendPasswordResetCode(request: NextRequest) {
  try {
    const data = await request.json();
    const email =
      typeof data.email === "string" ? data.email.trim().toLowerCase() : "";

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, message: "Enter a valid email address" },
        { status: 400 },
      );
    }

    await connectDB();
    const admin = await Admin.findOne({ email, isActive: true });

    if (!admin) {
      return NextResponse.json({
        success: true,
        message: "If an active account exists for this email, a reset code will be sent.",
      });
    }

    const now = new Date();
    const existingReset = await AdminPasswordReset.findOne({
      adminId: admin._id,
    });

    if (
      existingReset &&
      now.getTime() - existingReset.lastSentAt.getTime() <
        RESET_CODE_RESEND_DELAY_MS
    ) {
      return NextResponse.json({
        success: true,
        message: "If an active account exists for this email, a reset code will be sent.",
      });
    }

    const code = randomInt(100000, 1000000).toString();
    const resetCode = {
      codeHash: hashResetCode(code),
      expiresAt: new Date(now.getTime() + RESET_CODE_TTL_MS),
      attempts: 0,
      lastSentAt: now,
    };

    await AdminPasswordReset.findOneAndUpdate(
      { adminId: admin._id },
      { $set: resetCode },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    try {
      await getMailer().sendMail({
        from: process.env.EMAIL_USER,
        to: admin.email,
        subject: "Your CIMS password reset code",
        text: `Your CIMS password reset code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
      });
    } catch (error) {
      await AdminPasswordReset.deleteOne({ adminId: admin._id });
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: "If an active account exists for this email, a reset code will be sent.",
    });
  } catch (error) {
    console.error("Send password reset code error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to send a password reset code right now" },
      { status: 500 },
    );
  }
}

export async function resetAdminPassword(request: NextRequest) {
  try {
    const data = await request.json();
    const email =
      typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
    const code = typeof data.code === "string" ? data.code.trim() : "";
    const newPassword =
      typeof data.newPassword === "string" ? data.newPassword : "";

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !/^\d{6}$/.test(code) ||
      newPassword.length < 8
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Enter a valid email, 6-digit code, and new password of at least 8 characters",
        },
        { status: 400 },
      );
    }

    await connectDB();
    const admin = await Admin.findOne({ email, isActive: true });
    const invalidCodeResponse = () =>
      NextResponse.json(
        { success: false, message: "The reset code is invalid or expired" },
        { status: 400 },
      );

    if (!admin) {
      return invalidCodeResponse();
    }

    const now = new Date();
    const reset = await AdminPasswordReset.findOne({
      adminId: admin._id,
      expiresAt: { $gt: now },
      attempts: { $lt: MAX_RESET_ATTEMPTS },
    });

    if (!reset) {
      return invalidCodeResponse();
    }

    const candidateHash = hashResetCode(code);

    if (!passwordsMatch(candidateHash, reset.codeHash)) {
      await AdminPasswordReset.updateOne(
        {
          _id: reset._id,
          expiresAt: { $gt: now },
          attempts: { $lt: MAX_RESET_ATTEMPTS },
        },
        { $inc: { attempts: 1 } },
      );
      return invalidCodeResponse();
    }

    const claimedReset = await AdminPasswordReset.findOneAndDelete({
      _id: reset._id,
      codeHash: candidateHash,
      expiresAt: { $gt: now },
      attempts: { $lt: MAX_RESET_ATTEMPTS },
    });

    if (!claimedReset) {
      return invalidCodeResponse();
    }

    admin.passwordHash = await bcrypt.hash(newPassword, 12);
    await admin.save();

    await createAuditLog({
      actor: {
        userId: admin._id.toString(),
        name: admin.name,
        role: admin.role,
      },
      action: "UPDATE",
      entity: "AUTH",
      entityId: admin._id.toString(),
      description: `Admin "${admin.name}" reset their password`,
    });

    return NextResponse.json({
      success: true,
      message: "Password reset successfully. You can now sign in.",
    });
  } catch (error) {
    console.error("Reset admin password error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to reset password right now" },
      { status: 500 },
    );
  }
}
