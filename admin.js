const BACKUP_PREFIX='grade5LearningBackup.v1.';
const stores=[{name:'数学',state:'grade5MathCoach.v2',game:'grade5MathGame.v2'},{name:'英语',state:'grade5EnglishCoach.v1',game:'grade5EnglishGame.v1'}];
function read(key,fallback){try{return JSON.parse(localStorage.getItem(key)||localStorage.getItem(BACKUP_PREFIX+key)||'null')||fallback}catch{return fallback}}
const data=stores.map((store)=>({store,state:read(store.state,{records:[],topicStatus:{},photos:[]}),game:read(store.game,{points:0,stars:0,streak:0,badges:[]})}));
const allRecords=data.flatMap((item)=>item.state.records.map((record)=>({...record,subject:item.store.name}))).sort((a,b)=>String(b.time).localeCompare(String(a.time)));
const allStatuses=data.flatMap((item)=>Object.entries(item.state.topicStatus).map(([topic,status])=>({subject:item.store.name,topic,status})));
const mastered=allStatuses.filter((item)=>item.status.mastered).length;
const average=allRecords.length?Math.round(allRecords.reduce((sum,item)=>sum+item.score,0)/allRecords.length):0;
const photos=data.reduce((sum,item)=>sum+(item.state.photos||[]).length,0);
const points=data.reduce((sum,item)=>sum+(item.game.points||0),0);
const streak=Math.max(...data.map((item)=>item.game.streak||0),0);
const metrics=[['最近记录',allRecords.length],['已掌握',mastered],['平均分',average+'分'],['连续学习',streak+'天'],['照片',photos+'张']];
document.querySelector('#summaryGrid').innerHTML=metrics.map(([label,value])=>`<div class="metric"><span>${label}</span><strong>${value}</strong></div>`).join('');
document.querySelector('#recordCount').textContent=`${allRecords.length}条`;
document.querySelector('#recordList').innerHTML=allRecords.length?allRecords.slice(0,20).map((r)=>`<div class="record-item"><strong>${r.subject} · ${r.topic}：${r.score}分</strong><small>${r.time}，${r.correct}/${r.total}题正确${r.durationMinutes?`，${r.durationMinutes}分钟`:''}</small></div>`).join(''):'<div class="record-item"><small>还没有学习记录。</small></div>';
document.querySelector('#masteredSummary').textContent=`${mastered}/${allStatuses.length}`;
document.querySelector('#topicList').innerHTML=allStatuses.length?allStatuses.map((item)=>{const cls=item.status.mastered?'mastered':item.status.attempts?'review':'none';const text=item.status.mastered?'已掌握':item.status.attempts?'需巩固':'未开始';return `<div class="topic-item"><div><strong>${item.subject} · ${item.topic}</strong><small>最近${item.status.lastScore||0}分，尝试${item.status.attempts||0}次</small></div><span class="status ${cls}">${text}</span></div>`}).join(''):'<div class="topic-item"><small>还没有知识点记录。</small></div>';
document.querySelector('#dataNotes').innerHTML=`<div>本地记录：${allRecords.length}条</div><div>数学积分：${data[0].game.points||0}分，英语积分：${data[1].game.points||0}分</div><div>本后台读取浏览器本地记录，不上传服务器。</div><div>建议每周导出一次 JSON 备份。</div>`;
document.querySelector('#exportBtn').addEventListener('click',()=>{const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),data},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`学习记录备份-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href)});
