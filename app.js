'use strict';
const uniqueSorted=arr=>Array.from(new Set(arr)).sort();
/* ---------- model: every number below follows the original dashboard's formulas ---------- */
/* zones (ภาค) come from the Zones tab: [dcCode, dcName, zone, mergeTo]. mergeTo folds a closed DC into another one */
const ZROWS=(DATA.zones||[]).map(z=>({code:String(z[0]).trim(),name:String(z[1]||''),zone:String(z[2]||'').trim(),to:String(z[3]||'').trim()})).filter(z=>z.code);
const ZONE={},MERGE={};ZROWS.forEach(z=>{if(z.zone)ZONE[z.code]=z.zone;if(z.to)MERGE[z.code]=z.to});
const RAWNAME={};DATA.rows.forEach(a=>{const c=String(a[1]);if(!RAWNAME[c])RAWNAME[c]=String(a[2])});
const mergeCode=c=>MERGE[c]||c,mergeName=(c,n)=>MERGE[c]?(RAWNAME[MERGE[c]]||(MERGE[c]+' '+((ZROWS.find(z=>z.code===MERGE[c])||{}).name||''))).trim():n;
const zoneOf=c=>ZONE[c]||'ไม่ระบุภาค';
/* shared settings from the Settings tab. Grade = อัตรากำไร % of a DC / ภาค, off until the admin turns it on */
const SETTINGS=DATA.settings||{};
const GRADE=Object.assign({on:false,A:0,B:-15,C:-30,D:-50},SETTINGS.grade||{});
const gradeOn=()=>!!GRADE.on;
const gradeOf=v=>!Number.isFinite(v)?'':v>=GRADE.A?'A':v>=GRADE.B?'B':v>=GRADE.C?'C':v>=GRADE.D?'D':'F';
/* a DC or ภาค without revenue has no margin, so it gets no grade */
const gradeFor=x=>x&&x.revenue>0?gradeOf(x.margin):'';
const GCOL={A:'#1d57b8',B:'#6e93d6',C:'#d4af37',D:'#e08a3c',F:'#b8334a'};
const allData=DATA.rows.map(a=>{const revenue=+a[7],vc=String(a[3]||''),c0=String(a[1]);return{date:String(a[0]),dcCode:mergeCode(c0),dcName:mergeName(c0,String(a[2])),origDc:c0,vehicleCode:vc,plate:String(a[4]),vtype:String(a[5]),trips:+a[6]||0,revenue,fuel:+a[8],driver:+a[9],repair:+a[10],installment:+a[11],net:+a[12],result:String(a[13]),hasRevenue:revenue>0?'มีรายได้':'ไม่มีรายได้',key:a[0]+'|'+(vc||a[4])}});
allData.forEach(r=>r.zone=zoneOf(r.dcCode));
const zones=uniqueSorted(allData.map(r=>r.zone));
const thMonthNames=['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
function thMonthLabel(ym){if(!ym)return'';const[y,m]=ym.split('-');return`${thMonthNames[parseInt(m,10)]} ${parseInt(y,10)+543}`}
function fmt(n){return Number(n||0).toLocaleString('th-TH',{maximumFractionDigits:0})}
function fmtSigned(n){const v=Number(n||0);return(v>=0?'+':'')+v.toLocaleString('th-TH',{maximumFractionDigits:0})}
const fmtN=(v,d=0)=>Number.isFinite(v)?v.toLocaleString('th-TH',{minimumFractionDigits:d,maximumFractionDigits:d}):'–';
const fmtP=(v,d=1)=>Number.isFinite(v)?v.toFixed(d)+'%':'–';
const fmtM=v=>Number.isFinite(v)?(v>=0?'+':'−')+fmtN(Math.abs(v)/1e6,2):'–';
const fmtS=v=>{if(!Number.isFinite(v))return'–';const a=Math.abs(v),s=v<0?'−':'';return a>=1e6?s+fmtN(a/1e6,1)+'M':a>=1e3?s+fmtN(a/1e3,0)+'K':s+fmtN(a)};
const vk=r=>r.vehicleCode||r.plate;
const costOf=r=>r.fuel+r.driver+r.repair+r.installment;
const months=uniqueSorted(allData.map(r=>r.date));
const lastM=months[months.length-1];
const dcNames=(()=>{const m=new Map();allData.forEach(r=>{if(!m.has(r.dcCode))m.set(r.dcCode,r.dcName)});return m})();
const dcLabel=c=>dcNames.get(c)||c;

/* ---------- state ---------- */
const S={page:'home',mode:'month',m:lastM||'ALL',zone:'',zcmp:'net',dc:'',type:'',rev:'',plate:'',adim:'dc',ametric:'net',scope:'all',cmp:'net',q:{},sort:{},pg:{},psize:50};
function applyFilters(o={}){const f={...S,...o};let rows=allData;
 if(f.mode==='month'){if(f.m!=='ALL')rows=rows.filter(r=>r.date===f.m)}else{if(f.m!=='ALL')rows=rows.filter(r=>r.date<=f.m)}
 if(f.zone)rows=rows.filter(r=>r.zone===f.zone);if(f.dc)rows=rows.filter(r=>r.dcCode===f.dc);if(f.type)rows=rows.filter(r=>r.vtype===f.type);if(f.rev)rows=rows.filter(r=>r.hasRevenue===f.rev);
 const p=(f.plate||'').trim().toLowerCase();if(p)rows=rows.filter(r=>r.plate.toLowerCase().includes(p));return rows}
const curEnd=()=>S.m==='ALL'?lastM:S.m;
function rangeLabel(){if(S.mode==='month')return S.m==='ALL'?'ทุกเดือน':thMonthLabel(S.m);return'สะสม '+thMonthLabel(months[0])+' – '+thMonthLabel(curEnd())}
const typeLabel=()=>S.type?'รถ '+S.type:'รถทุกประเภท';
const scope=()=>[rangeLabel(),typeLabel(),S.rev,S.zone?'ภาค '+S.zone:'',S.dc?dcLabel(S.dc):'',S.plate?'ทะเบียน "'+S.plate+'"':''].filter(Boolean).join(' · ');
function prevSpec(){if(S.mode==='month'){if(S.m==='ALL')return null;const i=months.indexOf(S.m);return i<1?null:{m:months[i-1],n:1,nc:1,l:thMonthLabel(months[i-1])}}
 const i=months.indexOf(curEnd());return i<1?null:{m:months[i-1],n:i,nc:i+1,l:'สะสมถึง '+thMonthLabel(months[i-1])}}

/* original renderKPI math */
function kpiCalc(rows){
 const revenue=rows.reduce((s,r)=>s+r.revenue,0),fuel=rows.reduce((s,r)=>s+r.fuel,0),driver=rows.reduce((s,r)=>s+r.driver,0),repair=rows.reduce((s,r)=>s+r.repair,0),installment=rows.reduce((s,r)=>s+r.installment,0);
 const totalCost=fuel+driver+repair+installment,net=rows.reduce((s,r)=>s+r.net,0),totalTrips=rows.reduce((s,r)=>s+(r.trips||0),0);
 const vehicles=new Set(rows.map(vk)),vnet={};rows.forEach(r=>{const k=vk(r);vnet[k]=(vnet[k]||0)+r.net});
 /* approved rule: a vehicle is a loser when its total net over the selected range is below 0 (same as the original in month view) */
 const losers=new Set(Object.keys(vnet).filter(k=>vnet[k]<0)),lossSum=[...losers].reduce((s,k)=>s+vnet[k],0),profitVeh=vehicles.size-losers.size,profitSum=net-lossSum,noRev=rows.filter(r=>r.hasRevenue==='ไม่มีรายได้').length;
 const marginPct=revenue>0?(net/revenue*100):0,revenuePerTrip=totalTrips>0?(revenue/totalTrips):0,fuelPerTrip=totalTrips>0?(fuel/totalTrips):0,repairPerTrip=totalTrips>0?(repair/totalTrips):0,repairPerVehicle=vehicles.size>0?(repair/vehicles.size):0;
 const utilizationPct=rows.length>0?((rows.length-noRev)/rows.length*100):0;
 return{n:rows.length,revenue,fuel,driver,repair,installment,totalCost,net,totalTrips,vehicles:vehicles.size,losers:losers.size,lossSum,profitVeh,profitSum,noRev,marginPct,revenuePerTrip,fuelPerTrip,repairPerTrip,repairPerVehicle,utilizationPct}}
/* id, label, value, text, sub, colour class, better(+1 up good, -1 down good, 0 neutral), sum-type?, unit of change */
function kpiDefs(o){const pc=v=>o.totalCost>0?fmtP(v/o.totalCost*100)+' ของค่าใช้จ่าย':'';return[
 {id:'rev',l:'รายได้รวม',v:o.revenue,txt:fmt(o.revenue),sub:`${o.n.toLocaleString('th-TH')} รายการ`,cls:'',b:1,sum:1,u:'บาท',pg:'profit'},
 {id:'cost',l:'ค่าใช้จ่ายรวม',v:o.totalCost,txt:fmt(o.totalCost),sub:'น้ำมัน+คนขับ+ซ่อม+งวดรถ',cls:'',b:-1,sum:1,u:'บาท',pg:'profit'},
 {id:'net',l:'ผลสุทธิรวม',v:o.net,txt:fmtSigned(o.net),sub:o.net>=0?'กำไรสุทธิ':'ขาดทุนสุทธิ',cls:o.net>=0?'good':'bad',b:1,sum:1,u:'บาท',pg:'profit'},
 {id:'margin',l:'อัตรากำไรขั้นต้น',v:o.marginPct,txt:`${o.marginPct.toFixed(1)}%`,sub:'ผลสุทธิ ÷ รายได้'+(gradeOn()?' · เกรด '+gradeOf(o.marginPct):''),cls:o.marginPct>=0?'good':'bad',b:1,u:'จุด',pct:1,pg:'profit'},
 {id:'fuel',l:'ค่าน้ำมัน',v:o.fuel,txt:fmt(o.fuel),sub:pc(o.fuel),cls:'',b:-1,sum:1,u:'บาท',pg:'profit'},
 {id:'driver',l:'ค่าจ้างคนขับ',v:o.driver,txt:fmt(o.driver),sub:pc(o.driver),cls:'',b:-1,sum:1,u:'บาท',pg:'profit'},
 {id:'repair',l:'ค่าซ่อมแซม',v:o.repair,txt:fmt(o.repair),sub:pc(o.repair),cls:'',b:-1,sum:1,u:'บาท',pg:'profit'},
 {id:'inst',l:'ค่างวดรถ',v:o.installment,txt:fmt(o.installment),sub:pc(o.installment),cls:'',b:-1,sum:1,u:'บาท',pg:'profit'},
 {id:'veh',l:'รถทั้งหมด',v:o.vehicles,txt:o.vehicles.toLocaleString('th-TH'),sub:'นับไม่ซ้ำในช่วงที่เลือก',cls:'',b:0,u:'คัน',pg:'analysis'},
 {id:'prof',l:'รถกำไร',v:o.profitVeh,txt:o.profitVeh.toLocaleString('th-TH'),sub:`กำไรรวม ${fmtSigned(o.profitSum)} บาท`,cls:'good',b:1,u:'คัน',pg:'analysis'},
 {id:'loss',l:'รถขาดทุน',v:o.losers,txt:o.losers.toLocaleString('th-TH'),sub:`ขาดทุนรวม ${fmtSigned(o.lossSum)} บาท`,cls:'bad',b:-1,u:'คัน',pg:'analysis'},
 {id:'util',l:'อัตราการใช้งานรถ',v:o.utilizationPct,txt:`${o.utilizationPct.toFixed(1)}%`,sub:'สัดส่วนรายการที่มีรายได้',cls:o.utilizationPct>=80?'good':(o.utilizationPct<60?'bad':''),b:1,u:'จุด',pct:1,pg:'analysis'},
 {id:'norev',l:'รถไม่มีรายได้',v:o.noRev,txt:o.noRev.toLocaleString('th-TH'),sub:'รายการที่รายได้ = 0',cls:o.noRev>0?'bad':'good',b:-1,sum:1,u:'รายการ',unit:'รายการ'},
 {id:'rpt',l:'รายได้ต่อเที่ยว',v:o.revenuePerTrip,txt:fmt(o.revenuePerTrip),sub:`จาก ${fmt(o.totalTrips)} เที่ยว`,cls:'',b:1,u:'บาท',unit:'บาท'},
 {id:'fpt',l:'น้ำมันต่อเที่ยว',v:o.fuelPerTrip,txt:fmt(o.fuelPerTrip),sub:'ค่าน้ำมัน ÷ เที่ยววิ่ง',cls:'',b:-1,u:'บาท',unit:'บาท'},
 {id:'rept',l:'ค่าซ่อมแซมต่อเที่ยว',v:o.repairPerTrip,txt:fmt(o.repairPerTrip),sub:'ค่าซ่อมแซม ÷ เที่ยววิ่ง',cls:o.repairPerTrip>0?'bad':'',b:-1,u:'บาท',unit:'บาท'},
 {id:'repv',l:'ค่าซ่อมแซมต่อคัน',v:o.repairPerVehicle,txt:fmt(o.repairPerVehicle),sub:'ค่าซ่อมแซม ÷ จำนวนรถ',cls:o.repairPerVehicle>0?'bad':'',b:-1,u:'บาท',unit:'บาท'}]}
const NCARD=12;
function kpiData(){const rows=applyFilters(),o=kpiCalc(rows),p=prevSpec(),q=p?kpiCalc(applyFilters({m:p.m})):null,L=kpiDefs(o),PL=q?kpiDefs(q):null;
 L.forEach((k,i)=>{k.up=null;k.d='';if(!q)return;let cv=k.v,pv=PL[i].v;if(k.sum&&S.mode==='cumulative'){cv/=p.nc;pv/=p.n}const dl=cv-pv;k.dl=dl;k.prev=PL[i].txt;
  if(!Number.isFinite(dl))return;if(Math.abs(dl)<(k.pct?0.05:0.5)){k.d='= เท่าเดิม';k.up=null;return}
  k.up=k.b===0?null:(k.b>0?dl>0:dl<0);k.d=(dl>0?'▲ ':'▼ ')+(k.pct?fmtN(Math.abs(dl),1):fmt(Math.abs(dl)))+' '+k.u});
 return{o,q,p,rows,list:L}}

/* aggregates used by the original analysis tab */
function dcAgg(rows){const by={};rows.forEach(r=>{const k=vk(r),o=by[r.dcCode]=by[r.dcCode]||{code:r.dcCode,name:r.dcName,zone:r.zone,revenue:0,cost:0,net:0,fuel:0,driver:0,repair:0,installment:0,rows:0,rv:0,vehicles:new Set(),months:new Set(),vehicleNet:{}};o.rows++;if(r.hasRevenue==='มีรายได้')o.rv++;o.revenue+=r.revenue;o.fuel+=r.fuel;o.driver+=r.driver;o.repair+=r.repair;o.installment+=r.installment;o.cost+=costOf(r);o.net+=r.net;o.vehicles.add(k);o.months.add(r.date);o.vehicleNet[k]=(o.vehicleNet[k]||0)+r.net});
 return Object.values(by).map(x=>({key:x.code,dcCode:x.code,dcName:x.name,zone:x.zone,util:x.rows?x.rv/x.rows*100:NaN,fuel:x.fuel,driver:x.driver,repair:x.repair,installment:x.installment,vehicleCount:x.vehicles.size,monthCount:x.months.size,revenue:x.revenue,cost:x.cost,net:x.net,avgNetPerVehicle:x.vehicles.size>0?(x.net/x.vehicles.size):0,margin:x.revenue>0?(x.net/x.revenue*100):0,lossVehicleCount:Object.values(x.vehicleNet).filter(n=>n<0).length,status:x.net>=0?'กำไร':'ขาดทุน'})).sort((a,b)=>b.net-a.net)}
function zoneAgg(rows){const by={};rows.forEach(r=>{const k=vk(r),o=by[r.zone]=by[r.zone]||{zone:r.zone,revenue:0,cost:0,net:0,fuel:0,driver:0,repair:0,installment:0,rows:0,rv:0,vehicles:new Set(),dcs:new Set(),vehicleNet:{}};o.rows++;if(r.hasRevenue==='มีรายได้')o.rv++;o.revenue+=r.revenue;o.cost+=costOf(r);o.net+=r.net;o.fuel+=r.fuel;o.driver+=r.driver;o.repair+=r.repair;o.installment+=r.installment;o.vehicles.add(k);o.dcs.add(r.dcCode);o.vehicleNet[k]=(o.vehicleNet[k]||0)+r.net});
 return Object.values(by).map(x=>({key:x.zone,zone:x.zone,util:x.rows?x.rv/x.rows*100:NaN,dcCount:x.dcs.size,vehicleCount:x.vehicles.size,revenue:x.revenue,cost:x.cost,net:x.net,fuel:x.fuel,driver:x.driver,repair:x.repair,installment:x.installment,avgNetPerVehicle:x.vehicles.size>0?(x.net/x.vehicles.size):0,margin:x.revenue>0?(x.net/x.revenue*100):0,lossVehicleCount:Object.values(x.vehicleNet).filter(n=>n<0).length,status:x.net>=0?'กำไร':'ขาดทุน'})).sort((a,b)=>b.net-a.net)}
function vehAgg(rows){const by={};rows.forEach(r=>{const k=vk(r),o=by[k]=by[k]||{vehKey:k,plate:r.plate,dcCode:r.dcCode,dcName:r.dcName,vtype:r.vtype,last:'',months:new Set(),lossMonths:0,revenue:0,cost:0,totalNet:0};
  if(r.date>=o.last){o.last=r.date;o.dcCode=r.dcCode;o.dcName=r.dcName}o.months.add(r.date);o.revenue+=r.revenue;o.cost+=costOf(r);o.totalNet+=r.net;if(r.net<0)o.lossMonths++});
 return Object.values(by).map(v=>({key:v.vehKey,vehKey:v.vehKey,plate:v.plate,dcCode:v.dcCode,dcName:v.dcName,vtype:v.vtype,monthCount:v.months.size,revenue:v.revenue,cost:v.cost,net:v.totalNet,margin:v.revenue>0?(v.totalNet/v.revenue*100):0,lossMonths:v.lossMonths,status:v.totalNet>=0?'กำไร':'ขาดทุน'})).sort((a,b)=>b.net-a.net)}
function monthAgg(rows){return uniqueSorted(rows.map(r=>r.date)).map(m=>{const mr=rows.filter(r=>r.date===m);return{m,revenue:mr.reduce((s,r)=>s+r.revenue,0),cost:mr.reduce((s,r)=>s+costOf(r),0),net:mr.reduce((s,r)=>s+r.net,0),dry:mr.filter(r=>r.vtype==='Dry').reduce((s,r)=>s+r.net,0),cool:mr.filter(r=>r.vtype==='Cool').reduce((s,r)=>s+r.net,0)}})}
/* rows for the monthly trend: every filter except the month, cumulative stops at the chosen month */
const trendRows=()=>{let r=applyFilters({mode:'month',m:'ALL'});if(S.mode==='cumulative'&&S.m!=='ALL')r=r.filter(x=>x.date<=S.m);return r};
function issues(dataset){
 const byVehicle={};dataset.forEach(r=>{const k=vk(r);byVehicle[k]=byVehicle[k]||{vehKey:k,plate:r.plate,dcCode:r.dcCode,dcName:r.dcName,months:new Set(),lossMonths:0,totalNet:0};byVehicle[k].months.add(r.date);byVehicle[k].totalNet+=r.net;if(r.net<0)byVehicle[k].lossMonths++});
 const chronic=Object.values(byVehicle).filter(v=>v.months.size>=2&&v.lossMonths===v.months.size).sort((a,b)=>a.totalNet-b.totalNet);
 const norevAgg={};dataset.filter(r=>r.hasRevenue==='ไม่มีรายได้'&&costOf(r)>0).forEach(r=>{const k=vk(r);norevAgg[k]=norevAgg[k]||{vehKey:k,plate:r.plate,dcName:r.dcName,cost:0,count:0};norevAgg[k].cost+=costOf(r);norevAgg[k].count++});
 const norev=Object.values(norevAgg).sort((a,b)=>b.cost-a.cost);
 const D=dcAgg(dataset),top3=D.slice(0,3),bottom3=D.slice(-3).reverse(),V=vehAgg(dataset);
 const recos=[];
 if(chronic.length>0)recos.push(`มีรถ ${chronic.length} คันที่ขาดทุนต่อเนื่องทุกเดือนที่มีข้อมูล ควรตรวจสอบต้นทุนค่าซ่อมแซม/ค่างวดรถเทียบกับรายได้ และพิจารณาปรับเส้นทาง เปลี่ยนประเภทงาน หรือทบทวนความคุ้มค่าในการใช้รถคันดังกล่าวต่อ`);
 if(norev.length>0){const w=norev.reduce((s,v)=>s+v.cost,0);recos.push(`มีรถที่ไม่มีรายได้แต่ยังมีค่าใช้จ่ายรวม ${fmt(w)} บาท (${norev.length} คัน) ควรตรวจสอบสาเหตุที่รถไม่ได้ใช้งาน เช่น รอซ่อม จอดรอบรรทุก หรือขาดผู้ขับ เพื่อลดต้นทุนจมโดยไม่จำเป็น`)}
 if(bottom3.length>0)recos.push(`DC ที่ขาดทุนสูงสุด (${bottom3.map(x=>x.dcName).join(', ')}) ควรได้รับการทบทวนแผนการเดินรถและโครงสร้างต้นทุนเป็นลำดับแรก`);
 const wv=V.slice(-3).reverse();if(wv.length>0&&wv[0].net<0)recos.push(`รถที่ขาดทุนสูงสุด 3 อันดับแรก (${wv.map(x=>x.plate).join(', ')}) ควรพิจารณาเป็นลำดับแรกในการทบทวนต้นทุนหรือแผนการใช้งาน`);
 if(recos.length===0)recos.push('ไม่พบประเด็นผิดปกติที่มีนัยสำคัญในข้อมูลชุดนี้');
 return{chronic,norev,top3,bottom3,recos,D,V}}
const anaData=()=>S.scope==='filter'?applyFilters():allData;
window.FM={allData,applyFilters,kpiCalc,dcAgg,vehAgg,zoneAgg,issues};

/* ---------- charts: pure SVG strings. P = colours, so the same code draws the live page and the exports ---------- */
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function pal(){const s=getComputedStyle(document.documentElement),g=k=>s.getPropertyValue(k).trim();return{ink:g('--ink'),muted:g('--muted'),line:g('--line'),panel:g('--panel'),s:[g('--s1'),g('--s2'),g('--s3'),g('--s4'),g('--s5')],bad:g('--bad')}}
const LIGHT={ink:'#0b1f3f',muted:'#55657f',line:'#dbe3f0',panel:'#ffffff',s:['#1d57b8','#b8860b','#6e93d6','#b8334a','#2f8f8f'],bad:'#b8334a'};
const F='font-family="Prompt,sans-serif"';
function niceMax(v){if(v<=0)return 1;const e=Math.pow(10,Math.floor(Math.log10(v))),n=v/e;return(n<=1?1:n<=2?2:n<=5?5:10)*e}
function niceMin(v){return v>=0?0:-niceMax(-v)}
function lineChart({labels,series,fmt:fm,W=720,H=280,P,acts,tipTitle,refLine,mark}){
 const m={l:62,r:30,t:12,b:34},iw=W-m.l-m.r,ih=H-m.t-m.b,all=series.flatMap(s=>s.vals).filter(Number.isFinite);
 const hi0=Math.max(...all,refLine||0,0),lo0=Math.min(0,...all),st=niceMax((hi0-lo0)/4||1),mn=Math.floor(lo0/st)*st,mx=Math.max(Math.ceil(hi0/st)*st,mn+st),nt=Math.round((mx-mn)/st);const y=v=>m.t+ih*(1-(v-mn)/(mx-mn||1)),x=i=>m.l+(labels.length>1?iw*i/(labels.length-1):iw/2);
 let s=`<svg viewBox="0 0 ${W} ${H}" role="img" ${F}>`;
 if(mark!=null&&mark>=0)s+=`<rect x="${x(mark)-Math.max(10,iw/labels.length/2.4)}" y="${m.t}" width="${2*Math.max(10,iw/labels.length/2.4)}" height="${ih}" rx="6" fill="${P.s[1]}" opacity=".12"/>`;
 for(let k=0;k<=nt;k++){const v=mn+k*st;s+=`<line x1="${m.l}" x2="${W-m.r}" y1="${y(v)}" y2="${y(v)}" stroke="${P.line}"/><text x="${m.l-6}" y="${y(v)+4}" text-anchor="end" font-size="12" fill="${P.muted}">${esc(fm(v))}</text>`}
 if(mn<0)s+=`<line x1="${m.l}" x2="${W-m.r}" y1="${y(0)}" y2="${y(0)}" stroke="${P.muted}" stroke-width="1.2"/>`;
 const stepL=Math.ceil(labels.length/Math.max(3,Math.floor(iw/72)));labels.forEach((l,i)=>{if(i%stepL===0)s+=`<text x="${x(i)}" y="${H-12}" text-anchor="middle" font-size="12" fill="${P.muted}">${esc(l)}</text>`});
 if(refLine!=null)s+=`<line x1="${m.l}" x2="${W-m.r}" y1="${y(refLine)}" y2="${y(refLine)}" stroke="${P.s[1]}" stroke-dasharray="5 4"/>`;
 series.forEach((se,si)=>{let d='',p=false;se.vals.forEach((v,i)=>{if(!Number.isFinite(v)){p=false;return}d+=(p?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1);p=true});
  if(si===0&&series.length===1&&mn>=0)s+=`<path d="${d}L${x(labels.length-1)} ${y(Math.max(mn,0))}L${x(0)} ${y(Math.max(mn,0))}Z" fill="${se.color}" opacity=".1"/>`;
  s+=`<path d="${d}" fill="none" stroke="${se.color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
  se.vals.forEach((v,i)=>{if(Number.isFinite(v))s+=`<circle cx="${x(i)}" cy="${y(v)}" r="${i===mark||i===se.vals.length-1?4.5:3}" fill="${se.color}" stroke="${P.panel}" stroke-width="1.5"/>`})});
 const bw=iw/Math.max(1,labels.length-1);labels.forEach((l,i)=>{const tip=(tipTitle?tipTitle(i):l)+'\n'+series.map(se=>se.name+': '+fm(se.vals[i],1)).join('\n');
  s+=`<rect x="${x(i)-bw/2}" y="${m.t}" width="${bw}" height="${ih}" fill="transparent" data-tip="${esc(tip)}"${acts&&acts[i]?` data-act="${esc(acts[i])}" style="cursor:pointer"`:''}/>`});
 return s+'</svg>'}
function hbars({items,W=560,P,fmt:fm,labelW=150,rh=30}){const H=items.length*rh+8,vals=items.map(i=>i.v).filter(Number.isFinite),mx=Math.max(0,...vals),mn=Math.min(0,...vals),ri=W-labelW-92,sc=v=>(v-mn)/((mx-mn)||1)*ri,z=labelW+sc(0);
 let s=`<svg viewBox="0 0 ${W} ${H}" role="img" ${F}>`;s+=`<line x1="${z}" x2="${z}" y1="2" y2="${H-4}" stroke="${P.line}"/>`;
 items.forEach((it,i)=>{const yy=i*rh+(rh-18)/2,v=Number.isFinite(it.v)?it.v:0,x0=Math.min(z,labelW+sc(v)),w=Math.max(2,Math.abs(sc(v)-sc(0)));
  s+=`<g${it.act?` data-act="${esc(it.act)}" style="cursor:pointer"`:''} data-tip="${esc(it.tip||(it.l+': '+fm(it.v)))}"><rect x="0" y="${i*rh}" width="${W}" height="${rh}" fill="transparent"/><text x="${labelW-8}" y="${yy+13}" text-anchor="end" font-size="13" fill="${P.ink}">${esc(it.l)}</text><rect x="${x0}" y="${yy}" width="${w}" height="18" rx="4" fill="${it.c||(v<0?P.bad:P.s[0])}"/><text x="${v<0?z+6:x0+w+6}" y="${yy+13}" font-size="13" fill="${P.ink}">${esc(fm(it.v))}</text></g>`});
 return s+'</svg>'}
function donut({parts,center,sub,W=240,P}){const R=W/2-6,r=R*.64,cx=W/2,cy=W/2,tot=parts.reduce((s,p)=>s+Math.max(0,p.v),0)||1;let a=-Math.PI/2,s=`<svg viewBox="0 0 ${W} ${W}" role="img" ${F}>`;
 parts.forEach(p=>{const f=Math.max(0,p.v)/tot;if(!f)return;if(f>.9999){s+=`<circle cx="${cx}" cy="${cy}" r="${(R+r)/2}" fill="none" stroke="${p.c}" stroke-width="${R-r}" data-tip="${esc(p.l+': '+fmt(p.v)+' บาท (100%)')}"/>`;return}const a2=a+f*Math.PI*2-.02,l=(a2-a)>Math.PI?1:0,pt=(rr,t)=>`${(cx+rr*Math.cos(t)).toFixed(2)} ${(cy+rr*Math.sin(t)).toFixed(2)}`;
  s+=`<path d="M${pt(R,a)}A${R} ${R} 0 ${l} 1 ${pt(R,a2)}L${pt(r,a2)}A${r} ${r} 0 ${l} 0 ${pt(r,a)}Z" fill="${p.c}" data-tip="${esc(p.l+': '+fmt(p.v)+' บาท ('+fmtP(f*100)+')')}"/>`;a=a2+.02});
 return s+`<text x="${cx}" y="${cy+4}" text-anchor="middle" font-size="24" font-weight="600" font-family="Prompt,sans-serif" fill="${P.ink}">${esc(center)}</text><text x="${cx}" y="${cy+24}" text-anchor="middle" font-size="13" fill="${P.muted}">${esc(sub)}</text></svg>`}
function waterfall({steps,W=720,H=300,P}){const m={l:12,r:12,t:26,b:46},iw=W-m.l-m.r,ih=H-m.t-m.b;let cur=0,lo=0,hi=0;const seq=steps.map(s=>{const st=s.total?0:cur,en=s.total?s.v:cur+s.v;if(!s.total||s.first)cur=en;lo=Math.min(lo,st,en);hi=Math.max(hi,st,en);return{...s,st,en}});
 const y=v=>m.t+ih*(1-(v-lo)/((hi-lo)||1)),bw=iw/seq.length*.68,step=iw/seq.length;let s=`<svg viewBox="0 0 ${W} ${H}" role="img" ${F}><line x1="${m.l}" x2="${W-m.r}" y1="${y(0)}" y2="${y(0)}" stroke="${P.muted}"/>`;
 seq.forEach((b,i)=>{const x=m.l+i*step+(step-bw)/2,t=Math.min(y(b.st),y(b.en)),h=Math.max(2,Math.abs(y(b.st)-y(b.en))),c=b.total?(b.en<0?P.bad:P.s[0]):b.c;
  s+=`<g data-tip="${esc(b.l+': '+fmt(b.v)+' บาท')}"><rect x="${x}" y="${t}" width="${bw}" height="${h}" rx="4" fill="${c}"/><text x="${x+bw/2}" y="${t-6}" text-anchor="middle" font-size="12" fill="${P.ink}">${esc(fmtM(b.v))}</text></g><text x="${x+bw/2}" y="${H-24}" text-anchor="middle" font-size="12" fill="${P.muted}">${esc(b.l)}</text>`;
  if(i<seq.length-1)s+=`<line x1="${x+bw}" x2="${x+step}" y1="${y(b.en)}" y2="${y(b.en)}" stroke="${P.line}"/>`});
 return s+`<text x="${W-m.r}" y="${H-6}" text-anchor="end" font-size="11" fill="${P.muted}">ล้านบาท</text></svg>`}
const LEG=items=>`<div class="legend">${items.map(([c,t])=>`<span><i style="background:${c}"></i>${esc(t)}</span>`).join('')}</div>`;
function costParts(o,P){return[['ค่าน้ำมัน',o.fuel,P.s[0]],['ค่าจ้างคนขับ',o.driver,P.s[1]],['ค่าซ่อมแซม',o.repair,P.s[2]],['ค่างวดรถ',o.installment,P.s[3]]].map(([l,v,c])=>({l,v,c}))}
function trendSvg(P,W,H){const A=monthAgg(trendRows()),mk=S.mode==='month'&&S.m!=='ALL'?A.findIndex(x=>x.m===S.m):-1;
 return lineChart({labels:A.map(x=>thMonthLabel(x.m)),series:[{name:'รายได้',color:P.s[0],vals:A.map(x=>x.revenue)},{name:'ค่าใช้จ่าย',color:P.s[1],vals:A.map(x=>x.cost)},{name:'ผลสุทธิ',color:P.s[2],vals:A.map(x=>x.net)}],fmt:(v,full)=>full?fmtSigned(v)+' บาท':fmtS(v),W,H:H||Math.round(Math.max(220,W*.36)),P,acts:A.map(x=>'month:'+x.m),mark:mk})}

/* ---------- shell ---------- */
const ICON={home:'<path d="M3 11l9-8 9 8M5 10v10h14V10"/>',profit:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',analysis:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/>',records:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M3 14h18M9 9v11"/>',check:'<path d="M4 12l5 5L20 6"/>',settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>'};
const PAGES=[['home','หน้าหลัก','หน้าหลัก'],['profit','ผลประกอบการ DC','DC'],['analysis','วิเคราะห์ปัญหา','วิเคราะห์'],['records','ตารางข้อมูล','ตาราง']];if(window.ADMIN){PAGES.push(['check','ตรวจสอบข้อมูล','ตรวจสอบ'],['settings','ตั้งค่า','ตั้งค่า'])}
const ic=k=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;
const $=s=>document.querySelector(s);
function renderShell(){
 const he=document.getElementById('hdr-export');if(he)he.hidden=!window.ADMIN;
 const seg=(arr,val,act)=>arr.map(([k,t])=>`<button data-act="${act}:${k}" aria-pressed="${String(val)===String(k)}">${t}</button>`).join('');
 $('#seg-group').innerHTML=seg([['','รถทั้งหมด'],['Dry','Dry'],['Cool','Cool']],S.type,'type');
 $('#seg-mode').innerHTML=seg([['month','รายเดือน'],['cumulative','สะสม']],S.mode,'mode');
 const opt=(v,t,cur)=>`<option value="${esc(v)}"${String(v)===String(cur)?' selected':''}>${esc(t)}</option>`;
 const mo=[['ALL',S.mode==='month'?'ทุกเดือน':'สะสมทั้งหมด'],...months.map(m=>[m,(S.mode==='month'?'':'ถึง ')+thMonthLabel(m)])];
 const dcs=[...dcNames.entries()].filter(([c])=>!S.zone||zoneOf(c)===S.zone).sort((a,b)=>a[0].localeCompare(b[0]));
 const ae=document.activeElement&&document.activeElement.id==='f-plate';
 $('#filters').innerHTML=`<select id="f-month" aria-label="เดือน">${mo.map(([v,t])=>opt(v,t,S.m)).join('')}</select><select id="f-zone" aria-label="ภาค">${opt('','ทุกภาค',S.zone)}${zones.map(z=>opt(z,z,S.zone)).join('')}</select><select id="f-dc" aria-label="DC">${opt('','ทุก DC',S.dc)}${dcs.map(([c,n])=>opt(c,n,S.dc)).join('')}</select><select id="f-rev" aria-label="สถานะรายได้">${opt('','ทุกสถานะรายได้',S.rev)}${opt('มีรายได้','มีรายได้',S.rev)}${opt('ไม่มีรายได้','ไม่มีรายได้',S.rev)}</select><input type="search" id="f-plate" placeholder="ค้นหาทะเบียน" aria-label="ค้นหาทะเบียนรถ" value="${esc(S.plate)}">`;
 if(ae){const n=$('#f-plate');n.focus();const l=n.value.length;try{n.setSelectionRange(l,l)}catch(x){}}
 const nav=i=>PAGES.map(p=>`<button data-act="page:${p[0]}"${S.page===p[0]?' aria-current="page"':''}>${ic(p[0])}<span>${p[i]}</span></button>`).join('');
 $('#tab').innerHTML=nav(2);$('#rail-nav').innerHTML=nav(1)}

/* ---------- tables: sort starts "best → worst" like the original, a second tap reverses ---------- */
function goodSort(d,c,dir){const kind=c.dir||'text',val=c.v;const rk=v=>kind==='status'?(v==='กำไร'?0:1):kind==='status2'?(v==='มีรายได้'?0:1):0;
 return d.slice().sort((a,b)=>{let va=val(a),vb=val(b),r;if(kind==='high')r=(vb??-Infinity)-(va??-Infinity);else if(kind==='low')r=(va??Infinity)-(vb??Infinity);else if(kind==='status'||kind==='status2')r=rk(va)-rk(vb);else r=String(va??'').localeCompare(String(vb??''),'th');return r*dir})}
const DEF={};
function table(id,cols,data,opts={}){
 DEF[id]=opts.sort||null;const so=S.sort[id]||opts.sort||null;let d=data;const q=(S.q[id]||'').trim().toLowerCase();
 if(q)d=d.filter(r=>cols.some(c=>String(c.txt?c.txt(r):c.v(r)).toLowerCase().includes(q)));
 if(so){const c=cols.find(x=>x.k===so.k);if(c)d=goodSort(d,c,so.d)}
 const heat={};cols.forEach(c=>{if(c.heat){const v=d.map(c.v).filter(Number.isFinite).sort((a,b)=>a-b);heat[c.k]={lo:v[0],hi:v[v.length-1]}}});
 const tint=(c,v)=>{const h=heat[c.k];if(!h||!Number.isFinite(v)||h.hi===h.lo)return'';let t=(v-h.lo)/(h.hi-h.lo);if(c.heat<0)t=1-t;const bad=t<.5,a=Math.round(Math.abs(t-.5)*2*(bad?28:22));return` style="background:color-mix(in srgb,var(${bad?'--bad':'--good'}) ${a}%,var(--panel))"`};
 const head=cols.map(c=>`<th aria-sort="${so&&so.k===c.k?(so.d>0?'descending':'ascending'):'none'}"><button data-act="sort:${id}:${c.k}">${esc(c.t)}${so&&so.k===c.k?(so.d>0?' ▼':' ▲'):''}</button></th>`).join('');
 let pageInfo='';const total=d.length;if(opts.page){const size=S.psize==='ALL'?total:S.psize,pages=Math.max(1,Math.ceil(total/size));let p=Math.min(S.pg[id]||0,pages-1);S.pg[id]=p;d=d.slice(p*size,p*size+size);
  pageInfo=`<div class="pager"><button class="btn alt" data-act="pg:${id}:-1"${p<=0?' disabled':''}>ก่อนหน้า</button><span>หน้า ${p+1} / ${pages}</span><button class="btn alt" data-act="pg:${id}:1"${p>=pages-1?' disabled':''}>ถัดไป</button></div>`}
 const body=d.map(r=>`<tr${opts.sel&&opts.sel(r)?' class="sel"':''}${opts.act?` data-act="${esc(opts.act(r))}"`:''}>${cols.map(c=>{const v=c.v(r);return`<td${tint(c,v)}>${c.html?c.html(r):esc(c.txt?c.txt(r):v)}</td>`}).join('')}</tr>`).join('');
 const sums=opts.sums||(opts.sum?[{label:opts.sumLabel||'รวม',v:opts.sum}]:[]);const tot=sums.map(o=>`<tr class="sum">${cols.map((c,i)=>`<td>${i?esc(o.v[c.k]??''):esc(o.label)}</td>`).join('')}</tr>`).join('');
 const search=opts.search?`<div class="tools"><input type="search" id="q-${id}" placeholder="${esc(opts.search)}" aria-label="${esc(opts.search)}" value="${esc(S.q[id]||'')}" data-q="${id}">${opts.tools||''}</div>`:'';
 return`${search}<div class="tw"><table class="t" id="tb-${id}"><thead><tr>${head}</tr></thead><tbody>${body||`<tr><td colspan="${cols.length}">ไม่มีข้อมูลในเงื่อนไขนี้</td></tr>`}${tot}</tbody></table></div>${pageInfo}`}
const tagR=v=>`<span class="tag ${v==='ขาดทุน'?'':'ok'}">${esc(v||'-')}</span>`;
const tagT=v=>`<span class="tag mut">${esc(v||'-')}</span>`;
const DCCOLS=()=>[{k:'dcName',t:'DC',v:x=>x.dcName,dir:'text'},{k:'vehicleCount',t:'คัน',v:x=>x.vehicleCount,txt:x=>x.vehicleCount.toLocaleString('th-TH'),dir:'high'},{k:'monthCount',t:'เดือนที่มีข้อมูล',v:x=>x.monthCount,dir:'high'},{k:'revenue',t:'รายได้รวม',v:x=>x.revenue,txt:x=>fmt(x.revenue),dir:'high'},{k:'cost',t:'ค่าใช้จ่ายรวม',v:x=>x.cost,txt:x=>fmt(x.cost),dir:'low'},{k:'net',t:'ผลสุทธิ',v:x=>x.net,txt:x=>fmtSigned(x.net),dir:'high',heat:1},{k:'avgNetPerVehicle',t:'เฉลี่ยผลสุทธิ/คัน',v:x=>x.avgNetPerVehicle,txt:x=>fmtSigned(x.avgNetPerVehicle),dir:'high',heat:1},{k:'margin',t:'อัตรากำไร %',v:x=>x.margin,txt:x=>x.margin.toFixed(1)+'%',dir:'high',heat:1},{k:'lossVehicleCount',t:'รถขาดทุน',v:x=>x.lossVehicleCount,txt:x=>x.lossVehicleCount.toLocaleString('th-TH'),dir:'low'},{k:'status',t:'สถานะ',v:x=>x.status,html:x=>tagR(x.status),dir:'status'},...gradeCol()];
const gradeCol=()=>gradeOn()?[{k:'grade',t:'เกรด',v:x=>gradeFor(x),html:x=>{const g=gradeFor(x);return g?`<b style="color:${GCOL[g]}">${g}</b>`:'–'},dir:'text'}]:[];
const VEHCOLS=()=>[{k:'plate',t:'ทะเบียนรถ',v:x=>x.plate,dir:'text'},{k:'dcName',t:'DC',v:x=>x.dcName,dir:'text'},{k:'vtype',t:'ประเภทรถ',v:x=>x.vtype,html:x=>tagT(x.vtype),dir:'text'},{k:'monthCount',t:'เดือนที่มีข้อมูล',v:x=>x.monthCount,dir:'high'},{k:'revenue',t:'รายได้รวม',v:x=>x.revenue,txt:x=>fmt(x.revenue),dir:'high'},{k:'cost',t:'ค่าใช้จ่ายรวม',v:x=>x.cost,txt:x=>fmt(x.cost),dir:'low'},{k:'net',t:'ผลสุทธิ',v:x=>x.net,txt:x=>fmtSigned(x.net),dir:'high',heat:1},{k:'margin',t:'อัตรากำไร %',v:x=>x.margin,txt:x=>x.margin.toFixed(1)+'%',dir:'high',heat:1},{k:'lossMonths',t:'เดือนขาดทุน',v:x=>x.lossMonths,dir:'low'},{k:'status',t:'สถานะ',v:x=>x.status,html:x=>tagR(x.status),dir:'status'}];
const RECCOLS=()=>[{k:'date',t:'เดือน',v:r=>r.date,txt:r=>thMonthLabel(r.date),dir:'text'},{k:'dcName',t:'DC',v:r=>r.dcName,dir:'text'},{k:'plate',t:'ทะเบียนรถ',v:r=>r.plate,dir:'text'},{k:'vtype',t:'ประเภทรถ',v:r=>r.vtype,html:r=>tagT(r.vtype),dir:'text'},{k:'trips',t:'เที่ยววิ่ง',v:r=>r.trips,txt:r=>fmt(r.trips),dir:'high'},{k:'revenue',t:'รายได้',v:r=>r.revenue,txt:r=>fmt(r.revenue),dir:'high'},{k:'fuel',t:'ค่าน้ำมัน',v:r=>r.fuel,txt:r=>fmt(r.fuel),dir:'low'},{k:'driver',t:'ค่าจ้างคนขับ',v:r=>r.driver,txt:r=>fmt(r.driver),dir:'low'},{k:'repair',t:'ค่าซ่อมแซม',v:r=>r.repair,txt:r=>fmt(r.repair),dir:'low'},{k:'installment',t:'ค่างวดรถ',v:r=>r.installment,txt:r=>fmt(r.installment),dir:'low'},{k:'hasRevenue',t:'สถานะรายได้',v:r=>r.hasRevenue,html:r=>`<span class="tag ${r.hasRevenue==='มีรายได้'?'ok':''}">${r.hasRevenue}</span>`,dir:'status2'},{k:'net',t:'ผลสุทธิ',v:r=>r.net,txt:r=>fmtSigned(r.net),dir:'high',heat:1},{k:'result',t:'กำไร-ขาดทุน',v:r=>r.result,html:r=>tagR(r.result),dir:'status'}];

/* ---------- KPI ---------- */
const barOf=c=>c==='good'?'var(--s3)':c==='bad'?'var(--bad)':'var(--gold-l)';
function kpiHtml(K){const top=K.list.slice(0,NCARD),low=K.list.slice(NCARD);
 return`<div class="kpis" id="kpi-grid">${top.map(k=>`<button class="kpi" style="--bar:${barOf(k.cls)}" data-act="page:${k.pg}"><span class="l">${esc(k.l)}</span><span class="v">${esc(k.txt)}</span><span class="d">${esc(k.sub)}</span><span class="s">${k.d?`<b class="${k.up===null?'':k.up?'up':'dn'}">${esc(k.d)}</b>`:'&nbsp;'}</span></button>`).join('')}</div>
 <div class="stats s5">${low.map(k=>`<div class="stat"><span>${esc(k.l)}</span><b>${esc(k.txt)} <small style="font-size:13px;font-weight:400">${esc(k.unit||'')}</small></b>${k.d?`<em class="${k.up===null?'mut':k.up?'good':'badt'}">${esc(k.d)}</em>`:`<em class="mut">${esc(k.sub)}</em>`}</div>`).join('')}</div>
 ${K.q?`<p class="note" style="margin:-4px 0 0">ลูกศรเทียบกับ ${esc(K.p.l)}${S.mode==='cumulative'?' (ยอดเงินและจำนวนรายการเทียบเป็นค่าเฉลี่ยต่อเดือน)':''}</p>`:''}`}

/* ---------- pages ---------- */
const VIEW={};
const W=()=>Math.min(760,Math.max(320,($('#view').clientWidth||360)-30));
const WF=()=>Math.max(320,($('#view').clientWidth||360)-60);
const WH=()=>{const c=$('#view').clientWidth||360;return Math.max(320,innerWidth>=960?(c-14)/2-60:c-60)};
function header(t,sub){return`<div class="page-h"><h1>${esc(t)}</h1>${sub?`<p class="say" style="margin:0">${sub}</p>`:''}</div>${chips()}`}
function chips(){const c=[];if(S.zone)c.push(`<button class="chip" data-act="zone:">ภาค ${esc(S.zone)} ✕</button>`);if(S.dc)c.push(`<button class="chip" data-act="dc:">DC ${esc(dcLabel(S.dc))} ✕</button>`);if(S.type)c.push(`<button class="chip" data-act="type:">ประเภท ${esc(S.type)} ✕</button>`);if(S.rev)c.push(`<button class="chip" data-act="rev:">${esc(S.rev)} ✕</button>`);if(S.plate)c.push(`<button class="chip" data-act="plate:">ทะเบียน "${esc(S.plate)}" ✕</button>`);return c.length?`<div class="chips">${c.join('')}</div>`:''}
const dcRows=()=>dcAgg(applyFilters({dc:''}));
const zoneRows=()=>zoneAgg(applyFilters({zone:''}));
const dcl=x=>`${x.dcName} (${x.vehicleCount} คัน)`;
/* month-by-month matrix for ภาค or DC; the metric list is shared */
const pctX=v=>Number.isFinite(v)?v.toFixed(1)+'%':'–',cntX=v=>Number.isFinite(v)?fmt(v):'–';
const MET=[{k:'net',t:'ผลสุทธิ (บาท)',f:x=>x.net,x:fmtSigned,hi:1},{k:'revenue',t:'รายได้ (บาท)',f:x=>x.revenue,x:fmt,hi:1},{k:'cost',t:'ค่าใช้จ่ายรวม (บาท)',f:x=>x.cost,x:fmt,hi:0},{k:'fuel',t:'ค่าน้ำมัน (บาท)',f:x=>x.fuel,x:fmt,hi:0},{k:'driver',t:'ค่าจ้างคนขับ (บาท)',f:x=>x.driver,x:fmt,hi:0},{k:'repair',t:'ค่าซ่อมแซม (บาท)',f:x=>x.repair,x:fmt,hi:0},{k:'installment',t:'ค่างวดรถ (บาท)',f:x=>x.installment,x:fmt,hi:0},{k:'margin',t:'อัตรากำไร %',f:x=>x.margin,x:pctX,hi:1},{k:'lossVehicleCount',t:'รถขาดทุน (คัน)',f:x=>x.lossVehicleCount,x:cntX,hi:0}];
const CMP=MET;
const allAgg=rows=>zoneAgg(rows.map(r=>({...r,zone:'_'})))[0];
function matrixRows(dim){const z=dim==='zone',c=MET.find(x=>x.k===(z?S.zcmp:S.cmp))||MET[0],agg=z?zoneAgg:dcAgg,key=x=>z?x.zone:x.dcCode;
 const base=applyFilters(z?{mode:'month',m:'ALL',zone:''}:{mode:'month',m:'ALL',dc:''}),ms=uniqueSorted(base.map(r=>r.date)).filter(m=>S.mode==='month'||S.m==='ALL'||m<=S.m),inR=base.filter(r=>ms.includes(r.date));
 const per=ms.map(m=>{const o={};agg(inR.filter(r=>r.date===m)).forEach(d=>o[key(d)]=d);return o}),all=agg(inR);
 const rows=all.map(d=>({key:key(d),name:z?d.zone:d.dcName,zone:d.zone,dcN:d.dcCount,carsN:d.vehicleCount,vals:per.map(o=>o[key(d)]?c.f(o[key(d)]):NaN)}));
 const tot=ms.map(m=>{const a=allAgg(inR.filter(r=>r.date===m));return a?c.f(a):NaN}),avg=ms.map((m,i)=>{const v=rows.map(r=>r.vals[i]).filter(Number.isFinite);return v.length?v.reduce((s,x)=>s+x,0)/v.length:NaN});
 return{c,ms,rows,tot,avg,dcN:new Set(inR.map(r=>r.dcCode)).size,carsN:new Set(inR.map(vk)).size}}
function cmpRows(){return matrixRows('dc')}
function matrixTable(dim){const z=dim==='zone',M=matrixRows(dim),{c,ms,rows:R}=M,n=ms.length,chg=a=>a[n-1]-a[n-2];
 const cols=[{k:'name',t:z?'ภาค':'DC',v:o=>o.name,dir:'text'},...(z?[{k:'dc',t:'DC',v:o=>o.dcN,dir:'high'}]:[{k:'zone',t:'ภาค',v:o=>o.zone,dir:'text'}]),{k:'cn',t:'คัน',v:o=>o.carsN,dir:'high'},...ms.map((m,i)=>({k:'m'+i,t:thMonthLabel(m),v:o=>o.vals[i],txt:o=>c.x(o.vals[i]),dir:c.hi?'high':'low',heat:c.hi?1:-1}))];
 const cx=d=>Number.isFinite(d)?`${d>=0?'▲':'▼'} ${c.x(Math.abs(d)).replace('+','')}`:'–';
 if(n>1)cols.push({k:'chg',t:'เปลี่ยน',v:o=>chg(o.vals),html:o=>{const d=chg(o.vals);if(!Number.isFinite(d))return'–';const g=c.hi?d>=0:d<=0;return`<span class="${g?'good':'badt'}">${esc(cx(d))}</span>`},dir:c.hi?'high':'low'});
 const sv=(arr,extra)=>Object.fromEntries([...extra,...ms.map((m,i)=>['m'+i,c.x(arr[i])]),['chg',n>1?cx(chg(arr)):'']]);
 const sums=[{label:'รวม',v:sv(M.tot,z?[['dc',fmt(M.dcN)],['cn',fmt(M.carsN)]]:[['cn',fmt(M.carsN)]])},{label:z?'เฉลี่ยต่อภาค':'เฉลี่ยต่อ DC',v:sv(M.avg,[])}];
 if(c.k==='margin')sums[0].label='รวม (คิดจากยอดรวม)';
 return`<div class="tools" style="justify-content:center"><select id="${z?'f-zcmp':'f-cmp'}" aria-label="ตัวชี้วัดที่เทียบ">${MET.map(o=>`<option value="${o.k}"${o.k===c.k?' selected':''}>${esc(o.t)}</option>`).join('')}</select></div><p class="note">${z?'ภาค':'DC'} × เดือน · เรียงจากแย่ลงมากสุด · กดแถวเพื่อดูเฉพาะ${z?'ภาค':' DC '}นั้น</p>`+table(z?'zm':'cmp',cols,R,{act:o=>(z?'zone:':'dc:')+o.key,sel:o=>z?o.key===S.zone:o.key===S.dc,sort:{k:n>1?'chg':'name',d:-1},search:z?'':'ค้นหา DC',sums})}
function cmpTable(){return matrixTable('dc')}
function zoneBox(){const cum=S.mode==='cumulative';
 if(cum)return`<section class="card"><h2>เทียบรายเดือนตามภาค · ${esc(rangeLabel())}</h2>${matrixTable('zone')}</section>`;
 const RG=zoneRows(),t=kpiCalc(applyFilters({zone:''}));
 return`<section class="card"><h2>ผลรายภาค · ${esc(rangeLabel())}</h2><p class="note">กดภาคเพื่อดูเฉพาะภาคนั้น (KPI กราฟ และวงกลมเปลี่ยนตาม) กดซ้ำเพื่อปิด · กดหัวตารางเพื่อเรียงจากดีไปแย่</p>${table('zone',[{k:'zone',t:'ภาค',v:x=>x.zone,dir:'text'},{k:'dcCount',t:'DC',v:x=>x.dcCount,dir:'high'},{k:'vehicleCount',t:'คัน',v:x=>x.vehicleCount,txt:x=>fmt(x.vehicleCount),dir:'high'},{k:'revenue',t:'รายได้รวม',v:x=>x.revenue,txt:x=>fmt(x.revenue),dir:'high'},{k:'cost',t:'ค่าใช้จ่ายรวม',v:x=>x.cost,txt:x=>fmt(x.cost),dir:'low'},{k:'net',t:'ผลสุทธิ',v:x=>x.net,txt:x=>fmtSigned(x.net),dir:'high',heat:1},{k:'avgNetPerVehicle',t:'เฉลี่ยผลสุทธิ/คัน',v:x=>x.avgNetPerVehicle,txt:x=>fmtSigned(x.avgNetPerVehicle),dir:'high',heat:1},{k:'margin',t:'อัตรากำไร %',v:x=>x.margin,txt:x=>x.margin.toFixed(1)+'%',dir:'high',heat:1},{k:'lossVehicleCount',t:'รถขาดทุน',v:x=>x.lossVehicleCount,dir:'low'},...gradeCol()],RG,{act:x=>'zone:'+x.zone,sel:x=>x.zone===S.zone,sort:{k:'net',d:1},sum:{dcCount:fmt(new Set(applyFilters({zone:''}).map(r=>r.dcCode)).size),vehicleCount:fmt(t.vehicles),revenue:fmt(t.revenue),cost:fmt(t.totalCost),net:fmtSigned(t.net),avgNetPerVehicle:fmtSigned(t.vehicles?t.net/t.vehicles:0),margin:t.marginPct.toFixed(1)+'%',lossVehicleCount:fmt(t.losers)}})}</section>`}
VIEW.home=()=>{const K=kpiData(),P=pal(),cum=S.mode==='cumulative',vw=$('#view').clientWidth||360,w7=Math.max(320,innerWidth>=960?(vw-14)*.7-60:vw-60),parts=costParts(K.o,P),tc=K.o.totalCost,zl=S.zone?' · ภาค '+S.zone:S.dc?' · '+dcLabel(S.dc):'';
 return`<p class="eyebrow">NIMEX Vehicle P&amp;L Dashboard</p>${header('สรุปผล '+rangeLabel(),esc(scope().split(' · ').slice(1).join(' · ')))}${kpiHtml(K)}
 ${zoneBox()}
 <div class="grid2 g73"><section class="card fl"><h2>รายได้ ค่าใช้จ่าย ผลสุทธิรายเดือน${esc(zl)}</h2><p class="note">${cum?'สะสม: แสดงทุกเดือนถึงเดือนที่เลือก':'แถบสีทองคือเดือนที่เลือก'} · กดจุดเพื่อเลือกเดือน</p><div class="chart grow">${trendSvg(P,w7,innerWidth>=960?300:240)}</div>${LEG([[P.s[0],'รายได้'],[P.s[1],'ค่าใช้จ่าย'],[P.s[2],'ผลสุทธิ']])}</section>
 <section class="card fl"><h2>สัดส่วนค่าใช้จ่าย${esc(zl)}</h2><p class="note">รวม ${fmt(tc)} บาท</p><div class="chart" style="max-width:210px;width:100%;margin:4px auto">${donut({parts,center:fmtS(tc),sub:'บาท',P})}</div><div class="clist">${parts.map(p=>`<div><i style="background:${p.c}"></i><span>${esc(p.l)}</span><b>${fmt(p.v)}</b><em>${tc>0?fmtP(p.v/tc*100,0):'–'}</em></div>`).join('')}</div></section></div>`};
VIEW.profit=()=>{const rows=applyFilters(),o=kpiCalc(rows),P=pal(),w=WH(),A=monthAgg(trendRows()),mk=S.mode==='month'&&S.m!=='ALL'?A.findIndex(x=>x.m===S.m):-1,lbl=A.map(x=>thMonthLabel(x.m)),acts=A.map(x=>'month:'+x.m);
 const steps=[{l:'รายได้',v:o.revenue,total:1,first:1},{l:'ค่าน้ำมัน',v:-o.fuel,c:P.s[1]},{l:'ค่าจ้างคนขับ',v:-o.driver,c:P.s[1]},{l:'ค่าซ่อมแซม',v:-o.repair,c:P.s[1]},{l:'ค่างวดรถ',v:-o.installment,c:P.s[1]},{l:'ผลสุทธิ',v:o.net,total:1}];
 const byType={};rows.forEach(r=>{byType[r.vtype||'ไม่ระบุ']=(byType[r.vtype||'ไม่ระบุ']||0)+r.revenue});const tparts=Object.keys(byType).map((t,i)=>({l:t,v:byType[t],c:P.s[i%5]})),trev=tparts.reduce((s,p)=>s+p.v,0);
 const D=dcAgg(rows).sort((a,b)=>a.net-b.net),dcItems=[...D.slice(0,5),...D.slice(-5).reverse()].filter((x,i,a)=>a.findIndex(y=>y.dcCode===x.dcCode)===i);
 const V=vehAgg(rows).sort((a,b)=>a.net-b.net),vItems=[...V.slice(0,8),...V.slice(-8).reverse()].filter((x,i,a)=>a.findIndex(y=>y.vehKey===x.vehKey)===i);
 const top=S.mode==='cumulative'?`<section class="card"><h2>เทียบรายเดือนตาม DC · ${esc(rangeLabel())}</h2>${matrixTable('dc')}</section>`:`<section class="card"><h2>ผลราย DC · ${esc(rangeLabel())}</h2><p class="note">กด DC เพื่อดูเฉพาะ DC นั้น กดซ้ำเพื่อปิด · กดหัวตารางเพื่อเรียงจากดีไปแย่</p>${table('dc',[DCCOLS()[0],{k:'zone',t:'ภาค',v:x=>x.zone,dir:'text'},...DCCOLS().slice(1)],dcRows(),{act:x=>'dc:'+x.dcCode,sel:x=>x.dcCode===S.dc,sort:{k:'net',d:1},search:'ค้นหา DC'})}</section>`;
 return`${header('ผลประกอบการ DC',esc(scope()))}${top}
 <section class="card"><h2>จากรายได้ถึงผลสุทธิ</h2><p class="note">ผลสุทธิ ${fmtSigned(o.net)} บาท · อัตรากำไร ${o.marginPct.toFixed(1)}%</p><div class="chart">${waterfall({steps,P,W:WF(),H:Math.round(Math.min(340,Math.max(280,WF()*.32)))})}</div></section>
 <div class="grid2"><section class="card"><h2>อัตรากำไรขั้นต้นรายเดือน</h2><p class="note">ผลสุทธิ ÷ รายได้ · กดจุดเพื่อเลือกเดือน</p><div class="chart">${lineChart({labels:lbl,series:[{name:'อัตรากำไร',color:P.s[0],vals:A.map(x=>x.revenue>0?(x.net/x.revenue*100):0)}],fmt:v=>fmtN(v,0)+'%',P,W:w,H:Math.round(Math.max(220,w*.4)),acts,mark:mk})}</div></section>
 <section class="card"><h2>ผลสุทธิ Dry เทียบ Cool รายเดือน</h2><p class="note">กดจุดเพื่อเลือกเดือน</p><div class="chart">${lineChart({labels:lbl,series:[{name:'Dry',color:P.s[0],vals:A.map(x=>x.dry)},{name:'Cool',color:P.s[1],vals:A.map(x=>x.cool)}],fmt:(v,f)=>f?fmtSigned(v)+' บาท':fmtS(v),P,W:w,H:Math.round(Math.max(220,w*.4)),acts,mark:mk})}</div>${LEG([[P.s[0],'Dry'],[P.s[1],'Cool']])}</section></div>
 <div class="grid2"><section class="card"><h2>สัดส่วนรายได้ตามประเภทรถ</h2><p class="note">รวม ${fmt(trev)} บาท</p><div class="chart" style="max-width:240px;margin:auto">${donut({parts:tparts,center:fmtS(trev),sub:'บาท',P})}</div>${LEG(tparts.map(p=>[p.c,p.l+' '+(trev>0?fmtP(p.v/trev*100):'–')]))}</section>
 <section class="card"><h2>ผลสุทธิตาม DC สูงสุด/ต่ำสุด 5 อันดับ</h2><p class="note">กดแถบเพื่อดูเฉพาะ DC นั้น</p><div class="chart">${hbars({items:dcItems.map(x=>({l:x.dcName,v:x.net,act:'dc:'+x.dcCode,tip:dcl(x)+': '+fmtSigned(x.net)+' บาท'})),P,W:w,fmt:fmtS,labelW:170})}</div></section></div>
 <section class="card"><h2>รถผลงานดีสุด / ควรทบทวนเร่งด่วน</h2><p class="note">Top 8 / Bottom 8 ตามผลสุทธิ · กดแถบเพื่อดูรายเดือนของรถคันนั้น</p><div class="chart">${hbars({items:vItems.map(x=>({l:x.plate+' · '+x.dcName,v:x.net,act:'car:'+x.vehKey,tip:x.plate+' ('+x.dcName+'): '+fmtSigned(x.net)+' บาท'})),P,fmt:fmtS,labelW:WF()>620?260:200,W:WF()})}</div></section>`};
const AM=[{k:'net',t:'ผลสุทธิ',f:x=>x.net,x:fmtSigned,hi:1},{k:'margin',t:'อัตรากำไร %',f:x=>x.margin,x:v=>v.toFixed(1)+'%',hi:1},{k:'revenue',t:'รายได้รวม',f:x=>x.revenue,x:fmt,hi:1},{k:'cost',t:'ค่าใช้จ่ายรวม',f:x=>x.cost,x:fmt,hi:0},{k:'loss',t:'รถขาดทุน / เดือนขาดทุน',f:x=>x.lossVehicleCount??x.lossMonths,x:fmt,hi:0}];
function analysisRows(){const k=AM.find(x=>x.k===S.ametric)||AM[0],data=anaData(),R=(S.adim==='dc'?dcAgg(data):vehAgg(data)).slice().sort((a,b)=>k.hi?k.f(a)-k.f(b):k.f(b)-k.f(a));return{k,R}}
VIEW.analysis=()=>{const data=anaData(),I=issues(data),P=pal(),w=W(),{k,R}=analysisRows(),top=R.slice(0,15);
 const li=(arr,f)=>arr.length?`<ol class="list">${arr.slice(0,8).map(f).join('')}${arr.length>8?`<li style="list-style:none">…และอีก ${arr.length-8} คัน</li>`:''}</ol>`:'<p class="note">ไม่พบ</p>';
 const seg=(arr,val,act)=>`<div class="seg2">${arr.map(([v,t])=>`<button data-act="${act}:${v}" aria-pressed="${v===val}">${t}</button>`).join('')}</div>`;
 return`${header('วิเคราะห์ปัญหาและข้อแนะนำ',`ประมวลผลจาก${S.scope==='filter'?'ข้อมูลที่กรองอยู่':'ข้อมูลทั้งหมด'} (${data.length.toLocaleString('th-TH')} รายการ)`)}
 <div class="tools" style="justify-content:center">${seg([['all','ข้อมูลทั้งหมด'],['filter','ตามตัวกรองด้านบน']],S.scope,'scope')}</div>
 <div class="grid3"><section class="card"><h2>รถขาดทุนต่อเนื่องทุกเดือน<span class="pill${I.chronic.length?'':' ok'}">${I.chronic.length}</span></h2><p class="note">มีข้อมูลอย่างน้อย 2 เดือน และขาดทุนทุกเดือน</p>${li(I.chronic,v=>`<li><button data-act="car:${esc(v.vehKey)}">${esc(v.plate)}</button> · ${esc(v.dcName)} · ${v.months.size} เดือน รวม ${fmtSigned(v.totalNet)} บาท</li>`)}</section>
 <section class="card"><h2>ไม่มีรายได้แต่มีค่าใช้จ่าย<span class="pill${I.norev.length?'':' ok'}">${I.norev.length}</span></h2><p class="note">เรียงตามค่าใช้จ่ายที่เกิดขึ้น</p>${li(I.norev,v=>`<li><button data-act="car:${esc(v.vehKey)}">${esc(v.plate)}</button> · ${esc(v.dcName)} · ไม่มีรายได้ ${v.count} เดือน ค่าใช้จ่าย ${fmt(v.cost)} บาท</li>`)}</section>
 <section class="card"><h2>DC กำไรสูงสุด / ขาดทุนสูงสุด</h2><p class="note">กด DC เพื่อดูเฉพาะ DC นั้น</p><p style="margin:4px 0;font-weight:600">กำไรสูงสุด</p><ol class="list">${I.top3.map(x=>`<li><button data-act="dc:${esc(x.dcCode)}">${esc(x.dcName)}</button> (${x.vehicleCount} คัน) ${fmtSigned(x.net)}</li>`).join('')}</ol><p style="margin:10px 0 4px;font-weight:600">ขาดทุนสูงสุด</p><ol class="list">${I.bottom3.map(x=>`<li><button data-act="dc:${esc(x.dcCode)}">${esc(x.dcName)}</button> (${x.vehicleCount} คัน) ${fmtSigned(x.net)}</li>`).join('')}</ol></section></div>
 <section class="card"><h2>ข้อแนะนำ</h2><ol class="reco say">${I.recos.map(r=>`<li>${esc(r)}</li>`).join('')}</ol></section>
 <section class="card"><div class="tools" style="justify-content:center">${seg([['dc','DC'],['car','ทะเบียน']],S.adim,'adim')}<select id="f-am" aria-label="ตัวชี้วัด" style="flex:0 1 220px">${AM.map(a=>`<option value="${a.k}"${a.k===S.ametric?' selected':''}>${esc(a.t)}</option>`).join('')}</select></div>
 <h2>${top.length} อันดับที่แย่ที่สุดตาม${esc(k.t)}</h2><p class="note">กดแถบเพื่อเจาะลึก</p><div class="chart">${hbars({items:top.map(o=>S.adim==='dc'?{l:o.dcName,v:k.f(o),act:'dc:'+o.dcCode,tip:dcl(o)+': '+k.x(k.f(o)),c:k.hi?undefined:P.bad}:{l:o.plate+' · '+o.dcName,v:k.f(o),act:'car:'+o.vehKey,tip:o.plate+' ('+o.dcName+'): '+k.x(k.f(o)),c:k.hi?undefined:P.bad}),P,W:WF(),fmt:v=>k.k==='margin'?fmtN(v,1)+'%':fmtS(v),labelW:S.adim==='dc'?190:250})}</div></section>
 <section class="card"><h2>${S.adim==='dc'?'วิเคราะห์ DC แบบละเอียด':'วิเคราะห์รถแบบละเอียด (รายคัน)'}</h2><p class="note">ทั้งหมด ${R.length.toLocaleString('th-TH')} ${S.adim==='dc'?'DC':'คัน'} · กดหัวตารางเพื่อเรียงจากดีไปแย่ กดซ้ำเพื่อกลับด้าน · กดแถวเพื่อเจาะลึก</p>${S.adim==='dc'?table('adc',DCCOLS(),R,{act:x=>'dc:'+x.dcCode,sel:x=>x.dcCode===S.dc,search:'ค้นหา DC'}):table('aveh',VEHCOLS(),R,{act:x=>'car:'+x.vehKey,search:'ค้นหาทะเบียนหรือ DC'})}</section>`};
VIEW.records=()=>{const rows=applyFilters(),sum=k=>rows.reduce((s,r)=>s+r[k],0);
 const ps=`<div class="seg2">${[[50,'50'],[100,'100'],[200,'200'],['ALL','ทั้งหมด']].map(([v,t])=>`<button data-act="psize:${v}" aria-pressed="${String(S.psize)===String(v)}">${t}</button>`).join('')}</div>`;
 return`${header('ตารางข้อมูลรายละเอียด',esc(scope())+` · พบ ${rows.length.toLocaleString('th-TH')} รายการ`)}
 <section class="card"><h2>รายการทั้งหมดตามตัวกรอง</h2><p class="note">กดหัวตารางเพื่อเรียงจากดีไปแย่ กดซ้ำเพื่อกลับด้าน · กดแถวเพื่อดูประวัติรายเดือนของรถคันนั้น</p>${table('rec',RECCOLS(),rows,{act:r=>'car:'+vk(r)+':'+r.date,sort:{k:'net',d:1},search:'ค้นหาในตาราง',tools:ps,page:1,sumLabel:`รวม ${rows.length.toLocaleString('th-TH')} รายการ`,sum:{trips:fmt(sum('trips')),revenue:fmt(sum('revenue')),fuel:fmt(sum('fuel')),driver:fmt(sum('driver')),repair:fmt(sum('repair')),installment:fmt(sum('installment')),net:fmtSigned(sum('net'))}})}</section>`};

/* ---------- drill: vehicle -> months ---------- */
function carSheet(key,mon){const H=allData.filter(r=>vk(r)===key).sort((a,b)=>a.date.localeCompare(b.date));if(!H.length)return;const L=H[H.length-1],P=pal();
 const tr=H.reduce((s,r)=>s+r.revenue,0),tc=H.reduce((s,r)=>s+costOf(r),0),tn=H.reduce((s,r)=>s+r.net,0),lm=H.filter(r=>r.net<0).length,dcs=uniqueSorted(H.map(r=>r.dcName));
 openSheet(`<h2>${esc(L.plate)}</h2><p class="say" style="margin:0">DC ล่าสุด ${esc(L.dcName)} · ${esc(L.vtype)} · รหัสรถ ${esc(key)}${dcs.length>1?` · เคยอยู่ ${dcs.length} DC`:''}</p>
 <div class="mini"><div class="stat"><span>รายได้รวม</span><b>${fmt(tr)}</b></div><div class="stat"><span>ค่าใช้จ่ายรวม</span><b>${fmt(tc)}</b></div><div class="stat"><span>ผลสุทธิ</span><b class="${tn>=0?'good':'badt'}">${fmtSigned(tn)}</b></div><div class="stat"><span>เดือนขาดทุน</span><b class="${lm>0?'badt':'good'}">${lm} / ${H.length}</b></div></div>
 <div class="chart">${lineChart({labels:H.map(r=>thMonthLabel(r.date)),series:[{name:'ผลสุทธิ',color:P.s[0],vals:H.map(r=>r.net)}],fmt:(v,f)=>f?fmtSigned(v)+' บาท':fmtS(v),P,W:600,H:200,mark:mon?H.findIndex(r=>r.date===mon):-1})}</div>
 <div class="tw"><table class="t"><thead><tr><th>เดือน</th><th>DC</th><th>เที่ยว</th><th>รายได้</th><th>ค่าน้ำมัน</th><th>ค่าจ้างคนขับ</th><th>ค่าซ่อมแซม</th><th>ค่างวดรถ</th><th>ผลสุทธิ</th><th>สถานะ</th></tr></thead><tbody>${H.map(h=>`<tr${h.date===mon?' class="sel"':''}><td>${thMonthLabel(h.date)}</td><td style="text-align:left">${esc(h.dcName)}</td><td>${fmt(h.trips)}</td><td>${fmt(h.revenue)}</td><td>${fmt(h.fuel)}</td><td>${fmt(h.driver)}</td><td>${fmt(h.repair)}</td><td>${fmt(h.installment)}</td><td>${fmtSigned(h.net)}</td><td style="text-align:left">${tagR(h.result)}</td></tr>`).join('')}</tbody></table></div>
 <div class="btnrow"><button class="btn" data-act="plate:${esc(L.plate)}">กรองทั้งหน้าเฉพาะรถคันนี้</button><button class="btn alt" data-act="dcgo:${esc(L.dcCode)}">ดูเฉพาะ DC ${esc(L.dcName)}</button></div>`)}
function openSheet(html){const o=$('#ov');o.hidden=false;$('#sheet').innerHTML=`<button class="close" data-act="close" aria-label="ปิด">✕</button>${html}`;$('#sheet').scrollTop=0}
function closeSheet(){$('#ov').hidden=true}

/* ---------- render + events ---------- */
function render(keepScroll){if(!VIEW[S.page]||(!window.ADMIN&&(S.page==='check'||S.page==='settings')))S.page='home';renderShell();const y=window.scrollY;$('#view').innerHTML=VIEW[S.page]();window.scrollTo(0,keepScroll?y:0)}
document.addEventListener('click',e=>{const t=e.target.closest('[data-act]');if(!t)return;const[a,...rest]=t.dataset.act.split(':'),v=rest.join(':');
 if(a==='close'){closeSheet();return}
 if(a==='car'){carSheet(rest[0],rest[1]);return}
 if(a==='export'){if(window.openExport)openExport();return}
 if(a==='theme'){const r=document.documentElement,c=r.getAttribute('data-theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'),n=c==='dark'?'light':'dark';r.setAttribute('data-theme',n);try{localStorage.setItem('vpl-theme',n)}catch(x){}render(true);return}
 if(a.startsWith('do')){if(window.doExport)window.doExport(a);return}
 if(a==='page'){S.page=v;render();return}
 if(a==='sort'){const[id,k]=[rest[0],rest[1]],s=S.sort[id]||DEF[id]||null;S.sort[id]={k,d:s&&s.k===k?-s.d:1};S.pg[id]=0;render(true);return}
 if(a==='pg'){S.pg[rest[0]]=(S.pg[rest[0]]||0)+(+rest[1]);render(true);const tb=$('#tb-'+rest[0]);if(tb)tb.closest('.card').scrollIntoView({block:'start'});return}
 if(a==='psize'){S.psize=v==='ALL'?'ALL':+v;S.pg={};render(true);return}
 if(a==='type'){S.type=v}else if(a==='mode'){S.mode=v}else if(a==='rev'){S.rev=v}else if(a==='plate'){S.plate=v;closeSheet()}else if(a==='month'){S.m=v;if(S.mode!=='month')S.mode='month'}
 else if(a==='dc'){const off=v&&S.dc===v&&S.page==='profit';S.dc=off?'':v;if(v&&S.page==='analysis')S.adim='car'}
 else if(a==='zone'){const off=v&&S.zone===v;S.zone=off?'':v;if(S.zone&&S.dc&&zoneOf(S.dc)!==S.zone)S.dc=''}
 else if(a==='dcgo'){S.dc=v;S.page='profit';closeSheet()}
 else if(a==='adim'){S.adim=v}else if(a==='scope'){S.scope=v}else return;
 S.pg={};render(true)});
document.addEventListener('change',e=>{const t=e.target,id=t.id;if(id==='f-month'){S.m=t.value}else if(id==='f-zone'){S.zone=t.value;if(S.zone&&S.dc&&zoneOf(S.dc)!==S.zone)S.dc=''}else if(id==='f-zcmp'){S.zcmp=t.value}else if(id==='f-dc'){S.dc=t.value}else if(id==='f-rev'){S.rev=t.value}else if(id==='f-cmp'){S.cmp=t.value}else if(id==='f-am'){S.ametric=t.value}else return;S.pg={};render(true)});
let pt;document.addEventListener('input',e=>{if(e.target.id==='f-plate'){S.plate=e.target.value;clearTimeout(pt);pt=setTimeout(()=>{S.pg={};render(true)},250);return}
 const q=e.target.dataset&&e.target.dataset.q;if(!q)return;S.q[q]=e.target.value;S.pg[q]=0;const p=e.target.selectionStart;render(true);const n=document.getElementById('q-'+q);if(n){n.focus();try{n.setSelectionRange(p,p)}catch(x){}}});
const tip=()=>$('#tip');
function showTip(t,x,y){const el=tip();el.textContent=t;el.hidden=false;const r=el.getBoundingClientRect();el.style.left=Math.max(6,Math.min(innerWidth-r.width-6,x-r.width/2))+'px';el.style.top=Math.max(6,y-r.height-12)+'px'}
document.addEventListener('pointermove',e=>{const t=e.target.closest&&e.target.closest('[data-tip]');if(t)showTip(t.dataset.tip,e.clientX,e.clientY);else tip().hidden=true});
document.addEventListener('pointerdown',e=>{const t=e.target.closest&&e.target.closest('[data-tip]');if(t)showTip(t.dataset.tip,e.clientX,e.clientY)});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet()});
let rt;let lastW=innerWidth;addEventListener('resize',()=>{if(innerWidth===lastW)return;lastW=innerWidth;clearTimeout(rt);rt=setTimeout(()=>render(true),200)});
window.matchMedia('(prefers-color-scheme:dark)').addEventListener('change',()=>render(true));
if(window.ADMIN){const sj=document.createElement('script');sj.src='share.js?v='+(window.VPL_V||1);document.body.appendChild(sj)}
window.FX={S,render,kpiData,applyFilters,dcRows,zoneRows,cmpRows,matrixRows,analysisRows};

/* ---------- admin: data check, file import, months ---------- */
/* original .xlsx reader, unchanged */
function normNum(v){const n=parseFloat(v);return isNaN(n)?0:Math.round(n*100)/100}
/* dates are read as Excel serial numbers and converted in UTC, so a date on the 1st never slips into the previous month (SheetJS date objects can land on the 31st at 23:42 in Thai time) */
function monthKeyFromExcelDate(v){let d;if(v instanceof Date)d=v;else if(typeof v==='number'){d=new Date(Math.round((v-25569)*86400*1000));if(isNaN(d.getTime()))return null;return`${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`}else{d=new Date(v)}if(isNaN(d.getTime()))return null;const y=d.getFullYear();const m=String(d.getMonth()+1).padStart(2,'0');return`${y}-${m}`}
function parseSheetRows(rows){const header=rows[0].map(h=>(h||'').toString().trim());const idx=name=>header.indexOf(name);
 const iDate=idx('ลำดับ')>=0?idx('ลำดับ'):0,iDC=idx('DC'),iVehicleCode=idx('รหัสรถ'),iPlate=idx('ทะเบียนรถ'),iTrips=idx('จำนวนเลขที่ใบรายการ'),iVType=idx('ประเภทรถ'),iRevenue=idx('รายได้'),iFuel=idx('ค่าน้ำมัน'),iDriver=idx('ค่าจ้างคนขับ'),iRepair=idx('ค่าซ่อมแซม');
 const iInstallment=idx('ค่างวดรถมีรายได้')>=0?idx('ค่างวดรถมีรายได้'):idx('ค่างวดรถ'),iNet=idx('ผลสุทธิ'),iResult=idx('กำไร-ขาดทุน');const out=[];
 for(let r=1;r<rows.length;r++){const row=rows[r];if(!row||row.every(c=>c===undefined||c===''||c===null))continue;const dateStr=monthKeyFromExcelDate(row[iDate]);if(!dateStr)continue;const dcRaw=(row[iDC]||'').toString().trim();if(!dcRaw)continue;
  const m=dcRaw.match(/^(\d+)/),dcCode=m?m[1]:dcRaw,dcName=dcRaw.replace(/\s+/g,' ').trim(),vehicleCode=(row[iVehicleCode]!==undefined&&row[iVehicleCode]!==null)?row[iVehicleCode].toString().trim():'',plate=(row[iPlate]||'').toString().trim();
  out.push([dateStr,dcCode,dcName,vehicleCode,plate,(row[iVType]||'').toString().trim(),row[iTrips]!==undefined?(parseFloat(row[iTrips])||0):0,normNum(row[iRevenue]),normNum(row[iFuel]),normNum(row[iDriver]),normNum(row[iRepair]),normNum(row[iInstallment]),normNum(row[iNet]),(row[iResult]||'').toString().trim()])}
 return out}
const SET={plan:null,msg:'',del:''};
/* Index file: columns DC code | DC name | Zone (| merge into DC). A DC merged earlier keeps its merge when the new file has no such column */
function parseZones(rows){const h=(rows[0]||[]).map(x=>String(x||'').trim().toLowerCase()),iz=h.findIndex(x=>x==='zone'||x==='ภาค');if(iz<0)return null;const im=h.findIndex(x=>x.includes('รวม')||x==='mergeto'),out=new Map();
 for(let i=1;i<rows.length;i++){const r=rows[i]||[],c=r[0]==null?'':String(r[0]).trim().replace(/\.0+$/,'');if(!c)continue;const m=c.match(/^(\d+)/);out.set(m?m[1]:c,[m?m[1]:c,String(r[1]||'').trim(),String(r[iz]||'').trim(),im>=0&&r[im]!=null?String(r[im]).trim().replace(/\.0+$/,''):''])}
 if(im<0){const keep=ZROWS.filter(z=>z.to).map(z=>[z.code,z.name,z.zone,z.to]);if(!keep.length)keep.push(['680','DC สุวรรณภูมิ','','691']);keep.forEach(k=>{const o=out.get(k[0]);if(o)o[3]=k[3];else out.set(k[0],k)})}return[...out.values()]}
async function pickFiles(list){SET.plan=null;SET.msg='กำลังอ่านไฟล์…';renderSet();await new Promise(r=>setTimeout(r,40));const P={rows:[],seed:null,zones:null,bad:[],files:0};
 for(const f of list){try{if(/\.json$/i.test(f.name)){const j=JSON.parse(await f.text());if(j.kind==='vpl-seed'&&Array.isArray(j.rows))P.seed=j;else P.bad.push(f.name);continue}
  const wb=XLSX.read(await f.arrayBuffer(),{type:'array'}),R=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:true,defval:null});const zr=parseZones(R);if(zr){P.zones=zr;continue}const p=parseSheetRows(R);if(!p.length)P.bad.push(f.name);else{P.rows.push(...p);P.files++}}catch(e){P.bad.push(f.name)}}
 const map=new Map();let dup=0;P.rows.forEach(r=>{const k=r[0]+'|'+(r[3]||r[4]);if(map.has(k))dup++;map.set(k,r)});const rows=[...map.values()];
 const ms=uniqueSorted(rows.map(r=>r[0])).map(m=>{const R=rows.filter(r=>r[0]===m);return{m,n:R.length,old:allData.filter(r=>r.date===m).length,rev:R.reduce((s,r)=>s+r[7],0),net:R.reduce((s,r)=>s+r[12],0),veh:new Set(R.map(r=>r[3]||r[4])).size,bad:R.filter(r=>Math.abs(r[7]-r[8]-r[9]-r[10]-r[11]-r[12])>1).length}});
 SET.plan={rows,ms,dup,seed:P.seed,zones:P.zones,bad:P.bad};SET.msg='';renderSet()}
function planHtml(){const p=SET.plan;if(!p)return'';let h='';
 if(p.seed)h+=`<p><b>ไฟล์เริ่มต้น</b> ${fmt(p.seed.rows.length)} รายการ จะ<b>แทนที่ข้อมูลทั้งหมด</b>ในระบบ</p>`;
 p.ms.forEach(x=>{h+=`<div class="stats"><div class="stat"><span>${esc(thMonthLabel(x.m))}</span><b>${fmt(x.n)}</b><em class="mut">รายการ · ${fmt(x.veh)} คัน</em></div><div class="stat"><span>รายได้</span><b>${fmt(x.rev)}</b><em class="mut">บาท</em></div><div class="stat"><span>ผลสุทธิ</span><b>${fmtSigned(x.net)}</b><em class="mut">บาท</em></div><div class="stat"><span>ข้อมูลเดิมเดือนนี้</span><b>${fmt(x.old)}</b><em class="${x.old?'badt':'mut'}">${x.old?'จะถูกลบแล้วใช้ไฟล์ใหม่':'เดือนใหม่'}</em></div></div>${x.bad?`<p class="badt">มี ${x.bad} รายการที่ผลสุทธิไม่เท่ากับรายได้ลบค่าใช้จ่าย ระบบจะเก็บตามไฟล์</p>`:''}`});
 if(p.zones){const z=p.zones,inData=uniqueSorted(allData.map(r=>r.origDc)),known=new Set(z.map(r=>r[0])),miss=inData.filter(c=>!known.has(c)),chg=z.filter(r=>ZONE[r[0]]&&ZONE[r[0]]!==r[2]),zs=uniqueSorted(z.map(r=>r[2]).filter(Boolean));
  h+=`<div class="stats"><div class="stat"><span>ไฟล์ภาค</span><b>${fmt(z.length)}</b><em class="mut">DC · ${zs.length} ภาค</em></div><div class="stat"><span>เปลี่ยนภาค</span><b>${fmt(chg.length)}</b><em class="mut">DC เทียบกับที่ใช้อยู่</em></div><div class="stat"><span>DC ในข้อมูลที่ไม่มีในไฟล์</span><b class="${miss.length?'badt':'good'}">${fmt(miss.length)}</b><em class="mut">${miss.length?esc(miss.join(', ')):'ครบทุก DC'}</em></div><div class="stat"><span>DC ที่รวมเข้ากับ DC อื่น</span><b>${fmt(z.filter(r=>r[3]).length)}</b><em class="mut">${esc(z.filter(r=>r[3]).map(r=>r[0]+' → '+r[3]).join(', ')||'ไม่มี')}</em></div></div><p class="note">ภาคทั้งหมด: ${esc(zs.join(', '))}</p>`}
 if(p.dup)h+=`<p class="badt">พบรายการซ้ำในไฟล์ ${p.dup} รายการ (เดือนและรหัสรถเดียวกัน) ใช้ค่าที่อยู่ท้ายสุด</p>`;
 if(p.bad.length)h+=`<p class="badt">อ่านไม่ได้หรือไม่ใช่รูปแบบที่รู้จัก: ${p.bad.map(esc).join(', ')}</p>`;
 return h+((p.seed||p.ms.length||p.zones)?`<button class="btn" data-set="commit" style="width:100%">บันทึกลงระบบ</button>`:'')}
async function commitFiles(){const p=SET.plan;if(!p)return;SET.msg='กำลังบันทึก…';renderSet();try{if(p.seed)await api({a:'seed',rows:p.seed.rows,zones:p.seed.zones||null});if(p.zones)await api({a:'zones',rows:p.zones});if(p.ms.length)await api({a:'upsert',months:p.ms.map(x=>x.m),rows:p.rows});SET.msg='บันทึกแล้ว กำลังโหลดข้อมูลใหม่…';renderSet();setTimeout(()=>location.reload(),600)}catch(e){SET.msg='บันทึกไม่สำเร็จ: '+e.message;renderSet()}}
function renderSet(){const b=document.getElementById('set-up');if(b)b.innerHTML=`${SET.msg?`<p class="msg" role="status">${esc(SET.msg)}</p>`:''}${planHtml()}`}
function monthsHtml(){return`<div class="tw"><table class="t"><thead><tr><th>เดือน</th><th>รายการ</th><th>คัน</th><th>รายได้</th><th>ผลสุทธิ</th><th>ลบ</th></tr></thead><tbody>${months.map(m=>{const R=allData.filter(r=>r.date===m);return`<tr><td>${thMonthLabel(m)}</td><td>${fmt(R.length)}</td><td>${fmt(new Set(R.map(vk)).size)}</td><td>${fmt(R.reduce((s,r)=>s+r.revenue,0))}</td><td>${fmtSigned(R.reduce((s,r)=>s+r.net,0))}</td><td><button class="btn alt" style="min-height:32px;padding:4px 10px" data-set="del:${m}">${SET.del===m?'กดอีกครั้งเพื่อยืนยัน':'ลบเดือนนี้'}</button></td></tr>`}).join('')}</tbody></table></div>`}
VIEW.settings=()=>`${header('ตั้งค่า','เห็นเฉพาะผู้ดูแลระบบ')}
 <section class="card"><h2>เติมไฟล์</h2><p class="note">เลือกไฟล์ .xlsx รูปแบบเดิม (เลือกหลายไฟล์ได้) ระบบอ่านในเครื่องนี้และสรุปให้ตรวจก่อนบันทึก เดือนที่มีอยู่แล้วจะลบของเดิมแล้วใช้ไฟล์ใหม่ · ไฟล์ภาค (Index.xlsx มีคอลัมน์ Zone) เลือกช่องเดียวกันนี้ได้ ระบบจะแทนตารางภาคทั้งชุด</p><input type="file" id="up-file" accept=".xlsx,.xls,.json" multiple aria-label="เลือกไฟล์ข้อมูล"><div id="set-up" style="display:grid;gap:10px;margin-top:10px">${SET.msg?`<p class="msg">${esc(SET.msg)}</p>`:''}${planHtml()}</div></section>
 <section class="card"><h2>เกณฑ์เกรด</h2><p class="note">ให้เกรด DC และภาคตามอัตรากำไร % (ผลสุทธิ ÷ รายได้) · ตอนนี้${gradeOn()?'เปิดใช้อยู่':'ปิดอยู่'} · ทุกคนที่เปิดเว็บจะเห็นตามนี้</p>
 <label style="display:flex;gap:8px;align-items:center;margin:6px 0"><input type="checkbox" id="g-on"${gradeOn()?' checked':''}> แสดงเกรด</label>
 <div class="mini">${['A','B','C','D'].map(g=>`<label class="stat"><span>เกรด ${g} เมื่ออัตรากำไร ≥ (%)</span><input type="number" step="0.1" id="g-${g}" value="${GRADE[g]}" aria-label="เกณฑ์เกรด ${g}"></label>`).join('')}</div><p class="note">ต่ำกว่าเกณฑ์ D = เกรด F · ค่าต้องเรียงจากมากไปน้อย A ≥ B ≥ C ≥ D</p>
 <button class="btn" data-set="grade" style="width:100%">บันทึกเกณฑ์เกรด</button><p class="msg" id="g-msg" role="status"></p></section>
 <section class="card"><h2>ข้อมูลในระบบ</h2><p class="note">${fmt(allData.length)} รายการ · ${months.length} เดือน</p>${monthsHtml()}</section>
 <section class="card"><h2>ส่งออกข้อมูล</h2><p class="note">ส่งออก Excel, PowerPoint, PNG, อินโฟกราฟิก หรือข้อมูลรายการทั้งหมดตามตัวกรองด้านบน</p><div class="btns"><button class="btn" data-act="export">แชร์และส่งออก</button><button class="btn alt" data-act="doall">ข้อมูลรายการ (Excel)</button></div><p class="msg" id="xmsg" role="status"></p></section>
 <section class="card"><button class="btn alt" data-set="logout" style="width:100%">ออกจากระบบผู้ดูแล</button></section>`;
VIEW.check=()=>{const bad=allData.filter(r=>Math.abs(r.revenue-costOf(r)-r.net)>1),nm={};allData.forEach(r=>{(nm[r.dcCode]=nm[r.dcCode]||new Set()).add(r.dcName)});const multi=Object.entries(nm).filter(([,s])=>s.size>1);
 const lab=allData.filter(r=>r.result&&((r.net<0)!==(r.result==='ขาดทุน'))),mv={};allData.forEach(r=>{(mv[vk(r)]=mv[vk(r)]||new Set()).add(r.dcCode)});const moved=Object.values(mv).filter(s=>s.size>1).length;const noZone=uniqueSorted(allData.filter(r=>r.zone==='ไม่ระบุภาค').map(r=>r.dcName));
 return`${header('ตรวจสอบข้อมูล','เห็นเฉพาะผู้ดูแลระบบ · ตรวจจากข้อมูลทั้งหมดในระบบ')}
 <div class="stats"><div class="stat"><span>ผลสุทธิไม่เท่ากับรายได้ลบค่าใช้จ่าย</span><b class="${bad.length?'badt':'good'}">${fmt(bad.length)}</b><em class="mut">รายการ (ต่างเกิน 1 บาท)</em></div><div class="stat"><span>รหัส DC ที่มีหลายชื่อ</span><b class="${multi.length?'badt':'good'}">${multi.length}</b><em class="mut">รวมยอดตามรหัส DC เสมอ</em></div><div class="stat"><span>ป้ายกำไร-ขาดทุนไม่ตรงผลสุทธิ</span><b>${fmt(lab.length)}</b><em class="mut">ส่วนใหญ่เป็นผลสุทธิ 0</em></div><div class="stat"><span>DC ที่ยังไม่มีภาค</span><b class="${noZone.length?'badt':'good'}">${noZone.length}</b><em class="mut">${noZone.length?esc(noZone.join(', ')):'ครบทุก DC'}</em></div><div class="stat"><span>รถที่เคยย้าย DC</span><b>${fmt(moved)}</b><em class="mut">คัน · แสดง DC ล่าสุด</em></div></div>
 <section class="card"><h2>รายการที่ผลสุทธิไม่ตรง ${bad.length} รายการ</h2>${table('ck1',[{k:'date',t:'เดือน',v:r=>r.date,txt:r=>thMonthLabel(r.date),dir:'text'},{k:'dc',t:'DC',v:r=>r.dcName,dir:'text'},{k:'pl',t:'ทะเบียน',v:r=>r.plate,dir:'text'},{k:'rev',t:'รายได้',v:r=>r.revenue,txt:r=>fmt(r.revenue),dir:'high'},{k:'c',t:'ค่าใช้จ่าย',v:costOf,txt:r=>fmt(costOf(r)),dir:'low'},{k:'net',t:'ผลสุทธิในไฟล์',v:r=>r.net,txt:r=>fmtSigned(r.net),dir:'high'}],bad,{act:r=>'car:'+vk(r)+':'+r.date})}</section>
 <section class="card"><h2>รหัส DC ที่มีหลายชื่อ</h2>${multi.length?`<ul class="list">${multi.map(([c,s])=>`<li>${esc(c)}: ${[...s].map(esc).join(' / ')}</li>`).join('')}</ul>`:'<p class="note">ไม่พบ</p>'}</section>
 <section class="card"><h2>ป้ายกำไร-ขาดทุนไม่ตรงผลสุทธิ ${lab.length} รายการ</h2><p class="note">ตัวเลขใช้ผลสุทธิจากไฟล์ ป้ายนี้แสดงตามไฟล์เท่านั้น</p>${table('ck2',[{k:'date',t:'เดือน',v:r=>r.date,txt:r=>thMonthLabel(r.date),dir:'text'},{k:'dc',t:'DC',v:r=>r.dcName,dir:'text'},{k:'pl',t:'ทะเบียน',v:r=>r.plate,dir:'text'},{k:'net',t:'ผลสุทธิ',v:r=>r.net,txt:r=>fmtSigned(r.net),dir:'high'},{k:'res',t:'ป้ายในไฟล์',v:r=>r.result,dir:'text'}],lab,{act:r=>'car:'+vk(r)+':'+r.date})}</section>`};
document.addEventListener('change',e=>{const t=e.target;if(t.id==='up-file'&&t.files.length){pickFiles([...t.files])}});
document.addEventListener('click',async e=>{const b=e.target.closest('[data-set]');if(!b)return;const[a,v]=b.dataset.set.split(':');
 if(a==='commit')commitFiles();
 if(a==='del'){if(SET.del!==v){SET.del=v;render(true);return}b.disabled=true;b.textContent='กำลังลบ…';try{await api({a:'delmonth',month:v});location.reload()}catch(x){b.textContent='ลบไม่สำเร็จ'}}
 if(a==='grade'){const g={on:document.getElementById('g-on').checked};const m=document.getElementById('g-msg');for(const k of ['A','B','C','D']){const v=parseFloat(document.getElementById('g-'+k).value);if(!Number.isFinite(v)){m.textContent='กรอกตัวเลขให้ครบทุกเกรด';return}g[k]=v}
  if(!(g.A>=g.B&&g.B>=g.C&&g.C>=g.D)){m.textContent='เกณฑ์ต้องเรียงจากมากไปน้อย A ≥ B ≥ C ≥ D';return}b.disabled=true;m.textContent='กำลังบันทึก…';try{await api({a:'settings',data:{grade:g}});m.textContent='บันทึกแล้ว กำลังโหลดใหม่…';setTimeout(()=>location.reload(),600)}catch(x){m.textContent='บันทึกไม่สำเร็จ: '+x.message;b.disabled=false}}
 if(a==='logout'){try{sessionStorage.removeItem(KEY_NAME)}catch(x){}location.hash='';location.reload()}});
document.getElementById('ov').addEventListener('click',e=>{if(e.target.id==='ov')closeSheet()});
render();
