 "use client";

import {useEffect,useState} from "react";

export default function PushTest(){
  const [info,setInfo]=useState<any>({});
  useEffect(()=>{
    (async()=>{
      const x:any={
        userAgent:navigator.userAgent,
        serviceWorker:"serviceWorker" in navigator,
        pushManager:"PushManager" in window,
        notification:"Notification" in window,
        permission:"Notification" in window ? Notification.permission : "unsupported",
        secureContext:window.isSecureContext
      };
      if("serviceWorker" in navigator){
        try{
          const reg=await navigator.serviceWorker.register("/sw.js",{scope:"/"});
          x.swRegistered=true;
          x.swScope=reg.scope;
          const sub=await reg.pushManager.getSubscription();
          x.subscriptionExists=!!sub;
        }catch(e:any){x.swRegistered=false;x.swError=e?.message||String(e)}
      }
      try{
        const r=await fetch("/api/push/status",{cache:"no-store"});
        x.server=await r.json();
      }catch(e:any){x.serverError=e?.message||String(e)}
      setInfo(x);
    })();
  },[]);
  return <main style={{maxWidth:760,margin:"40px auto",padding:20,fontFamily:"Arial"}}>
    <h1>Diagnostik Web Push</h1>
    <p>Halaman ini hanya untuk pemeriksaan. Tidak mengirim notifikasi.</p>
    <pre style={{background:"#f5f5f5",padding:16,borderRadius:12,whiteSpace:"pre-wrap",overflow:"auto"}}>
      {JSON.stringify(info,null,2)}
    </pre>
  </main>
}