 "use client";

import { useEffect, useState } from "react";

type Status = {
  ok: boolean;
  checkedAt?: string;
  date?: string;
  masuk?: string | null;
  pulang?: string | null;
  message?: string;
  source?: string;
};

export default function Home() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [msg, setMsg] = useState("");

  async function check() {
    setLoading(true);
    setMsg("");
    try {
      const r = await fetch("/api/attendance", { cache: "no-store" });
      const data = await r.json();
      setStatus(data);
      if (!data.ok) setMsg(data.message || "Gagal mengecek SAENAGA.");
    } catch {
      setMsg("Tidak dapat menghubungi server.");
    } finally {
      setLoading(false);
    }
  }

  async function enablePush() {
    setMsg("");
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setMsg("Browser ini belum mendukung Web Push.");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMsg("Izin notifikasi belum diberikan.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) {
        setMsg("VAPID public key belum diatur di Vercel.");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
      const r = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub }),
      });
      if (!r.ok) throw new Error();
      setPushEnabled(true);
      setMsg("✅ Notifikasi berhasil diaktifkan.");
    } catch {
      setMsg("Gagal mengaktifkan notifikasi.");
    }
  }

  useEffect(() => { check(); }, []);

  const sudah = !!status?.masuk;

  return (
    <main className="container">
      <section className="hero">
        <div className="brand">SAENAGA REMINDER</div>
        <h1>{sudah ? "Presensi sudah aman." : "Jangan sampai lupa absen."}</h1>
        <p>Memeriksa status presensi masuk SAENAGA tanpa mengirim WhatsApp.</p>
      </section>

      <section className={"card status " + (sudah ? "ok" : "warning")}>
        <div className="statusIcon">{sudah ? "✓" : "!"}</div>
        <div>
          <span className="label">STATUS HARI INI</span>
          <h2>{status ? (sudah ? "SUDAH ABSEN" : "BELUM ABSEN") : "BELUM DICEK"}</h2>
          {sudah && <p>Masuk: <b>{status.masuk}</b>{status.pulang ? ` • Pulang: ${status.pulang}` : ""}</p>}
          {status?.date && <small>{status.date}</small>}
        </div>
      </section>

      <div className="actions">
        <button onClick={check} disabled={loading}>{loading ? "Mengecek..." : "↻ Cek Presensi"}</button>
        <button className="secondary" onClick={enablePush}>{pushEnabled ? "✓ Notifikasi Aktif" : "🔔 Aktifkan Notifikasi"}</button>
      </div>

      {msg && <div className="notice">{msg}</div>}

      <section className="card">
        <h3>Jadwal pengingat</h3>
        <div className="schedule"><span>06.45</span><b>Pengingat 1</b></div>
        <div className="schedule"><span>07.15</span><b>Pengingat 2</b></div>
        <div className="schedule"><span>07.45</span><b>Pengingat terakhir</b></div>
        <p className="muted">Jika presensi sudah terdeteksi, pengingat berikutnya otomatis tidak dikirim.</p>
      </section>

      <section className="card">
        <h3>Arsitektur</h3>
        <p className="muted">PWA → Vercel → API SAENAGA → Web Push → Android.</p>
        <p className="muted">Tidak menggunakan WhatsApp API.</p>
      </section>
    </main>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}