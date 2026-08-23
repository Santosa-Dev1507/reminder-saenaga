 "use client";

import { useEffect, useMemo, useState } from "react";

type Status = { ok:boolean; date?:string; masuk?:string|null; pulang?:string|null; message?:string };

const schedules = [
  ["Senin–Kamis", "06.45 / 07.15 / 07.45", "13.45 / 14.15 / 14.45"],
  ["Jumat", "06.45 / 07.15 / 07.45", "10.45 / 11.15 / 11.45"],
  ["Sabtu", "06.45 / 07.15 / 07.45", "12.15 / 12.45 / 13.15"],
];

export default function Home() {
  const [status,setStatus]=useState<Status|null>(null);
  const [loading,setLoading]=useState(false);
  const [pushEnabled,setPushEnabled]=useState(false);
  const [msg,setMsg]=useState("");

  async function check(){
    setLoading(true); setMsg("");
    try {
      const r=await fetch("/api/attendance",{cache:"no-store"});
      const data=await r.json(); setStatus(data);
      if(!data.ok)setMsg(data.message||"Gagal mengecek SAENAGA.");
    } catch { setMsg("Tidak dapat menghubungi server."); }
    finally { setLoading(false); }
  }

  async function enablePush(){
    setMsg("");
    try {
      if(!("serviceWorker" in navigator)||!("PushManager" in window)){
        setMsg("Browser ini belum mendukung Web Push."); return;
      }
      const permission=await Notification.requestPermission();
      if(permission!=="granted"){setMsg("Izin notifikasi belum diberikan.");return;}
      const reg=await navigator.serviceWorker.ready;
      const key=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if(!key){setMsg("VAPID public key belum diatur di Vercel.");return;}
      const sub=await reg.pushManager.subscribe({
        userVisibleOnly:true, applicationServerKey:urlBase64ToUint8Array(key)
      });
      const r=await fetch("/api/push/subscribe",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({subscription:sub})
      });
      if(!r.ok)throw new Error();
      setPushEnabled(true);setMsg("✅ Notifikasi berhasil diaktifkan.");
    } catch { setMsg("Gagal mengaktifkan notifikasi."); }
  }

  useEffect(()=>{check()},[]);
  const masuk=!!status?.masuk, pulang=!!status?.pulang;
  const todayName=useMemo(()=>new Intl.DateTimeFormat("id-ID",{weekday:"long"}).format(new Date()),[]);

  return <main className="container">
    <section className="hero">
      <div className="brand">SAENAGA REMINDER</div>
      <h1>Jangan sampai lupa presensi.</h1>
      <p>Memantau presensi masuk dan pulang SAENAGA tanpa WhatsApp API.</p>
    </section>

    <section className="grid2">
      <StatusCard icon="🌅" title="PRESENSI MASUK" done={masuk} time={status?.masuk}/>
      <StatusCard icon="🌆" title="PRESENSI PULANG" done={pulang} time={status?.pulang}/>
    </section>

    <div className="actions">
      <button onClick={check} disabled={loading}>{loading?"Mengecek...":"↻ Cek Presensi"}</button>
      <button className="secondary" onClick={enablePush}>
        {pushEnabled?"✓ Notifikasi Aktif":"🔔 Aktifkan Notifikasi"}
      </button>
    </div>

    {msg&&<div className="notice">{msg}</div>}

    <section className="card">
      <div className="sectionHead"><h3>Jadwal Pengingat</h3><span>{todayName}</span></div>
      <div className="table">
        <div className="tr th"><span>Hari</span><span>🌅 Masuk</span><span>🌆 Pulang</span></div>
        {schedules.map(([day,m,p])=><div className="tr" key={day}><span>{day}</span><span>{m}</span><span>{p}</span></div>)}
      </div>
      <p className="muted">Jika presensi sudah tercatat, pengingat sesi tersebut otomatis berhenti.</p>
    </section>

    <section className="card">
      <h3>Logika pengingat</h3>
      <div className="flow"><b>Masuk</b><span>06.45 → 07.15 → 07.45</span></div>
      <div className="flow"><b>Pulang</b><span>mengikuti jadwal hari</span></div>
      <p className="muted">Server Vercel mengecek SAENAGA. Android menerima Web Push hanya jika sesi belum tercatat.</p>
    </section>
    <p style={{marginTop:24,fontSize:13}}><a href="/rekap">📊 Buka Rekap Diagnostik</a></p>
  </main>
}

function StatusCard({icon,title,done,time}:{icon:string,title:string,done:boolean,time?:string|null}){
  return <section className={"card status "+(done?"ok":"warning")}>
    <div className="statusIcon">{done?"✓":icon}</div>
    <div><span className="label">{title}</span><h2>{done?"SUDAH":"BELUM"}</h2>
      <p>{done?`Jam: ${time}`:"Belum terdeteksi"}</p>
    </div>
  </section>
}
function urlBase64ToUint8Array(base64String:string){
  const padding="=".repeat((4-base64String.length%4)%4);
  const base64=(base64String+padding).replace(/-/g,"+").replace(/_/g,"/");
  const rawData=atob(base64);
  return Uint8Array.from([...rawData].map(c=>c.charCodeAt(0)));
}