#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';

const bankCode = fs.readFileSync('problem-bank.js', 'utf8');
let appCode = fs.readFileSync('app.js', 'utf8').replace(/\ninit\(\);\s*$/, '\n');
appCode += '\nglobalThis.__test = { topics, problemsFor, gradeProblem, buildVariants, makeFollowUpVariant, save, state, setCurrentProblems: (items) => { currentProblems = items; } };\n';
class Storage { constructor(){ this.data=new Map(); } getItem(k){ return this.data.has(k)?this.data.get(k):null; } setItem(k,v){ this.data.set(k,String(v)); } dump(k){ return JSON.parse(this.getItem(k)||'{}'); } }
const storage = new Storage();
const sandbox = { window:{}, localStorage:storage, console:{log(){},warn(){},error(){}}, navigator:{}, setTimeout(){ return 0; }, clearTimeout(){} };
vm.createContext(sandbox); vm.runInContext(bankCode, sandbox); vm.runInContext(appCode, sandbox);
const app = sandbox.__test;
const levels=[['L1','优秀',.95,.98],['L2','良好',.8,.88],['L3','中等',.65,.72],['L4','及格边缘',.5,.52],['L5','较弱',.28,.34],['L6','非常薄弱',.1,.12]].map(([id,label,base,variant])=>({id,label,base,variant}));
function rng(seed){ let x=seed>>>0; return ()=>((x=(x*1664525+1013904223)>>>0)/4294967296); }
function makeAnswer(answer, ok, random){ if(answer.type==='text') return ok?`答案是${answer.keywords[0]}，因为题意是这样。`:'我不确定。'; if(ok) return String(Math.round(answer.value*1000)/1000); const delta=Math.max(1,Math.abs(answer.value)*(.2+random()*.5)); return String(Math.round((answer.value+(random()>.5?delta:-delta))*1000)/1000); }
function gradeVariant(variant, raw){ const a=variant.answer; if(a.type==='text') return a.keywords.some((word)=>raw.includes(word)); const value=Number(String(raw).replace(/[^0-9./-]/g,'')); return Number.isFinite(value)&&Math.abs(value-a.value)<=a.tolerance; }
function validateProblem(problem, where, failures){ if(!problem.type||!problem.text||!Array.isArray(problem.answers)||!problem.answers.length||!problem.insight) failures.push(`${where}: 字段不完整`); for(const a of problem.answers||[]){ if(!['number','text'].includes(a.type)) failures.push(`${where}: answer.type无效`); if(a.type==='number'&&(!Number.isFinite(a.value)||!Number.isFinite(a.tolerance))) failures.push(`${where}: 数值答案无效`); if(a.type==='text'&&(!Array.isArray(a.keywords)||!a.keywords.length)) failures.push(`${where}: 文字答案关键词为空`); } }
const topics=app.topics.flatMap((unit)=>unit.items.map((name)=>({unit:unit.unit,name})));
const failures=[]; const warnings=[]; const rows=[]; let students=0;
for(const topic of topics){ const problems=app.problemsFor(topic.name); if(!Array.isArray(problems)||!problems.length) failures.push(`${topic.name}: 无基础题`); problems.forEach((p,i)=>validateProblem(p,`${topic.name} 基础${i+1}`,failures)); let topicStudentFailures=0; let topicRounds=0;
 for(const level of levels){ for(let copy=0;copy<5;copy++){ students++; const random=rng(10000+students*97); app.state.currentTopic=topic.name; app.state.answers={}; app.state.variants=[]; app.state.variantAnswers={}; app.state.variantRound=0; app.setCurrentProblems(problems);
   problems.forEach((p,pi)=>p.answers.forEach((a,ai)=>{ app.state.answers[`${pi}-${ai}`]=makeAnswer(a,random()<level.base,random); }));
   const results=problems.map((p,pi)=>app.gradeProblem(p,pi)); const score=Math.round(results.filter(Boolean).length/problems.length*100); const mastered=score>=85; app.state.variants=app.buildVariants(results,!mastered);
   if(!mastered&&results.some((x)=>!x)&&!app.state.variants.length){ failures.push(`${topic.name} ${level.id}学生${students}: 错题后无追练`); topicStudentFailures++; }
   for(let round=1;round<=3&&app.state.variants.length;round++){ topicRounds++; const current=[...app.state.variants]; current.forEach((v,i)=>{ if(!v.title||!v.text||!v.answer||!v.hint) failures.push(`${topic.name} 追练${round}-${i+1}: 字段不完整`); validateProblem({type:v.title,text:v.text,answers:[v.answer],insight:v.hint},`${topic.name} 追练${round}-${i+1}`,failures); }); const variantResults=current.map((v)=>gradeVariant(v,makeAnswer(v.answer,random()<level.variant,random))); const wrong=current.filter((_,i)=>!variantResults[i]); app.state.variantRound+=1; app.state.variants=(wrong.length?wrong:current).map((v,i)=>app.makeFollowUpVariant(v,i)); if(!app.state.variants.length){ failures.push(`${topic.name} ${level.id}学生${students}: 第${round}轮后空追练`); topicStudentFailures++; break; } }
   app.save(); if(storage.dump('grade5MathCoach.v2').currentTopic!==topic.name){ failures.push(`${topic.name} ${level.id}学生${students}: localStorage未保存`); topicStudentFailures++; }
 } }
 rows.push({unit:topic.unit,name:topic.name,count:problems.length,failures:topicStudentFailures,rounds:topicRounds});
 if(topic.name!=='相遇问题') warnings.push(`${topic.name}: 追练题没有真正换数字，仍然使用原题答案，只追加提示文字。`);
}
console.log(`平台菜单知识点: ${topics.length}`); console.log(`模拟学生总数: ${students}`); console.log(`基础题总量: ${rows.reduce((n,r)=>n+r.count,0)}`); console.log(`追练轮次: ${rows.reduce((n,r)=>n+r.rounds,0)}`); console.log(`失败数: ${failures.length}`); console.log(`质量警告数: ${warnings.length}`); console.log('\n知识点覆盖:'); rows.forEach((r)=>console.log(`- ${r.unit} / ${r.name}: ${r.count}题, 追练轮${r.rounds}, 失败${r.failures}`)); if(failures.length){ console.log('\n失败:'); failures.slice(0,40).forEach((x)=>console.log(`- ${x}`)); } console.log('\n质量警告:'); warnings.slice(0,10).forEach((x)=>console.log(`- ${x}`)); if(warnings.length>10) console.log(`- 还有 ${warnings.length-10} 条同类警告`); if(failures.length) process.exitCode=1;
