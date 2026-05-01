import { requireAdmin } from "@/server/auth";
import { container } from "@/server/container";
import { err } from "@/lib/result";
import {
  buildUsersCsv,
  buildCoursesCsv,
  buildProgressCsv,
} from "@/server/services/export";
import { NextResponse } from "next/server";

// UTF-8 BOM — Excel での文字化け回避
const BOM = "﻿";

function yyyymmdd(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function csvResponse(csv: string, filename: string): Response {
  return new Response(BOM + csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function GET(req: Request) {
  // 認可ガード
  let actor;
  try {
    actor = await requireAdmin();
  } catch {
    return NextResponse.json(
      err("UNAUTHENTICATED", "管理者権限が必要です。"),
      { status: 401 },
    );
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const courseId = searchParams.get("courseId") ?? undefined;
  const today = yyyymmdd(new Date());

  try {
    switch (type) {
      case "users": {
        const csv = await buildUsersCsv();
        await container.audit.write({
          actorId: actor.id,
          action: "EXPORT_CSV",
          target: "users",
        });
        container.logger.info("admin.export.csv", { type, actorId: actor.id });
        return csvResponse(csv, `users-${today}.csv`);
      }

      case "courses": {
        const csv = await buildCoursesCsv();
        await container.audit.write({
          actorId: actor.id,
          action: "EXPORT_CSV",
          target: "courses",
        });
        container.logger.info("admin.export.csv", { type, actorId: actor.id });
        return csvResponse(csv, `courses-${today}.csv`);
      }

      case "progress": {
        const csv = await buildProgressCsv(courseId);
        await container.audit.write({
          actorId: actor.id,
          action: "EXPORT_CSV",
          target: courseId ? `progress:${courseId}` : "progress",
        });
        container.logger.info("admin.export.csv", {
          type,
          courseId: courseId ?? null,
          actorId: actor.id,
        });
        return csvResponse(csv, `progress-${today}.csv`);
      }

      default:
        return NextResponse.json(
          err(
            "VALIDATION_FAILED",
            "type パラメータは users / courses / progress のいずれかを指定してください。",
          ),
          { status: 400 },
        );
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "internal";
    container.logger.error("admin.export.csv.failed", { type, message });
    return NextResponse.json(
      err("INTERNAL", "CSV の生成に失敗しました。"),
      { status: 500 },
    );
  }
}
