import { NextResponse } from "next/server";
import { getTodayAttendance } from "@/lib/saenaga";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await getTodayAttendance();
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Gagal mengakses API SAENAGA." },
      { status: 500 }
    );
  }
}