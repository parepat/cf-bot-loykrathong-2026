'use strict';
const cfg=window.CF_CONFIG||{};
const state={step:0,base:'banana',flower:'pink',wish:'ขอให้ทุกวันเต็มไปด้วยความสุขและรอยยิ้ม',registered:false,employeeName:'',finished:false,requestId:'',saved:false};
const $=id=>document.getElementById(id);
const palette={pink:['#f4a7c2','#ffd4df','#ffe3a4'],purple:['#c49fe8','#e9cfff','#f8e2ff'],gold:['#f5bf69','#ffe09d','#fff3c6'],white:['#eff0ee','#ffffff','#ffefc8']};
const labels={banana:'ใบตอง',lotus:'กลีบบัว',natural:'วัสดุธรรมชาติ'};
function toast(s){const el=$('toast');el.textContent=s;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),3600)}
function updateKrathong(){
  const base=$('baseShape');base.setAttribute('fill',state.base==='banana'?'#477b4a':state.base==='lotus'?'#68865c':'#8e7651');
  base.setAttribute('d',state.base==='banana'?'M46 120Q160 217 274 120Q160 151 46 120Z':state.base==='lotus'?'M55 125Q160 191 265 125Q219 160 160 151Q101 160 55 125Z':'M52 128Q81 148 106 144Q160 179 213 144Q240 148 268 128L251 150Q160 192 69 150Z');
  const petals=$('petalLayer').querySelectorAll('path');petals.forEach((p,i)=>p.setAttribute('fill',palette[state.flower][i]));
}
function setStep(n){state.step=n;document.querySelectorAll('.screen').forEach((e,i)=>e.classList.toggle('active',i===n));document.querySelectorAll('.step').forEach((e,i)=>{e.classList.toggle('active',i===n);e.classList.toggle('done',i<n)});window.scrollTo({top:0,behavior:'smooth'});}
function bindDesign(){document.querySelectorAll('[data-kind]').forEach(button=>button.addEventListener('click',()=>{const kind=button.dataset.kind;state[kind==='base'?'base':'flower']=button.dataset.value;document.querySelectorAll(`[data-kind="${kind}"]`).forEach(el=>el.classList.toggle('selected',el===button));updateKrathong()}));}
function initWishes(){document.querySelectorAll('[data-wish]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-wish]').forEach(b=>b.classList.toggle('selected',b===button));$('wishText').value=button.dataset.wish;updateWish()}));$('wishText').addEventListener('input',()=>{document.querySelectorAll('[data-wish]').forEach(b=>b.classList.toggle('selected',b.dataset.wish===$('wishText').value));updateWish()});updateWish();}
function updateWish(){state.wish=$('wishText').value.trim();$('wishCount').textContent=Array.from($('wishText').value).length;$('quoteText').textContent=`“${state.wish||'ขอให้ทุกวันเป็นวันที่ดี'}”`;}
function register(){
  const name=$('employeeName').value.trim().replace(/\s+/g,' ');
  if(name.length<2||name.length>80){toast('กรุณากรอกชื่อ–นามสกุลให้ครบ');return}
  if(!$('consent').checked){toast('กรุณาอ่านและยืนยันการใช้ข้อมูลก่อนเริ่ม');return}
  state.employeeName=name;state.registered=true;
  $('registration').hidden=true;$('gameArea').hidden=false;
  window.scrollTo({top:0,behavior:'smooth'});
}
function validInput(){updateWish();if(!state.wish){toast('กรุณาเขียนคำอธิษฐาน');return false}return true}
function htmlSafe(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function saveEntry(){
  const status=$('saveStatus');
  if(!state.registered){status.textContent='ยังไม่ได้ลงทะเบียน';return}
  if(!cfg.APPS_SCRIPT_URL){status.textContent='โหมดทดลอง • ยังไม่ได้เชื่อม Google Sheets';return}
  if(!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(cfg.APPS_SCRIPT_URL)){
    status.textContent='กรุณาตรวจสอบ Apps Script URL ใน config.js';return;
  }
  status.textContent='กำลังบันทึกชื่อและผลการเล่น...';
  const id=(globalThis.crypto&&typeof crypto.randomUUID==='function')?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`;
  state.requestId=id;state.saved=false;
  const frame=document.createElement('iframe');frame.name='cf-save-'+id;frame.title='ช่องส่งผลกิจกรรม';frame.hidden=true;document.body.appendChild(frame);
  const form=document.createElement('form');form.method='POST';form.action=cfg.APPS_SCRIPT_URL;form.target=frame.name;form.style.display='none';
  const payload={requestId:id,employeeName:state.employeeName,base:state.base,flower:state.flower,consent:'yes',event:'CF_LOY_KRATHONG_2569'};
  Object.entries(payload).forEach(([key,value])=>{const field=document.createElement('input');field.type='hidden';field.name=key;field.value=value;form.appendChild(field)});
  document.body.appendChild(form);
  let done=false;
  const cleanup=()=>{setTimeout(()=>{form.remove();frame.remove()},1500)};
  const listener=event=>{
    if(!/^https:\/\/([a-z0-9-]+\.)*(googleusercontent\.com|google\.com)$/.test(event.origin))return;
    if(!event.data||event.data.type!=='CF_KRATHONG_SAVED'||event.data.requestId!==id)return;
    done=true;window.removeEventListener('message',listener);
    if(event.data.ok){state.saved=true;status.textContent=event.data.duplicate?'✓ คุณร่วมกิจกรรมและได้รับการบันทึกแล้ว':'✓ บันทึกผลลง Google Sheets สำเร็จ';}
    else status.textContent='ยังบันทึกไม่ได้: '+String(event.data.message||'โปรดแจ้งผู้ดูแล');
    cleanup();
  };
  window.addEventListener('message',listener);
  try{form.submit()}catch(e){done=true;status.textContent='ส่งข้อมูลไม่สำเร็จ กรุณาลองใหม่';window.removeEventListener('message',listener);cleanup();return}
  setTimeout(()=>{if(!done&&state.requestId===id){window.removeEventListener('message',listener);if(!state.saved)status.textContent='ยังไม่ได้รับการยืนยันจาก Google Sheets กรุณาให้ผู้ดูแลตรวจสอบ';cleanup()}},20000);
}
function finish(){if(state.finished)return;state.finished=true;$('scene').classList.add('floating');$('sceneCaption').textContent='✦ ปล่อยความสุขไปกับสายน้ำ ✦';$('floatBtn').hidden=true;$('floatHint').textContent='ขอให้คืนนี้เต็มไปด้วยความทรงจำที่งดงาม';saveEntry();setTimeout(()=>{$('resultPanel').hidden=false;$('blessing').textContent='ขอให้คำอธิษฐานของคุณเป็นจริง และทุกวันเป็นวันที่งดงาม';$('resultPanel').scrollIntoView({behavior:'smooth',block:'nearest'})},3000)}
// Keep every card text segment inside 1080px. Canvas maxWidth behavior differs
// across Thai fonts/browsers, so explicitly scale measured text if necessary.
function cardFont(g,size,weight='400') {
  g.font=`${weight} ${size}px Kanit, Prompt, 'Noto Sans Thai', sans-serif`;
}
function splitCardLines(g,value,maxWidth){
  const result=[];
  const text=String(value||'');
  const segments=typeof Intl!=='undefined'&&Intl.Segmenter
    ? Array.from(new Intl.Segmenter('th',{granularity:'grapheme'}).segment(text),x=>x.segment)
    : Array.from(text);
  let line='';
  for(const cluster of segments){
    if(cluster==='\n'){result.push(line);line='';continue}
    if(line&&g.measureText(line+cluster).width>maxWidth){result.push(line.trim());line=cluster}
    else line+=cluster;
  }
  if(line||!result.length)result.push(line.trim());
  return result;
}
function drawCardText(g,text,opts={}){
  const {centerY=700,width=850,maxLines=2,size=48,minSize=22,
    weight='400',color='#fff3e6',lineHeight=1.4}=opts;
  let lines=[],fontSize=minSize;
  for(let trial=size;trial>=minSize;trial-=2){
    cardFont(g,trial,weight);
    const found=splitCardLines(g,text,width);
    if(found.length<=maxLines){fontSize=trial;lines=found;break}
  }
  cardFont(g,fontSize,weight);
  if(!lines.length)lines=splitCardLines(g,text,width);
  if(lines.length>maxLines){
    lines=lines.slice(0,maxLines);
    let last=lines[maxLines-1];
    while(last.length&&g.measureText(last+'…').width>width)last=last.slice(0,-1);
    lines[maxLines-1]=last+'…';
  }
  g.save();
  g.textAlign='center';g.textBaseline='middle';g.fillStyle=color;
  const advance=fontSize*lineHeight;
  lines.forEach((line,i)=>{
    const measured=Math.max(1,g.measureText(line).width);
    const fit=Math.min(1,width/measured);
    g.save();
    g.translate(540,centerY+(i-(lines.length-1)/2)*advance);
    g.scale(fit,1);
    g.fillText(line,0,0);
    g.restore();
  });
  g.restore();
}
function card(){
  const c=document.createElement('canvas');c.width=1080;c.height=1350;
  const g=c.getContext('2d');
  const bg=g.createLinearGradient(0,0,0,1350);
  bg.addColorStop(0,'#241338');bg.addColorStop(.65,'#3d2b67');bg.addColorStop(1,'#174b70');
  g.fillStyle=bg;g.fillRect(0,0,1080,1350);
  let seed=13;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
  for(let i=0;i<115;i++){
    g.fillStyle=`rgba(255,237,180,${rnd()*.6})`;
    g.beginPath();g.arc(rnd()*1080,rnd()*1050,rnd()*3+.6,0,Math.PI*2);g.fill();
  }
  g.shadowColor='#ffe3a6';g.shadowBlur=70;g.fillStyle='#ffe5ad';
  g.beginPath();g.arc(785,260,106,0,Math.PI*2);g.fill();g.shadowBlur=0;
  drawCardText(g,'CF BOT • LOY KRATHONG 2026',{centerY:100,width:900,maxLines:1,size:30,minSize:24,weight:'500',color:'#e2beea'});
  drawKrathong(g,540,460,1.7);
  drawCardText(g,'สุขสันต์วันลอยกระทง',{centerY:680,width:840,maxLines:2,size:72,minSize:40,weight:'600',color:'#ffe6a6',lineHeight:1.24});
  drawCardText(g,state.wish,{centerY:905,width:830,maxLines:4,size:40,minSize:24,weight:'400',color:'#fff3e6',lineHeight:1.48});
  drawCardText(g,'ขอให้ความสุขและความหวังเดินทางไปกับแสงจันทร์',{centerY:1143,width:820,maxLines:2,size:30,minSize:22,weight:'400',color:'#f3d2a4'});
  drawCardText(g,'✦  ส่งความสุขจาก CF BOT  ✦',{centerY:1254,width:880,maxLines:1,size:27,minSize:21,weight:'400',color:'#f3d2a4'});
  return c;
}
function drawKrathong(g,x,y,s){g.save();g.translate(x,y);g.scale(s,s);g.fillStyle='#4d864e';g.beginPath();g.moveTo(-130,16);g.quadraticCurveTo(0,112,130,16);g.quadraticCurveTo(0,45,-130,16);g.fill();const cols=palette[state.flower];[-90,-55,-20,20,55,90].forEach((v,i)=>{g.fillStyle=cols[i%3];g.beginPath();g.moveTo(v,20);g.quadraticCurveTo(v-37,-65,v-9,-63);g.quadraticCurveTo(v+25,-53,v+12,20);g.fill()});g.fillStyle='#fff0d2';g.fillRect(-5,-54,10,65);g.fillStyle='#ffe18b';g.beginPath();g.ellipse(0,-67,9,18,0,0,Math.PI*2);g.fill();g.restore()}
async function savePng(){if(document.fonts&&document.fonts.ready){try{await document.fonts.ready}catch(e){}}const c=card();c.toBlob(async blob=>{if(!blob){toast('สร้างไฟล์ภาพไม่สำเร็จ');return}const file=new File([blob],'CF-Loy-Krathong.png',{type:'image/png'});if(navigator.canShare&&navigator.canShare({files:[file]})&&navigator.share){try{await navigator.share({files:[file],title:'การ์ดลอยกระทงจาก CF BOT'});return}catch(e){if(e.name==='AbortError')return}}const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='CF-Loy-Krathong.png';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),3000)},'image/png')}
async function shareLine(){
 const url=cfg.GAME_URL||location.href.split('#')[0];
 const message=`🌕 สุขสันต์วันลอยกระทง 2569\n🪷 กระทง${labels[state.base]} • ดอกไม้สี${{pink:'ชมพู',purple:'ม่วง',gold:'ทอง',white:'ขาว'}[state.flower]}\n✨ ${state.wish}\nมาสร้างกระทงออนไลน์กันที่ ${url}`;
 try{
   if(navigator.share){await navigator.share({title:'CF BOT วันลอยกระทง',text:message});return}
   if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(message);toast('คัดลอกข้อความแล้ว เปิด LINE เพื่อวางและแชร์');return}
   toast('โปรดบันทึกการ์ด PNG แล้วส่งรูปผ่าน LINE');
 }catch(e){if(e.name!=='AbortError')toast('แชร์ไม่สำเร็จ ให้บันทึกการ์ด PNG แล้วแชร์ใน LINE')}
}
function reset(){state.finished=false;state.saved=false;state.base='banana';state.flower='pink';state.wish='ขอให้ทุกวันเต็มไปด้วยความสุขและรอยยิ้ม';$('wishText').value=state.wish;$('scene').classList.remove('floating');$('sceneCaption').textContent='✦ สร้างกระทงในแบบของคุณ ✦';$('floatBtn').hidden=false;$('resultPanel').hidden=true;$('saveStatus').textContent='';document.querySelectorAll('[data-kind]').forEach(b=>b.classList.toggle('selected',b.dataset.value===(b.dataset.kind==='base'?'banana':'pink')));document.querySelectorAll('[data-wish]').forEach(b=>b.classList.toggle('selected',b.dataset.wish===state.wish));updateKrathong();updateWish();setStep(0)}
function boot(){bindDesign();initWishes();updateKrathong();$('toWish').onclick=()=>setStep(1);$('backBuild').onclick=()=>setStep(0);$('toFloat').onclick=()=>{if(validInput())setStep(2)};$('floatBtn').onclick=finish;$('downloadBtn').onclick=savePng;$('shareBtn').onclick=shareLine;$('restartBtn').onclick=reset;$('beginBtn').onclick=register;$('modeBadge').textContent=cfg.APPS_SCRIPT_URL?'พร้อมบันทึกผล':'โหมดทดลองเล่น';$('registrationMode').textContent=cfg.APPS_SCRIPT_URL?'เมื่อเล่นจบ ระบบจะส่งข้อมูลเพื่อบันทึกหลังผ่านการตรวจรายชื่อที่อนุญาต':'โหมดทดลอง: ข้อมูลที่กรอกจะไม่ถูกส่งหรือบันทึกบนเซิร์ฟเวอร์'};document.addEventListener('DOMContentLoaded',boot);
