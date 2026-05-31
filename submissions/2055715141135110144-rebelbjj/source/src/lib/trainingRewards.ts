import {
  differenceInCalendarDays,
  endOfWeek,
  format,
  parseISO,
  startOfWeek,
  subDays,
} from "date-fns";
import {
  getTrainingSessionCount,
  getTrainingStreak,
  TrainingLogEntry,
  TrainingMilestoneClaim,
} from "@/lib/trainingLogs";

export type RewardTrack = "streak" | "volume" | "discipline" | "mastery";

export type RewardQuest = {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  rewardLabel: string;
  completed: boolean;
};

export type RewardBadge = {
  id: string;
  title: string;
  detail: string;
  unlocked: boolean;
  track: RewardTrack;
};

export type RewardUnlock = {
  id: string;
  title: string;
  detail: string;
  unlocked: boolean;
  requirementLabel: string;
};

export type TrainingRewardSummary = {
  xp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  streak: number;
  sessions: number;
  weeklySessions: number;
  longestGapDays: number;
  chainBonusLabel: string;
  rankTitle: string;
  quests: RewardQuest[];
  badges: RewardBadge[];
  unlocks: RewardUnlock[];
  claimedProofCount: number;
};

const XP_BASE = 80;
const XP_PER_15_MINUTES = 8;
const STREAK_MULTIPLIER_CAP = 1.6;

const toUniqueDates = (logs: TrainingLogEntry[]) =>
  Array.from(new Set(logs.map((entry) => entry.date))).sort((a, b) => a.localeCompare(b));

const getWeeklySessions = (logs: TrainingLogEntry[]) => {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  return logs.filter((entry) => {
    const date = parseISO(entry.date);
    return date >= weekStart && date <= weekEnd;
  }).length;
};

const getLongestGapDays = (logs: TrainingLogEntry[]) => {
  const dates = toUniqueDates(logs);
  if (dates.length <= 1) return 0;

  let longestGap = 0;
  for (let index = 1; index < dates.length; index += 1) {
    const diff = differenceInCalendarDays(parseISO(dates[index]), parseISO(dates[index - 1])) - 1;
    longestGap = Math.max(longestGap, diff);
  }
  return longestGap;
};

const getRecentSessionCount = (logs: TrainingLogEntry[], days: number) => {
  const cutoff = subDays(new Date(), days - 1);
  return logs.filter((entry) => parseISO(entry.date) >= cutoff).length;
};

const getTechniqueCount = (logs: TrainingLogEntry[]) =>
  new Set(logs.flatMap((entry) => entry.techniques.map((technique) => technique.trim()).filter(Boolean))).size;

const getCategoryCount = (logs: TrainingLogEntry[]) =>
  new Set(logs.flatMap((entry) => entry.categories)).size;

const getMinutesTotal = (logs: TrainingLogEntry[]) =>
  logs.reduce((total, entry) => total + entry.durationMinutes, 0);

const buildXp = (logs: TrainingLogEntry[], streak: number) => {
  const multiplier = Math.min(STREAK_MULTIPLIER_CAP, 1 + streak * 0.02);

  return logs.reduce((total, entry) => {
    const durationXp = Math.floor(entry.durationMinutes / 15) * XP_PER_15_MINUTES;
    return total + Math.round((XP_BASE + durationXp) * multiplier);
  }, 0);
};

const getLevelThreshold = (level: number) => 180 + (level - 1) * 90;

const buildLevelState = (xp: number) => {
  let remaining = xp;
  let level = 1;
  let threshold = getLevelThreshold(level);

  while (remaining >= threshold) {
    remaining -= threshold;
    level += 1;
    threshold = getLevelThreshold(level);
  }

  return {
    level,
    xpIntoLevel: remaining,
    xpForNextLevel: threshold,
  };
};

const getRankTitle = (level: number) => {
  if (level >= 15) return "HEIST LEGEND";
  if (level >= 11) return "RED MASK VETERAN";
  if (level >= 7) return "SHADOW OPERATOR";
  if (level >= 4) return "MAT INFILTRATOR";
  return "ROOKIE PHANTOM";
};

export const buildTrainingRewardSummary = (
  logs: TrainingLogEntry[],
  milestoneClaims: Record<string, TrainingMilestoneClaim>,
): TrainingRewardSummary => {
  const streak = getTrainingStreak(logs);
  const sessions = getTrainingSessionCount(logs);
  const weeklySessions = getWeeklySessions(logs);
  const longestGapDays = getLongestGapDays(logs);
  const claimedProofCount = Object.keys(milestoneClaims).length;
  const xp = buildXp(logs, streak);
  const { level, xpIntoLevel, xpForNextLevel } = buildLevelState(xp);
  const uniqueTechniques = getTechniqueCount(logs);
  const uniqueCategories = getCategoryCount(logs);
  const totalMinutes = getMinutesTotal(logs);
  const recentSeven = getRecentSessionCount(logs, 7);
  const recentThirty = getRecentSessionCount(logs, 30);

  const quests: RewardQuest[] = [
    {
      id: "weekly-3",
      title: "WEEKLY HEIST / 三次上垫",
      description: "本周完成 3 次训练，让训练节奏不要断线。",
      progress: weeklySessions,
      target: 3,
      rewardLabel: "+180 XP / RED STAMP",
      completed: weeklySessions >= 3,
    },
    {
      id: "shadow-7",
      title: "SHADOW TRACE / 七日留痕",
      description: "最近 7 天内留下 4 次训练记录，维持连续存在感。",
      progress: recentSeven,
      target: 4,
      rewardLabel: "+240 XP / DOSSIER TAPE",
      completed: recentSeven >= 4,
    },
    {
      id: "archive-30",
      title: "ARCHIVE STACK / 月度沉淀",
      description: "30 天内完成 12 次训练记录，建立真正能回看的档案。",
      progress: recentThirty,
      target: 12,
      rewardLabel: "+420 XP / WANTED FRAME",
      completed: recentThirty >= 12,
    },
  ];

  const badges: RewardBadge[] = [
    {
      id: "streak-keeper",
      title: "STREAK KEEPER",
      detail: "连续训练达到 7 天。",
      unlocked: streak >= 7,
      track: "streak",
    },
    {
      id: "session-engine",
      title: "SESSION ENGINE",
      detail: "累计训练达到 25 次。",
      unlocked: sessions >= 25,
      track: "volume",
    },
    {
      id: "full-spectrum",
      title: "FULL SPECTRUM",
      detail: "覆盖 6 个以上训练分类。",
      unlocked: uniqueCategories >= 6,
      track: "mastery",
    },
    {
      id: "tech-hoarder",
      title: "TECH HOARDER",
      detail: "记录 20 个以上不同技术。",
      unlocked: uniqueTechniques >= 20,
      track: "mastery",
    },
    {
      id: "steady-heart",
      title: "STEADY HEART",
      detail: "训练档案中最长中断不超过 3 天。",
      unlocked: sessions >= 10 && longestGapDays <= 3,
      track: "discipline",
    },
  ];

  const unlocks: RewardUnlock[] = [
    {
      id: "red-stamp",
      title: "RED STAMP FINISHER",
      detail: "解锁更重型的奖励印章视觉。",
      unlocked: streak >= 14,
      requirementLabel: "14-DAY STREAK",
    },
    {
      id: "wanted-frame",
      title: "WANTED BOARD FRAME",
      detail: "解锁通缉令边框档案卡。",
      unlocked: sessions >= 50,
      requirementLabel: "50 SESSIONS",
    },
    {
      id: "vault-key",
      title: "VAULT KEY",
      detail: "拥有 3 个以上链上训练证明后开启。",
      unlocked: claimedProofCount >= 3,
      requirementLabel: "3 ON-CHAIN PROOFS",
    },
    {
      id: "black-file",
      title: "BLACK FILE DOSSIER",
      detail: "累计训练时长达到 4,000 分钟。",
      unlocked: totalMinutes >= 4000,
      requirementLabel: "4,000 MINUTES",
    },
  ];

  const chainBonusLabel = claimedProofCount >= 1
    ? `${claimedProofCount} PROOFS SEALED`
    : streak >= 7
      ? "CHAIN READY"
      : "KEEP TRAINING";

  return {
    xp,
    level,
    xpIntoLevel,
    xpForNextLevel,
    streak,
    sessions,
    weeklySessions,
    longestGapDays,
    chainBonusLabel,
    rankTitle: getRankTitle(level),
    quests,
    badges,
    unlocks,
    claimedProofCount,
  };
};

export const formatRewardDate = (date: string) => format(parseISO(date), "yyyy.MM.dd");
