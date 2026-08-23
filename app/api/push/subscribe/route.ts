import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  const body = await req.json();
  if (!body?.subscription?.endpoint) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi" }, { status: 500 });
  }
  const { error } = await supabaseAdmin.from("push_subscriptions").upsert({
    endpoint: body.subscription.endpoint,
    subscription: body.subscription,
    updated_at: new Date().toISOString()
  }, { onConflict: "endpoint" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}