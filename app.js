const SUBJECT_KEY = "grade5Subject.v1";
const STORAGE_KEY = "grade5MathCoach.v2";
const GAME_KEY = "grade5MathGame.v2";
const ENG_STORAGE_KEY = "grade5EnglishCoach.v1";
const ENG_GAME_KEY = "grade5EnglishGame.v1";

// Current subject: 'math' or 'english'
let currentSubject = (function() {
  try { return JSON.parse(localStorage.getItem(SUBJECT_KEY)) || "math"; }
  catch { return "math"; }
})();

function getStorageKey() { return currentSubject === "english" ? ENG_STORAGE_KEY : STORAGE_KEY; }
function getGameKey() { return currentSubject === "english" ? ENG_GAME_KEY : GAME_KEY; }

const shoeRewards = [
  { points: 20, name: "Nike Ja 2", subtitle: "后卫启动鞋", color: "#fdb927", accent: "#552583", image: "assets/shoes/ja2-real.png" },
  { points: 50, name: "adidas AE 1", subtitle: "爆发力鞋", color: "#552583", accent: "#fdb927", image: "assets/shoes/ae1-real.jpg" },
  { points: 100, name: "Jordan Luka 5", subtitle: "组织核心鞋", color: "#24113f", accent: "#fdb927", image: "assets/shoes/luka5-real.png" },
  { points: 180, name: "Jordan Tatum 4", subtitle: "全能锋线鞋", color: "#fdb927", accent: "#24113f", image: "assets/shoes/tatum4-real.png" },
  { points: 300, name: "Nike Kobe 6 Protro", subtitle: "传奇收藏鞋", color: "#552583", accent: "#ffffff", image: "assets/shoes/kobe6-real.jpg" },
];

const badmintonRewards = [
  { points: 20, name: "基础训练拍", subtitle: "适合初学的铝合金球拍", color: "#00a86b", accent: "#ffffff", image: "assets/rewards/badminton-basic.svg" },
  { points: 50, name: "进阶碳素拍", subtitle: "轻量碳纤维，控球精准", color: "#0055a4", accent: "#ffffff", image: "assets/rewards/badminton-carbon.svg" },
  { points: 100, name: "专业攻防拍", subtitle: "攻守兼备，比赛级装备", color: "#c41e3a", accent: "#ffffff", image: "assets/rewards/badminton-pro.svg" },
  { points: 180, name: "限量签名拍", subtitle: "世界冠军同款签名球拍", color: "#ffd700", accent: "#000000", image: "assets/rewards/badminton-elite.svg" },
  { points: 300, name: "🏆 冠军典藏套装", subtitle: "球拍+球包+羽毛球全套", color: "#8b00ff", accent: "#ffffff", image: "assets/rewards/badminton-champion.svg" },
];

const topics = [
  { unit: "分数加减法", items: ["折纸：异分母分数加减法", "星期日的安排", "分数王国与小数王国", "练习一"] },
  { unit: "长方体（一）", items: ["长方体的认识", "展开与折叠", "长方体的表面积", "露在外面的面", "练习二"] },
  { unit: "分数乘法", items: ["分数乘整数", "分数乘分数", "倒数", "分数乘法应用题", "练习三"] },
  { unit: "长方体（二）", items: ["体积与容积", "体积单位", "长方体的体积", "体积单位的换算", "有趣的测量", "练习四"] },
  { unit: "分数除法", items: ["分数除以整数", "一个数除以分数", "分数除以分数", "已知一个数的几分之几是多少，求这个数", "分数除法应用题"] },
  { unit: "确定位置", items: ["用方向和距离确定位置", "根据描述找位置", "根据图描述位置", "路线描述"] },
  { unit: "用方程解决问题", items: ["邮票的张数", "列方程解决倍数关系", "相遇问题", "方程应用题综合"] },
  { unit: "数学好玩", items: ['"象征性"长跑', "有趣的折叠", "包装的学问"] },
  { unit: "数据的表示和分析", items: ["复式条形统计图", "复式折线统计图", "平均数的再认识"] },
];

const topicMeta = {
  "相遇问题": {
    goal: "在不同出发时间、方向变化和速度变化中找等量关系",
    rule: "路程差或路程和 = 速度关系 × 时间",
    diagram: "相向/追及/折返",
  },
  default: {
    goal: "读懂情境，选择合适的数量关系解决问题",
    rule: "先找单位、关系和未知量，再列式或列方程",
    diagram: "分析关系",
  },
};

// State and game are initialized based on current subject
let state;
let game;

function initState() {
  const defaultTopic = currentSubject === "english" ? "My Day" : "相遇问题";
  state = load(getStorageKey(), {
    currentTopic: defaultTopic,
    openUnits: {},
    records: [],
    topicStatus: {},
    photos: [],
    answers: {},
    variants: [],
    variantAnswers: {},
    variantRound: 0,
    session: { active: false, topic: "", startedAt: "" },
    unitIssues: {},
  });
  game = load(getGameKey(), {
    stars: 0,
    points: 0,
    streak: 0,
    lastStudyDate: "",
    badges: [],
    topicAttempts: {},
  });
}
initState();

let currentProblems = [];

function load(key, fallback) {
  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(key) || "{}") };
  } catch {
    return fallback;
  }
}

function save() {
  localStorage.setItem(getStorageKey(), JSON.stringify(state));
  localStorage.setItem(getGameKey(), JSON.stringify(game));
}

function $(id) {
  return document.getElementById(id);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function allTopicNames() {
  if (currentSubject === "english") {
    return (window.englishTopics || []).flatMap(function(unit) { return unit.items; });
  }
  return topics.flatMap(function(unit) { return unit.items; });
}

function getUnit(topicName) {
  if (currentSubject === "english") {
    return (window.englishTopics || []).find(function(unit) { return unit.items.includes(topicName); })?.unit || "";
  }
  return topics.find(function(unit) { return unit.items.includes(topicName); })?.unit || "";
}

function numberAnswer(value, unit = "", tolerance = 0.01) {
  return { type: "number", value, unit, tolerance };
}

function formatAnswerExample(answer) {
  if (!answer.unit && Number.isInteger(answer.value)) return String(answer.value);
  if (Number.isInteger(answer.value)) return `${answer.value}${answer.unit || ""}`;
  const fraction = toSimpleFraction(answer.value);
  if (fraction) return `${fraction}${answer.unit || ""}`;
  return `${Number(answer.value.toFixed(2))}${answer.unit || ""}`;
}

function toSimpleFraction(value) {
  for (let denominator = 2; denominator <= 100; denominator += 1) {
    const numerator = Math.round(value * denominator);
    if (Math.abs(numerator / denominator - value) < 0.0001) {
      const gcd = (a, b) => b ? gcd(b, a % b) : a;
      const divisor = gcd(Math.abs(numerator), denominator);
      return `${numerator / divisor}/${denominator / divisor}`;
    }
  }
  return null;
}

function textAnswer(keywords) {
  return { type: "text", keywords };
}

function makeProblem(type, text, answers, insight, variantSeed) {
  return { type, text, answers, insight, variantSeed };
}

function meetingProblems() {
  return [
    makeProblem(
      "同时相向",
      "两名同学从相距1800米的学校和图书馆同时出发相向而行。小宇每分钟走85米，小宁每分钟走65米。几分钟后相遇？相遇点离学校多少米？",
      [numberAnswer(12, "分钟"), numberAnswer(1020, "米")],
      "相向而行用总路程除以速度和；相遇点位置要用其中一人的速度乘时间。",
      "同时相向",
    ),
    makeProblem(
      "不同时间出发",
      "甲、乙两车从相距420千米的两地相向而行。甲车先出发1小时，速度70千米/时；乙车出发后速度90千米/时。乙车出发后几小时两车相遇？",
      [numberAnswer(2.1875, "小时", 0.02)],
      "先扣掉甲车提前走的70千米，再用剩余路程除以速度和。",
      "延迟出发",
    ),
    makeProblem(
      "相背而行",
      "两艘巡逻船从同一港口同时向相反方向行驶。甲船每小时28千米，乙船每小时34千米。几小时后两船相距310千米？",
      [numberAnswer(5, "小时")],
      "相背而行距离增加，增加速度是两船速度和。",
      "相背而行",
    ),
    makeProblem(
      "同向追及",
      "晨跑时，小林先从起点出发，速度为每分钟140米。8分钟后，小川从同一起点骑车追赶，速度为每分钟260米。小川出发后几分钟追上小林？",
      [numberAnswer(9.333, "分钟", 0.02)],
      "追及问题先求领先路程，再除以速度差。",
      "同向追及",
    ),
    makeProblem(
      "途中停留",
      "A、B两地相距36千米。哥哥骑车从A地去B地，每小时12千米；妹妹从B地向A地步行，每小时4千米。妹妹出发后停留了30分钟再继续，两人同时出发。几小时后相遇？",
      [numberAnswer(2.375, "小时", 0.02)],
      "停留的人少走了路程，可把全过程拆成停留前和停留后。",
      "停留",
    ),
    makeProblem(
      "折返相遇",
      "小车从甲地开往乙地，速度60千米/时；货车从乙地开往甲地，速度40千米/时。两地相距250千米。小车到乙地后立即折返，货车不停。小车出发后几小时第一次追上货车？",
      [numberAnswer(2.5, "小时", 0.02)],
      "先判断正常相遇是否发生；若到端点后折返，再用剩余路程和相对速度分析。",
      "折返",
    ),
    makeProblem(
      "环形相向",
      "环形跑道一圈600米。甲、乙从同一点同时反向跑，甲每分钟90米，乙每分钟60米。几分钟后第一次相遇？",
      [numberAnswer(4, "分钟")],
      "环形相向第一次相遇时，两人合跑一圈。",
      "环形相向",
    ),
    makeProblem(
      "环形追及",
      "环形跑道一圈400米。甲、乙从同一点同向出发，甲每分钟110米，乙每分钟70米。甲几分钟后第一次追上乙？",
      [numberAnswer(10, "分钟")],
      "环形追及第一次追上时，快者比慢者多跑一圈。",
      "环形追及",
    ),
    makeProblem(
      "速度变化",
      "两地相距198千米。甲车从A地、乙车从B地同时相向而行。甲车前1小时每小时54千米，之后每小时60千米；乙车一直每小时48千米。几小时后相遇？",
      [numberAnswer(1.333, "小时", 0.02)],
      "速度变化要分段：先算第一小时合走多少，再算剩余路程。",
      "速度变化",
    ),
    makeProblem(
      "往返综合",
      "小明和爸爸在长900米的直路两端同时出发相向而行。小明每分钟70米，爸爸每分钟110米。第一次相遇后两人继续走到对端再立即返回。出发后几分钟第二次相遇？",
      [numberAnswer(15, "分钟")],
      "直路往返第二次相遇时，两人合走3个全长。",
      "往返第二次",
    ),
  ];
}

const templates = {
  fractionAdd(topic) {
    return [
      makeProblem("计划调整", `班级读书角本周先整理了全部图书的1/3，后来又整理了1/4。还剩几分之几没整理？`, [numberAnswer(5 / 12, "本书")], "异分母分数先通分，再计算。", topic),
      makeProblem("时间安排", `周日小航用2/5天做作业，用1/6天运动，剩下时间阅读。阅读时间占一天的几分之几？`, [numberAnswer(13 / 30, "天")], "把一天看作单位1。", topic),
      makeProblem("小数互化", `一个水杯装了0.35升水，又加入1/4升。现在共有多少升？`, [numberAnswer(0.6, "升")], "先把分数化成小数，或把小数化成分数。", topic),
      makeProblem("比较决策", `两个小组分别完成项目的7/12和0.58。哪个小组完成得更多？多约多少？`, [textAnswer(["7/12", "多"])], "比较时可把0.58化成58/100。", topic),
    ];
  },
  cuboid(topic) {
    return [
      makeProblem("展开图判断", `一个长方体长8厘米、宽5厘米、高3厘米。做纸盒至少需要多少平方厘米硬纸？`, [numberAnswer(158, "平方厘米")], "表面积是六个面的面积总和。", topic),
      makeProblem("外露面", `4个棱长2厘米的小正方体排成一排，露在外面的面积是多少平方厘米？`, [numberAnswer(72, "平方厘米")], "排成一排共有18个小正方形面露出。", topic),
      makeProblem("鱼缸玻璃", `无盖鱼缸长6分米、宽4分米、高3分米，做玻璃至少需要多少平方分米？`, [numberAnswer(84, "平方分米")], "无盖只算底面和四个侧面。", topic),
      makeProblem("包装省料", `两个长6厘米、宽4厘米、高2厘米的盒子上下叠放包装，最小表面积是多少平方厘米？`, [numberAnswer(128, "平方厘米")], "叠放后变成长6、宽4、高4的长方体。", topic),
    ];
  },
  fractionMultiply(topic) {
    return [
      makeProblem("部分的部分", `果园有苹果树120棵，其中2/3挂果，挂果的树中3/5已经采摘。已经采摘的是多少棵？`, [numberAnswer(48, "棵")], "连续求一个数的几分之几，用乘法。", topic),
      makeProblem("长度缩放", `一根彩带长4.8米，用去5/8。用去了多少米？还剩多少米？`, [numberAnswer(3, "米"), numberAnswer(1.8, "米")], "剩余也可以用1-5/8。", topic),
      makeProblem("倒数", `一个数与5/7相乘得1，这个数是多少？`, [numberAnswer(1.4, "")], "乘积为1的两个数互为倒数。", topic),
      makeProblem("面积模型", `长方形菜地长3/4米，宽2/5米，面积是多少平方米？`, [numberAnswer(0.3, "平方米")], "分数乘分数可看作面积。", topic),
    ];
  },
  volume(topic) {
    return [
      makeProblem("体积计算", `收纳箱长8分米、宽5分米、高4分米，体积是多少立方分米？`, [numberAnswer(160, "立方分米")], "长方体体积=长×宽×高。", topic),
      makeProblem("单位换算", `一个盒子体积是0.72立方米，合多少立方分米？`, [numberAnswer(720, "立方分米")], "1立方米=1000立方分米。", topic),
      makeProblem("容积选择", `一个水槽长6分米、宽4分米，能装72升水，水深是多少分米？`, [numberAnswer(3, "分米")], "72升=72立方分米。", topic),
      makeProblem("排水测量", `量杯原有350毫升水，放入石块后水面到470毫升。石块体积是多少立方厘米？`, [numberAnswer(120, "立方厘米")], "上升的水的体积等于石块体积。", topic),
    ];
  },
  fractionDivide(topic) {
    return [
      makeProblem("平均分", `3/4升果汁平均倒入3个杯子，每杯多少升？`, [numberAnswer(0.25, "升")], "分数除以整数等于乘这个整数的倒数。", topic),
      makeProblem("包含除", `每个小瓶装1/6升蜂蜜，2升蜂蜜可以装多少瓶？`, [numberAnswer(12, "瓶")], "求里面有几个几分之一，用除法。", topic),
      makeProblem("已知部分", `一条路的3/5是240米，这条路全长多少米？`, [numberAnswer(400, "米")], "已知一个数的几分之几，用除法或方程。", topic),
      makeProblem("效率问题", `一台机器2/3小时加工18个零件，平均每小时加工多少个？`, [numberAnswer(27, "个")], "数量除以时间等于效率。", topic),
    ];
  },
  position(topic) {
    return [
      makeProblem("方向距离", `从学校向东偏北30度走400米到图书馆，再向正南走300米到体育馆。描述从学校到体育馆的大致位置关系。`, [textAnswer(["东", "北", "南"])], "方向题要先定观测点。", topic),
      makeProblem("坐标读图", `地图上电影院在(3,5)，书店在(7,5)。从电影院到书店要向哪个方向走几格？`, [textAnswer(["东", "4"])], "横坐标增加表示向东。", topic),
      makeProblem("路线描述", `小明从(2,1)出发，先向北3格，再向东4格，最后到达哪里？`, [textAnswer(["6", "4"])], "先变纵坐标，再变横坐标。", topic),
      makeProblem("反向推理", `公园在学校北偏西40度600米处，那么学校在公园的什么方向约600米处？`, [textAnswer(["南", "东"])], "反向描述方向相反、距离不变。", topic),
    ];
  },
  equation(topic) {
    return [
      makeProblem("邮票关系", `哥哥的邮票比妹妹的3倍少8张，两人共有72张。妹妹有多少张？`, [numberAnswer(20, "张")], "设妹妹x张，哥哥3x-8张。", topic),
      makeProblem("倍数关系", `合唱队女生人数是男生的2倍多6人，共有66人。男生有多少人？`, [numberAnswer(20, "人")], "设男生x人，女生2x+6人。", topic),
      makeProblem("面积方程", `长方形长比宽多5厘米，周长是38厘米。宽是多少厘米？`, [numberAnswer(7, "厘米")], "设宽x厘米，长x+5厘米。", topic),
      makeProblem("综合方程", `两种笔共买18支，钢笔每支6元，铅笔每支2元，共花60元。钢笔买了几支？`, [numberAnswer(6, "支")], "设钢笔x支，铅笔18-x支。", topic),
    ];
  },
  data(topic) {
    return [
      makeProblem("条形图比较", `甲班四周阅读量分别为20、24、28、32本，乙班为18、25、31、34本。哪一班增长更多？`, [textAnswer(["乙", "16"])], "比较首尾差值。", topic),
      makeProblem("折线趋势", `气温从周一到周五为18、20、24、23、27摄氏度。哪一天到哪一天上升最快？`, [textAnswer(["周二", "周三"])], "折线图看相邻变化量。", topic),
      makeProblem("平均数", `五次跳绳成绩为96、102、100、98、104下，平均每次多少下？`, [numberAnswer(100, "下")], "平均数=总数÷份数。", topic),
      makeProblem("数据判断", `两组平均分都是86分，A组分数集中，B组分数忽高忽低。只看平均数能判断谁更稳定吗？`, [textAnswer(["不能", "稳定"])], "平均数代表水平，但不代表波动。", topic),
    ];
  },
  fun(topic) {
    return [
      makeProblem("路线规划", `班级要完成象征性长跑15千米，已经跑了全程的2/5，还剩多少千米？`, [numberAnswer(9, "千米")], "先求剩余分率。", topic),
      makeProblem("折叠推理", `一张长24厘米、宽16厘米的纸对折一次后面积是多少平方厘米？`, [numberAnswer(192, "平方厘米")], "对折面积变为原来一半。", topic),
      makeProblem("包装优化", `三个相同正方体排成一排包装，外露面比单独包装少了几个面？`, [numberAnswer(4, "个面")], "两个接触处各少2个外露面。", topic),
      makeProblem("方案选择", `4人小组每人完成项目的1/6，还需要共同完成多少？`, [numberAnswer(1 / 3, "")], "4个1/6是2/3。", topic),
    ];
  },
};

function problemsFor(topicName) {
  if (currentSubject === "english") {
    if (window.getEnglishProblems) return window.getEnglishProblems(topicName);
    return [];
  }
  if (topicName === "相遇问题") return meetingProblems().slice(0, 5);
  if (window.problemBank?.[topicName]) return window.problemBank[topicName];
  const unit = getUnit(topicName);
  if (unit === "分数加减法") return templates.fractionAdd(topicName);
  if (unit === "长方体（一）") return templates.cuboid(topicName);
  if (unit === "分数乘法") return templates.fractionMultiply(topicName);
  if (unit === "长方体（二）") return templates.volume(topicName);
  if (unit === "分数除法") return templates.fractionDivide(topicName);
  if (unit === "确定位置") return templates.position(topicName);
  if (unit === "用方程解决问题") return templates.equation(topicName);
  if (unit === "数学好玩") return templates.fun(topicName);
  if (unit === "数据的表示和分析") return templates.data(topicName);
  return templates.equation(topicName);
}

function renderNav() {
  const nav = $("topicNav");
  nav.innerHTML = "";
  const topicList = currentSubject === "english" ? (window.englishTopics || []) : topics;
  topicList.forEach((unit) => {
    if (state.openUnits[unit.unit] === undefined) state.openUnits[unit.unit] = true;
    const group = document.createElement("div");
    group.className = "unit-group";

    const header = document.createElement("button");
    header.type = "button";
    header.className = "unit-header";
    header.setAttribute("aria-expanded", String(state.openUnits[unit.unit]));
    header.innerHTML = `<span class="unit-chevron">${state.openUnits[unit.unit] ? "⌄" : "›"}</span><strong class="unit-name">${unit.unit}</strong>`;
    header.addEventListener("click", () => {
      state.openUnits[unit.unit] = !state.openUnits[unit.unit];
      save();
      renderNav();
    });
    group.appendChild(header);

    if (state.openUnits[unit.unit]) {
      const items = document.createElement("div");
      items.className = "unit-items";
      unit.items.forEach((item) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `topic-button${item === state.currentTopic ? " active" : ""}`;
        const status = state.topicStatus[item]?.mastered ? "已掌握" : state.topicStatus[item]?.attempts ? "需巩固" : "未开始";
        button.innerHTML = `<span>${item}</span><small>${status}</small>`;
        button.addEventListener("click", () => selectTopic(item));
        items.appendChild(button);
      });
      group.appendChild(items);
    }
    nav.appendChild(group);
  });
}

function selectTopic(topicName) {
  state.currentTopic = topicName;
  state.answers = {};
  state.variants = [];
  state.variantAnswers = {};
  state.variantRound = 0;
  state.session = { active: false, topic: topicName, startedAt: "" };
  state.unitIssues = {};
  renderLesson();
  renderNav();
  save();
}

function renderLesson() {
  currentProblems = problemsFor(state.currentTopic);
  const metaSource = currentSubject === "english" ? (window.englishTopicMeta || {}) : topicMeta;
  const meta = metaSource[state.currentTopic] || metaSource.default || { goal: "完成练习，检查掌握情况", rule: "认真读题，仔细作答", diagram: "学习" };
  document.body.dataset.subject = currentSubject;
  $("unitLabel").textContent = getUnit(state.currentTopic);
  $("topicTitle").textContent = state.currentTopic;
  $("lessonGoal").textContent = meta.goal;
  $("coreRule").textContent = meta.rule;
  var diagramEl = document.querySelector(".mini-diagram b");
  if (diagramEl) diagramEl.textContent = meta.diagram;
  var topicStatus = state.topicStatus[state.currentTopic];
  $("topicStatus").textContent = topicStatus?.mastered ? "已掌握" : topicStatus?.attempts ? "需巩固" : "未开始";
  // Update reward panels visibility
  updateRewardPanels();
  renderProblems();
  renderVariants();
  renderDiagnosis();
  renderCounts();
  renderGame();
}

function updateRewardPanels() {
  var mathPanel = $("rewardPanelMath");
  var engPanel = $("rewardPanelEnglish");
  if (mathPanel) mathPanel.style.display = currentSubject === "math" ? "" : "none";
  if (engPanel) engPanel.style.display = currentSubject === "english" ? "" : "none";
}

function renderProblems() {
  const activeLesson = state.session?.active && state.session.topic === state.currentTopic;
  const list = $("problemList");
  const template = $("problemTemplate");
  list.innerHTML = "";
  currentProblems.forEach((problem, index) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.dataset.index = String(index);
    node.querySelector(".problem-index").textContent = `第${index + 1}题`;
    node.querySelector(".problem-type").textContent = problem.type;
    node.querySelector(".problem-text").textContent = problem.text;
    if (problem.visual) {
      const figure = document.createElement("figure");
      figure.className = "problem-visual";
      figure.innerHTML = `<img src="${escapeHtml(problem.visual.src)}" alt="${escapeHtml(problem.visual.alt || problem.type)}" />${problem.visual.caption ? `<figcaption>${escapeHtml(problem.visual.caption)}</figcaption>` : ""}`;
      node.querySelector(".problem-text").insertAdjacentElement("afterend", figure);
    }
    const area = node.querySelector(".answer-area");
    const prompt = document.createElement("div");
    prompt.className = "answer-prompt";
    prompt.innerHTML = `<strong>先写答案</strong><span>${currentSubject === "english" ? "可以先写关键词，再补完整句子。" : "先算一算，再写出结果。"}</span>`;
    area.appendChild(prompt);
    const grid = document.createElement("div");
    grid.className = "answer-grid";
    problem.answers.forEach((answer, answerIndex) => {
      const label = document.createElement("label");
      label.className = "answer-box";
      const saved = state.answers[`${index}-${answerIndex}`] || "";
      const placeholder = answer.type === "text" ? (currentSubject === "english" ? "写一个完整句子…" : "写清楚你的理由…") : `例如：${formatAnswerExample(answer)}`;
      label.innerHTML = `<span>${answerIndex + 1}. ${answer.type === "text" ? "我的回答" : `答案${answer.unit ? `（${answer.unit}）` : ""}`}</span><input class="input-field${activeLesson ? "" : " locked"}" data-problem="${index}" data-answer="${answerIndex}" value="${escapeHtml(saved)}" placeholder="${placeholder}" ${activeLesson ? "" : "disabled"} />`;
      grid.appendChild(label);
    });
    area.appendChild(grid);
    if (state.currentTopic === "相遇问题") {
      const thinking = document.createElement("label");
      thinking.className = "thinking-label";
      const savedThinking = state.answers[`think-${index}`] || "";
      thinking.innerHTML = `<span>我这样想：谁走了多少？为什么要相加或相减？</span><textarea class="text-field thinking-field${activeLesson ? "" : " locked"}" data-thinking="${index}" placeholder="例如：两个人相向而行，所以要把两个人每分钟走的路程相加。" ${activeLesson ? "" : "disabled"}>${escapeHtml(savedThinking)}</textarea>`;
      area.appendChild(thinking);
    }
    list.appendChild(node);
  });

  const row = document.createElement("div");
  row.className = "submit-row";
  row.innerHTML = `<div class="lesson-lock-note">${activeLesson ? "本轮学习已开始，答案会自动保存。" : "请先点击上方“开始”，再写答案。"}</div><button class="tool-button" type="button" id="submitBtn" ${activeLesson ? "" : "disabled"}>提交诊断</button><button class="tool-button secondary" type="button" id="variantBtn" ${activeLesson ? "" : "disabled"}>生成变式</button>`;
  list.appendChild(row);
  $("submitBtn").addEventListener("click", submitAnswers);
  $("variantBtn").addEventListener("click", () => {
    state.variantRound = 0;
    state.variantAnswers = {};
    state.variants = buildVariants(currentProblems.map(() => true), false);
    renderVariants();
    save();
  });
  list.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", rememberAnswer);
    input.addEventListener("focus", hidePlaceholderWhileTyping);
    input.addEventListener("blur", restorePlaceholderAfterTyping);
  });
  list.querySelectorAll("textarea[data-thinking]").forEach((input) => input.addEventListener("input", rememberThinking));
}

function rememberThinking(event) {
  const input = event.currentTarget;
  state.answers[`think-${input.dataset.thinking}`] = input.value;
  save();
}

function rememberAnswer(event) {
  const input = event.currentTarget;
  state.answers[`${input.dataset.problem}-${input.dataset.answer}`] = input.value;
  save();
}

function hidePlaceholderWhileTyping(event) {
  const input = event.currentTarget;
  if (!input.dataset.placeholderText) input.dataset.placeholderText = input.placeholder;
  input.placeholder = "";
}

function restorePlaceholderAfterTyping(event) {
  const input = event.currentTarget;
  if (!input.value) input.placeholder = input.dataset.placeholderText || "";
}

function submitAnswers() {
  if (!state.session?.active || state.session.topic !== state.currentTopic) return;
  state.unitIssues = {};
  document.querySelectorAll(".answer-area input").forEach((input) => {
    state.answers[`${input.dataset.problem}-${input.dataset.answer}`] = input.value;
  });
  document.querySelectorAll(".answer-area textarea").forEach((textarea) => {
    if (textarea.dataset.thinking !== undefined) {
      state.answers[`think-${textarea.dataset.thinking}`] = textarea.value;
    }
  });
  const results = currentProblems.map((problem, index) => gradeProblem(problem, index));
  const correct = results.filter(Boolean).length;
  const score = Math.round((correct / currentProblems.length) * 100);
  var explanationOk;
  if (currentSubject === "english") {
    // English: check if all text answers have reasonable length
    explanationOk = currentProblems.every(function(_, index) {
      return problemAnswersHaveContent(index);
    });
  } else {
    explanationOk = currentProblems.every(function(_, index) { return explainLooksReasonable(state.answers["think-" + index] || ""); });
  }
  const mastered = score >= 85 && explanationOk;
  state.topicStatus[state.currentTopic] = {
    mastered,
    attempts: (state.topicStatus[state.currentTopic]?.attempts || 0) + 1,
    lastScore: score,
    explanationOk,
  };
  state.records.unshift({
    topic: state.currentTopic,
    score,
    correct,
    total: currentProblems.length,
    startedAt: state.session.startedAt,
    durationMinutes: Math.max(1, Math.round((Date.now() - new Date(state.session.startedAt).getTime()) / 60000)),
    time: new Date().toLocaleString("zh-CN"),
  });
  state.records = state.records.slice(0, 20);
  state.variantRound = 0;
  state.variantAnswers = {};
  state.variants = buildVariants(results, !mastered);
  updateGame(score, mastered);
  renderFeedback(results);
  renderDiagnosis(results);
  renderVariants();
  renderHistory();
  renderCounts();
  $("topicStatus").textContent = mastered ? "已掌握" : "需巩固";
  renderNav();
  save();
}

function explainLooksReasonable(raw) {
  const text = String(raw || "").trim();
  return text.length >= 10 && /(相加|相减|速度和|速度差|路程|时间|相向|追上|追及|相背)/.test(text);
}

function problemAnswersHaveContent(index) {
  return currentProblems[index].answers.some(function(_, answerIndex) {
    var raw = String(state.answers[index + "-" + answerIndex] || "").trim();
    return raw.length >= 2;
  });
}

function gradeProblem(problem, index) {
  // Use English grading if applicable
  if (currentSubject === "english" && window.gradeEnglishAnswer) {
    return problem.answers.every(function(answer, answerIndex) {
      var raw = String(state.answers[index + "-" + answerIndex] || "").trim();
      return window.gradeEnglishAnswer(answer, raw);
    });
  }
  return problem.answers.every((answer, answerIndex) => {
    const raw = String(state.answers[`${index}-${answerIndex}`] || "").trim();
    if (answer.type === "text") return answer.keywords.some((word) => raw.includes(word));
    const value = Number(raw.replace(/[^0-9./-]/g, ""));
    const numericCorrect = raw.includes("/") && !raw.includes(".")
      ? (() => { const [a, b] = raw.split("/").map(Number); return b && Math.abs(a / b - answer.value) <= answer.tolerance; })()
      : Number.isFinite(value) && Math.abs(value - answer.value) <= answer.tolerance;
    if (numericCorrect && answer.unit && !raw.includes(answer.unit)) {
      state.unitIssues[`${index}-${answerIndex}`] = `答案对了，但单位“${answer.unit}”漏了。`;
      return false;
    }
    if (raw.includes("/") && !raw.includes(".")) {
      const [a, b] = raw.split("/").map(Number);
      return b && Math.abs(a / b - answer.value) <= answer.tolerance;
    }
    return Number.isFinite(value) && Math.abs(value - answer.value) <= answer.tolerance;
  });
}

function renderFeedback(results) {
  document.querySelectorAll(".problem-card").forEach((card, index) => {
    const feedback = card.querySelector(".problem-feedback");
    var label = currentSubject === "english" ? "Good job! " : "答对了。";
    var retryLabel = currentSubject === "english" ? "Try again. Hint: " : "再想想。提示：";
    feedback.className = `problem-feedback show ${results[index] ? "ok" : "bad"}`;
    const unitIssue = Object.values(state.unitIssues || {}).find((text) => text);
    feedback.textContent = results[index] ? label + currentProblems[index].insight : unitIssue || retryLabel + currentProblems[index].insight;
  });
}

function renderDiagnosis(results) {
  results = results || null;
  const status = state.topicStatus[state.currentTopic];
  if (!status) {
    $("scoreBadge").textContent = "待提交";
    $("diagnosisBody").className = "empty-state";
    $("diagnosisBody").textContent = "完成题目后提交。";
    return;
  }
  $("scoreBadge").textContent = status.lastScore + "分";
  const wrongCount = results ? results.filter(function(ok) { return !ok; }).length : Math.max(0, currentProblems.length - Math.round((status.lastScore / 100) * currentProblems.length));
  $("diagnosisBody").className = "";
  if (currentSubject === "english") {
    $("diagnosisBody").innerHTML = status.mastered
      ? "<p><strong>Great! 可以进入下一单元。</strong></p><p>词汇、句型、语法都掌握得很好，继续保持！</p>"
      : "<p><strong>需要更多练习。</strong></p><p>本轮约有 " + wrongCount + " 道题需要复盘。" + (status.explanationOk ? "每题都有作答，但还需要提高准确率。" : "请确保每道题都认真作答。") + "</p>";
  } else {
    $("diagnosisBody").innerHTML = status.mastered
      ? "<p><strong>可以进入下一知识点。</strong></p><p>本轮表现稳定，而且每题都写出了等量关系。</p>"
      : "<p><strong>需要举一反三。</strong></p><p>本轮约有 " + wrongCount + " 道题需要复盘。" + (status.explanationOk ? "答案基本对，但还要继续检查题型变化。" : "还需要写清\"谁走了多少、谁和谁相加或相减\"。") + "</p>";
  }
}

function buildVariants(results, focusWrong) {
  // Use English variant builder if applicable
  if (currentSubject === "english") {
    return buildEnglishVariants(results, focusWrong);
  }
  const wrongIndexes = results
    .map((ok, index) => ({ ok, index }))
    .filter((item) => !item.ok)
    .map((item) => item.index);
  const sourceIndexes = focusWrong && wrongIndexes.length ? wrongIndexes : currentProblems.slice(-4).map((_, index, list) => currentProblems.length - list.length + index);
  return sourceIndexes.slice(0, 4).map((problemIndex, index) => makeVariant(currentProblems[problemIndex], problemIndex, index));
}

function buildEnglishVariants(results, focusWrong) {
  var wrongIndexes = [];
  results.forEach(function(ok, index) { if (!ok) wrongIndexes.push(index); });
  var sourceIndexes = focusWrong && wrongIndexes.length ? wrongIndexes : currentProblems.slice(-2).map(function(_, index, list) { return currentProblems.length - list.length + index; });
  var round = (state.variantRound || 0) + 1;
  return sourceIndexes.slice(0, 3).map(function(problemIndex, index) {
    if (window.makeEnglishVariant) {
      return window.makeEnglishVariant(currentProblems[problemIndex], index, round);
    }
    return makeVariant(currentProblems[problemIndex], problemIndex, index);
  });
}

function makeVariant(problem, problemIndex, variantIndex) {
  const round = state.variantRound + 1;
  if (state.currentTopic === "相遇问题") {
    return makeMeetingVariant(problem.variantSeed, round, variantIndex);
  }
  const answer = problem.answers[0];
  const number = answer.type === "number" ? answer.value : null;
  const extra = number !== null ? `原题答案附近再换一个数字，正确结果应接近${number}。` : `先说清${problem.type}的关键关系，再写答案。`;
  return {
    title: `第${round}轮追练：${problem.type}`,
    text: `${problem.text}
追练要求：${extra}`,
    answer,
    hint: problem.insight,
  };
}

function makeMeetingVariant(seed, round, index) {
  const variants = {
    "同时相向": {
      text: `小明和小华从相距${900 + round * 60}米的两地同时相向而行，小明每分钟走${70 + index * 5}米，小华每分钟走${50 + index * 5}米。几分钟后相遇？`,
      answer: numberAnswer((900 + round * 60) / ((70 + index * 5) + (50 + index * 5)), "分钟", 0.02),
      hint: "相向而行时，两人每分钟走的路程要相加。",
    },
    "延迟出发": {
      text: `甲车先从A地出发，每小时${60 + index * 10}千米。1小时后乙车从B地出发，每小时${80 + index * 10}千米，两地相距${400 + round * 20}千米，相向而行。乙车出发后几小时相遇？`,
      answer: numberAnswer(((400 + round * 20) - (60 + index * 10)) / ((60 + index * 10) + (80 + index * 10)), "小时", 0.02),
      hint: "先扣掉甲车提前走的路程，再用剩余路程除以速度和。",
    },
    "相背而行": {
      text: `两艘小船从同一港口同时向相反方向行驶，速度分别为每小时${24 + index * 4}千米和${30 + index * 4}千米。几小时后相距${270 + round * 30}千米？`,
      answer: numberAnswer((270 + round * 30) / ((24 + index * 4) + (30 + index * 4)), "小时", 0.02),
      hint: "相背而行时，两船距离增加的速度是速度和。",
    },
    "同向追及": {
      text: `小林先从起点出发，每分钟走${120 + index * 10}米。${6 + round}分钟后小川从同一起点出发，每分钟走${220 + index * 10}米。小川出发后几分钟追上小林？`,
      answer: numberAnswer(((120 + index * 10) * (6 + round)) / ((220 + index * 10) - (120 + index * 10)), "分钟", 0.02),
      hint: "追及问题先求领先路程，再除以速度差。",
    },
    "停留": {
      text: `A、B两地相距${30 + round * 3}千米。哥哥每小时骑${10 + index * 2}千米，妹妹每小时走${4 + index}千米。妹妹出发后停留半小时再继续，两人同时相向出发。几小时后相遇？`,
      answer: numberAnswer(((30 + round * 3) - ((4 + index) * 0.5)) / ((10 + index * 2) + (4 + index)), "小时", 0.02),
      hint: "停留的人少走了一段路，要先把这段路扣掉。",
    },
    "折返": {
      text: `甲、乙两地相距${240 + round * 20}千米。小车从甲地出发，每小时${60 + index * 5}千米；货车从乙地出发，每小时${40 + index * 5}千米。小车到乙地后立即折返。小车出发后几小时第一次追上货车？`,
      answer: numberAnswer((240 + round * 20) / (60 + index * 5), "小时", 0.02),
      hint: "先看小车到乙地用了多久，这时货车刚好也到甲地。",
    },
    "环形相向": {
      text: `环形跑道一圈${540 + round * 30}米。甲、乙从同一点同时反向跑，速度分别为每分钟${90 + index * 5}米和${60 + index * 5}米。几分钟后第一次相遇？`,
      answer: numberAnswer((540 + round * 30) / ((90 + index * 5) + (60 + index * 5)), "分钟", 0.02),
      hint: "环形相向第一次相遇时，两人合跑一圈。",
    },
    "环形追及": {
      text: `环形跑道一圈${360 + round * 40}米。甲、乙从同一点同向出发，甲每分钟${110 + index * 5}米，乙每分钟${70 + index * 5}米。甲几分钟后第一次追上乙？`,
      answer: numberAnswer((360 + round * 40) / ((110 + index * 5) - (70 + index * 5)), "分钟", 0.02),
      hint: "环形追及第一次追上时，快者比慢者多跑一圈。",
    },
    "速度变化": {
      text: `两地相距${180 + round * 18}千米。甲车前1小时每小时${50 + index * 4}千米，之后每小时${60 + index * 4}千米；乙车一直每小时${46 + index * 3}千米，同时相向而行。几小时后相遇？`,
      answer: numberAnswer(1 + ((180 + round * 18) - ((50 + index * 4) + (46 + index * 3))) / ((60 + index * 4) + (46 + index * 3)), "小时", 0.02),
      hint: "速度变化要分段计算。",
    },
    "往返第二次": {
      text: `一条直路长${840 + round * 60}米。小明和爸爸从两端同时出发相向而行，速度分别为每分钟${70 + index * 5}米和${110 + index * 5}米。第一次相遇后继续走到对端再返回。出发后几分钟第二次相遇？`,
      answer: numberAnswer(((840 + round * 60) * 3) / ((70 + index * 5) + (110 + index * 5)), "分钟", 0.02),
      hint: "第二次相遇时，两人合走3个全长。",
    },
  };
  const item = variants[seed] || variants["同时相向"];
  return { title: `第${round}轮追练：${seed}`, text: item.text, answer: item.answer, hint: item.hint, variantSeed: seed };
}

function renderVariants() {
  $("variantBadge").textContent = String(state.variants.length);
  $("variantList").innerHTML = state.variants.length
    ? state.variants.map((item, index) => {
        const saved = state.variantAnswers[index] || "";
        return `<div class="variant-item"><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.text)}</p><input class="variant-answer" data-variant="${index}" value="${escapeHtml(saved)}" placeholder="写答案或说明理由" /><div class="variant-feedback" id="variantFeedback${index}"></div></div>`;
      }).join("") + `<div class="variant-note">错题会继续生成下一轮追练，直到本轮全部答对。</div><div class="variant-actions"><button class="tool-button" type="button" id="submitVariantsBtn">提交追练</button></div>`
    : `<div class="empty-state">提交后会根据结果生成追练题。</div>`;
  $("variantList").querySelectorAll(".variant-answer").forEach((input) => input.addEventListener("input", (event) => {
    state.variantAnswers[event.currentTarget.dataset.variant] = event.currentTarget.value;
    save();
  }));
  $("variantList").querySelectorAll(".variant-answer").forEach((input) => {
    input.addEventListener("focus", hidePlaceholderWhileTyping);
    input.addEventListener("blur", restorePlaceholderAfterTyping);
  });
  const button = $("submitVariantsBtn");
  if (button) button.addEventListener("click", submitVariants);
}

function submitVariants() {
  const results = state.variants.map((item, index) => gradeVariant(item, index));
  const wrong = results.filter(function(ok) { return !ok; }).length;
  state.variants.forEach((item, index) => {
    const feedback = $(`variantFeedback${index}`);
    if (!feedback) return;
    feedback.className = `variant-feedback ${results[index] ? "ok" : "bad"}`;
    var okLabel = currentSubject === "english" ? "Correct! " : "答对了。";
    var retryLabel = currentSubject === "english" ? "Keep trying. Hint: " : "还需要再练。提示：";
    feedback.textContent = results[index] ? okLabel + item.hint : retryLabel + item.hint;
  });
  if (wrong === 0) {
    state.variantRound += 1;
    state.variantAnswers = {};
    state.variants = state.variants.map(function(item, index) { return makeFollowUpVariant(item, index); });
    setTimeout(function() { renderVariants(); }, 900);
  } else {
    const next = state.variants.filter(function(_, index) { return !results[index]; });
    state.variantRound += 1;
    state.variantAnswers = {};
    state.variants = next.map(function(item, index) { return makeFollowUpVariant(item, index); });
    setTimeout(function() { renderVariants(); }, 1200);
  }
  save();
}

function gradeVariant(item, index) {
  const raw = String(state.variantAnswers[index] || "").trim();
  const answer = item.answer;
  if (currentSubject === "english" && window.gradeEnglishAnswer) {
    return window.gradeEnglishAnswer(answer, raw);
  }
  if (answer.type === "text") return answer.keywords.some(function(word) { return raw.includes(word); });
  const value = Number(raw.replace(/[^0-9./-]/g, ""));
  if (raw.includes("/") && !raw.includes(".")) {
    const [a, b] = raw.split("/").map(Number);
    return b && Math.abs(a / b - answer.value) <= answer.tolerance;
  }
  return Number.isFinite(value) && Math.abs(value - answer.value) <= answer.tolerance;
}

function makeFollowUpVariant(item, index) {
  if (currentSubject === "english") {
    if (window.makeEnglishFollowUpVariant) {
      return window.makeEnglishFollowUpVariant(item, state.variantRound + 1);
    }
    return item;
  }
  if (state.currentTopic === "相遇问题") {
    return makeMeetingVariant(item.variantSeed || "同时相向", state.variantRound + 1, index);
  }
  return {
    ...item,
    title: `第${state.variantRound + 1}轮追练：${item.title.replace(/^第\d+轮追练：/, "")}`,
  };
}

function updateGame(score, mastered) {
  const today = todayKey();
  if (game.lastStudyDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    game.streak = game.lastStudyDate === yesterday ? game.streak + 1 : 1;
    game.lastStudyDate = today;
  }
  game.stars += Math.max(1, Math.round(score / 20));
  game.points += Math.max(4, Math.round(score / 10) + (mastered ? 4 : 0));
  if (mastered && !game.badges.includes(state.currentTopic)) game.badges.push(state.currentTopic);
  game.topicAttempts[state.currentTopic] = (game.topicAttempts[state.currentTopic] || 0) + 1;
}

function renderGame() {
  document.querySelector(".streak-count").textContent = String(game.streak);
  document.querySelector(".star-count").textContent = String(game.stars);
  var tasks;
  if (currentSubject === "english") {
    tasks = [
      state.topicStatus[state.currentTopic]?.attempts ? "今日已练" : "完成1次练习",
      game.badges.includes(state.currentTopic) ? "已拿徽章" : "冲刺85分",
    ];
  } else {
    tasks = [
      state.topicStatus[state.currentTopic]?.attempts ? "今日已练" : "完成1次练习",
      state.photos.length ? "已上传作答" : "上传草稿照片",
      game.badges.includes(state.currentTopic) ? "已拿徽章" : "冲刺85分",
    ];
  }
  $("dailyTasks").innerHTML = tasks.map(function(task) { return "<span>" + task + "</span>"; }).join("");
  renderRewards();
}

function renderRewards() {
  if (currentSubject === "english") {
    renderBadmintonRewards();
  } else {
    renderShoeRewards();
  }
}

function renderShoeRewards() {
  var shoeEl = $("shoePoints");
  if (shoeEl) shoeEl.textContent = game.points + "分";
  const earned = shoeRewards.filter(function(reward) { return game.points >= reward.points; });
  const next = shoeRewards.find(function(reward) { return game.points < reward.points; });
  if (!next) {
    $("rewardProgress").innerHTML = "<strong>🏆 已解锁全部球鞋奖励！</strong><span>你已经完成冠军级训练。</span>";
  } else {
    const gap = next.points - game.points;
    const percent = Math.max(0, Math.min(100, (game.points / next.points) * 100));
    $("rewardProgress").innerHTML = `<div class="reward-track"><span style="width:${percent}%"></span></div><strong>距离 ${next.name} 还差 ${gap} 分</strong><span>再完成一轮练习就更接近新球鞋。</span>`;
  }
  $("rewardWall").innerHTML = shoeRewards.map(function(reward) {
    const unlocked = game.points >= reward.points;
    const gap = Math.max(0, reward.points - game.points);
    return `<div class="shoe-card ${unlocked ? "unlocked" : "locked"}">
      <div class="shoe-art" style="--shoe:${reward.color};--accent:${reward.accent}"><img src="${reward.image}" alt="${escapeHtml(reward.name)}" /><span></span></div>
      <div><strong>${escapeHtml(reward.name)}</strong><small>${escapeHtml(reward.subtitle)}</small><em>${unlocked ? "已解锁" : "还差" + gap + "分"}</em></div>
    </div>`;
  }).join("");
}

function renderBadmintonRewards() {
  var batEl = $("badmintonPoints");
  if (batEl) batEl.textContent = game.points + "分";
  const earned = badmintonRewards.filter(function(reward) { return game.points >= reward.points; });
  const next = badmintonRewards.find(function(reward) { return game.points < reward.points; });
  var progressEl = $("badmintonProgress");
  if (!next) {
    if (progressEl) progressEl.innerHTML = "<strong>🏆 已解锁全部羽毛球拍奖励！</strong><span>你是英语学习冠军！</span>";
  } else {
    const gap = next.points - game.points;
    const percent = Math.max(0, Math.min(100, (game.points / next.points) * 100));
    if (progressEl) progressEl.innerHTML = `<div class="reward-track"><span style="width:${percent}%"></span></div><strong>距离 ${next.name} 还差 ${gap} 分</strong><span>继续完成练习解锁新装备！</span>`;
  }
  var wallEl = $("badmintonWall");
  if (wallEl) wallEl.innerHTML = badmintonRewards.map(function(reward) {
    const unlocked = game.points >= reward.points;
    const gap = Math.max(0, reward.points - game.points);
    return `<div class="shoe-card ${unlocked ? "unlocked" : "locked"}">
      <div class="shoe-art badminton-art" style="--shoe:${reward.color};--accent:${reward.accent}">
        <img src="${reward.image}" alt="${escapeHtml(reward.name)}" />
      </div>
      <div><strong>${escapeHtml(reward.name)}</strong><small>${escapeHtml(reward.subtitle)}</small><em>${unlocked ? "已解锁" : "还差" + gap + "分"}</em></div>
    </div>`;
  }).join("");
}

function renderCounts() {
  const statuses = Object.values(state.topicStatus);
  $("masteredCount").textContent = statuses.filter(function(item) { return item.mastered; }).length;
  $("reviewCount").textContent = statuses.filter(function(item) { return item.attempts && !item.mastered; }).length;
  if ($("photoCount")) $("photoCount").textContent = state.photos.length;
}

function renderHistory() {
  $("historyList").innerHTML = state.records.length
    ? state.records.map(function(record) { return `<div class="history-item"><strong>${escapeHtml(record.topic)}：${record.score}分</strong><p>${record.time}，${record.correct}/${record.total}题正确</p></div>`; }).join("")
    : `<div class="empty-state">还没有学习记录。</div>`;
}

function handlePhotos(event) {
  const files = Array.from(event.target.files || []);
  files.forEach((file) => {
    const reader = new FileReader();
    reader.onload = () => {
      state.photos.unshift({ name: file.name, data: reader.result, time: new Date().toLocaleString("zh-CN") });
      state.photos = state.photos.slice(0, 12);
      renderPhotos();
      renderCounts();
      save();
    };
    reader.readAsDataURL(file);
  });
}

function renderPhotos() {
  $("uploadState").textContent = state.photos.length ? `已上传${state.photos.length}张` : "未上传";
  $("photoGrid").innerHTML = state.photos.length
    ? state.photos
        .map((photo, index) => `<div class="photo-thumb"><img src="${photo.data}" alt="${escapeHtml(photo.name)}" /><button type="button" data-photo="${index}">删除</button></div>`)
        .join("") + `<div class="photo-review-note">照片用于查看解题过程。系统会优先依据输入答案判断；如果答案写在照片上，请点击“查看照片答题”后把关键答案补到输入框。</div>`
    : "";
  $("photoGrid").querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.photos.splice(Number(button.dataset.photo), 1);
      renderPhotos();
      renderCounts();
      save();
    });
  });
}

function resetTopic() {
  state.answers = {};
  state.variants = [];
  state.variantAnswers = {};
  state.variantRound = 0;
  state.session = { active: false, topic: state.currentTopic, startedAt: "" };
  state.unitIssues = {};
  renderLesson();
  save();
}

function clearHistory() {
  state.records = [];
  renderHistory();
  save();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function switchSubject(subject) {
  if (subject === currentSubject) return;
  currentSubject = subject;
  localStorage.setItem(SUBJECT_KEY, JSON.stringify(currentSubject));
  // Re-init state for new subject
  initState();
  // Update tab UI
  updateSubjectTabs();
  // Update brand
  updateBrand();
  // Full re-render
  renderNav();
  renderLesson();
  renderHistory();
  renderPhotos();
  updateRewardPanels();
}

function updateSubjectTabs() {
  var mathTab = $("mathTab");
  var englishTab = $("englishTab");
  if (mathTab) {
    mathTab.className = "subject-tab" + (currentSubject === "math" ? " active" : "");
  }
  if (englishTab) {
    englishTab.className = "subject-tab" + (currentSubject === "english" ? " active" : "");
  }
}

function updateBrand() {
  var brandMark = document.querySelector(".brand-mark");
  var subjectTitle = $("subjectTitle");
  var brandP = document.querySelector(".brand p");
  if (currentSubject === "english") {
    if (brandMark) { brandMark.textContent = "英"; brandMark.className = "brand-mark english-mark"; }
    if (subjectTitle) subjectTitle.textContent = "五下英语";
    if (brandP) brandP.textContent = "外研社版";
    document.body.classList.add("english-theme");
    var encText = document.querySelector(".game-encourage-text");
    if (encText) encText.textContent = "Practice makes perfect!";
    var startBtn = $("startBtn");
    if (startBtn) startBtn.innerHTML = '<span aria-hidden="true">▶</span> 开始';
  } else {
    if (brandMark) { brandMark.textContent = "数"; brandMark.className = "brand-mark math-mark"; }
    if (subjectTitle) subjectTitle.textContent = "五下数学";
    if (brandP) brandP.textContent = "北师大版";
    document.body.classList.remove("english-theme");
    var encText2 = document.querySelector(".game-encourage-text");
    if (encText2) encText2.textContent = "思考让大脑更聪明！";
    var startBtn2 = $("startBtn");
    if (startBtn2) startBtn2.innerHTML = '<span aria-hidden="true">▶</span> 开始';
  }
  // Photos only for math
  var photoSection = document.querySelector(".upload-panel");
  if (photoSection) photoSection.style.display = currentSubject === "math" ? "" : "none";
  var photoReviewBtn = $("reviewPhotoBtn");
  if (photoReviewBtn) photoReviewBtn.style.display = currentSubject === "math" ? "" : "none";
}

function init() {
  // Subject tabs
  var mathTab = $("mathTab");
  var englishTab = $("englishTab");
  if (mathTab) mathTab.addEventListener("click", function() { switchSubject("math"); });
  if (englishTab) englishTab.addEventListener("click", function() { switchSubject("english"); });
  updateSubjectTabs();
  updateBrand();

  if (!allTopicNames().includes(state.currentTopic)) {
    state.currentTopic = currentSubject === "english" ? "My Day" : "相遇问题";
  }
  $("startBtn").addEventListener("click", function() {
    state.session = { active: true, topic: state.currentTopic, startedAt: new Date().toISOString() };
    save();
    renderLesson();
  });
  $("resetBtn").addEventListener("click", resetTopic);
  $("clearHistoryBtn").addEventListener("click", clearHistory);
  var photoInput = $("photoInput");
  if (photoInput) photoInput.addEventListener("change", handlePhotos);
  var reviewBtn = $("reviewPhotoBtn");
  if (reviewBtn) reviewBtn.addEventListener("click", reviewPhotoAnswers);
  var closeBtn = $("closePhotoReviewBtn");
  if (closeBtn) closeBtn.addEventListener("click", function() { $("photoReviewDialog").close(); });
  var askAiBtn = $("askAiBtn");
  if (askAiBtn) askAiBtn.addEventListener("click", askAiHint);
  renderNav();
  renderLesson();
  renderHistory();
  renderPhotos();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("service-worker.js").catch(function() {});
}

async function askAiHint() {
  var button = $("askAiBtn");
  var question = String($("aiQuestion")?.value || "").trim();
  if (!question) {
    $("aiState").textContent = "先写问题";
    $("aiAnswer").textContent = "你可以问：这题第一步做什么？为什么这里用 at？";
    return;
  }
  button.disabled = true;
  button.textContent = "AI 思考中...";
  $("aiState").textContent = "正在回答";
  try {
    var context = `${currentSubject === "english" ? "外研社版五年级下册英语" : "北师大版五年级下册数学"}；当前知识点：${state.currentTopic}；请先给提示和追问，不要直接给完整答案。`;
    var response = await fetch("https://grade5-math-coach-api.vercel.app/api/deepseek", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: question, context: context }),
    });
    if (!response.ok) throw new Error("AI request failed");
    var data = await response.json();
    $("aiAnswer").textContent = data.answer || data.content || data.message || "AI 已收到问题，请再换一种问法试试。";
    $("aiState").textContent = "已回答";
  } catch (error) {
    $("aiState").textContent = "暂不可用";
    $("aiAnswer").textContent = "AI 服务暂时不可用。你先说说自己想到的第一步，我会根据你的思路继续提示。";
  } finally {
    button.disabled = false;
    button.textContent = "问 AI 提示";
  }
}

function askAiHint() {
  var questionEl = $("aiQuestion");
  var answerEl = $("aiAnswer");
  var stateEl = $("aiState");
  if (!questionEl || !answerEl) return;
  var question = questionEl.value.trim();
  if (!question) { answerEl.textContent = "请先输入你的问题。"; answerEl.className = "ai-answer"; return; }

  var context = currentSubject === "english"
    ? "五年级下册英语 - 当前学习：" + state.currentTopic
    : "五年级下册数学 - 当前学习：" + state.currentTopic;

  if (stateEl) stateEl.textContent = "思考中...";
  answerEl.textContent = "正在请教 AI 学习伙伴...";
  answerEl.className = "ai-answer";

  fetch("/api/deepseek", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: question, context: context, subject: currentSubject })
  })
  .then(function(resp) { return resp.json(); })
  .then(function(data) {
    if (data.answer) {
      answerEl.textContent = data.answer;
      answerEl.className = "ai-answer";
      if (stateEl) stateEl.textContent = "已回答";
    } else {
      answerEl.textContent = "AI 暂时无法回答，请稍后再试。";
      answerEl.className = "ai-answer";
      if (stateEl) stateEl.textContent = "出错";
    }
  })
  .catch(function() {
    answerEl.textContent = "网络连接失败，请检查网络后重试。";
    answerEl.className = "ai-answer";
    if (stateEl) stateEl.textContent = "离线";
  });
}

function reviewPhotoAnswers() {
  if (!state.photos.length) {
    $("uploadState").textContent = "请先上传照片";
    return;
  }
  const latest = state.photos[0];
  $("photoReviewImage").src = latest.data;
  $("photoReviewImage").alt = latest.name;
  $("photoReviewDialog").showModal();
}

init();
