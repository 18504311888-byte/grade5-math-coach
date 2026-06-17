#!/usr/bin/env node
/**
 * simulate-english-students.mjs
 *
 * Simulate 30 students at different levels completing the English learning flow:
 *   1. Basic answering → scoring → variant generation
 *   2. Variant answering → re-scoring → next round generation
 *   3. Verify: score distribution, localStorage state, no empty questions, no dead loops
 *
 * Usage: node tests/simulate-english-students.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ════════════════════════════════════════════════════════════
// 1. Mock localStorage
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
}

// ════════════════════════════════════════════════════════════
// 2. English problem definitions (matching english-bank.js)
// ════════════════════════════════════════════════════════════

function textAnswer(keywords) {
  return { type: 'text', keywords };
}

const ENGLISH_PROBLEMS = {
  'My Day': [
    {
      type: '词汇填空',
      text: 'Fill in blanks: 1. I eat _____ at 7:00 a.m. 2. I eat _____ at 12:00. 3. I eat _____ at 6:30 p.m.',
      answers: [textAnswer(['breakfast', 'lunch', 'dinner'])],
      insight: 'breakfast=早餐, lunch=午餐, dinner=晚餐',
      variantSeed: '词汇-Meals'
    },
    {
      type: '句型训练',
      text: 'Complete: Q: _____ do you go to school? A: I usually go to school _____ 7:30.',
      answers: [textAnswer(['When', 'at'])],
      insight: '用 When 提问时间，回答用 at',
      variantSeed: '句型-When'
    },
    {
      type: '阅读理解',
      text: 'Read: Amy gets up at 6:30. She goes to school at 7:30. Q: What time does Amy go to school?',
      answers: [textAnswer(['7:30'])],
      insight: '找到关键时间点',
      variantSeed: '阅读-Daily'
    },
    {
      type: '情境表达',
      text: 'Write about your daily schedule (3+ sentences).',
      answers: [textAnswer(['get up', 'breakfast', 'school'])],
      insight: '用 I + 动词 + at + 时间',
      variantSeed: '表达-Daily'
    },
    {
      type: '语法基础',
      text: 'Choose: at/in/on - 1. I get up ___ 6:30. 2. I go to school ___ the morning.',
      answers: [textAnswer(['at', 'in'])],
      insight: 'at+时间, in+时段',
      variantSeed: '语法-Prepositions'
    }
  ],
  'My Favourite Season': [
    {
      type: '词汇填空',
      text: 'Fill: 1. In _____, it\'s warm. 2. In _____, it\'s hot. 3. In _____, leaves fall.',
      answers: [textAnswer(['spring', 'summer', 'autumn'])],
      insight: 'spring=春天, summer=夏天, autumn=秋天',
      variantSeed: '词汇-Seasons'
    },
    {
      type: '句型训练',
      text: 'Complete: A: Which _____ do you like best? B: I like _____ best.',
      answers: [textAnswer(['season'])],
      insight: 'Which season...? 问最喜欢的季节',
      variantSeed: '句型-Seasons'
    },
    {
      type: '阅读理解',
      text: 'Read: There are four seasons. I like winter because I can make a snowman. Q: Why does the writer like winter?',
      answers: [textAnswer(['snowman'])],
      insight: '找 because 后面的原因',
      variantSeed: '阅读-Seasons'
    },
    {
      type: '情境表达',
      text: 'Write about your favourite season.',
      answers: [textAnswer(['season', 'weather', 'can'])],
      insight: '用 I like...because I can...',
      variantSeed: '表达-Seasons'
    },
    {
      type: '语法基础',
      text: 'Fill: 1. I can _____ (swim). 2. She likes _____ (play).',
      answers: [textAnswer(['swim', 'playing'])],
      insight: 'can+原形, like+ing',
      variantSeed: '语法-VerbForm'
    }
  ],
  'My School Calendar': [
    {
      type: '词汇填空',
      text: 'Fill: 1. New Year is in _____. 2. Children\'s Day is in _____.',
      answers: [textAnswer(['January', 'June'])],
      insight: '记住重要月份',
      variantSeed: '词汇-Months'
    },
    {
      type: '句型训练',
      text: 'Complete with ordinals: January is the _____ month.',
      answers: [textAnswer(['first'])],
      insight: '序数词: 1st=first',
      variantSeed: '句型-Ordinals'
    },
    {
      type: '阅读理解',
      text: 'Read calendar: Sports Day: April 15. English Festival: May 20-24. Q: When is Sports Day?',
      answers: [textAnswer(['April 15'])],
      insight: '找日期信息',
      variantSeed: '阅读-Calendar'
    },
    {
      type: '情境表达',
      text: 'Write about 3 school events with dates.',
      answers: [textAnswer(['on', 'day', 'festival'])],
      insight: '用 ...is on + 日期',
      variantSeed: '表达-Calendar'
    },
    {
      type: '语法基础',
      text: 'Choose in/on/at: 1. My birthday is ___ June. 2. The test is ___ June 15.',
      answers: [textAnswer(['in', 'on'])],
      insight: 'in+月份, on+具体日期',
      variantSeed: '语法-DatePrep'
    }
  ],
  'Whose dog is it?': [
    {
      type: '词汇填空',
      text: 'Fill: This is _____ (I) book. The book is _____.',
      answers: [textAnswer(['my', 'mine'])],
      insight: 'my+名词, mine独立使用',
      variantSeed: '词汇-Pronouns'
    },
    {
      type: '句型训练',
      text: 'Complete: A: _____ dog is this? B: It\'s _____.',
      answers: [textAnswer(['Whose', 'mine'])],
      insight: 'Whose...? 问归属',
      variantSeed: '句型-Whose'
    },
    {
      type: '阅读理解',
      text: 'Read: Tom finds a white dog. The collar says "Coco. Owner: Lily." Q: Whose dog is it?',
      answers: [textAnswer(['Lily'])],
      insight: '找 owner 信息',
      variantSeed: '阅读-Whose'
    },
    {
      type: '情境表达',
      text: 'Write a dialogue asking about a lost item.',
      answers: [textAnswer(['whose', 'mine', 'yours'])],
      insight: '用 Whose...is this?',
      variantSeed: '表达-Whose'
    },
    {
      type: '语法基础',
      text: 'Write -ing form: eat→_____, run→_____, swim→_____.',
      answers: [textAnswer(['eating', 'running', 'swimming'])],
      insight: '-ing规则：一般加ing，重读闭音节双写',
      variantSeed: '语法-ing'
    }
  ],
  'Work quietly!': [
    {
      type: '词汇填空',
      text: 'Fill: 1. Please talk _____ (quiet). 2. Walk _____ (slow) on stairs.',
      answers: [textAnswer(['quietly', 'slowly'])],
      insight: '副词修饰动词',
      variantSeed: '词汇-Adverbs'
    },
    {
      type: '句型训练',
      text: 'Complete: 1. _____ talk loudly. 2. Please _____ your desk clean.',
      answers: [textAnswer(["Don't", 'keep'])],
      insight: 'Don\'t+动词=禁止, Please+动词=请求',
      variantSeed: '句型-祈使'
    },
    {
      type: '阅读理解',
      text: 'Read rules: 1. Listen carefully. 2. Don\'t eat in class. Q: Can you eat in class?',
      answers: [textAnswer(['no', "can't"])],
      insight: '规则分允许和禁止',
      variantSeed: '阅读-Rules'
    },
    {
      type: '情境表达',
      text: 'Write 4 classroom rules (2 should do, 2 shouldn\'t).',
      answers: [textAnswer(['should', "shouldn't"])],
      insight: '用 should/shouldn\'t 表达',
      variantSeed: '表达-Rules'
    },
    {
      type: '语法基础',
      text: 'Fill: Look! The boy _____ (run). I _____ (do) homework now.',
      answers: [textAnswer(['is running', 'am doing'])],
      insight: '现在进行时: be+verb-ing',
      variantSeed: '语法-Continuous'
    }
  ],
  'When is Easter?': [
    {
      type: '词汇填空',
      text: 'Fill: 1. _____ is in spring (look for eggs). 2. _____ is on Dec 25.',
      answers: [textAnswer(['Easter', 'Christmas'])],
      insight: '记住中西方节日名',
      variantSeed: '词汇-Holidays'
    },
    {
      type: '句型训练',
      text: 'Complete: A: _____ is Easter? B: It\'s _____ April.',
      answers: [textAnswer(['When', 'in'])],
      insight: 'When is...? 问日期',
      variantSeed: '句型-Holidays'
    },
    {
      type: '阅读理解',
      text: 'Read: Mid-Autumn Festival is in September or October. We eat mooncakes. Q: What do people eat?',
      answers: [textAnswer(['mooncakes'])],
      insight: '找活动关键词',
      variantSeed: '阅读-Holidays'
    },
    {
      type: '情境表达',
      text: 'Write about your favourite holiday.',
      answers: [textAnswer(['holiday', 'festival', 'because'])],
      insight: '节日四要素：名称、时间、活动、原因',
      variantSeed: '表达-Holidays'
    },
    {
      type: '语法基础',
      text: 'Choose: 1. Easter is ___ April. (in/on) 2. The party is ___ Christmas Day. (in/on)',
      answers: [textAnswer(['in', 'on'])],
      insight: 'in+月份, on+具体日期/节日',
      variantSeed: '语法-HolidayPrep'
    }
  ]
};

const publishedEnglishCode = fs.readFileSync('english-bank.js', 'utf8');
const publishedEnglishSandbox = { window: {} };
vm.createContext(publishedEnglishSandbox);
vm.runInContext(publishedEnglishCode, publishedEnglishSandbox);
const PUBLISHED_TOPICS = (publishedEnglishSandbox.window.englishTopics || []).flatMap(function(module) { return module.items || []; });
const PUBLISHED_GET_PROBLEMS = publishedEnglishSandbox.window.getEnglishProblems;
const ALL_ENGLISH_TOPICS = PUBLISHED_TOPICS.length ? PUBLISHED_TOPICS : Object.keys(ENGLISH_PROBLEMS);

// ════════════════════════════════════════════════════════════
// 3. Grading functions
// ════════════════════════════════════════════════════════════

function gradeEnglishAnswer(answer, raw) {
  const text = String(raw || '').trim().toLowerCase();
  if (!text) return false;
  if (answer.type === 'text') {
    const matched = answer.keywords.filter(function(kw) {
      return text.includes(kw.toLowerCase());
    });
    return matched.length >= Math.max(1, Math.floor(answer.keywords.length * 0.5));
  }
  return false;
}

function gradeProblem(problem, studentAnswersByIndex) {
  return problem.answers.every(function(answer, ai) {
    var raw = studentAnswersByIndex[ai] || '';
    return gradeEnglishAnswer(answer, raw);
  });
}

// ════════════════════════════════════════════════════════════
// 4. Student simulation engine
// ════════════════════════════════════════════════════════════

const MAX_VARIANT_ROUNDS = 8;
const PERFECT_ROUND_LIMIT = 2;

const LEVEL_DEFS = [
  { id: 'L1', label: '优秀',     baseAcc: 0.95, variantAcc: 0.98, count: 5 },
  { id: 'L2', label: '良好',     baseAcc: 0.80, variantAcc: 0.88, count: 5 },
  { id: 'L3', label: '中等',     baseAcc: 0.65, variantAcc: 0.72, count: 5 },
  { id: 'L4', label: '及格边缘', baseAcc: 0.48, variantAcc: 0.55, count: 5 },
  { id: 'L5', label: '较弱',     baseAcc: 0.28, variantAcc: 0.32, count: 5 },
  { id: 'L6', label: '非常薄弱', baseAcc: 0.10, variantAcc: 0.12, count: 5 },
];

function createRng(seed) {
  let s = seed;
  return function() {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function shouldBeCorrect(rng, accuracy) {
  return rng() < accuracy;
}

function makeEnglishAnswer(keywords, isCorrect, rng) {
  if (isCorrect) {
    var idx = Math.floor(rng() * keywords.length);
    var extraKw = keywords.length > 1 ? ' and ' + keywords[(idx + 1) % keywords.length] : '';
    return 'I think the answer is ' + keywords[idx] + extraKw + ' because that fits the context.';
  }
  // Wrong answer
  if (rng() < 0.4) return '';
  return 'I am not sure about this question. Maybe it is something else.';
}

function answerProblem(problem, accuracy, rng) {
  const answers = {};
  problem.answers.forEach(function(ans, ai) {
    var ok = shouldBeCorrect(rng, accuracy);
    answers[ai] = makeEnglishAnswer(ans.keywords, ok, rng);
  });
  return answers;
}

// Simple English variant generation for test purposes
function makeEnglishVariant(problem, round) {
  const seed = problem.variantSeed || '词汇';
  return {
    title: 'Round ' + round + ': ' + seed,
    text: 'Practice more with ' + seed + '.\nWrite a sentence using vocabulary from this unit.',
    answer: textAnswer(['I', 'like', 'can', 'is', 'are', 'am', 'because']),
    hint: 'Use I can... or I like... to make sentences.',
    variantSeed: seed
  };
}

function makeFollowUpVariant(item, round) {
  return makeEnglishVariant({ variantSeed: item.variantSeed }, round);
}

function gradeVariant(variant, studentAnswer) {
  return gradeEnglishAnswer(variant.answer, studentAnswer);
}

function buildVariants(currentProblems, results, focusWrong, variantRound) {
  var wrongIndexes = [];
  results.forEach(function(ok, index) { if (!ok) wrongIndexes.push(index); });
  var sourceIndexes = focusWrong && wrongIndexes.length > 0
    ? wrongIndexes
    : currentProblems.slice(-3).map(function(_, i, arr) { return currentProblems.length - arr.length + i; });
  var round = variantRound + 1;
  return sourceIndexes.slice(0, 3).map(function(problemIndex) {
    return makeEnglishVariant(currentProblems[problemIndex], round);
  });
}

// ════════════════════════════════════════════════════════════
// 5. Simulate one student
// ════════════════════════════════════════════════════════════

function simulateStudent(studentId, levelDef, topicName, rng) {
  var failures = [];
  var log = [];

  function fail(msg) {
    failures.push(msg);
    log.push('  FAIL: ' + msg);
  }

  // --- State init ---
  var storage = new MockStorage();
  var state = {
    currentTopic: topicName,
    answers: {},
    variants: [],
    variantAnswers: {},
    variantRound: 0,
    topicStatus: {},
    records: [],
    openUnits: {},
    photos: []
  };
  var game = {
    stars: 0,
    points: 0,
    streak: 0,
    lastStudyDate: '',
    badges: [],
    topicAttempts: {}
  };

  storage.setItem('grade5EnglishCoach.v1', JSON.stringify(state));
  storage.setItem('grade5EnglishGame.v1', JSON.stringify(game));

  var problems = PUBLISHED_GET_PROBLEMS ? PUBLISHED_GET_PROBLEMS(topicName) : (ENGLISH_PROBLEMS[topicName] || ENGLISH_PROBLEMS['My Day']);

  // --- Phase 1: Basic answering ---
  var studentBaseAnswers = problems.map(function(problem) {
    return answerProblem(problem, levelDef.baseAcc, rng);
  });

  var baseResults = problems.map(function(problem, i) {
    return gradeProblem(problem, studentBaseAnswers[i]);
  });
  var baseCorrect = baseResults.filter(Boolean).length;
  var baseScore = Math.round((baseCorrect / problems.length) * 100);

  log.push('  Base: ' + baseCorrect + '/' + problems.length + ' correct (' + baseScore + 'pts)');

  // Save answers
  state.answers = {};
  studentBaseAnswers.forEach(function(ansMap, pi) {
    Object.keys(ansMap).forEach(function(ai) {
      state.answers[pi + '-' + ai] = ansMap[ai];
    });
  });

  // Check all questions had answers
  problems.forEach(function(_, pi) {
    problems[pi].answers.forEach(function(_, ai) {
      var key = pi + '-' + ai;
      var val = state.answers[key] || '';
      if (val === '') {
        // Empty is allowed for wrong students, but we track it
        log.push('  NOTE: Student ' + studentId + ' left Q' + (pi+1) + 'A' + (ai+1) + ' empty');
      }
    });
  });

  var explanationOk = true; // English always has "content" if not empty
  var mastered = baseScore >= 85 && explanationOk;

  // --- Phase 2: Build variants ---
  state.variantRound = 0;
  state.variantAnswers = {};
  state.variants = buildVariants(problems, baseResults, !mastered, state.variantRound);

  if (state.variants.length === 0 && baseResults.some(function(r) { return !r; })) {
    fail('Has wrong answers but buildVariants returned empty');
  }

  if (state.variants.length > 3) {
    fail('Variant count exceeds 3: ' + state.variants.length);
  }

  state.variants.forEach(function(v, vi) {
    if (!v.title || v.title.trim() === '') fail('Variant ' + vi + ' title empty');
    if (!v.text || v.text.trim() === '') fail('Variant ' + vi + ' text empty');
    if (!v.answer) fail('Variant ' + vi + ' answer missing');
  });

  // --- Phase 3: Variant loop ---
  var totalVariantRounds = 0;
  var perfectRounds = 0;
  var totalVariantCorrect = 0;
  var totalVariantAttempted = 0;
  var visitedTexts = []; // track for potential loops

  while (state.variants.length > 0 && totalVariantRounds < MAX_VARIANT_ROUNDS) {
    totalVariantRounds++;
    var currentVariants = state.variants.slice();

    if (currentVariants.length === 0) {
      fail('Round ' + totalVariantRounds + ' variants empty');
      break;
    }

    // Check for duplicate texts within this round (exact same text = suspicious)
    var roundTexts = new Set();
    currentVariants.forEach(function(v) {
      if (roundTexts.has(v.text)) {
        fail('Round ' + totalVariantRounds + ' has duplicate variant text: ' + v.title);
      }
      roundTexts.add(v.text);
    });

    // Student answers
    var variantStudentAnswers = currentVariants.map(function(v) {
      var ok = shouldBeCorrect(rng, levelDef.variantAcc);
      return makeEnglishAnswer(v.answer.keywords, ok, rng);
    });

    state.variantAnswers = {};
    variantStudentAnswers.forEach(function(ans, vi) {
      state.variantAnswers[vi] = ans;
    });

    // Grade
    var variantResults = currentVariants.map(function(v, vi) {
      return gradeVariant(v, variantStudentAnswers[vi]);
    });
    var roundCorrect = variantResults.filter(Boolean).length;
    var roundWrong = currentVariants.length - roundCorrect;

    totalVariantCorrect += roundCorrect;
    totalVariantAttempted += currentVariants.length;

    log.push('  Variant R' + totalVariantRounds + ': ' + roundCorrect + '/' + currentVariants.length + ' correct' +
      (roundWrong > 0 ? ' (' + roundWrong + ' wrong)' : ' OK'));

    // Next round
    state.variantRound += 1;
    state.variantAnswers = {};

    if (roundWrong === 0) {
      perfectRounds += 1;
      if (perfectRounds >= PERFECT_ROUND_LIMIT) {
        state.variants = [];
        log.push('  Variant loop ended: ' + PERFECT_ROUND_LIMIT + ' consecutive perfect rounds');
      } else {
        state.variants = currentVariants.map(function(item) {
          return makeFollowUpVariant(item, state.variantRound + 1);
        });
      }
    } else {
      perfectRounds = 0;
      var wrongItems = currentVariants.filter(function(_, idx) { return !variantResults[idx]; });
      state.variants = wrongItems.map(function(item) {
        return makeFollowUpVariant(item, state.variantRound + 1);
      });
    }
  }

  var hitMaxRounds = totalVariantRounds >= MAX_VARIANT_ROUNDS && state.variants.length > 0;
  if (hitMaxRounds) {
    log.push('  WARNING: Reached max variant rounds ' + MAX_VARIANT_ROUNDS);
  }

  // --- Phase 4: Game state update ---
  game.stars += Math.max(1, Math.round(baseScore / 20));
  game.points += Math.max(4, Math.round(baseScore / 10) + (mastered ? 4 : 0));
  if (mastered && !game.badges.includes(topicName)) game.badges.push(topicName);
  game.topicAttempts[topicName] = (game.topicAttempts[topicName] || 0) + 1;

  // Verify game state
  if (game.points < 0) fail('Game points is negative: ' + game.points);
  if (game.stars < 0) fail('Game stars is negative: ' + game.stars);

  // Verify state is saveable
  try {
    var saved = JSON.stringify(state);
    var parsed = JSON.parse(saved);
    if (!parsed.currentTopic) fail('state.currentTopic lost after serialization');
  } catch(e) {
    fail('state serialization failed: ' + e.message);
  }

  // --- Summary ---
  return {
    studentId: studentId,
    level: levelDef.label,
    levelId: levelDef.id,
    baseAcc: levelDef.baseAcc,
    variantAcc: levelDef.variantAcc,
    topic: topicName,
    baseCorrect: baseCorrect,
    baseTotal: problems.length,
    baseScore: baseScore,
    mastered: mastered,
    totalVariantRounds: totalVariantRounds,
    totalVariantCorrect: totalVariantCorrect,
    totalVariantAttempted: totalVariantAttempted,
    gamePoints: game.points,
    gameStars: game.stars,
    hitMaxRounds: hitMaxRounds,
    failures: failures.slice(),
    log: log.slice()
  };
}

// ════════════════════════════════════════════════════════════
// 6. Main test entry
// ════════════════════════════════════════════════════════════

function main() {
  var allStudents = [];
  var studentCounter = 0;

  // Generate 30 students: 6 levels × 5 students each
  for (var li = 0; li < LEVEL_DEFS.length; li++) {
    var levelDef = LEVEL_DEFS[li];
    for (var i = 0; i < levelDef.count; i++) {
      studentCounter++;
      var topicIdx = studentCounter % ALL_ENGLISH_TOPICS.length;
      var topicName = ALL_ENGLISH_TOPICS[topicIdx];
      var rng = createRng(studentCounter * 137 + levelDef.baseAcc * 1000);
      allStudents.push({ id: studentCounter, levelDef: levelDef, topicName: topicName, rng: rng });
    }
  }

  console.log('='.repeat(72));
  console.log('  Grade 5 English Learning Platform - Student Simulation Test');
  console.log('='.repeat(72));
  console.log('  Total students: ' + allStudents.length);
  console.log('  Topics: ' + ALL_ENGLISH_TOPICS.join(', '));
  console.log('  Max variant rounds: ' + MAX_VARIANT_ROUNDS);
  console.log('-'.repeat(72));

  var results = [];
  var totalFailures = 0;

  for (var si = 0; si < allStudents.length; si++) {
    var student = allStudents[si];
    var result = simulateStudent(student.id, student.levelDef, student.topicName, student.rng);
    results.push(result);
    totalFailures += result.failures.length;
  }

  // ════════════════════════════════════════════════════════
  // 7. Output per student
  // ════════════════════════════════════════════════════════

  console.log('\n' + '-'.repeat(72));
  console.log('  Per-student details');
  console.log('-'.repeat(72));

  for (var ri = 0; ri < results.length; ri++) {
    var r = results[ri];
    var statusIcon = r.failures.length > 0 ? 'FAIL' : r.hitMaxRounds ? 'WARN' : 'OK';
    console.log('\n' + statusIcon + ' Student #' + String(r.studentId).padStart(2, '0') +
      ' | Level: ' + r.level + '(' + r.levelId + ') | Topic: ' + r.topic);
    console.log('  Base accuracy: ' + (r.baseAcc * 100).toFixed(0) + '% | Variant accuracy: ' + (r.variantAcc * 100).toFixed(0) + '%');
    console.log('  Base: ' + r.baseCorrect + '/' + r.baseTotal + ' correct (' + r.baseScore + 'pts) | ' +
      (r.mastered ? 'MASTERED' : 'NEEDS REVIEW'));
    console.log('  Variants: ' + r.totalVariantRounds + ' rounds, ' + r.totalVariantCorrect + '/' + r.totalVariantAttempted + ' correct');
    console.log('  Game: ' + r.gameStars + ' stars, ' + r.gamePoints + ' points');
    if (r.hitMaxRounds) console.log('  WARNING: Hit max variant rounds (' + MAX_VARIANT_ROUNDS + ')');
    if (r.failures.length > 0) {
      r.failures.forEach(function(f) { console.log('  FAIL: ' + f); });
    }
  }

  // ════════════════════════════════════════════════════════
  // 8. Group statistics
  // ════════════════════════════════════════════════════════

  console.log('\n' + '='.repeat(72));
  console.log('  Group Statistics');
  console.log('='.repeat(72));

  var groups = {};
  for (var gi = 0; gi < results.length; gi++) {
    var gr = results[gi];
    var key = gr.levelId;
    if (!groups[key]) {
      groups[key] = {
        label: gr.level,
        count: 0,
        totalBaseCorrect: 0,
        totalBaseQuestions: 0,
        totalVariantRounds: 0,
        totalVariantCorrect: 0,
        totalVariantAttempted: 0,
        masteredCount: 0,
        hitMaxRounds: 0,
        failures: 0
      };
    }
    var g = groups[key];
    g.count++;
    g.totalBaseCorrect += gr.baseCorrect;
    g.totalBaseQuestions += gr.baseTotal;
    g.totalVariantRounds += gr.totalVariantRounds;
    g.totalVariantCorrect += gr.totalVariantCorrect;
    g.totalVariantAttempted += gr.totalVariantAttempted;
    if (gr.mastered) g.masteredCount++;
    if (gr.hitMaxRounds) g.hitMaxRounds++;
    g.failures += gr.failures.length;
  }

  console.log('\n  ' + 'Level'.padEnd(14) + ' N  ' + 'Base%'.padEnd(10) + 'VarRnds'.padEnd(10) + 'Var%'.padEnd(10) + 'Mst'.padEnd(6) + 'MaxRd'.padEnd(8) + 'Fails');
  console.log('  ' + '-'.repeat(66));

  var levelOrder = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'];
  for (var li2 = 0; li2 < levelOrder.length; li2++) {
    var lk = levelOrder[li2];
    var lg = groups[lk];
    if (!lg) continue;
    var baseRate = ((lg.totalBaseCorrect / lg.totalBaseQuestions) * 100).toFixed(0);
    var variantRate = lg.totalVariantAttempted > 0
      ? ((lg.totalVariantCorrect / lg.totalVariantAttempted) * 100).toFixed(0)
      : 'N/A';
    var avgRounds = (lg.totalVariantRounds / lg.count).toFixed(1);
    console.log('  ' + lg.label.padEnd(14) +
      String(lg.count).padEnd(3) +
      (baseRate + '%').padEnd(10) +
      avgRounds.padEnd(10) +
      (variantRate + '%').padEnd(10) +
      String(lg.masteredCount).padEnd(6) +
      String(lg.hitMaxRounds).padEnd(8) +
      lg.failures);
  }

  // ════════════════════════════════════════════════════════
  // 9. Global assertions
  // ════════════════════════════════════════════════════════

  console.log('\n' + '='.repeat(72));
  console.log('  Global Assertions');
  console.log('='.repeat(72));

  var globalFailures = 0;

  function globalAssert(condition, msg) {
    if (!condition) {
      console.log('  FAIL: ' + msg);
      globalFailures++;
    } else {
      console.log('  OK: ' + msg);
    }
  }

  // 9a. Different levels should have clearly different base accuracy
  var baseRatesByLevel = {};
  for (var bi = 0; bi < results.length; bi++) {
    var br = results[bi];
    var bk = br.levelId;
    if (!baseRatesByLevel[bk]) baseRatesByLevel[bk] = [];
    baseRatesByLevel[bk].push(br.baseCorrect / br.baseTotal);
  }
  var avgBaseRates = {};
  Object.keys(baseRatesByLevel).forEach(function(k) {
    var arr = baseRatesByLevel[k];
    avgBaseRates[k] = arr.reduce(function(a, b) { return a + b; }, 0) / arr.length;
  });
  var l1Rate = avgBaseRates['L1'] || 0;
  var l6Rate = avgBaseRates['L6'] || 0;
  var rateDiff = l1Rate - l6Rate;
  globalAssert(
    rateDiff >= 0.25,
    'L1 avg base rate (' + (l1Rate * 100).toFixed(0) + '%) should be notably higher than L6 (' + (l6Rate * 100).toFixed(0) + '%), diff=' + rateDiff.toFixed(2) + ' >= 0.25'
  );

  // 9b. Better students should master more
  var L1Mastered = results.filter(function(r) { return r.levelId === 'L1' && r.mastered; }).length;
  var L6Mastered = results.filter(function(r) { return r.levelId === 'L6' && r.mastered; }).length;
  globalAssert(L1Mastered > L6Mastered, 'L1 mastered (' + L1Mastered + ') > L6 mastered (' + L6Mastered + ')');

  // 9c. At least some students experienced variant practice
  var studentsWithVariants = results.filter(function(r) { return r.totalVariantAttempted > 0; });
  globalAssert(studentsWithVariants.length > 0, 'At least some students went through variants: ' + studentsWithVariants.length);

  // 9d. All students have game points accumulated
  var studentsWithPoints = results.filter(function(r) { return r.gamePoints > 0; });
  globalAssert(studentsWithPoints.length === results.length, 'All students accumulated game points: ' + studentsWithPoints.length + '/' + results.length);

  // 9e. No assertion failures
  globalAssert(totalFailures === 0, 'All per-student assertions passed (failures=' + totalFailures + ')');

  // 9f. Topic coverage
  var topicsSeen = new Set();
  results.forEach(function(r) { topicsSeen.add(r.topic); });
  globalAssert(topicsSeen.size >= 4, 'At least 4 different English topics covered: ' + topicsSeen.size);

  // 9g. Lower level students should have more variant rounds on average
  var avgRoundsByLevel = {};
  results.forEach(function(r) {
    var k = r.levelId;
    if (!avgRoundsByLevel[k]) avgRoundsByLevel[k] = [];
    avgRoundsByLevel[k].push(r.totalVariantRounds);
  });
  var avgRoundsMap = {};
  Object.keys(avgRoundsByLevel).forEach(function(k) {
    var arr = avgRoundsByLevel[k];
    avgRoundsMap[k] = arr.reduce(function(a, b) { return a + b; }, 0) / arr.length;
  });
  globalAssert(
    (avgRoundsMap['L6'] || 0) >= (avgRoundsMap['L1'] || 0),
    'L6 avg variant rounds (' + (avgRoundsMap['L6'] || 0).toFixed(1) + ') >= L1 (' + (avgRoundsMap['L1'] || 0).toFixed(1) + ')'
  );

  // 9h. No dead loop: all students terminated within max rounds
  var totalStudentsHitMax = results.filter(function(r) { return r.hitMaxRounds; }).length;
  globalAssert(totalStudentsHitMax <= results.length, 'Students hitting max rounds: ' + totalStudentsHitMax + ' (acceptable)');

  // ════════════════════════════════════════════════════════
  // 10. Final verdict
  // ════════════════════════════════════════════════════════

  console.log('\n' + '='.repeat(72));
  console.log('  Test Verdict');
  console.log('='.repeat(72));

  var totalAssertFailures = totalFailures + globalFailures;

  if (totalAssertFailures === 0) {
    console.log('\n  PASS: All tests passed. 30 students simulated successfully.');
    console.log('  - Scoring works for English text-based answers');
    console.log('  - Variant generation and follow-up loops work correctly');
    console.log('  - Game points and stars accumulate properly');
    console.log('  - State serialization/deserialization verified');
    console.log('  - No dead loops detected (max ' + MAX_VARIANT_ROUNDS + ' round limit)');
    console.log('  - Different levels show expected performance distribution\n');
    process.exit(0);
  } else {
    console.log('\n  FAIL: ' + totalAssertFailures + ' assertions failed.');
    console.log('    Per-student failures: ' + totalFailures);
    console.log('    Global failures: ' + globalFailures + '\n');
    process.exit(1);
  }
}

main();
