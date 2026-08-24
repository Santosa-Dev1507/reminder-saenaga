"use client";
import { useState } from "react";

export default function RekapPage() {
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, "0"));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/rekap?tahun=${year}&bulan=${month.padStart(2,"0")}`, { cache: "no-store" });
      setData(await r.json());
    } finally {
      setLoading(false);
    }
  }

  function download() {
    window.location.href = `/api/rekap/csv?tahun=${year}&bulan=${month.padStart(2,"0")}`;
  }

  const rows: any[] = data?.rows || [];
  const columns: string[] = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <main className="container">
      <section className="hero">
        <div className="brand">SAENAGA REMINDER</div>
        <h1>Rekap Presensi</h1>
        <p>Lihat dan unduh data presensi bulanan dari SAENAGA.</p>
      </section>

      <section className="card">
        <div className="rekapControls">
          <label>
            Tahun
            <input
              value={year}
              onChange={e => setYear(e.target.value)}
              inputMode="numeric"
              maxLength={4}
            />
          </label>
          <label>
            Bulan
            <input
              value={month}
              onChange={e => setMonth(e.target.value)}
              inputMode="numeric"
              maxLength={2}
            />
          </label>
          <button onClick={load} disabled={loading}>
            {loading ? "Memuat..." : "Cek Rekap"}
          </button>
          <button className="secondary" onClick={download}>
            ⬇️ Download CSV
          </button>
        </div>

        {data && (
          <>
            <div className="notice" style={{ marginTop: 16 }}>
              {data.ok
                ? `✅ Data ditemukan: ${rows.length} baris.`
                : `❌ ${data.message || "Gagal mengambil rekap."}`}
            </div>

            {data.ok && rows.length > 0 && (
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>{columns.map(k => <th key={k}>{k}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rows.map((row: any, i: number) => (
                      <tr key={i}>
                        {columns.map(k => <td key={k}>{String(row?.[k] ?? "")}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {data.ok && rows.length === 0 && (
              <p className="muted" style={{ marginTop: 12 }}>Tidak ada data presensi untuk periode ini.</p>
            )}

            <details style={{ marginTop: 16 }}>
              <summary style={{ cursor: "pointer", fontSize: 13, color: "var(--muted)" }}>
                Respons API mentah (diagnostik)
              </summary>
              <pre>{JSON.stringify(data, null, 2)}</pre>
            </details>
          </>
        )}
      </section>

      <p style={{ marginTop: 16, fontSize: 13 }}>
        <a href="/">← Kembali ke Dashboard</a>
      </p>
    </main>
  );
}