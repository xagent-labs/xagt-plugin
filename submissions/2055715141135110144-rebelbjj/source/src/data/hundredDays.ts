export type SkillDetail = {
  title: string;
  english: string;
  oneLine: string;
  breakdown: string[];
  tips: string[];
  cue: string;
};

export type DungeonQuest = {
  id: string;
  title: string;
  english: string;
  days: string;
  focus: string;
  skills: string[];
  boss: string;
};

export type DungeonChapter = {
  id: string;
  title: string;
  subtitle: string;
  days: string;
  summary: string;
  quests: DungeonQuest[];
};

export type DayPlan = {
  day: number;
  key: string;
  chapterId: string;
  chapterTitle: string;
  chapterSubtitle: string;
  chapterSummary: string;
  questId: string;
  questTitle: string;
  questEnglish: string;
  questDays: string;
  suit: string;
  zone: string;
  primarySkill: string;
  supportSkill: string;
  skills: string[];
  mission: string;
  focus: string;
  oneLine: string;
  trainingBlocks: string[];
  cue: string;
  boss: string;
};

export const QUEST_STORAGE_KEY = "persona5-bjj-atlas-progress-v2";
export const DAY_STORAGE_KEY = "persona5-bjj-day-progress-v1";

export const HUNDRED_DAY_CHAPTERS: DungeonChapter[] = [
  {
    id: "chapter-1",
    title: "CHAPTER 1 / 百日筑基·一",
    subtitle: "站立、侧压、骑乘、拿背",
    days: "DAY 01-25",
    summary: "站立起步，接 top control 主线，建立最基本的进攻骨架。",
    quests: [
      {
        id: "week1-standing",
        title: "WEEK 1 / 站立 STANDING",
        english: "Standing Basics",
        days: "DAY 01-07",
        focus: "姿势、抢把、破势、受身、起身、双腿抱摔、单腿抱摔、防摔。",
        skills: [
          "姿势 posture",
          "抢把 grip fighting",
          "破势 kuzushi",
          "受身 breakfall",
          "起身 standup",
          "双腿抱摔 double leg",
          "单腿抱摔 single leg",
          "防摔 sprawl",
        ],
        boss: "完成一次 clean entry，不管最后有没有摔成。",
      },
      {
        id: "week2-side-control",
        title: "WEEK 2 / 侧压 SIDE CONTROL",
        english: "Control & Far-Side Attacks",
        days: "DAY 08-13",
        focus: "环游世界、远侧手臂进攻、侧压逃脱。",
        skills: [
          "环游世界 around the world",
          "浮固 knee on belly",
          "袈裟 scarf hold",
          "南北 north south",
          "长步转背 longstep to back",
          "美国锁 americana",
          "木村锁 kimura",
          "旋身十字固 spinning armbar",
          "虾行回防 hip escape",
          "抢腋下回防 underhook escape",
        ],
        boss: "能从 side control 连续保持 10 秒控制，不被立刻翻开。",
      },
      {
        id: "week3-mount",
        title: "WEEK 3 / 骑乘 MOUNT",
        english: "Control, Arms, Escapes",
        days: "DAY 14-19",
        focus: "低中高骑乘、骑乘拿背、美国锁、十字固、桥逃、虾逃、推膝逃。",
        skills: [
          "低中高骑乘 low/middle/high mount",
          "骑乘拿背 mount backtakes",
          "美国锁 americana",
          "十字固 mount armbar",
          "起桥 bridge escape",
          "虾行 hip escape",
          "推膝 kipping escape",
        ],
        boss: "从 mount 触发一次稳定进攻链。",
      },
      {
        id: "week4-backtake",
        title: "WEEK 4 / 拿背 BACKTAKE",
        english: "Turtle to Chokes",
        days: "DAY 20-25",
        focus: "转背、塞钩、弓箭绞、裸绞、弱侧逃脱、强侧逃脱。",
        skills: [
          "转背 go behind",
          "塞钩子 insert hooks",
          "弓箭绞 bow and arrow choke",
          "裸绞 rear naked choke",
          "弱侧逃脱 weak side escape",
          "强侧逃脱 strong side escape",
        ],
        boss: "从 turtle 拿背成功一次，并保住位置超过 5 秒。",
      },
    ],
  },
  {
    id: "chapter-2",
    title: "CHAPTER 2 / 百日筑基·二",
    subtitle: "四大过腿体系",
    days: "DAY 26-50",
    summary: "先开腿，再分四条路线推进，形成 passing palace。",
    quests: [
      {
        id: "week5-closed-pass",
        title: "WEEK 5 / 封闭式过腿",
        english: "Pass the Closed Guard",
        days: "DAY 26-31",
        focus: "跪姿开腿、站姿开腿、斯巴达式、压膝过腿、单腿压制。",
        skills: [
          "跪姿 open the guard on knees",
          "站姿 open the guard on feet",
          "斯巴达式 Sparta (one knee in middle)",
          "压膝过腿 knee pin pass",
          "单腿压制 single under pass",
        ],
        boss: "从 closed guard 里稳定打开一次。",
      },
      {
        id: "week6-outside-pass",
        title: "WEEK 6 / 外侧过腿",
        english: "Outside Pass",
        days: "DAY 32-37",
        focus: "斗牛过腿、拖腿过腿、南北过腿。",
        skills: [
          "斗牛 bull fight pass",
          "拖腿 leg drag pass",
          "南北过腿 north south pass",
        ],
        boss: "从 open guard 外侧绕过一次并压住上身。",
      },
      {
        id: "week7-inside-pass",
        title: "WEEK 7 / 内侧过腿",
        english: "Inside Pass",
        days: "DAY 38-43",
        focus: "抢腋下切膝、猎头切膝、外切、切膝、长步、压平半防过腿。",
        skills: [
          "抢腋下切膝 underhook kneecut",
          "猎头式切膝 headhunter kneecut",
          "外切 outside kneecut",
          "切膝 kneecut",
          "长步 longstep",
          "压平半防过腿 flat half guard pass",
        ],
        boss: "找到一条你最顺手的切膝主线。",
      },
      {
        id: "week8-stack-pass",
        title: "WEEK 8 / 压制过腿",
        english: "Stack Pass",
        days: "DAY 44-50",
        focus: "折叠过腿、双腿压制、双腋压制。",
        skills: [
          "折叠过腿 double ankle stack",
          "双腿压制 stack pass",
          "双腋压制 double under pass",
        ],
        boss: "在 pressure pass 里低髋重胸完成一次推进。",
      },
    ],
  },
  {
    id: "chapter-3",
    title: "CHAPTER 3 / 百日筑基·三",
    subtitle: "半防、封闭防守、开放防守",
    days: "DAY 51-75",
    summary: "先学封闭防守，再开到开放防守和半防，补完整个下位生存与反攻系统。",
    quests: [
      {
        id: "week9-closed-guard-a",
        title: "WEEK 9 / 封闭防守上",
        english: "Closed Guard A",
        days: "DAY 51-56",
        focus: "圈臂攻击、三角、肩胛固、断头台、木村、坐起扫。",
        skills: [
          "圈臂 overhook attacks",
          "三角 triangle",
          "肩胛固 omoplata",
          "断头台 guillotine",
          "木村锁 kimura",
          "坐起扫 sit up sweep",
        ],
        boss: "从 closed guard 打出一个完整威胁链。",
      },
      {
        id: "week10-closed-guard-b",
        title: "WEEK 10 / 封闭防守下",
        english: "Closed Guard B",
        days: "DAY 57-62",
        focus: "侧封闭、guard 十字固、爬背、高手十字固、双根扫、侍者扫。",
        skills: [
          "侧封闭 side closed guard",
          "十字固 guard armbar",
          "爬背 backtake",
          "高位十字固 high armbar",
          "双根扫 double ankle sweep",
          "侍者扫 waiter sweep",
        ],
        boss: "别人站起来时，不慌，能切到 sweep 线。",
      },
      {
        id: "week11-open-guard",
        title: "WEEK 11 / 开放防守",
        english: "Open Guard",
        days: "DAY 63-69",
        focus: "四道防线、回防练习、上下半身 guard、三角架扫。",
        skills: [
          "guard 四道防线 the 4 layers of guard defense",
          "回防练习 guard recovery drills",
          "guard 上半身和下半身 upperbody guard vs lowerbody guard",
          "三角架扫 tripod sweep",
        ],
        boss: "被过腿时能先守住至少两层防线。",
      },
      {
        id: "week12-half-guard",
        title: "WEEK 12 / 半防守",
        english: "Half Guard",
        days: "DAY 70-75",
        focus: "半防概念、拿背、斗狗、回翻扫。",
        skills: [
          "半防基本概念 concept",
          "拿背 underhook backtake",
          "斗狗 dogfight",
          "回翻扫 backward sweep",
        ],
        boss: "从 half guard 成功抢一次下钩。",
      },
    ],
  },
  {
    id: "chapter-4",
    title: "CHAPTER 4 / INTEGRATION RAID",
    subtitle: "整合副本",
    days: "DAY 76-90",
    summary: "把已有路线串联成能在 rolling 里启动的主线。",
    quests: [
      {
        id: "raid-a",
        title: "RAID A / 站立到压制",
        english: "Entry to Pin",
        days: "DAY 76-80",
        focus: "Entry、Takedown、Pass、Side Control 串联。",
        skills: ["Entry → Takedown", "Takedown → Pass", "Pass → Side Control"],
        boss: "从站立进到上位压制，完成一条完整路线。",
      },
      {
        id: "raid-b",
        title: "RAID B / Guard 到扫技",
        english: "Guard to Sweep",
        days: "DAY 81-85",
        focus: "Closed guard、Open guard、Half guard 的扫技主线整合。",
        skills: ["Closed guard sweep chain", "Tripod / Double ankle sweep", "Half guard dogfight route"],
        boss: "从下位主动扫倒一次并保持上位。",
      },
      {
        id: "raid-c",
        title: "RAID C / 控制到降服",
        english: "Pin to Finish",
        days: "DAY 86-90",
        focus: "Side control、Mount、Back 的终结入口整合。",
        skills: ["Americana / Kimura chain", "Mount armbar chain", "Rear naked choke / Bow and arrow"],
        boss: "从控制位成功打出一次完整终结尝试。",
      },
    ],
  },
  {
    id: "chapter-5",
    title: "CHAPTER 5 / BOSS RUSH",
    subtitle: "最终结算",
    days: "DAY 91-100",
    summary: "复盘、查漏、验证，完成百日闭环。",
    quests: [
      {
        id: "boss-1",
        title: "BOSS 1 / 日志复盘",
        english: "Training Review",
        days: "DAY 91-93",
        focus: "回看哪条路线最顺、哪条最卡、哪条还只是知道不会做。",
        skills: ["Review 12 weeks", "Mark weak points", "Pick 1 A-game path"],
        boss: "写出自己的 A-game 主线和保命主线。",
      },
      {
        id: "boss-2",
        title: "BOSS 2 / 定位对抗",
        english: "Positional Spar",
        days: "DAY 94-96",
        focus: "从 bad positions 和 good positions 分别开始定位滚动。",
        skills: ["Positional spar", "Start in bad positions", "Start in good positions"],
        boss: "坏位置先活下来，好位置先保住。",
      },
      {
        id: "boss-3",
        title: "FINAL BOSS / 百日结算",
        english: "100-Day Clear",
        days: "DAY 97-100",
        focus: "完整 rolling、录像、复盘、规划下一阶段。",
        skills: ["Full rounds rolling", "Video review", "Next chapter planning"],
        boss: "完成一次看得见自己路线的 rolling。",
      },
    ],
  },
];

export const DUNGEON_SKILL_DETAILS: Record<string, SkillDetail> = {
  "姿势 posture": {
    title: "姿势",
    english: "Posture",
    oneLine: "先把头、髋、脚排成能攻能退的结构。",
    breakdown: ["头不过度前冲。", "膝微屈。", "双脚能切换前后重心。"],
    tips: ["姿势是所有站立的起点。", "站太高容易被抱腿。"],
    cue: "先稳姿势，再谈进攻。",
  },
  "抢把 grip fighting": {
    title: "抢把",
    english: "Grip Fighting",
    oneLine: "先赢手位，再赢动作。",
    breakdown: ["先拆对手 grip。", "拿到控制。", "带着控制进入下一步。"],
    tips: ["抢把本身就是站立节奏。", "先破再抢通常更稳。"],
    cue: "先赢手，再赢摔。",
  },
  "破势 kuzushi": {
    title: "破势",
    english: "Kuzushi",
    oneLine: "先让对手重心漂起来，摔法才会变轻。",
    breakdown: ["制造失衡。", "手和身体一起引导。", "对手未补脚前立刻进入。"],
    tips: ["没有破势就会硬撞。", "节奏比力大更关键。"],
    cue: "先摇重心，再进路线。",
  },
  "双腿抱摔 double leg": {
    title: "双腿抱摔",
    english: "Double Leg",
    oneLine: "直线穿进去收双腿，是最直接的进入线。",
    breakdown: ["先降重心。", "穿步抱双腿。", "肩和头持续向前顶。"],
    tips: ["半进半退最危险。", "落地后立刻接上位。"],
    cue: "低进、抱满、穿透。",
  },
  "单腿抱摔 single leg": {
    title: "单腿抱摔",
    english: "Single Leg",
    oneLine: "抓住一条腿，像掀地基一样拆人。",
    breakdown: ["走到外侧。", "抱稳单腿。", "跑管或转角放倒。"],
    tips: ["头位别送 guillotine。", "先稳再摔。"],
    cue: "先抱稳，再放倒。",
  },
  "防摔 sprawl": {
    title: "防摔",
    english: "Sprawl",
    oneLine: "别人抱腿时，把髋往后砸下去。",
    breakdown: ["髋后撤。", "腿拉长。", "胸口压头肩。"],
    tips: ["别站着给人抱实。", "髋反应速度最关键。"],
    cue: "腿撤开，髋砸下。",
  },
  "环游世界 around the world": {
    title: "环游世界",
    english: "Around the World",
    oneLine: "理解 side control 到 north-south 再到另一侧的流动控制。",
    breakdown: ["从一侧 side control 开始。", "转 north-south。", "继续转另一边。"],
    tips: ["转位时胸压不能掉。", "脚步帮你保持平衡。"],
    cue: "转位置，不丢压。",
  },
  "浮固 knee on belly": {
    title: "浮固",
    english: "Knee on Belly",
    oneLine: "用膝压腹逼出反应，再借反应升级位置。",
    breakdown: ["膝压腹。", "另一腿远支。", "手控头髋。"],
    tips: ["不是休息位。", "底盘一定要大。"],
    cue: "先逼反应，再换位。",
  },
  "美国锁 americana": {
    title: "美国锁",
    english: "Americana",
    oneLine: "把手臂压成 L 型，从外侧卷肩。",
    breakdown: ["手腕钉地。", "另一手穿进去抓自己。", "抬肘卷肩。"],
    tips: ["先让肘离开身体。", "压制位要先稳。"],
    cue: "压手抬肘，卷肩关门。",
  },
  "木村锁 kimura": {
    title: "木村锁",
    english: "Kimura",
    oneLine: "先把肘拔开，再用 figure four 锁住肩线。",
    breakdown: ["抓腕。", "穿手形成四字。", "抬肘带腕。"],
    tips: ["很多时候它先是控制系统。", "别急着硬掰。"],
    cue: "先拔肘，再锁四字。",
  },
  "十字固 mount armbar": {
    title: "骑乘十字固",
    english: "Mount Armbar",
    oneLine: "从 mount 把手臂抬过肩线，再切成经典关节终结。",
    breakdown: ["把手过肩。", "转髋过头。", "夹肩抬髋。"],
    tips: ["不稳时别急着躺。", "膝线比后仰更重要。"],
    cue: "先高位，再折肘。",
  },
  "起桥 bridge escape": {
    title: "桥逃",
    english: "Bridge Escape",
    oneLine: "先困住一边手脚，再把人整个人翻掉。",
    breakdown: ["先困一边。", "桥到肩。", "顺势翻身。"],
    tips: ["桥要向肩。", "没困住手脚很难翻。"],
    cue: "先困一边，再桥翻。",
  },
  "虾行 hip escape": {
    title: "虾行",
    english: "Hip Escape",
    oneLine: "先把髋拉开，空间出来了，腿才回得来。",
    breakdown: ["建立框架。", "髋向后缩。", "膝插回防线。"],
    tips: ["不是只动脚。", "空间来自髋。"],
    cue: "先拉空间，再回腿。",
  },
  "转背 go behind": {
    title: "转背",
    english: "Go Behind",
    oneLine: "绕到背后，不跟正面力量硬拼。",
    breakdown: ["让对手支撑在前。", "你绕到侧后。", "控制髋和肩。"],
    tips: ["脚步要轻。", "别在正面停住。"],
    cue: "避开正门，绕到背后。",
  },
  "弓箭绞 bow and arrow choke": {
    title: "弓箭绞",
    english: "Bow and Arrow Choke",
    oneLine: "一手拉领，一手拉身，像拉弓一样把脖子和身体分开。",
    breakdown: ["拿深领。", "抓腿或裤。", "侧向拉开形成绞。"],
    tips: ["深领是前提。", "侧拉比直拉更紧。"],
    cue: "领口深，拉弓开。",
  },
  "裸绞 rear naked choke": {
    title: "裸绞",
    english: "Rear Naked Choke",
    oneLine: "最直接的背后终结，前提是背后位置先坐稳。",
    breakdown: ["seatbelt 稳住。", "前臂滑喉。", "抓二头肌扩胸。"],
    tips: ["位置先于降服。", "别只用手臂掐。"],
    cue: "先背稳，再扩胸。",
  },
};

const QUEST_MODES = [
  "TECH STUDY / 技术拆解",
  "FLOW ROUTE / 路线流动",
  "POSITIONAL SPAR / 定位对练",
  "CHAIN BUILD / 连招拼接",
  "REVIEW LOOP / 复盘回放",
];

const ZONE_NAMES: Record<string, string> = {
  "chapter-1": "CASTLE OF ENTRY",
  "chapter-2": "PASSING PALACE",
  "chapter-3": "GUARD MAZE",
  "chapter-4": "INTEGRATION LINE",
  "chapter-5": "FINAL EXAM",
};

const CHAPTER_SUITS: Record<string, string> = {
  "chapter-1": "♠",
  "chapter-2": "♦",
  "chapter-3": "♣",
  "chapter-4": "♥",
  "chapter-5": "★",
};

const parseDayRange = (value: string) => {
  const match = value.match(/DAY\s*(\d+)(?:-(\d+))?/i);
  if (!match) return [];

  const start = Number(match[1]);
  const end = Number(match[2] ?? match[1]);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
};

const buildBlocks = (primarySkill: string, supportSkill: string, quest: DungeonQuest, dayIndex: number) => [
  `Warm-Up / 用 5 分钟把 ${primarySkill} 的起手动作做慢练。`,
  `Main Route / 主练 ${primarySkill}，再接 ${supportSkill} 做两段连线。`,
  `Pressure Test / 从 ${quest.english} 情境出发，做 2 到 3 轮定位对练。`,
  `Log Note / 记下今天最顺的一次进入，以及最容易断掉的地方。`,
  dayIndex % 3 === 0
    ? `Bonus Rep / 做 1 轮轻强度 flow roll，把 ${quest.focus} 串起来。`
    : `Boss Check / 结束前尝试完成：${quest.boss}`,
];

export const DAY_PLANS: DayPlan[] = HUNDRED_DAY_CHAPTERS.flatMap((chapter) =>
  chapter.quests.flatMap((quest) => {
    const days = parseDayRange(quest.days);
    return days.map((day, dayIndex) => {
      const primarySkill = quest.skills[dayIndex % quest.skills.length];
      const supportSkill = quest.skills[(dayIndex + 1) % quest.skills.length] ?? primarySkill;
      const detail = DUNGEON_SKILL_DETAILS[primarySkill];

      return {
        day,
        key: `day-${day}`,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        chapterSubtitle: chapter.subtitle,
        chapterSummary: chapter.summary,
        questId: quest.id,
        questTitle: quest.title,
        questEnglish: quest.english,
        questDays: quest.days,
        suit: CHAPTER_SUITS[chapter.id] ?? "♠",
        zone: ZONE_NAMES[chapter.id] ?? "MAIN ROUTE",
        primarySkill,
        supportSkill,
        skills: quest.skills,
        mission: QUEST_MODES[(day - 1) % QUEST_MODES.length],
        focus: quest.focus,
        oneLine:
          detail?.oneLine ??
          `把 ${primarySkill} 放进 ${quest.english} 的主线里，练到能自然接出下一步。`,
        trainingBlocks: buildBlocks(primarySkill, supportSkill, quest, dayIndex),
        cue: detail?.cue ?? `今天先把 ${primarySkill} 做顺，再去追求速度。`,
        boss: quest.boss,
      };
    });
  }),
);

export const getDayPlan = (day: number) =>
  DAY_PLANS.find((plan) => plan.day === day) ?? DAY_PLANS[0];
