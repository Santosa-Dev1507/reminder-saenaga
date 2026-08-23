self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",event=>event.waitUntil(self.clients.claim()));

self.addEventListener("push",event=>{
  let data={};
  try{data=event.data?event.data.json():{}}catch{}
  event.waitUntil(self.registration.showNotification(
    data.title||"SAENAGA Reminder",
    {
      body:data.body||"Ada pengingat presensi.",
      icon:"/icon-192.svg",
      badge:"/icon-192.svg",
      tag:"saenaga-reminder",
      renotify:true,
      data:{url:data.url||"/"}
    }
  ));
});

self.addEventListener("notificationclick",event=>{
  event.notification.close();
  const url=event.notification?.data?.url||"/";
  event.waitUntil(
    self.clients.matchAll({type:"window",includeUncontrolled:true}).then(clients=>{
      for(const client of clients){
        if("focus" in client){client.navigate(url);return client.focus();}
      }
      if(self.clients.openWindow)return self.clients.openWindow(url);
    })
  );
});
