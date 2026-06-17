#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';

const code = fs.readFileSync('english-bank.js', 'utf8');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(code, sandbox);

const topics = sandbox.window.englishTopics || [];
const meta = sandbox.window.englishTopicMeta || {};
const getProblems = sandbox.window.getEnglishProblems;
let failures = 0;
function fail(message) { console.error('❌ ' + message); failures += 1; }

if (topics.length !== 10) fail(`Expected 10 modules, got ${topics.length}`);
const allTopics = topics.flatMap((module) => module.items || []);
if (allTopics.length !== 20) fail(`Expected 20 units, got ${allTopics.length}`);
if (allTopics.some((topic) => /^(My Day|My Favourite Season|Work quietly!|When is Easter\?|Whose dog is it\?|My School Calendar)$/i.test(topic))) {
  fail('Found old non-FLTRP English topics in published bank');
}
allTopics.forEach((topic) => {
  const problems = getProblems(topic);
  if (!problems.length) fail(`No problems for ${topic}`);
  problems.forEach((problem, index) => {
    if (!problem.text || !problem.type || !problem.insight) fail(`${topic} Q${index + 1} missing text/type/insight`);
    if (!Array.isArray(problem.answers) || !problem.answers.length) fail(`${topic} Q${index + 1} missing answers`);
    const metaKey = topic.replace(/ — .+$/, '');
    if (!meta[metaKey]) fail(`Missing metadata for ${topic}`);
  });
});

if (failures) process.exit(1);
console.log(`✅ English bank audit passed: ${topics.length} modules, ${allTopics.length} units, ${allTopics.length * 5} generated problems`);
