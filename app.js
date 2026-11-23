'use strict';
const cfg=window.CF_CONFIG||{};
const state={step:0,base:'banana',flower:'pink',wish:'ขอให้ทุกวันเต็มไปด้วยความสุขและรอยยิ้ม',lineReady:false,lineName:'',idToken:'',finished:false,requestId:'',saved:false};
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
async function initLine(){
  if(!cfg.LIFF_ID){$('modeBadge').textContent='โหมดทดลองเล่น';return}
  if(!window.liff){$('modeBadge').textContent='LINE SDK ไม่พร้อม';return}
  try{
    await liff.init({liffId:cfg.LIFF_ID});
    if(!liff.isLoggedIn()){$('modeBadge').textContent='กรุณาเข้าสู่ LINE';$('saveMode').textContent='หากต้องการบันทึกผล กรุณาเปิดเกมจาก LINE และเข้าสู่ระบบ';return}
    const token=liff.getIDToken();
    if(!token){$('modeBadge').textContent='ต้องเปิดสิทธิ์ openid';toast('ต้องเปิด scope openid ใน LIFF เพื่อบันทึกผล');return}
    state.idToken=token;state.lineReady=true;
    try{const profile=await liff.getProfile();state.lineName=profile.displayName||'';if(!$('employeeName').value.trim())$('employeeName').value=profile.displayName||'';}catch(e){}
    $('modeBadge').textContent='เชื่อมต่อ LINE แล้ว';
    $('saveMode').textContent='เมื่อกดยินยอม ระบบจะบันทึกชื่อและการร่วมกิจกรรมหลังจากลอยกระทง (ผู้ใช้ต้องเป็นพนักงานที่ได้รับอนุญาต)';
  }catch(e){$('modeBadge').textContent='โหมดทดลองเล่น';toast('เชื่อม LINE ไม่สำเร็จ จึงทดลองเล่นได้โดยไม่บันทึกข้อมูล')}
}
function validInput(){updateWish();if(!state.wish){toast('กรุณาเขียนคำอธิษฐาน');return false}if(state.lineReady&&cfg.APPS_SCRIPT_URL&&$('consent').checked){if(!$('employeeName').value.trim()){toast('กรุณากรอกชื่อสำหรับบันทึกผล');return false}}return true}
function htmlSafe(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function saveEntry(){
  const status=$('saveStatus');
  if(!state.lineReady || !cfg.APPS_SCRIPT_URL){status.textContent='โหมดทดลอง • ยังไม่ได้บันทึกลง Google Sheets';return}
  if(!$('consent').checked){status.textContent='ไม่ได้ส่งข้อมูล เพราะยังไม่ได้ยินยอม';return}
  status.textContent='กำลังส่งข้อมูลเพื่อบันทึก...';
  const id=(crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`);state.requestId=id;
  // Submit a traditional form to a hidden iframe to avoid Apps Script CORS redirects.
  // The Apps Script response sends a postMessage acknowledgement.
  let frame=document.createElement('iframe');frame.name='cf-save-'+id;frame.title='บันทึกผล';frame.hidden=true;document.body.appendChild(frame);
  let form=document.createElement('form');form.method='POST';form.action=cfg.APPS_SCRIPT_URL;form.target=frame.name;form.style.display='none';
  const payload={requestId:id,idToken:state.idToken,employeeName:$('employeeName').value.trim(),base:state.base,flower:state.flower,consent:'yes',event:'CF_LOY_KRATHONG_2569'};
  Object.entries(payload).forEach(([key,value])=>{const field=document.createElement('input');field.type='hidden';field.name=key;field.value=value;form.appendChild(field)});
  document.body.appendChild(form);
  const cleanup=()=>{setTimeout(()=>{form.remove();frame.remove()},2000)};
  const listener=event=>{
    // Apps Script HtmlService is served from Google's script domain.
    if(!/^https:\/\/([a-z0-9-]+\.)*(googleusercontent\.com|google\.com)$/.test(event.origin))return;
    if(!event.data||event.data.type!=='CF_KRATHONG_SAVED'||event.data.requestId!==id)return;
    window.removeEventListener('message',listener);
    if(event.data.ok){state.saved=true;status.textContent='✓ บันทึกผลใน Google Sheets สำเร็จแล้ว';}
    else{status.textContent='ไม่สามารถบันทึกได้: '+String(event.data.message||'โปรดลองอีกครั้ง')}
    cleanup();
  };
  window.addEventListener('message',listener);
  try{form.submit();}catch(e){status.textContent='ส่งข้อมูลไม่สำเร็จ โปรดตรวจสอบการเชื่อมต่อ';window.removeEventListener('message',listener);cleanup();return}
  setTimeout(()=>{if(!state.saved&&state.requestId===id){window.removeEventListener('message',listener);if(status.textContent.startsWith('กำลัง'))status.textContent='ยังไม่ยืนยันผลการบันทึก โปรดตรวจสอบรายการในชีต';cleanup()}},15000);
}
function finish(){if(state.finished)return;state.finished=true;$('scene').classList.add('floating');$('sceneCaption').textContent='✦ ปล่อยความสุขไปกับสายน้ำ ✦';$('floatBtn').hidden=true;$('floatHint').textContent='ขอให้คืนนี้เต็มไปด้วยความทรงจำที่งดงาม';saveEntry();setTimeout(()=>{$('resultPanel').hidden=false;$('blessing').textContent='ขอให้คำอธิษฐานของคุณเป็นจริง และทุกวันเป็นวันที่งดงาม';$('resultPanel').scrollIntoView({behavior:'smooth',block:'nearest'})},3000)}
function card(){const c=document.createElement('canvas');c.width=1080;c.height=1350;const g=c.getContext('2d');const bg=g.createLinearGradient(0,0,0,1350);bg.addColorStop(0,'#241338');bg.addColorStop(.65,'#3d2b67');bg.addColorStop(1,'#174b70');g.fillStyle=bg;g.fillRect(0,0,c.width,c.height);let seed=13;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};for(let i=0;i<115;i++){g.fillStyle=`rgba(255,237,180,${rnd()*.6})`;g.beginPath();g.arc(rnd()*1080,rnd()*1050,rnd()*3+.6,0,Math.PI*2);g.fill()}g.shadowColor='#ffe3a6';g.shadowBlur=70;g.fillStyle='#ffe5ad';g.beginPath();g.arc(785,260,106,0,Math.PI*2);g.fill();g.shadowBlur=0;g.fillStyle='#e2beea';g.font='500 29px Kanit, Prompt, sans-serif';g.textAlign='center';g.fillText('CF BOT  •  LOY KRATHONG 2026',540,105);g.fillStyle='#ffe6a6';g.font='600 76px Kanit, Prompt, sans-serif';g.fillText('สุขสันต์วันลอยกระทง',540,685);g.fillStyle='#fff3e6';g.font='400 40px Kanit, Prompt, sans-serif';wrap(g,state.wish,540,785,850,65,4);g.fillStyle='#f3d2a4';g.font='400 31px Kanit, Prompt, sans-serif';g.fillText('ขอให้ความสุขและความหวังเดินทางไปกับแสงจันทร์',540,1140);g.font='400 27px Kanit, Prompt, sans-serif';g.fillText('✦  ส่งความสุขจาก CF BOT  ✦',540,1250);drawKrathong(g,540,490,2.1);return c}
function wrap(g,text,x,y,width,height,maxLines){const segments=Array.from(text);let line='',lines=[];for(const ch of segments){if(g.measureText(line+ch).width>width&&line){lines.push(line);line=ch}else line+=ch}if(line)lines.push(line);if(lines.length>maxLines){lines=lines.slice(0,maxLines);lines[maxLines-1]=lines[maxLines-1].slice(0,-1)+'…'}lines.forEach((s,i)=>g.fillText(s,x,y+i*height))}
function drawKrathong(g,x,y,s){g.save();g.translate(x,y);g.scale(s,s);g.fillStyle='#4d864e';g.beginPath();g.moveTo(-130,16);g.quadraticCurveTo(0,112,130,16);g.quadraticCurveTo(0,45,-130,16);g.fill();const cols=palette[state.flower];[-90,-55,-20,20,55,90].forEach((v,i)=>{g.fillStyle=cols[i%3];g.beginPath();g.moveTo(v,20);g.quadraticCurveTo(v-37,-65,v-9,-63);g.quadraticCurveTo(v+25,-53,v+12,20);g.fill()});g.fillStyle='#fff0d2';g.fillRect(-5,-54,10,65);g.fillStyle='#ffe18b';g.beginPath();g.ellipse(0,-67,9,18,0,0,Math.PI*2);g.fill();g.restore()}
function savePng(){const c=card();c.toBlob(async blob=>{if(!blob){toast('สร้างไฟล์ภาพไม่สำเร็จ');return}const file=new File([blob],'CF-Loy-Krathong.png',{type:'image/png'});if(navigator.canShare&&navigator.canShare({files:[file]})&&navigator.share){try{await navigator.share({files:[file],title:'การ์ดลอยกระทงจาก CF BOT'});return}catch(e){if(e.name==='AbortError')return}}const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='CF-Loy-Krathong.png';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),3000)},'image/png')}
async function shareLine(){const url=cfg.GAME_URL||location.href.split('#')[0];const message=`🌕 สุขสันต์วันลอยกระทง 2569\n🪷 กระทง${labels[state.base]} • ดอกไม้สี${{pink:'ชมพู',purple:'ม่วง',gold:'ทอง',white:'ขาว'}[state.flower]}\n✨ ${state.wish}\nมาสร้างกระทงออนไลน์กันที่ ${url}`;
  try{if(state.lineReady&&window.liff&&liff.isApiAvailable('shareTargetPicker')){const response=await liff.shareTargetPicker([{type:'flex',altText:'การ์ดคำอวยพรลอยกระทงจาก CF BOT',contents:{type:'bubble',styles:{body:{backgroundColor:'#291943'},footer:{backgroundColor:'#291943'}},body:{type:'box',layout:'vertical',contents:[{type:'text',text:'🌕 LOY KRATHONG 2026',size:'sm',color:'#F4D9A6',weight:'bold',align:'center'},{type:'text',text:'สุขสันต์วันลอยกระทง',size:'xl',weight:'bold',color:'#FFFFFF',align:'center',margin:'lg',wrap:true},{type:'text',text:state.wish,size:'md',color:'#F5E7FC',align:'center',margin:'xl',wrap:true},{type:'text',text:`🪷 กระทง${labels[state.base]}`,color:'#F4D9A6',align:'center',margin:'xl'}]},footer:{type:'box',layout:'vertical',contents:[{type:'button',style:'primary',color:'#BD95E7',action:{type:'uri',label:'สร้างกระทงของฉัน',uri:url}}]}}}]);if(response){toast('แชร์คำอวยพรแล้ว');}return}if(navigator.share){await navigator.share({title:'CF BOT วันลอยกระทง',text:message,url});return}await navigator.clipboard.writeText(message);toast('คัดลอกคำอวยพรและลิงก์แล้ว')}catch(e){if(e.name!=='AbortError')toast('แชร์ไม่สำเร็จ ลองบันทึกการ์ด PNG แทน')}}
function reset(){state.finished=false;state.saved=false;state.base='banana';state.flower='pink';state.wish='ขอให้ทุกวันเต็มไปด้วยความสุขและรอยยิ้ม';$('wishText').value=state.wish;$('scene').classList.remove('floating');$('sceneCaption').textContent='✦ สร้างกระทงในแบบของคุณ ✦';$('floatBtn').hidden=false;$('resultPanel').hidden=true;$('saveStatus').textContent='';document.querySelectorAll('[data-kind]').forEach(b=>b.classList.toggle('selected',b.dataset.value===(b.dataset.kind==='base'?'banana':'pink')));document.querySelectorAll('[data-wish]').forEach(b=>b.classList.toggle('selected',b.dataset.wish===state.wish));updateKrathong();updateWish();setStep(0)}
function boot(){bindDesign();initWishes();updateKrathong();$('toWish').onclick=()=>setStep(1);$('backBuild').onclick=()=>setStep(0);$('toFloat').onclick=()=>{if(validInput())setStep(2)};$('floatBtn').onclick=finish;$('downloadBtn').onclick=savePng;$('shareBtn').onclick=shareLine;$('restartBtn').onclick=reset;initLine()};document.addEventListener('DOMContentLoaded',boot);
