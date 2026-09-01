const KEY='recite_app_v1';
const subjects=['语文','英语单词','英语语法','英语课文','历史','道法','物理','化学'];
const hints={
 '语文':'建议按段落或诗句分行录入。适合全文背诵、挖空、默写和随机抽句。',
 '英语单词':'建议每行“英文 = 中文”。可进行中英互测、拼写和听写。',
 '英语语法':'建议每行一个规则或例句。系统会优先用问答模式复习。',
 '英语课文':'建议按句分行。适合跟读、挖空、脱稿和语音背诵。',
 '历史':'建议按“时间—事件—原因—影响”分行。适合关键词和随机问答。',
 '道法':'建议每行一个得分点。复习时按关键词判断，减少死背整段。',
 '物理':'建议录入“公式/单位/概念/实验结论”。会优先使用公式理解模式。',
 '化学':'建议录入“化学式/方程式/现象/条件”。适合默写和分项检查。'
};
let state=load(); let currentQueue=[]; let currentIndex=0; let recognition=null;
function load(){try{return JSON.parse(localStorage.getItem(KEY))||{tasks:[],reviews:[]}}catch{return {tasks:[],reviews:[]}}}
function save(){localStorage.setItem(KEY,JSON.stringify(state));renderAll()}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function dateOnly(d=new Date()){return new Date(d.getFullYear(),d.getMonth(),d.getDate())}
function daysFromNow(n){let d=dateOnly();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)}
function todayStr(){return dateOnly().toISOString().slice(0,10)}
function splitContent(text,subject){
 let lines=text.split(/\n+/).map(x=>x.trim()).filter(Boolean);
 if(lines.length<=1 && text.length>35){lines=text.split(/(?<=[。！？.!?；;])/).map(x=>x.trim()).filter(Boolean)}
 return lines.map((line,i)=>({id:uid(),text:line,level:0,due:todayStr(),wrong:0,seen:0,last:null}));
}
function autoMode(subject){if(subject==='英语单词')return 'spell'; if(['历史','道法','英语语法'].includes(subject))return 'qa'; if(['物理','化学'].includes(subject))return 'formula'; if(['语文','英语课文'].includes(subject))return 'cloze'; return 'recite'}
function nav(id){document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===id));document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.nav===id)); if(id==='review')prepareReview(); window.scrollTo({top:0,behavior:'smooth'})}
document.querySelectorAll('[data-nav]').forEach(b=>b.addEventListener('click',()=>nav(b.dataset.nav)));

const subjectEl=document.querySelector('#subject');
function updateHint(){document.querySelector('#subjectHint').textContent=hints[subjectEl.value]}
subjectEl.addEventListener('change',updateHint);updateHint();

document.querySelector('#saveTask').addEventListener('click',()=>{
 const subject=subjectEl.value, title=document.querySelector('#title').value.trim(), content=document.querySelector('#content').value.trim();
 if(!title||!content){alert('请填写标题和内容');return}
 let mode=document.querySelector('#mode').value; if(mode==='auto')mode=autoMode(subject);
 state.tasks.unshift({id:uid(),subject,title,content,mode,examDate:document.querySelector('#examDate').value||'',created:Date.now(),items:splitContent(content,subject)});
 save(); document.querySelector('#title').value='';document.querySelector('#content').value='';document.querySelector('#examDate').value='';nav('review');
});

function allItems(){return state.tasks.flatMap(t=>t.items.map(i=>({task:t,item:i})))}
function dueItems(){return allItems().filter(x=>x.item.due<=todayStr()).sort((a,b)=>a.item.level-b.item.level||b.item.wrong-a.item.wrong)}
function masteredCount(){return allItems().filter(x=>x.item.level>=4).length}
function weakItems(){return allItems().filter(x=>x.item.wrong>=2 && x.item.level<5).sort((a,b)=>b.item.wrong-a.item.wrong)}
function masteryPct(){let a=allItems(); return a.length?Math.round(a.filter(x=>x.item.level>=4).length/a.length*100):0}
function reviewThisWeek(){let since=Date.now()-7*864e5;return state.reviews.filter(r=>r.time>=since).length}
function streak(){let dates=[...new Set(state.reviews.map(r=>new Date(r.time).toISOString().slice(0,10)))].sort().reverse(); if(!dates.length)return 0;let s=0,d=dateOnly();for(let i=0;i<40;i++){let ds=d.toISOString().slice(0,10);if(dates.includes(ds))s++;else if(i===0){}else break;d.setDate(d.getDate()-1)}return s}
function subjectStats(s){let a=allItems().filter(x=>x.task.subject===s);let mastered=a.filter(x=>x.item.level>=4).length;let weak=a.filter(x=>x.item.wrong>=2&&x.item.level<5).length;return {total:a.length,mastered,weak,pct:a.length?Math.round(mastered/a.length*100):0}}
function renderAll(){
 let due=dueItems();document.querySelector('#statToday').textContent=due.length;document.querySelector('#statMastered').textContent=masteredCount();document.querySelector('#statWeak').textContent=weakItems().length;
 document.querySelector('#todaySummary').textContent=due.length?`今天有 ${due.length} 个知识点待复习，优先处理最容易忘的内容。`:'今天的复习任务已完成。';
 const list=document.querySelector('#todayList');list.innerHTML=''; if(!due.length)list.innerHTML='<div class="card empty">今天暂时没有到期任务 🎉</div>'; else due.slice(0,8).forEach(x=>{let d=document.createElement('div');d.className='task';d.innerHTML=`<div><b>${esc(x.task.title)}</b><div class="meta">${x.task.subject} · ${levelName(x.item.level)} · 错 ${x.item.wrong} 次</div></div><span class="pill">复习</span>`;list.appendChild(d)});
 const so=document.querySelector('#subjectOverview');so.innerHTML='';subjects.forEach(s=>{let st=subjectStats(s);if(!st.total)return;let d=document.createElement('div');d.className='subject-card';d.innerHTML=`<b>${s}</b><div class="muted">${st.mastered}/${st.total} 已稳定掌握</div><div class="bar"><i style="width:${st.pct}%"></i></div>`;so.appendChild(d)});
 renderWeak();renderParent();
}
function levelName(l){return ['未掌握','刚学会','基本熟练','较熟练','稳定掌握','长期记忆'][Math.min(l,5)]}
function esc(s){return s.replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}

function makePrompt(task,item){let text=item.text;
 if(task.mode==='cloze'){
   let words=text.split(/([，。！？；,.!?;\s]+)/); let count=0; return words.map((w,idx)=>{if(/[，。！？；,.!?;\s]+/.test(w)||w.length<2)return w; count++; return count%3===0?'____':w}).join('');
 }
 if(task.mode==='spell' && /[=＝:：\-—]/.test(text)){let p=text.split(/[=＝:：\-—]/);return `请写出/说出：${p.slice(1).join(' ').trim() || '对应内容'}`}
 if(task.mode==='qa') return `请说出这个知识点的核心内容：\n${task.title}`;
 if(task.mode==='formula') return `请解释并写出：${task.title}\n（公式/单位/条件/现象都要想一遍）`;
 return text.length>18?`请背诵这一条（可从中间开始）：\n${text.slice(0,Math.min(12,text.length))}……`:'请完整背出这一条';
}
function prepareReview(shuffle=false){currentQueue=dueItems();if(shuffle)currentQueue.sort(()=>Math.random()-.5);currentIndex=0;showReview()}
function showReview(){let empty=document.querySelector('#reviewEmpty'),card=document.querySelector('#reviewCard'); if(!currentQueue.length){empty.hidden=false;card.hidden=true;return}empty.hidden=true;card.hidden=false;let {task,item}=currentQueue[currentIndex];document.querySelector('#reviewSubject').textContent=task.subject;document.querySelector('#reviewTitle').textContent=task.title;document.querySelector('#reviewProgress').textContent=`${currentIndex+1} / ${currentQueue.length} · ${levelName(item.level)}`;document.querySelector('#promptArea').textContent=makePrompt(task,item);document.querySelector('#answerArea').hidden=true;document.querySelector('#gradeBtns').hidden=true;document.querySelector('#answerInput').value='';}
document.querySelector('#showAnswer').addEventListener('click',()=>{let {item}=currentQueue[currentIndex];let a=document.querySelector('#answerArea');a.textContent=item.text;a.hidden=false;document.querySelector('#gradeBtns').hidden=false});
document.querySelector('#shuffleBtn').addEventListener('click',()=>prepareReview(true));
document.querySelectorAll('#gradeBtns button').forEach(b=>b.addEventListener('click',()=>grade(b.dataset.grade)));
function grade(g){let {task,item}=currentQueue[currentIndex];let old=item.level;item.seen++;item.last=Date.now();let gap=1;
 if(g==='again'){item.level=Math.max(0,item.level-1);item.wrong++;gap=0}
 if(g==='hard'){item.level=Math.max(1,item.level);item.wrong++;gap=1}
 if(g==='good'){item.level=Math.min(5,item.level+1);gap=[1,1,3,7,14,30][item.level]}
 if(g==='easy'){item.level=Math.min(5,item.level+2);gap=[1,1,3,7,14,30][item.level]}
 item.due=daysFromNow(gap);state.reviews.push({time:Date.now(),taskId:task.id,itemId:item.id,grade:g,from:old,to:item.level});save();currentIndex++; if(currentIndex>=currentQueue.length){currentQueue=dueItems();currentIndex=0}showReview();}

document.querySelector('#speakBtn').addEventListener('click',()=>{if(!currentQueue.length)return;let {item,task}=currentQueue[currentIndex];let u=new SpeechSynthesisUtterance(item.text);u.lang=task.subject.startsWith('英语')?'en-GB':'zh-CN';speechSynthesis.cancel();speechSynthesis.speak(u)});
document.querySelector('#voiceBtn').addEventListener('click',()=>{
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){alert('当前浏览器不支持语音识别。Android Chrome 通常可用；iPhone/iPad 可先用系统听写输入。');return}
 if(recognition){recognition.stop();recognition=null;return}recognition=new SR();recognition.lang=currentQueue[currentIndex].task.subject.startsWith('英语')?'en-GB':'zh-CN';recognition.interimResults=true;recognition.continuous=false;recognition.onresult=e=>{document.querySelector('#answerInput').value=Array.from(e.results).map(r=>r[0].transcript).join('')};recognition.onend=()=>{recognition=null};recognition.start();
});

function renderWeak(){let box=document.querySelector('#weakList');box.innerHTML='';let w=weakItems();if(!w.length){box.innerHTML='<div class="card empty">暂时没有反复出错的知识点。</div>';return}w.forEach(x=>{let d=document.createElement('div');d.className='task';d.innerHTML=`<div><b>${esc(x.item.text.slice(0,48))}${x.item.text.length>48?'…':''}</b><div class="meta">${x.task.subject} · ${x.task.title} · 累计错 ${x.item.wrong} 次</div></div><span class="pill">${levelName(x.item.level)}</span>`;box.appendChild(d)})}
document.querySelector('#clearWeak').addEventListener('click',()=>{allItems().forEach(x=>{if(x.item.level>=4)x.item.wrong=0});save()});

function renderParent(){document.querySelector('#pCompleted').textContent=reviewThisWeek();document.querySelector('#pMastery').textContent=masteryPct()+'%';document.querySelector('#pStreak').textContent=streak();let stats=subjects.map(s=>({s,...subjectStats(s)})).filter(x=>x.total);let weak=stats.sort((a,b)=>b.weak-a.weak||a.pct-b.pct)[0];document.querySelector('#parentAdvice').textContent=weak?`目前最值得关注的是${weak.s}：稳定掌握率 ${weak.pct}%，薄弱点 ${weak.weak} 个。建议优先完成到期复习，不要只看当天是否背会。`:'先添加学习内容。家长端重点看“稳定掌握率”和“反复错点”，而不是学习时长。';let box=document.querySelector('#parentSubjects');box.innerHTML='';subjects.forEach(s=>{let st=subjectStats(s);if(!st.total)return;let d=document.createElement('div');d.className='subject-row';d.innerHTML=`<div class="line"><b>${s}</b><span>${st.pct}% 掌握 · ${st.weak} 个薄弱点</span></div><div class="bar"><i style="width:${st.pct}%"></i></div>`;box.appendChild(d)})}

document.querySelector('#exportBtn').addEventListener('click',()=>{let blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});let a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='背书助手备份-'+todayStr()+'.json';a.click();URL.revokeObjectURL(a.href)});
document.querySelector('#importFile').addEventListener('change',e=>{let f=e.target.files[0];if(!f)return;let r=new FileReader();r.onload=()=>{try{state=JSON.parse(r.result);save();alert('导入成功')}catch{alert('备份文件格式不正确')}};r.readAsText(f)});

let deferredPrompt;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;document.querySelector('#installBtn').hidden=false});document.querySelector('#installBtn').addEventListener('click',async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;document.querySelector('#installBtn').hidden=true});
if('serviceWorker'in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}))}
renderAll();
