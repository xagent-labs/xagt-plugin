import {
  Crosshair,
  Flame,
  Shield,
  Swords,
  TimerReset,
} from "lucide-react";

export type Section = {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  icon: typeof Crosshair;
  items: string[];
};

export type Mission = {
  code: string;
  title: string;
  detail: string;
  reward: string;
  difficulty: string;
};

export type LogEntry = {
  day: string;
  title: string;
  focus: string;
  result: string;
};

export const STORAGE_KEY = "bjj-phantom-progress-v1";

export const SECTIONS: Section[] = [
  {
    id: "standing",
    code: "01",
    title: "STANDING",
    subtitle: "ENTRY / FEINT / SHOOT",
    icon: Crosshair,
    items: [
      "Stance 站姿 balance reset",
      "Grip fight 抢手路线",
      "Single leg 单腿抱摔",
      "Double leg 双腿抱摔",
      "Sprawl 防摔反应",
      "Guard pull 主动入地",
    ],
  },
  {
    id: "guard",
    code: "02",
    title: "GUARD",
    subtitle: "FRAME / HOOK / RECOVER",
    icon: Shield,
    items: [
      "Closed guard 封闭防守",
      "Open guard 开放防守",
      "Butterfly hook 蝴蝶钩",
      "Half guard 半防守",
      "Retention guard 恢复路线",
      "Sweep combo 扫技连段",
    ],
  },
  {
    id: "control",
    code: "03",
    title: "CONTROL",
    subtitle: "PIN / PRESSURE / SWITCH",
    icon: TimerReset,
    items: [
      "Side control 侧压固定",
      "Mount 骑乘维持",
      "Back control 背后控制",
      "North south 南北位",
      "Knee on belly 膝压腹",
      "Transition 位置转换",
    ],
  },
  {
    id: "submission",
    code: "04",
    title: "SUBMISSION",
    subtitle: "TRAP / ISOLATE / FINISH",
    icon: Flame,
    items: [
      "Armbar 十字固",
      "Triangle 三角绞",
      "Guillotine 断头台",
      "Rear naked choke 裸绞",
      "Kimura 木村锁",
      "Americana 美式锁",
    ],
  },
];

export const SIX_MONTH_PLAN = [
  "MONTH 01 / 建立 weekly 3x training routine，学会 bridge / shrimp / stand-up。",
  "MONTH 02 / 看懂 major positions，开始 light rolling & calm breathing。",
  "MONTH 03 / 把 guard retention 练成 instinct，完成 first sweep combo。",
  "MONTH 04 / 做出 3 条 finish route，开始每周一次 video review。",
  "MONTH 05 / 打一次 in-house match，确认自己的 A-game 主武器。",
  "MONTH 06 / 完成 50 rounds rolling，进入 blue-belt pre-check mindset。",
];

export const MISSIONS: Mission[] = [
  {
    code: "M-01",
    title: "FRAME RECOVER / 框架回收",
    detail: "被 side control 压住时，先保住 elbow-knee frame，再偷空间逃出。",
    reward: "+30 Calm / +15 Survival",
    difficulty: "NORMAL",
  },
  {
    code: "M-02",
    title: "ENTRY ONLY / 只练进入",
    detail: "今晚站立阶段不追求摔成，只练 distance、level change、clean entry。",
    reward: "+20 Timing / +20 Confidence",
    difficulty: "HARD",
  },
  {
    code: "M-03",
    title: "MOUNT FLOW / 骑乘连段",
    detail: "从 mount 起手，armbar 与 americana 两条终结路线至少接通一条。",
    reward: "+40 Pressure / +25 Finish",
    difficulty: "BOSS",
  },
];

export const LOGS: LogEntry[] = [
  {
    day: "05 / MON",
    title: "OPEN MAT / 自由对练",
    focus: "Guard retention + breathing",
    result: "被压时没急着乱推，成功 recover 两次 half guard。",
  },
  {
    day: "07 / WED",
    title: "DRILL NIGHT / 技术训练",
    focus: "Single leg entry",
    result: "进入速度变快了，但 head position 还需要更低更贴。",
  },
  {
    day: "09 / FRI",
    title: "POSITIONAL / 位置对抗",
    focus: "Mount escape",
    result: "先建框架再桥，动作顺序开始变稳定，不再只靠蛮力。",
  },
];

export const NAV_ITEMS = [
  { to: "/", label: "HOME / 主界面" },
  { to: "/mission", label: "MISSION / 任务板" },
  { to: "/training-log", label: "TRAINING LOG / 训练日志" },
  { to: "/arsenal", label: "ARSENAL / 技能库" },
];

export const TOTAL_CHECKBOXES = SECTIONS.reduce(
  (count, section) => count + section.items.length,
  0,
) + SIX_MONTH_PLAN.length;

export const TROPHY_RULES = [
  "3x TRAINING / 每周三次上垫",
  "1 TARGET ONLY / 每次只带一个明确目标",
  "POST-ROLL NOTE / 每次 rolling 后写一句复盘",
];

export const HOME_STATS = [
  { label: "FOCUS", value: "88%", note: "awareness steady up" },
  { label: "FLOW", value: "A-", note: "transition getting cleaner" },
  { label: "HEART", value: "MAX", note: "show up even on rough days" },
];

export const HOME_TAGLINES = [
  "STEAL THE SPACE / 先偷空间",
  "BREAK THE RHYTHM / 再断节奏",
  "OWN THE ROUND / 最后拿下整回合",
];

export const ARSENAL_QUOTES = [
  "STYLE IS A WEAPON / 风格本身就是武器",
  "SMALL WIN, BIG SHIFT / 小进步也会改变整场局面",
  "POSITION BEFORE SUBMISSION / 先位置，再终结",
];

export const FEATURED_COMBO = [
  "Frame 建立框架",
  "Hip escape 虾行拉空间",
  "Insert knee 膝盖回线",
  "Recover guard 抢回防守",
];

export const WEAPONS = [
  { name: "Phantom Sweep", type: "Guard", note: "hook + angle + pull" },
  { name: "Red Line Pass", type: "Passing", note: "head low, hips heavy" },
  { name: "Mask Choke", type: "Finish", note: "isolate, clamp, squeeze" },
  { name: "Shadow Escape", type: "Defense", note: "frame first, panic never" },
];
