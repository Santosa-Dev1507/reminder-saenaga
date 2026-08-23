import { NextResponse } from "next/server";
import webpush from "web-push";
import { getTodayAttendance } from "@/lib/saenaga";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await getTodayAttendance();
  if (!result.ok) return NextResponse.json(result, { status: 502 });
  if (result.masuk) return NextResponse.json({ ok: true, notified: false, reason: "already_attended", result });

  if (!supabaseAdmin || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT) {
    return NextResponse.json({ ok: false, message: "Push/Supabase belum dikonfigurasi.", result }, { status: 500 });
  }

  webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

  const { data: rows } = await supabaseAdmin.from("push_subscriptions").select("id,endpoint,subscription");
  const payload = JSON.stringify({
    title: "Pengingat Presensi",
    body: "Presensi masuk hari ini belum terdeteksi di SAENAGA. Jangan lupa absen.",
    url: "/"
  });

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
  return NextResponse.json({ ok: true, notified: sent > 0, sent, result });
}