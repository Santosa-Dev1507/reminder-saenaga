import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
export const dynamic="force-dynamic";

export async function GET() {
  if (!supabaseAdmin) return NextResponse.json({ok:false,count:0,message:"Supabase belum dikonfigurasi."},{status:500});
  const {count,error}=await supabaseAdmin.from("push_subscriptions").select("id",{count:"exact",head:true});
  if(error) return NextResponse.json({ok:false,count:0,message:error.message},{status:500});
  return NextResponse.json({ok:true,count:count??0});
}
