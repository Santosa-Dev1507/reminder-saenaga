import { NextResponse } from "next/server";
import { getAttendanceRecap } from "@/lib/saenaga-rekap";
export const dynamic = "force-dynamic";
function csvEscape(value: unknown) { const s=value==null?"":String(value); return `"${s.replace(/"/g,'""')}"`; }
export async function GET(req:Request){
 const {searchParams}=new URL(req.url); const now=new Date();
 const year=searchParams.get("tahun")||String(now.getFullYear());
 const month=searchParams.get("bulan")||String(now.getMonth()+1).padStart(2,"0");
 if(!/^\d{4}$/.test(year)||!/^\d{1,2}$/.test(month)) return NextResponse.json({ok:false,message:"Format tahun/bulan tidak valid."},{status:400});
 const mm=month.padStart(2,"0"); const result=await getAttendanceRecap(year,mm);
 if(!result.ok) return NextResponse.json(result,{status:502});
 const rows=result.rows||[];
 const keys=Array.from(new Set(rows.flatMap((row:any)=>row&&typeof row==="object"&&!Array.isArray(row)?Object.keys(row):[])));
 const lines=[keys.map(csvEscape).join(","),...rows.map((row:any)=>keys.map(k=>csvEscape(row?.[k])).join(","))];
 return new NextResponse("\ufeff"+lines.join("\r\n"),{status:200,headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":`attachment; filename="rekap-presensi-${year}-${mm}.csv"`,"Cache-Control":"no-store"}});
}
