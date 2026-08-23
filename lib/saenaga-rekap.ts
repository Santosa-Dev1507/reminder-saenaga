/*
 * SAENAGA rekap adapter
 *
 * APK SAENAGA 3.0.6:
 * doPresensiRekap(nip, tahun, bulan)
 * -> GET data_presensi/rekapPresensi
 * -> query: nip, tahun, bulan
 */

export type RekapResult = {
  ok: boolean;
  year: string;
  month: string;
  rows: any[];
  raw?: any;
  message?: string;
  source?: string;
  httpStatus?: number;
};

const DEFAULT_BASES = [
  "http://103.108.187.203/apis/",
  "https://sepakat-bkppd.klaten.go.id/apis/"
];

function bases() {
  const configured=(process.env.SAENAGA_BASE_URL||"").trim();
  const list=configured ? [configured,...DEFAULT_BASES] : DEFAULT_BASES;
  return [...new Set(list.map(x=>x.endsWith("/")?x:x+"/"))];
}

function rowsFrom(json:any): any[] {
  const candidates=[
    json?.data,
    json?.result,
    json?.presensi,
    json?.data?.data,
    json?.result?.data
  ];
  for(const c of candidates) {
    if(Array.isArray(c)) return c;
  }
  if(Array.isArray(json)) return json;
  return [];
}

export async function getAttendanceRecap(year:string, month:string):Promise<RekapResult>{
  const nip=process.env.SAENAGA_NIP?.trim();
  if(!nip) return {ok:false,year,month,rows:[],message:"SAENAGA_NIP belum dikonfigurasi."};

  let last="API rekap SAENAGA tidak dapat diakses.";
  for(const base of bases()){
    const url=new URL("data_presensi/rekapPresensi",base);
    url.searchParams.set("nip",nip);
    url.searchParams.set("tahun",year);
    url.searchParams.set("bulan",month);
    try{
      const res=await fetch(url.toString(),{
        cache:"no-store",
        headers:{Accept:"application/json"},
        signal:AbortSignal.timeout(15000)
      });
      const text=await res.text();
      let json:any;
      try{json=JSON.parse(text)}catch{
        last=`${new URL(base).hostname} mengembalikan respons bukan JSON (HTTP ${res.status}).`;
        continue;
      }
      if(!res.ok){
        last=`${new URL(base).hostname} mengembalikan HTTP ${res.status}.`;
        continue;
      }
      return {
        ok:json?.status!==false,
        year,month,
        rows:rowsFrom(json),
        raw:json,
        message:json?.message,
        source:`${new URL(base).origin}/apis/data_presensi/rekapPresensi`,
        httpStatus:res.status
      };
    }catch(e:any){
      last=`${new URL(base).hostname}: ${e?.message||"network error"}`;
    }
  }
  return {ok:false,year,month,rows:[],message:last};
}
