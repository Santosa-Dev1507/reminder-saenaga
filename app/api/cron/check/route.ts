import { NextResponse } from "next/server";
import webpush from "web-push";
import { getTodayAttendance } from "@/lib/saenaga";
import { supabaseAdmin } from "@/lib/supabase";
export const dynamic="force-dynamic";

function localParts(){
  const p=new Intl.DateTimeFormat("en-GB",{timeZone:process.env.APP_TIMEZONE||"Asia/Jakarta",
    weekday:"short",hour:"2-digit",minute:"2-digit",hour12:false}).formatToParts(new Date());
  const g=(t:string)=>p.find(x=>x.type===t)?.value||"";
  return {weekday:g("weekday"),hour:Number(g("hour")),minute:Number(g("minute"))};
}
function sessionForNow(){
  const {weekday,hour,minute}=localParts(),hm=hour*60+minute;
  const masuk=[405,435,465];
  let pulang:number[]=[];
  if(["Mon","Tue","Wed","Thu"].includes(weekday))pulang=[825,855,885];
  else if(weekday==="Fri")pulang=[645,675,705];
  else if(weekday==="Sat")pulang=[735,765,795];
  if(masuk.includes(hm))return"masuk" as const;
  if(pulang.includes(hm))return"pulang" as const;
  return null;
}
export async function GET(req:Request){
  const auth=req.headers.get("authorization");
  if(process.env.CRON_SECRET&&auth!==`Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({error:"Unauthorized"},{status:401});
  const session=sessionForNow();
  if(!session)return NextResponse.json({ok:true,notified:false,reason:"outside_schedule"});
  const result=await getTodayAttendance();
  if(!result.ok)return NextResponse.json(result,{status:502});
  const done=session==="masuk"?!!result.masuk:!!result.pulang;
  if(done)return NextResponse.json({ok:true,notified:false,reason:`${session}_already_recorded`,result});
  if(!supabaseAdmin||!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY||!process.env.VAPID_PRIVATE_KEY||!process.env.VAPID_SUBJECT)
    return NextResponse.json({ok:false,message:"Push/Supabase belum dikonfigurasi.",result},{status:500});
  webpush.setVapidDetails(process.env.VAPID_SUBJECT,process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY);
  const {data:rows}=await supabaseAdmin.from("push_subscriptions").select("id,subscription");
  const payload=JSON.stringify({title:session==="masuk"?"🌅 Pengingat Presensi Masuk":"🌆 Pengingat Presensi Pulang",
    body:session==="masuk"?"Presensi masuk hari ini belum terdeteksi di SAENAGA. Jangan lupa absen.":"Presensi pulang hari ini belum terdeteksi di SAENAGA. Jangan lupa absen pulang.",url:"/"});
  let sent=0;
  for(const row of rows??[]){try{await webpush.sendNotification(row.subscription,payload);sent++}catch(e:any){
    if(e?.statusCode===404||e?.statusCode===410)await supabaseAdmin.from("push_subscriptions").delete().eq("id",row.id)}}
  return NextResponse.json({ok:true,notified:sent>0,sent,session,result});
}