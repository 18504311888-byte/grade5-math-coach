window.englishBank = {};

const fltrpModules = [
  { key: "Module 1", unit1: "She was a driver before.", unit2: "He worked in an office." },
  { key: "Module 2", unit1: "What did she have for lunch?", unit2: "Lunch is usually at half past twelve." },
  { key: "Module 3", unit1: "Have you got the Harry Potter DVDs?", unit2: "You can use the computers." },
  { key: "Module 4", unit1: "Did you read them?", unit2: "My favourite season is spring." },
  { key: "Module 5", unit1: "Your bag is broken.", unit2: "Mine is pink." },
  { key: "Module 6", unit1: "We'll see lots of very big stones.", unit2: "It was amazing." },
  { key: "Module 7", unit1: "My father goes to work at 8 o'clock every morning.", unit2: "I'll be home at 7 o'clock." },
  { key: "Module 8", unit1: "Will you help me?", unit2: "I made a kite." },
  { key: "Module 9", unit1: "We laughed a lot.", unit2: "Mum bought new chopsticks for you." },
  { key: "Module 10", unit1: "What did you put in your bag?", unit2: "I played on the beach." },
];

// 教材来源：用户于 2026-06-14 提供的外研社五年级下册目录照片，已逐项核验 Module 1-10。

function makeFltrpProblems(module) {
  const words = module.words;
  const [word1, word2, word3, word4, word5] = words;
  return [
    { type: "词汇填空", text: `Read and fill in the blanks.\n(${words.join(", ")})\n\n1. ${module.unit1.replace(word1, "_____")}\n2. ${module.unit2.replace(word2, "_____")}`, answers: [{ type: "text", keywords: [word1, word2] }], insight: "先读句子，再从本模块核心词汇里找合适的词。", variantSeed: `词汇-${module.key}` },
    { type: "句型训练", text: `Complete the sentences.\n\n1. ${module.unit1}\n2. ${module.unit2}\n\nNow write one sentence about yourself: _____`, answers: [{ type: "text", keywords: [module.unit1.split(" ")[0], module.unit2.split(" ")[0]] }], insight: "先模仿课本句型，再换成自己的内容。", variantSeed: `句型-${module.key}` },
    { type: "阅读理解", text: `Read and answer.\n\nAmy is talking about this module. She says: "${module.unit1}" Then she says: "${module.unit2}"\n\nQuestion: What does Amy say first? What does she say next?`, answers: [{ type: "text", keywords: [word1, word2] }], insight: "阅读题先找人物、顺序和关键词。", variantSeed: `阅读-${module.key}` },
    { type: "情境表达", text: `Your friend asks you about this topic. Write 3 short sentences.\nUse at least these words: ${word1}, ${word2}, ${word3}.\n\n1. _____\n2. _____\n3. _____`, answers: [{ type: "text", keywords: [word1, word2, word3] }], insight: "每句话先写主语，再写动词和关键词。", variantSeed: `表达-${module.key}` },
    { type: "语法基础", text: `Choose the correct form.\n\n1. Write a sentence with: ${word1}.\n2. Write a sentence with: ${word5}.\n3. Which sentence is from this module?`, answers: [{ type: "text", keywords: [word1, word5] }], insight: "注意句子里要有主语和动词。", variantSeed: `语法-${module.key}` },
  ];
}

const moduleDetails = [
  { key: "Module 1", title: "Past jobs", goal: "描述过去的职业和以前做过的工作", rule: "was / worked / What did...?", words: ["driver", "worked", "office", "before", "drove"] },
  { key: "Module 2", title: "Food and time", goal: "谈论吃过什么和吃饭时间", rule: "What did...? / had / usually at...", words: ["lunch", "sausages", "fish", "half", "twelve"] },
  { key: "Module 3", title: "Library", goal: "询问有没有物品和图书馆规则", rule: "Have you got...? / Yes, I have. / You can...", words: ["DVDs", "books", "computers", "borrow", "use"] },
  { key: "Module 4", title: "Reading and seasons", goal: "询问是否读过书并表达喜欢的季节", rule: "Did you...? / Yes, I did. / favourite / because", words: ["read", "season", "spring", "favourite", "because"] },
  { key: "Module 5", title: "Bags and colours", goal: "描述物品状态、大小和归属", rule: "Your... is... / Mine is... / Which one is yours?", words: ["bag", "broken", "mine", "yours", "pink"] },
  { key: "Module 6", title: "Travel", goal: "描述旅行计划和过去旅行体验", rule: "We'll see... / When will...? / It was...", words: ["stones", "amazing", "will", "lots", "went"] },
  { key: "Module 7", title: "Daily timetable", goal: "描述每天时间安排和回家时间", rule: "goes to... at... / What time will...? / I'll...", words: ["father", "work", "home", "eight", "seven"] },
  { key: "Module 8", title: "Making things", goal: "请求帮助并描述制作过程", rule: "Will you help me? / What about...? / I made...", words: ["help", "made", "kite", "drew", "cut"] },
  { key: "Module 9", title: "Theatre and visit", goal: "描述过去经历和来访准备", rule: "laughed / told / bought / put / will", words: ["laughed", "jokes", "bought", "chopsticks", "borrowed"] },
  { key: "Module 10", title: "Trip and beach", goal: "谈论旅行物品和过去旅行经历", rule: "What did you put...? / Where will...? / I played...", words: ["put", "bag", "played", "beach", "passport"] },
].map((detail) => ({ ...detail, ...fltrpModules.find((item) => item.key === detail.key) }))
  .map((detail) => ({
    ...detail,
    source: "用户目录照片 + haoduoyun.cc/fanyi/waiyan/5x/1.html-20.html",
  }));

window.englishTopics = moduleDetails.map((item) => ({ unit: `${item.key}`, items: [`${item.key} Unit 1 — ${item.unit1}`, `${item.key} Unit 2 — ${item.unit2}`] }));
window.englishTopicMeta = Object.fromEntries(moduleDetails.flatMap((item) => [
  [`${item.key} Unit 1`, { goal: item.goal, rule: item.rule, diagram: item.unit1 }],
  [`${item.key} Unit 2`, { goal: item.goal, rule: item.rule, diagram: item.unit2 }],
]));
window.englishTopicMeta.default = { goal: "积累词汇，练习句型，提升英语综合能力", rule: "先读题，找关键词，再作答", diagram: "English Skills" };
window.getEnglishProblems = function(topicName) {
  const match = /^(Module \d+) Unit ([12])/.exec(topicName);
  if (!match) return [];
  const module = moduleDetails.find((item) => item.key === match[1]);
  return module ? makeFltrpProblems(module) : [];
};
