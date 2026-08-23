 "use client";

import {useState} from "react";

export default function RekapPage(){
  const [year,setYear]=useState("2026");
  const [month,setMonth]=useState("08");
  const [data,setData]=useState<any>(null);
  const [loading,setLoading]=useState(false);

  async function load(){
    setLoading(true);
    try{
      const r=await fetch(`/api/rekap?tahun=${year}&bulan=${month}`,{cache:"no-store"});
      setData(await r.json());
    }finally{setLoading(false)}
  }

  return <main style={{maxWidth:900,margin:"40px auto",padding:20,fontFamily:"Arial,sans-serif"}}>
    <h1>Rekap Presensi SAENAGA</h1>
    <p>Halaman diagnostik untuk mencocokkan data API dengan rekap di aplikasi SAENAGA.</p>
    <div style={{display:"flex",gap:10,flexWrap:"wrap",margin:"20px 0"}}>
      <input value={year} onChange={e=>setYear(e.target.value)} style={{padding:10}} placeholder="Tahun"/>
      <input value={month} onChange={e=>setMonth(e.target.value)} style={{padding:10}} placeholder="Bulan"/>
      <button onClick={load} disabled={loading} style={{padding:"10px 18px"}}>{loading?"Memuat...":"Cek Rekap"}</button>
    </div>
    {data && <pre style={{whiteSpace:"pre-wrap",background:"#f5f5f5",padding:16,borderRadius:10,overflow:"auto"}}>
      {JSON.stringify(data,null,2)}
    </pre>}
  </main>
}