import { NextResponse } from "next/server";
import webpush from "web-push";
import { supabaseAdmin } from "@/lib/supabase";
export const dynamic="force-dynamic";

export async function GET(req:Request) {
  const auth=req.headers.get("authorization");
  if(process.env.CRON_SECRET && auth!==`Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ok:false,message:"Unauthorized"},{status:401});

  if(!supabaseAdmin||!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY||!process.env.VAPID_PRIVATE_KEY||!process.env.VAPID_SUBJECT)
    return NextResponse.json({ok:false,message:"Supabase/VAPID belum dikonfigurasi."},{status:500});

  webpush.setVapidDetails(process.env.VAPID_SUBJECT,process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY);
  const {data:rows,error}=await supabaseAdmin.from("push_subscriptions").select("id,subscription");
  if(error) return NextResponse.json({ok:false,message:error.message},{status:500});

  const payload=JSON.stringify({title:"SAENAGA Reminder",body:"🔔 Notifikasi tes berhasil.",url:"/"});
  let sent=0,removed=0;
  for(const row of rows??[]){
    try{await webpush.sendNotification(row.subscription,payload);sent++}
    catch(e:any){
      if(e?.statusCode===404||e?.statusCode===410){
        await supabaseAdmin.from("push_subscriptions").delete().eq("id",row.id);
        removed++;
      }
    }
  }
  return NextResponse.json({ok:true,found:(rows??[]).length,sent,removed});
}
