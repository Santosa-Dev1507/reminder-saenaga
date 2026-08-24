import { NextResponse } from "next/server";
import webpush from "web-push";
import { getTodayAttendance } from "@/lib/saenaga";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function getLocalParts() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: process.env.APP_TIMEZONE || "Asia/Jakarta",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(new Date());

  const getPart = (type: string) => parts.find(x => x.type === type)?.value || "";
  return {
    weekday: getPart("weekday"), // Mon, Tue, Wed, Thu, Fri, Sat, Sun
    hour: Number(getPart("hour")),
    minute: Number(getPart("minute"))
  };
}

function determineSession(): "masuk" | "pulang" | null {
  const { weekday, hour, minute } = getLocalParts();
  const totalMinutes = hour * 60 + minute;

  // Window tolerance: +/- 4 minutes for cron triggers
  const isInWindow = (target: number) => Math.abs(totalMinutes - target) <= 4;

  // Presensi Masuk (Senin-Sabtu): 06.45 (405), 07.15 (435), 07.45 (465)
  const masukTargets = [405, 435, 465];
  if (["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].includes(weekday)) {
    if (masukTargets.some(isInWindow)) return "masuk";
  }

  // Presensi Pulang
  let pulangTargets: number[] = [];
  if (["Mon", "Tue", "Wed", "Thu"].includes(weekday)) {
    pulangTargets = [825, 855, 885]; // 13:45, 14:15, 14:45
  } else if (weekday === "Fri") {
    pulangTargets = [645, 675, 705]; // 10:45, 11:15, 11:45
  } else if (weekday === "Sat") {
    pulangTargets = [735, 765, 795]; // 12:15, 12:45, 13:15
  }

  if (pulangTargets.some(isInWindow)) return "pulang";

  return null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const force = searchParams.get("force") === "true";
  const explicitSession = searchParams.get("session") as "masuk" | "pulang" | null;

  const session = explicitSession || determineSession();

  // If outside schedule and not forced, return status without sending push
  if (!session && !force) {
    const { weekday, hour, minute } = getLocalParts();
    return NextResponse.json({
      ok: true,
      notified: false,
      reason: "outside_schedule",
      currentTime: `${weekday} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} WIB`
    });
  }

  const activeSession = session || "masuk";

  const result = await getTodayAttendance();
  if (!result.ok) {
    return NextResponse.json(result, { status: 502 });
  }

  // Check if attendance for active session is already recorded
  const isRecorded = activeSession === "masuk" ? !!result.masuk : !!result.pulang;
  if (isRecorded) {
    return NextResponse.json({
      ok: true,
      notified: false,
      reason: `${activeSession}_already_recorded`,
      result
    });
  }

  if (!supabaseAdmin || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT) {
    return NextResponse.json({
      ok: false,
      message: "Push Notification atau Supabase belum dikonfigurasi.",
      result
    }, { status: 500 });
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const { data: rows } = await supabaseAdmin.from("push_subscriptions").select("id,endpoint,subscription");

  const title = activeSession === "masuk"
    ? "🌅 Pengingat Presensi Masuk"
    : "🌆 Pengingat Presensi Pulang";

  const body = activeSession === "masuk"
    ? "Presensi masuk hari ini belum terdeteksi di SAENAGA. Jangan lupa absen."
    : "Presensi pulang hari ini belum terdeteksi di SAENAGA. Jangan lupa absen pulang.";

  const payload = JSON.stringify({ title, body, url: "/" });

  let sent = 0;
  for (const row of rows ?? []) {
    try {
      await webpush.sendNotification(row.subscription, payload);
      sent++;
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) {
        await supabaseAdmin.from("push_subscriptions").delete().eq("id", row.id);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    notified: sent > 0,
    sent,
    session: activeSession,
    result
  });
}