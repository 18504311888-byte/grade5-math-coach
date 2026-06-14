#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';
const sandbox = { window: {} }; vm.createContext(sandbox); vm.runInContext(fs.readFileSync('problem-bank.js', 'utf8'), sandbox);
let numeric = 0; let readable = 0; let bad = [];
function fraction(value) { for (let d=2; d<=100; d++) { const n=Math.round(value*d); if (Math.abs(n/d-value)<0.0001) return `${n}/${d}`; } return null; }
for (const [topic, problems] of Object.entries(sandbox.window.problemBank)) {
  problems.forEach((problem, i) => (problem.answers || []).forEach((answer, j) => {
    if (answer.type !== 'number') return;
    numeric++;
    if (!Number.isFinite(answer.value)) bad.push(`${topic}#${i+1}.${j+1}: NaN`);
    else if (Number.isInteger(answer.value) || fraction(answer.value) || Number.isFinite(Number(answer.value.toFixed(2)))) readable++;
    else bad.push(`${topic}#${i+1}.${j+1}: ${answer.value}`);
  }));
}
console.log(`numeric=${numeric} readable=${readable} bad=${bad.length}`);
if (bad.length) { console.log(bad.join('\n')); process.exitCode = 1; }
