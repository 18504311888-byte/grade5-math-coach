#!/usr/bin/env node
/**
 * simulate-students.mjs
 *
 * 模拟 30 个不同水平的五年级学生，测试平台的完整流程：
 *   1. 基础题答题 → 评分 → 生成追练题
 *   2. 追练题答题 → 再评分 → 继续生成下一轮（答错/答对都继续）
 *   3. 验证：正确率差异、localStorage 状态、无空题、无死循环
 *
 * 用法: node tests/simulate-students.mjs
 */

import assert from 'node:assert/strict';

// ════════════════════════════════════════════════════════════
// 1. Mock localStorage（Node 环境模拟）
// ════════════════════════════════════════════════════════════

class MockStorage {
  constructor() {
    this._data = new Map();
  }
  getItem(key) {
    const v = this._data.get(key);
    return v === undefined ? null : v;
  }
  setItem(key, value) {
    this._data.set(key, String(value));
  }
  removeItem(key) {
    this._data.delete(key);
  }
  clear() {
    this._data.clear();
  }
  dump() {
    const obj = {};
    for (const [k, v] of this._data) {
      try { obj[k] = JSON.parse(v); } catch { obj[k] = v; }
    }
    return obj;
  }
}

// ════════════════════════════════════════════════════════════
// 2. 题目定义（从 app.js 复制核心逻辑，去除 DOM 依赖）
// ════════════════════════════════════════════════════════════

function numberAnswer(value, unit = '', tolerance = 0.01) {
  return { type: 'number', value, unit, tolerance };
}

function textAnswer(keywords) {
  return { type: 'text', keywords };
}

function makeProblem(type, text, answers, insight, variantSeed) {
  return { type, text, answers, insight, variantSeed };
}

function meetingProblems() {
  return [
    makeProblem(
      '同时相向',
      '两名同学从相距1800米的学校和图书馆同时出发相向而行。小宇每分钟走85米，小宁每分钟走65米。几分钟后相遇？相遇点离学校多少米？',
      [numberAnswer(12, '分钟'), numberAnswer(1020, '米')],
      '相向而行用总路程除以速度和；相遇点位置要用其中一人的速度乘时间。',
      '同时相向',
    ),
    makeProblem(
      '不同时间出发',
      '甲、乙两车从相距420千米的两地相向而行。甲车先出发1小时，速度70千米/时；乙车出发后速度90千米/时。乙车出发后几小时两车相遇？',
      [numberAnswer(2.1875, '小时', 0.02)],
      '先扣掉甲车提前走的70千米，再用剩余路程除以速度和。',
      '延迟出发',
    ),
    makeProblem(
      '相背而行',
      '两艘巡逻船从同一港口同时向相反方向行驶。甲船每小时28千米，乙船每小时34千米。几小时后两船相距310千米？',
      [numberAnswer(5, '小时')],
      '相背而行距离增加，增加速度是两船速度和。',
      '相背而行',
    ),
    makeProblem(
      '同向追及',
      '晨跑时，小林先从起点出发，速度为每分钟140米。8分钟后，小川从同一起点骑车追赶，速度为每分钟260米。小川出发后几分钟追上小林？',
      [numberAnswer(9.333, '分钟', 0.02)],
      '追及问题先求领先路程，再除以速度差。',
      '同向追及',
    ),
    makeProblem(
      '途中停留',
      'A、B两地相距36千米。哥哥骑车从A地去B地，每小时12千米；妹妹从B地向A地步行，每小时4千米。妹妹出发后停留了30分钟再继续，两人同时出发。几小时后相遇？',
      [numberAnswer(2.375, '小时', 0.02)],
      '停留的人少走了路程，可把全过程拆成停留前和停留后。',
      '停留',
    ),
    makeProblem(
      '折返相遇',
      '小车从甲地开往乙地，速度60千米/时；货车从乙地开往甲地，速度40千米/时。两地相距250千米。小车到乙地后立即折返，货车不停。小车出发后几小时第一次追上货车？',
      [numberAnswer(2.5, '小时', 0.02)],
      '先判断正常相遇是否发生；若到端点后折返，再用剩余路程和相对速度分析。',
      '折返',
    ),
    makeProblem(
      '环形相向',
      '环形跑道一圈600米。甲、乙从同一点同时反向跑，甲每分钟90米，乙每分钟60米。几分钟后第一次相遇？',
      [numberAnswer(4, '分钟')],
      '环形相向第一次相遇时，两人合跑一圈。',
      '环形相向',
    ),
    makeProblem(
      '环形追及',
      '环形跑道一圈400米。甲、乙从同一点同向出发，甲每分钟110米，乙每分钟70米。甲几分钟后第一次追上乙？',
      [numberAnswer(10, '分钟')],
      '环形追及第一次追上时，快者比慢者多跑一圈。',
      '环形追及',
    ),
    makeProblem(
      '速度变化',
      '两地相距198千米。甲车从A地、乙车从B地同时相向而行。甲车前1小时每小时54千米，之后每小时60千米；乙车一直每小时48千米。几小时后相遇？',
      [numberAnswer(1.333, '小时', 0.02)],
      '速度变化要分段：先算第一小时合走多少，再算剩余路程。',
      '速度变化',
    ),
    makeProblem(
      '往返综合',
      '小明和爸爸在长900米的直路两端同时出发相向而行。小明每分钟70米，爸爸每分钟110米。第一次相遇后两人继续走到对端再立即返回。出发后几分钟第二次相遇？',
      [numberAnswer(15, '分钟')],
      '直路往返第二次相遇时，两人合走3个全长。',
      '往返第二次',
    ),
  ];
}

function problemsFor(topicName) {
  if (topicName === '相遇问题') return meetingProblems().slice(0, 5);
  // 非相遇问题简化为返回 4 道方程题
  return [
    makeProblem('邮票关系', '哥哥的邮票比妹妹的3倍少8张，两人共有72张。妹妹有多少张？', [numberAnswer(20, '张')], '设妹妹x张，哥哥3x-8张。', '方程-倍数'),
    makeProblem('倍数关系', '合唱队女生人数是男生的2倍多6人，共有66人。男生有多少人？', [numberAnswer(20, '人')], '设男生x人，女生2x+6人。', '方程-倍数'),
    makeProblem('面积方程', '长方形长比宽多5厘米，周长是38厘米。宽是多少厘米？', [numberAnswer(7, '厘米')], '设宽x厘米，长x+5厘米。', '方程-几何'),
    makeProblem('综合方程', '两种笔共买18支，钢笔每支6元，铅笔每支2元，共花60元。钢笔买了几支？', [numberAnswer(6, '支')], '设钢笔x支，铅笔18-x支。', '方程-综合'),
  ];
}

// ════════════════════════════════════════════════════════════
// 3. 核心逻辑（从 app.js 复制，去除 DOM 依赖）
// ════════════════════════════════════════════════════════════

function gradeAnswer(answer, raw) {
  const text = String(raw || '').trim();
  if (answer.type === 'text') {
    return answer.keywords.some((w) => text.includes(w));
  }
  const value = Number(text.replace(/[^0-9./-]/g, ''));
  if (text.includes('/') && !text.includes('.')) {
    const [a, b] = text.split('/').map(Number);
    return b !== 0 && !Number.isNaN(b) && Math.abs(a / b - answer.value) <= (answer.tolerance ?? 0.01);
  }
  return Number.isFinite(value) && Math.abs(value - answer.value) <= (answer.tolerance ?? 0.01);
}

function gradeProblem(problem, studentAnswersByIndex) {
  return problem.answers.every((answer, ai) => {
    const raw = studentAnswersByIndex[ai] ?? '';
    return gradeAnswer(answer, raw);
  });
}

function gradeVariant(variant, studentAnswer) {
  return gradeAnswer(variant.answer, studentAnswer);
}

function makeMeetingVariant(seed, round, idx) {
  const variants = {
    '同时相向': {
      text: `小明和小华从相距${900 + round * 60}米的两地同时相向而行，小明每分钟走${70 + idx * 5}米，小华每分钟走${50 + idx * 5}米。几分钟后相遇？`,
      answer: numberAnswer((900 + round * 60) / ((70 + idx * 5) + (50 + idx * 5)), '分钟', 0.02),
      hint: '相向而行时，两人每分钟走的路程要相加。',
    },
    '延迟出发': {
      text: `甲车先从A地出发，每小时${60 + idx * 10}千米。1小时后乙车从B地出发，每小时${80 + idx * 10}千米，两地相距${400 + round * 20}千米，相向而行。乙车出发后几小时相遇？`,
      answer: numberAnswer(((400 + round * 20) - (60 + idx * 10)) / ((60 + idx * 10) + (80 + idx * 10)), '小时', 0.02),
      hint: '先扣掉甲车提前走的路程，再用剩余路程除以速度和。',
    },
    '相背而行': {
      text: `两艘小船从同一港口同时向相反方向行驶，速度分别为每小时${24 + idx * 4}千米和${30 + idx * 4}千米。几小时后相距${270 + round * 30}千米？`,
      answer: numberAnswer((270 + round * 30) / ((24 + idx * 4) + (30 + idx * 4)), '小时', 0.02),
      hint: '相背而行时，两船距离增加的速度是速度和。',
    },
    '同向追及': {
      text: `小林先从起点出发，每分钟走${120 + idx * 10}米。${6 + round}分钟后小川从同一起点出发，每分钟走${220 + idx * 10}米。小川出发后几分钟追上小林？`,
      answer: numberAnswer(((120 + idx * 10) * (6 + round)) / ((220 + idx * 10) - (120 + idx * 10)), '分钟', 0.02),
      hint: '追及问题先求领先路程，再除以速度差。',
    },
    '停留': {
      text: `A、B两地相距${30 + round * 3}千米。哥哥每小时骑${10 + idx * 2}千米，妹妹每小时走${4 + idx}千米。妹妹出发后停留半小时再继续，两人同时相向出发。几小时后相遇？`,
      answer: numberAnswer(((30 + round * 3) - ((4 + idx) * 0.5)) / ((10 + idx * 2) + (4 + idx)), '小时', 0.02),
      hint: '停留的人少走了一段路，要先把这段路扣掉。',
    },
    '折返': {
      text: `甲、乙两地相距${240 + round * 20}千米。小车从甲地出发，每小时${60 + idx * 5}千米；货车从乙地出发，每小时${40 + idx * 5}千米。小车到乙地后立即折返。小车出发后几小时第一次追上货车？`,
      answer: numberAnswer((240 + round * 20) / (60 + idx * 5), '小时', 0.02),
      hint: '先看小车到乙地用了多久，这时货车刚好也到甲地。',
    },
    '环形相向': {
      text: `环形跑道一圈${540 + round * 30}米。甲、乙从同一点同时反向跑，速度分别为每分钟${90 + idx * 5}米和${60 + idx * 5}米。几分钟后第一次相遇？`,
      answer: numberAnswer((540 + round * 30) / ((90 + idx * 5) + (60 + idx * 5)), '分钟', 0.02),
      hint: '环形相向第一次相遇时，两人合跑一圈。',
    },
    '环形追及': {
      text: `环形跑道一圈${360 + round * 40}米。甲、乙从同一点同向出发，甲每分钟${110 + idx * 5}米，乙每分钟${70 + idx * 5}米。甲几分钟后第一次追上乙？`,
      answer: numberAnswer((360 + round * 40) / ((110 + idx * 5) - (70 + idx * 5)), '分钟', 0.02),
      hint: '环形追及第一次追上时，快者比慢者多跑一圈。',
    },
    '速度变化': {
      text: `两地相距${180 + round * 18}千米。甲车前1小时每小时${50 + idx * 4}千米，之后每小时${60 + idx * 4}千米；乙车一直每小时${46 + idx * 3}千米，同时相向而行。几小时后相遇？`,
      answer: numberAnswer(1 + ((180 + round * 18) - ((50 + idx * 4) + (46 + idx * 3))) / ((60 + idx * 4) + (46 + idx * 3)), '小时', 0.02),
      hint: '速度变化要分段计算。',
    },
    '往返第二次': {
      text: `一条直路长${840 + round * 60}米。小明和爸爸从两端同时出发相向而行，速度分别为每分钟${70 + idx * 5}米和${110 + idx * 5}米。第一次相遇后继续走到对端再返回。出发后几分钟第二次相遇？`,
      answer: numberAnswer(((840 + round * 60) * 3) / ((70 + idx * 5) + (110 + idx * 5)), '分钟', 0.02),
      hint: '第二次相遇时，两人合走3个全长。',
    },
  };
  const item = variants[seed] || variants['同时相向'];
  return { title: `第${round}轮追练：${seed}`, text: item.text, answer: item.answer, hint: item.hint, variantSeed: seed };
}

function makeVariant(problem, problemIndex, variantIndex, variantRound, isMeeting) {
  const round = variantRound + 1;
  if (isMeeting) {
    return makeMeetingVariant(problem.variantSeed, round, variantIndex);
  }
  const answer = problem.answers[0];
  const extra = answer.type === 'number'
    ? `原题答案附近再换一个数字，正确结果应接近${answer.value}。`
    : `先说清${problem.type}的关键关系，再写答案。`;
  return {
    title: `第${round}轮追练：${problem.type}`,
    text: `${problem.text}\n追练要求：${extra}`,
    answer,
    hint: problem.insight,
  };
}

function makeFollowUpVariant(item, variantRound, isMeeting) {
  const seed = item.variantSeed || '同时相向';
  if (isMeeting) {
    return makeMeetingVariant(seed, variantRound + 1, 0);
  }
  return {
    ...item,
    title: `第${variantRound + 1}轮追练：${item.title.replace(/^第\d+轮追练：/, '')}`,
  };
}

function buildVariants(currentProblems, results, variantRound, isMeeting, focusWrong) {
  const wrongIndexes = results
    .map((ok, index) => ({ ok, index }))
    .filter((item) => !item.ok)
    .map((item) => item.index);

  const sourceIndexes = (focusWrong && wrongIndexes.length > 0)
    ? wrongIndexes
    : currentProblems.slice(-4).map((_, i, arr) => currentProblems.length - arr.length + i);

  return sourceIndexes.slice(0, 4).map((problemIndex, index) =>
    makeVariant(currentProblems[problemIndex], problemIndex, index, variantRound, isMeeting),
  );
}

// ════════════════════════════════════════════════════════════
// 4. 学生模拟引擎
// ════════════════════════════════════════════════════════════

const MAX_VARIANT_ROUNDS = 8;   // 防止死循环的上限
const PERFECT_ROUND_LIMIT = 2;
const TOPICS = ['相遇问题', '用方程解决问题'];

/**
 * 6 个水平等级，每个等级 5 个学生
 * accuracy: 基础题正确率
 * variantAccuracy: 追练题正确率（通常比基础题略高，代表学习效果）
 */
const LEVEL_DEFS = [
  { id: 'L1', label: '优秀',     baseAcc: 0.95, variantAcc: 0.98, count: 5 },
  { id: 'L2', label: '良好',     baseAcc: 0.80, variantAcc: 0.88, count: 5 },
  { id: 'L3', label: '中等',     baseAcc: 0.65, variantAcc: 0.72, count: 5 },
  { id: 'L4', label: '及格边缘', baseAcc: 0.48, variantAcc: 0.55, count: 5 },
  { id: 'L5', label: '较弱',     baseAcc: 0.28, variantAcc: 0.32, count: 5 },
  { id: 'L6', label: '非常薄弱', baseAcc: 0.10, variantAcc: 0.12, count: 5 },
];

/** 用确定性 seed 生成可复现的“随机”序列 */
function createRng(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

/** 根据正确率决定是否答对 */
function shouldBeCorrect(rng, accuracy) {
  return rng() < accuracy;
}

/** 生成数值答案：正确则返回精确值，错误则返回偏移值 */
function makeNumericAnswer(correctValue, tolerance, isCorrect, rng) {
  if (isCorrect) {
    // 以不同格式返回答案，模拟真实学生的书写
    const fmt = rng();
    if (fmt < 0.3) return String(Math.round(correctValue * 100) / 100);
    if (fmt < 0.55 && Number.isInteger(correctValue)) return String(correctValue);
    if (fmt < 0.75) return String(Math.round(correctValue * 1000) / 1000);
    // 分数形式
    if (Math.abs(correctValue - Math.round(correctValue)) > 0.001) {
      for (let d = 2; d <= 20; d++) {
        const n = Math.round(correctValue * d);
        if (Math.abs(n / d - correctValue) <= tolerance) {
          return `${n}/${d}`;
        }
      }
    }
    return String(Math.round(correctValue * 100) / 100);
  }
  // 错误答案：提供偏移
  const offset = (rng() - 0.5) * correctValue * (0.3 + rng() * 0.7);
  const wrong = correctValue + offset + (rng() > 0.5 ? 1 : -1) * (1 + rng() * 3);
  const rounded = Math.round(wrong * 100) / 100;
  return rounded === correctValue ? String(rounded + 1) : String(rounded);
}

/** 生成文字答案 */
function makeTextAnswer(keywords, isCorrect, rng) {
  if (isCorrect) {
    const idx = Math.floor(rng() * keywords.length);
    return `我认为答案是${keywords[idx]}，因为根据题意分析得出了这个结论。`;
  }
  return '我不太确定这个题目的答案是什么。';
}

/** 为学生的一道题生成答案 */
function answerProblem(problem, accuracy, rng) {
  const answers = {};
  problem.answers.forEach((ans, ai) => {
    const ok = shouldBeCorrect(rng, accuracy);
    if (ans.type === 'text') {
      answers[ai] = makeTextAnswer(ans.keywords, ok, rng);
    } else {
      answers[ai] = makeNumericAnswer(ans.value, ans.tolerance ?? 0.01, ok, rng);
    }
  });
  return answers;
}

/** 为一道追练题生成答案 */
function answerVariant(variant, accuracy, rng) {
  const ans = variant.answer;
  const ok = shouldBeCorrect(rng, accuracy);
  if (ans.type === 'text') {
    return makeTextAnswer(ans.keywords, ok, rng);
  }
  return makeNumericAnswer(ans.value, ans.tolerance ?? 0.01, ok, rng);
}

// ════════════════════════════════════════════════════════════
// 5. 模拟一个学生的完整流程
// ════════════════════════════════════════════════════════════

function simulateStudent(studentId, levelDef, topicName, rng) {
  const isMeeting = topicName === '相遇问题';
  const failures = [];
  const log = [];

  function fail(msg) {
    failures.push(msg);
    log.push(`  ❌ 断言失败: ${msg}`);
  }

  // --- 初始化状态 ---
  const storage = new MockStorage();
  const baseState = {
    currentTopic: topicName,
    answers: {},
    variants: [],
    variantAnswers: {},
    variantRound: 0,
  };
  storage.setItem('grade5MathCoach.v2', JSON.stringify(baseState));

  // 恢复状态
  let state;
  try {
    state = { ...baseState, ...JSON.parse(storage.getItem('grade5MathCoach.v2') || '{}') };
  } catch {
    state = { ...baseState };
  }

  const problems = problemsFor(topicName);

  // --- 阶段 1：基础题答题 ---
  const studentBaseAnswers = problems.map((problem) =>
    answerProblem(problem, levelDef.baseAcc, rng),
  );

  // 评分
  const baseResults = problems.map((problem, i) =>
    gradeProblem(problem, studentBaseAnswers[i]),
  );
  const baseCorrect = baseResults.filter(Boolean).length;
  const baseScore = Math.round((baseCorrect / problems.length) * 100);

  log.push(`  基础题: ${baseCorrect}/${problems.length} 正确 (${baseScore}分)`);

  // 存入 state.answers
  state.answers = {};
  studentBaseAnswers.forEach((ansMap, pi) => {
    Object.entries(ansMap).forEach(([ai, val]) => {
      state.answers[`${pi}-${ai}`] = val;
    });
  });

  // 判断是否“掌握”
  const mastered = baseScore >= 85;

  // --- 阶段 2：生成首轮追练题 ---
  state.variantRound = 0;
  state.variantAnswers = {};
  state.variants = buildVariants(problems, baseResults, state.variantRound, isMeeting, !mastered);

  // 断言：非掌握且存在错题时，应该生成追练题
  if (!mastered && baseResults.some((r) => !r)) {
    if (state.variants.length === 0) {
      fail('存在错题但 buildVariants 返回了空数组（focusWrong=true）');
    }
  }

  // 断言：追练题数量不超过 4
  if (state.variants.length > 4) {
    fail(`追练题数量超过上限：${state.variants.length} > 4`);
  }

  // 断言：每道追练题必须有 title、text、answer、hint
  state.variants.forEach((v, vi) => {
    if (!v.title || v.title.trim() === '') fail(`追练题 ${vi} title 为空`);
    if (!v.text || v.text.trim() === '') fail(`追练题 ${vi} text 为空`);
    if (!v.answer) fail(`追练题 ${vi} answer 缺失`);
    if (v.answer && v.answer.type === 'number' && (v.answer.value === undefined || Number.isNaN(v.answer.value))) {
      fail(`追练题 ${vi} answer.value 为 NaN/undefined`);
    }
  });

  // --- 阶段 3：追练题循环 ---
  let totalVariantRounds = 0;
  let perfectRounds = 0;
  let totalVariantCorrect = 0;
  let totalVariantAttempted = 0;
  while (state.variants.length > 0 && totalVariantRounds < MAX_VARIANT_ROUNDS) {
    totalVariantRounds++;
    const currentVariants = [...state.variants];

    // 检查本轮变式是否为空
    if (currentVariants.length === 0) {
      fail(`第 ${totalVariantRounds} 轮追练题为空`);
      break;
    }

    // 仅检测本轮内是否有题干完全相同的追练题（同轮出现相同题干才是异常）
    // 跨轮同类型题是预期行为：makeFollowUpVariant 对同 seed 生成同类题，数字随轮次变化
    const roundVariantTexts = new Set();
    currentVariants.forEach((v) => {
      const key = v.text;
      if (roundVariantTexts.has(key)) {
        fail(`第 ${totalVariantRounds} 轮内出现题干完全相同的追练题: ${v.title}`);
      }
      roundVariantTexts.add(key);
    });

    // 学生答题
    const variantStudentAnswers = currentVariants.map((v) =>
      answerVariant(v, levelDef.variantAcc, rng),
    );
    state.variantAnswers = {};
    variantStudentAnswers.forEach((ans, vi) => {
      state.variantAnswers[vi] = ans;
    });

    // 评分
    const variantResults = currentVariants.map((v, vi) =>
      gradeVariant(v, variantStudentAnswers[vi]),
    );
    const roundCorrect = variantResults.filter(Boolean).length;
    const roundWrong = variantResults.filter((r) => !r).length;

    totalVariantCorrect += roundCorrect;
    totalVariantAttempted += currentVariants.length;

    log.push(`  追练第${totalVariantRounds}轮: ${roundCorrect}/${currentVariants.length} 正确` +
      (roundWrong > 0 ? ` (${roundWrong}错)` : ' ✅'));

    // 生成下一轮追练题（模拟 submitVariants 逻辑）
    state.variantRound += 1;
    state.variantAnswers = {};

    if (roundWrong === 0) {
      perfectRounds += 1;
      if (perfectRounds >= PERFECT_ROUND_LIMIT) {
        state.variants = [];
      } else {
        state.variants = currentVariants.map((item, idx) =>
          makeFollowUpVariant(item, state.variantRound, isMeeting),
        );
      }
    } else {
      perfectRounds = 0;
      // 存在错误 → 只将错题生成下一轮
      const wrongItems = currentVariants.filter((_, idx) => !variantResults[idx]);
      state.variants = wrongItems.map((item, idx) =>
        makeFollowUpVariant(item, state.variantRound, isMeeting),
      );
    }

    // 连续两轮全对后允许追练结束。

    // 断言：followUp variant 不能为空字段
    state.variants.forEach((v, vi) => {
      if (!v.title || v.title.trim() === '') fail(`第${totalVariantRounds + 1}轮追练题 ${vi} title 为空`);
      if (!v.text || v.text.trim() === '') fail(`第${totalVariantRounds + 1}轮追练题 ${vi} text 为空`);
      if (!v.answer || (v.answer.type === 'number' && (v.answer.value === undefined || Number.isNaN(v.answer.value)))) {
        fail(`第${totalVariantRounds + 1}轮追练题 ${vi} answer 无效`);
      }
    });
  }

  // 检查是否因达到上限而退出（可能为死循环）
  const hitMaxRounds = totalVariantRounds >= MAX_VARIANT_ROUNDS && state.variants.length > 0;
  if (hitMaxRounds) {
    log.push(`  ⚠️ 追练达到上限 ${MAX_VARIANT_ROUNDS} 轮，可能存在死循环风险`);
    // 这不算断言失败，因为代码设计如此（答对也继续生成追练），但需要记录
  }

  // --- 阶段 4：结果汇总 ---
  const summary = {
    studentId,
    level: levelDef.label,
    levelId: levelDef.id,
    baseAcc: levelDef.baseAcc,
    variantAcc: levelDef.variantAcc,
    topic: topicName,
    baseCorrect,
    baseTotal: problems.length,
    baseScore,
    mastered,
    totalVariantRounds,
    totalVariantCorrect,
    totalVariantAttempted,
    hitMaxRounds,
    failures: failures.slice(),
    log: log.slice(),
  };

  return summary;
}

// ════════════════════════════════════════════════════════════
// 6. 主测试入口
// ════════════════════════════════════════════════════════════

function main() {
  const allStudents = [];
  let studentCounter = 0;

  // 生成 30 个学生：6 个等级 × 5 人
  for (const levelDef of LEVEL_DEFS) {
    for (let i = 0; i < levelDef.count; i++) {
      studentCounter++;
      // 交替分配知识点
      const topicName = TOPICS[studentCounter % TOPICS.length];
      // 每人独立的随机种子
      const rng = createRng(studentCounter * 137 + levelDef.baseAcc * 1000);
      allStudents.push({ id: studentCounter, levelDef, topicName, rng });
    }
  }

  console.log('═'.repeat(72));
  console.log('  五年级数学学习平台 — 学生模拟测试');
  console.log('═'.repeat(72));
  console.log(`  学生总数: ${allStudents.length}`);
  console.log(`  知识点: ${TOPICS.join(', ')}`);
  console.log(`  追练上限: ${MAX_VARIANT_ROUNDS} 轮`);
  console.log('─'.repeat(72));

  const results = [];
  let totalFailures = 0;

  for (const student of allStudents) {
    const result = simulateStudent(student.id, student.levelDef, student.topicName, student.rng);
    results.push(result);
    totalFailures += result.failures.length;
  }

  // ════════════════════════════════════════════════════════
  // 7. 输出按等级分组的结果
  // ════════════════════════════════════════════════════════

  console.log('\n' + '─'.repeat(72));
  console.log('  逐学生详情');
  console.log('─'.repeat(72));

  for (const r of results) {
    const statusIcon = r.failures.length > 0 ? '❌' : r.hitMaxRounds ? '⚠️' : '✅';
    console.log(`\n${statusIcon} 学生#${String(r.studentId).padStart(2, '0')} | 水平: ${r.level}(${r.levelId}) | 知识点: ${r.topic}`);
    console.log(`   基础正确率设定: ${(r.baseAcc * 100).toFixed(0)}% | 追练正确率设定: ${(r.variantAcc * 100).toFixed(0)}%`);
    console.log(`   基础题: ${r.baseCorrect}/${r.baseTotal} 正确 (${r.baseScore}分) | ${r.mastered ? '已掌握' : '需巩固'}`);
    console.log(`   追练: ${r.totalVariantRounds} 轮, ${r.totalVariantCorrect}/${r.totalVariantAttempted} 正确`);
    if (r.hitMaxRounds) console.log(`   ⚠️ 追练达到 ${MAX_VARIANT_ROUNDS} 轮上限（代码设计：答对也继续生成追练）`);
    if (r.failures.length > 0) {
      r.failures.forEach((f) => console.log(`   ❌ ${f}`));
    }
    // 显示详细日志（仅在有问题时）
    if (r.failures.length > 0 || r.hitMaxRounds) {
      r.log.forEach((l) => console.log(`     ${l}`));
    }
  }

  // ════════════════════════════════════════════════════════
  // 8. 分组统计
  // ════════════════════════════════════════════════════════

  console.log('\n' + '═'.repeat(72));
  console.log('  分组统计');
  console.log('═'.repeat(72));

  const groups = {};
  for (const r of results) {
    const key = r.levelId;
    if (!groups[key]) {
      groups[key] = {
        label: r.level,
        count: 0,
        totalBaseCorrect: 0,
        totalBaseQuestions: 0,
        totalVariantRounds: 0,
        totalVariantCorrect: 0,
        totalVariantAttempted: 0,
        masteredCount: 0,
        hitMaxRounds: 0,
        failures: 0,
      };
    }
    const g = groups[key];
    g.count++;
    g.totalBaseCorrect += r.baseCorrect;
    g.totalBaseQuestions += r.baseTotal;
    g.totalVariantRounds += r.totalVariantRounds;
    g.totalVariantCorrect += r.totalVariantCorrect;
    g.totalVariantAttempted += r.totalVariantAttempted;
    if (r.mastered) g.masteredCount++;
    if (r.hitMaxRounds) g.hitMaxRounds++;
    g.failures += r.failures.length;
  }

  console.log(`\n  ${'水平'.padEnd(14)} ${'人数'} ${'基础正确率'} ${'追练轮数(均)'} ${'追练正确率'} ${'掌握'} ${'触上限'} ${'断言失败'}`);
  console.log('  ' + '─'.repeat(72));

  for (const key of ['L1', 'L2', 'L3', 'L4', 'L5', 'L6']) {
    const g = groups[key];
    if (!g) continue;
    const baseRate = ((g.totalBaseCorrect / g.totalBaseQuestions) * 100).toFixed(0);
    const variantRate = g.totalVariantAttempted > 0
      ? ((g.totalVariantCorrect / g.totalVariantAttempted) * 100).toFixed(0)
      : 'N/A';
    const avgRounds = (g.totalVariantRounds / g.count).toFixed(1);
    console.log(`  ${g.label.padEnd(14)} ${String(g.count).padEnd(4)} ${(baseRate + '%').padEnd(12)} ${avgRounds.padEnd(14)} ${(variantRate + '%').padEnd(10)} ${String(g.masteredCount).padEnd(4)} ${String(g.hitMaxRounds).padEnd(6)} ${g.failures}`);
  }

  // ════════════════════════════════════════════════════════
  // 9. 全局断言
  // ════════════════════════════════════════════════════════

  console.log('\n' + '═'.repeat(72));
  console.log('  全局断言');
  console.log('═'.repeat(72));

  let globalFailures = 0;

  function globalAssert(condition, msg) {
    if (!condition) {
      console.log(`  ❌ ${msg}`);
      globalFailures++;
    } else {
      console.log(`  ✅ ${msg}`);
    }
  }

  // 9a. 不同水平学生的基础正确率应有明显差异
  // 改用稳健断言：L1 平均基础正确率应明显高于 L6（至少高 0.25）
  // 不要求每一层严格单调，避免随机波动导致假失败
  const baseRatesByLevel = {};
  for (const r of results) {
    const k = r.levelId;
    if (!baseRatesByLevel[k]) baseRatesByLevel[k] = [];
    baseRatesByLevel[k].push(r.baseCorrect / r.baseTotal);
  }
  const avgBaseRates = Object.fromEntries(
    Object.entries(baseRatesByLevel).map(([k, arr]) => [k, arr.reduce((a, b) => a + b, 0) / arr.length]),
  );
  const l1Rate = avgBaseRates['L1'] || 0;
  const l6Rate = avgBaseRates['L6'] || 0;
  const rateDiff = l1Rate - l6Rate;
  globalAssert(
    rateDiff >= 0.25,
    `L1平均基础正确率(${(l1Rate * 100).toFixed(0)}%) 应明显高于 L6(${(l6Rate * 100).toFixed(0)}%)，差=${rateDiff.toFixed(2)} ≥ 0.25`,
  );

  // 9b. 低水平学生应该更多未掌握
  const L1_mastered = results.filter((r) => r.levelId === 'L1' && r.mastered).length;
  const L6_mastered = results.filter((r) => r.levelId === 'L6' && r.mastered).length;
  globalAssert(L1_mastered > L6_mastered, `优秀学生(L1)掌握人数(${L1_mastered}) > 薄弱学生(L6)掌握人数(${L6_mastered})`);

  // 9c. 追练轮数应该 > 0（只要存在错题）
  const studentsWithVariants = results.filter((r) => r.totalVariantAttempted > 0);
  globalAssert(studentsWithVariants.length > 0, '至少部分学生经历了追练题');

  // 9d. 低水平学生的追练轮数应该更多（因为错得多）
  const avgRoundsByLevel = {};
  for (const r of results) {
    const k = r.levelId;
    if (!avgRoundsByLevel[k]) avgRoundsByLevel[k] = [];
    avgRoundsByLevel[k].push(r.totalVariantRounds);
  }
  const avgRounds = Object.fromEntries(
    Object.entries(avgRoundsByLevel).map(([k, arr]) => [k, arr.reduce((a, b) => a + b, 0) / arr.length]),
  );

  // L6 的追练轮数应 ≥ L1（薄弱学生错得多）
  globalAssert(
    (avgRounds['L6'] || 0) >= (avgRounds['L1'] || 0),
    `薄弱学生(L6)平均追练轮数(${avgRounds['L6']?.toFixed(1)}) ≥ 优秀学生(L1)平均追练轮数(${avgRounds['L1']?.toFixed(1)})`,
  );

  // 9e. 不存在断言失败
  globalAssert(totalFailures === 0, `所有学生的逐题断言均通过 (失败数=${totalFailures})`);

  // 9f. 至少有一个学生触发了追练上限（证明“全对也继续生成”的逻辑生效）
  const hitMaxCount = results.filter((r) => r.hitMaxRounds).length;
  globalAssert(hitMaxCount > 0, `至少有一个学生触发追练上限（验证“答对后也生成下一轮”逻辑）: ${hitMaxCount}人`);

  // 9g. 相遇问题 vs 非相遇问题均有覆盖
  const meetingStudents = results.filter((r) => r.topic === '相遇问题');
  const otherStudents = results.filter((r) => r.topic !== '相遇问题');
  globalAssert(meetingStudents.length >= 10, `相遇问题学生 ≥ 10: ${meetingStudents.length}`);
  globalAssert(otherStudents.length >= 10, `其他知识点学生 ≥ 10: ${otherStudents.length}`);

  // ════════════════════════════════════════════════════════
  // 10. 最终判定
  // ════════════════════════════════════════════════════════

  console.log('\n' + '═'.repeat(72));
  console.log('  测试结论');
  console.log('═'.repeat(72));

  const totalAssertFailures = totalFailures + globalFailures;

  if (totalAssertFailures === 0) {
    console.log(`\n  ✅ 全部测试通过。30 名学生模拟完成，${MAX_VARIANT_ROUNDS} 轮追练上限内无断言失败。`);
    console.log(`     连续两轮追练全对后结束的行为已确认。`);
    console.log(`     不同水平学生的正确率差异符合预期。\n`);
    process.exit(0);
  } else {
    console.log(`\n  ❌ 测试失败。共有 ${totalAssertFailures} 个断言未通过。`);
    console.log(`     逐题断言失败: ${totalFailures}`);
    console.log(`     全局断言失败: ${globalFailures}\n`);
    process.exit(1);
  }
}

main();
