/*
 * SAENAGA adapter.
 *
 * IMPORTANT:
 * The APK confirms the existence of a Retrofit service and a
 * jadwalPresensiToday endpoint. The exact authentication contract
 * should be verified against the current production server before
 * deployment. Do not hard-code credentials in browser code.
 *
 * This adapter intentionally keeps authentication server-side.
 */

export type Attendance = {
  ok: boolean;
  date: string;
  masuk: string | null;
  pulang: string | null;
  message?: string;
  source?: string;
};

export async function getTodayAttendance(): Promise<Attendance> {
  const nip = process.env.SAENAGA_NIP;
  const base = process.env.SAENAGA_BASE_URL;

  if (!nip || !base) {
    return {
      ok: false,
      date: todayJakarta(),
      masuk: null,
      pulang: null,
      message: "SAENAGA_NIP atau SAENAGA_BASE_URL belum dikonfigurasi."
    };
  }

  /*
   * TODO: Setelah endpoint + auth production diverifikasi, aktifkan
   * request di bawah. Jangan menyalin token dari APK debug.
   *
   * const url = new URL("data_presensi/jadwalPresensiToday", base);
   * url.searchParams.set("nip", nip);
   * const res = await fetch(url, { cache: "no-store" });
   * const json = await res.json();
   * return normalizeToday(json);
   */

  return {
    ok: false,
    date: todayJakarta(),
    masuk: null,
    pulang: null,
    message: "Adapter SAENAGA menunggu verifikasi kontrak autentikasi/API produksi.",
    source: "saenaga-adapter"
  };
}

function todayJakarta() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.APP_TIMEZONE || "Asia/Jakarta",
    year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date());
}