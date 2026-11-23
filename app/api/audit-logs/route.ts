import { NextRequest, NextResponse } from "next/server";

import { requirePermission } from "@/lib/authorization";
import { connectDB } from "@/lib/mongodb";
import AuditLog from "@/models/AuditLog";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "auditLogs.view");
  if (auth instanceof Response) return auth;

  const rawPage = request.nextUrl.searchParams.get("page") ?? "1";
  if (!/^[1-9]\d*$/.test(rawPage)) {
    return NextResponse.json(
      { success: false, message: "Page must be a positive integer" },
      { status: 400 },
    );
  }
  const page = Number(rawPage);
  if (!Number.isSafeInteger(page)) {
    return NextResponse.json(
      { success: false, message: "Page must be a positive integer" },
      { status: 400 },
    );
  }

  const pageSize = 50;

  try {
    await connectDB();
    const total = await AuditLog.countDocuments();
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, totalPages);
    const logs = await AuditLog.find()
      .select("_id createdAt actorName actorRole action entity entityId description")
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize)
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        items: logs,
        pagination: {
          page: currentPage,
          pageSize,
          total,
          totalPages,
        },
      },
    });
  } catch (error) {
    console.error("Load audit logs error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load audit log" },
      { status: 500 },
    );
  }
}
