import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ ok:false, message:"Supabase belum dikonfigurasi di Vercel." }, { status:500 });
    }
    const body = await req.json();
    const sub = body?.subscription;
    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
      return NextResponse.json({ ok:false, message:"Format Web Push subscription tidak lengkap." }, { status:400 });
    }
    const { data, error } = await supabaseAdmin
      .from("push_subscriptions")
      .upsert({
        endpoint:String(sub.endpoint),
        subscription:sub,
        updated_at:new Date().toISOString()
      }, { onConflict:"endpoint" })
      .select("id,endpoint,updated_at")
      .single();

    if (error) return NextResponse.json({ ok:false, message:`Gagal menyimpan subscription: ${error.message}` }, { status:500 });
    return NextResponse.json({ ok:true, message:"Subscription tersimpan.", subscriptionId:data?.id });
  } catch(e:any) {
    return NextResponse.json({ ok:false, message:e?.message||"Request subscription gagal." }, { status:500 });
  }
}
