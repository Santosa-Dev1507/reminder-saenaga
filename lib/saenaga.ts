/*
 * SAENAGA adapter v0.3
 * Findings from the supplied SAENAGA 3.0.6 APK:
 * - doPresensiToday(String) -> GET data_presensi/jadwalPresensiToday?
 * - parameter @Query("nip")
 * - doPresensiRekap(String,String,String) -> GET data_presensi/rekapPresensi?
 * - parameters @Query("nip"), @Query("tahun"), @Query("bulan")
 * - ApiClient only adds a logging interceptor; no Authorization interceptor is present.
 * Therefore this read-only checker uses NIP only and does not store the SAENAGA password.
 */

export type Attendance = {
  ok: boolean; date: string; masuk: string | null; pulang: string | null;
  ketMasuk?: string | null; ketPulang?: string | null;
  message?: string; source?: string; httpStatus?: number;
};

function todayJakarta() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.APP_TIMEZONE || "Asia/Jakarta",
    year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date());
}
function normalizeTime(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s && s !== "-" && s !== "null" ? s : null;
}
function normalize(json: any): Attendance {
  const d = json?.data ?? {};
  return {
    ok: json?.status !== false,
    date: todayJakarta(),
    masuk: normalizeTime(d?.masuk),
    pulang: normalizeTime(d?.pulang),
    ketMasuk: d?.ketMasuk ?? null,
    ketPulang: d?.ketPulang ?? null,
    message: json?.message ?? undefined,
    source: "SAENAGA data_presensi/jadwalPresensiToday"
  };
}
export async function getTodayAttendance(): Promise<Attendance> {
  const nip = process.env.SAENAGA_NIP?.trim();
  const base = (process.env.SAENAGA_BASE_URL || "http://103.108.187.203/apis/").trim();
  if (!nip) return {
    ok:false,date:todayJakarta(),masuk:null,pulang:null,
    message:"SAENAGA_NIP belum dikonfigurasi."
  };
  const url = new URL("data_presensi/jadwalPresensiToday", base.endsWith("/") ? base : base + "/");
  url.searchParams.set("nip", nip);
  try {
    const res = await fetch(url.toString(), {
      cache:"no-store", headers:{"Accept":"application/json"},
      signal:AbortSignal.timeout(15000)
    });
    const text = await res.text();
    let json:any;
    try { json=JSON.parse(text); } catch {
      return {ok:false,date:todayJakarta(),masuk:null,pulang:null,
        message:`Respons SAENAGA bukan JSON (HTTP ${res.status}).`,httpStatus:res.status};
    }
    if (!res.ok) return {...normalize(json),ok:false,
      message:json?.message || `SAENAGA mengembalikan HTTP ${res.status}.`,httpStatus:res.status};
    return normalize(json);
  } catch(e:any) {
    return {ok:false,date:todayJakarta(),masuk:null,pulang:null,
      message:`Tidak dapat menghubungi API SAENAGA: ${e?.message || "network error"}`};
  }
}