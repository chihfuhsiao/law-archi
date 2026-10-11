// 建技規則函令查詢 iPad 離線版 — 版本 20261011020242
const CORE = "bci-core-20261011020242";
const CORE_FILES = ["index.html", "data.js", "manifest.json", "icon.png", "apple-touch-icon.png", "favicon.ico", "lib/pdf.min.js", "lib/pdf.worker.min.js"];
self.addEventListener("install", e=>{
  e.waitUntil(caches.open(CORE).then(c=>c.addAll(CORE_FILES)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate", e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith("bci-core-") && k!==CORE).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim()));
});
function timeout(ms){ return new Promise((_,rej)=>setTimeout(()=>rej(new Error("timeout")), ms)); }
self.addEventListener("fetch", e=>{
  const req = e.request;
  if(req.method!=="GET") return;
  const url = new URL(req.url);
  if(url.origin!==location.origin) return;
  const scope = self.registration.scope;
  if(!url.href.startsWith(scope)) return;
  const rel = decodeURIComponent(url.pathname.slice(new URL(scope).pathname.length));
  const isCore = req.mode==="navigate" || rel==="" || CORE_FILES.includes(rel);
  if(isCore){
    // 有網路時拿最新版（3 秒內沒回應就用本機版）；沒網路時用本機版
    const key = (req.mode==="navigate" || rel==="") ? scope+"index.html" : req;
    e.respondWith(Promise.race([fetch(req.url, {cache:"no-cache"}), timeout(3000)]).then(r=>{
      if(r && r.ok){ const cl=r.clone(); caches.open(CORE).then(c=>c.put(key, cl)); }
      return r;
    }).catch(()=>caches.match(key, {ignoreSearch:true}).then(r=>r || caches.match(req, {ignoreSearch:true}))
      .then(r=>r || new Response("離線中，且本機尚未存有此檔案。", {status:503, headers:{"Content-Type":"text/plain; charset=utf-8"}}))));
    return;
  }
  // 原書 PDF：先用本機存好的
  e.respondWith(caches.open("bci-assets").then(c=>c.match(req, {ignoreSearch:true})).then(r=>r || fetch(req)));
});
