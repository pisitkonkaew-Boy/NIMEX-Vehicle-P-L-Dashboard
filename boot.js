/* loads data from the Google Sheet API, then starts the dashboard */
window.__STANDALONE=true;
const KEY_NAME='vpl-key';
function closeCover(){const c=document.getElementById('cover');if(c)c.remove()}
(function(){let k=null;try{k=sessionStorage.getItem(KEY_NAME)}catch(e){}if(location.hash==='#admin'||k){closeCover();return}const c=document.getElementById('cover');if(!c)return;c.querySelector('button').onclick=closeCover;c.querySelector('.fg').onclick=closeCover;c.querySelector('button').focus()})();
async function api(body){const k=(()=>{try{return sessionStorage.getItem(KEY_NAME)}catch(e){return null}})();const r=await fetch(window.VPL_API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({...body,key:k})});const j=await r.json();if(!j.ok)throw new Error(j.error||'failed');return j}
const bootMsg=(h)=>{const b=document.getElementById('boot');b.innerHTML=h;b.hidden=false};
function askKey(err){bootMsg(`<h1>ผู้ดูแลระบบ</h1>${err?`<p class="badt">${err}</p>`:''}<label for="adm-key">รหัสผู้ดูแล</label><input id="adm-key" type="password" autocomplete="current-password"><button class="btn" id="adm-go">เข้าสู่ระบบ</button>`);document.getElementById('adm-go').onclick=async()=>{const v=document.getElementById('adm-key').value;try{sessionStorage.setItem(KEY_NAME,v)}catch(e){}try{await api({a:'auth'});location.reload()}catch(e){try{sessionStorage.removeItem(KEY_NAME)}catch(x){}askKey('รหัสไม่ถูกต้อง')}}}
async function start(){const wantAdmin=location.hash==='#admin';let key=null;try{key=sessionStorage.getItem(KEY_NAME)}catch(e){}
 if(!window.VPL_API){bootMsg('<h1>ยังไม่ได้ตั้งค่า</h1><p>ยังไม่ได้ใส่ที่อยู่ระบบข้อมูลใน config.js</p>');return}
 if(wantAdmin&&!key){askKey();return}
 let D;try{bootMsg('<p>กำลังโหลดข้อมูล…</p>');D=await (await fetch(window.VPL_API)).json()}catch(e){bootMsg('<h1>โหลดข้อมูลไม่สำเร็จ</h1><p>ลองเปิดหน้านี้ใหม่อีกครั้ง</p>');return}
 window.DATA=D;
 if(key){try{await api({a:'admin'});window.ADMIN=true}catch(e){try{sessionStorage.removeItem(KEY_NAME)}catch(x){}if(wantAdmin){askKey('รหัสไม่ถูกต้อง');return}}}
 if(!D.rows||!D.rows.length){if(window.ADMIN){bootMsg('<h1>ตั้งค่าครั้งแรก</h1><p>เลือกไฟล์ vpl-seed.json เพื่อนำเข้าข้อมูลเริ่มต้น</p><input type="file" id="seed-f" accept=".json" aria-label="ไฟล์เริ่มต้น"><p class="msg" id="seed-m"></p>');document.getElementById('seed-f').onchange=async e=>{const m=document.getElementById('seed-m');m.textContent='กำลังนำเข้า…';try{const j=JSON.parse(await e.target.files[0].text());await api({a:'seed',rows:j.rows,zones:j.zones||null});m.textContent='นำเข้าแล้ว';setTimeout(()=>location.reload(),600)}catch(x){m.textContent='นำเข้าไม่สำเร็จ: '+x.message}}}else bootMsg('<h1>ยังไม่มีข้อมูล</h1>');return}
 document.getElementById('boot').hidden=true;document.getElementById('app').hidden=false;const s=document.createElement('script');s.src='app.js?v='+(window.VPL_V||1);document.body.appendChild(s)}
start();
