/*
 * SAENAGA adapter v0.4
 *
 * The supplied SAENAGA 3.0.6 APK contains BOTH:
 *   https://sepakat-bkppd.klaten.go.id/apis/
 *   http://103.108.187.203/apis/
 *
 * The previous MVP used the legacy IP and received HTTP 404. This version
 * uses the hostname from the APK as the primary base URL. The legacy IP is
 * only a fallback.
 *
 * Read-only endpoint found in the APK:
 *   GET data_presensi/jadwalPresensiToday?nip=...
 *
 * No SAENAGA password/token is sent by this checker.
 */

export type Attendance = {
  ok: boolean;
  date: string;
  masuk: string | null;
  pulang: string | null;
  ketMasuk?: string | null;
  ketPulang?: string | null;
  message?: string;
  source?: string;
  httpStatus?: number;
  errorType?: "config" | "not_found" | "server" | "network" | "invalid_response";
};

const DEFAULT_BASES = [
  "https://sepakat-bkppd.klaten.go.id/apis/",
  "http://103.108.187.203/apis/"
];

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

function pickData(json: any): any {
  const d = json?.data ?? json?.result ?? json?.presensi ?? json;
  if (Array.isArray(d)) return d[0] ?? {};
  if (d?.data && Array.isArray(d.data)) return d.data[0] ?? {};
  return d ?? {};
}

function normalize(json: any, source: string, httpStatus: number): Attendance {
  const d = pickData(json);
  return {
    ok: json?.status !== false,
    date: todayJakarta(),
    masuk: normalizeTime(d?.masuk),
    pulang: normalizeTime(d?.pulang),
    ketMasuk: d?.ketMasuk ?? d?.keteranganMasuk ?? null,
    ketPulang: d?.ketPulang ?? d?.keteranganPulang ?? null,
    message: json?.message ?? undefined,
    source,
    httpStatus
  };
}

function bases(): string[] {
  const configured = (process.env.SAENAGA_BASE_URL || "").trim();
  const list = configured
    ? [configured, ...DEFAULT_BASES.filter(x => x !== configured)]
    : DEFAULT_BASES;
  return [...new Set(list.map(x => x.endsWith("/") ? x : x + "/"))];
}

export async function getTodayAttendance(): Promise<Attendance> {
  const nip = process.env.SAENAGA_NIP?.trim();

  if (!nip) {
    return {
      ok: false,
      date: todayJakarta(),
      masuk: null,
      pulang: null,
      message: "SAENAGA_NIP belum dikonfigurasi.",
      errorType: "config"
    };
  }

  let lastMessage = "API SAENAGA tidak dapat dihubungi.";

  for (const base of bases()) {
    const url = new URL("data_presensi/jadwalPresensiToday", base);
    url.searchParams.set("nip", nip);

    try {
      const res = await fetch(url.toString(), {
        cache: "no-store",
        headers: { "Accept": "application/json" },
        signal: AbortSignal.timeout(12000)
      });

      const text = await res.text();

      let json: any;
      try {
        json = JSON.parse(text);
      } catch {
        lastMessage = `Respons ${new URL(base).hostname} bukan JSON (HTTP ${res.status}).`;
        continue;
      }

      if (!res.ok) {
        lastMessage = `${new URL(base).hostname} mengembalikan HTTP ${res.status}.`;
        continue;
      }

      return normalize(
        json,
        `${new URL(base).origin}/apis/data_presensi/jadwalPresensiToday`,
        res.status
      );
    } catch (e: any) {
      lastMessage = `${new URL(base).hostname}: ${e?.message || "network error"}`;
    }
  }

  return {
    ok: false,
    date: todayJakarta(),
    masuk: null,
    pulang: null,
    message: lastMessage,
    errorType: lastMessage.includes("HTTP 404") ? "not_found" :
      lastMessage.includes("HTTP 5") ? "server" :
      lastMessage.includes("bukan JSON") ? "invalid_response" : "network"
  };
}

