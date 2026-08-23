import { NextResponse } from "next/server";
import { getAttendanceRecap } from "@/lib/saenaga-rekap";

export const dynamic="force-dynamic";

export async function GET(req:Request){
  const {searchParams}=new URL(req.url);
  const now=new Date();
  const year=searchParams.get("tahun") || String(now.getFullYear());
  const month=searchParams.get("bulan") || String(now.getMonth()+1).padStart(2,"0");

  if(!/^\d{4}$/.test(year)||!/^\d{1,2}$/.test(month))
    return NextResponse.json({ok:false,message:"Format tahun/bulan tidak valid."},{status:400});

  const result=await getAttendanceRecap(year,month.padStart(2,"0"));
  return NextResponse.json(result,{status:result.ok?200:502});
}