import {
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  subDays,
} from "date-fns";
import {
  readScopedStorageItem,
  removeScopedStorageItem,
  writeScopedStorageItem,
} from "@/lib/storage";

export const TRAINING_LOG_STORAGE_KEY = "bjj-phantom-training-log-v1";
export const TRAINING_LOG_PREFILL_STORAGE_KEY = "bjj-phantom-training-log-prefill-v1";
export const TRAINING_MILESTONE_CLAIM_STORAGE_KEY = "bjj-phantom-training-milestone-claims-v1";
export const TRAINING_VERIFICATION_STORAGE_KEY = "bjj-phantom-training-verifications-v1";

export const TRAINING_SESSION_TYPES = ["私教课", "团课", "开放滚", "自练"] as const;
export const TRAINING_UNIFORM_TYPES = ["GI", "NO GI"] as const;
export const MENSTRUAL_PHASES = ["月经期", "卵泡期", "排卵期", "黄体期"] as const;
export const TRAINING_CATEGORIES = [
  "站立",
  "防守",
  "压制",
  "降服",
  "扫技",
  "逃脱",
  "过腿",
  "位置控制",
] as const;
export const TRAINING_IDENTITIES = ["Top", "Bottom", "进攻方", "防守方", "自由滚"] as const;

export type TrainingSessionType = (typeof TRAINING_SESSION_TYPES)[number];
export type TrainingUniformType = (typeof TRAINING_UNIFORM_TYPES)[number];
export type MenstrualPhase = (typeof MENSTRUAL_PHASES)[number];
export type TrainingCategory = (typeof TRAINING_CATEGORIES)[number];
export type TrainingIdentity = (typeof TRAINING_IDENTITIES)[number];

export type TrainingLogEntry = {
  id: string;
  date: string;
  durationMinutes: number;
  location: string;
  sessionType: TrainingSessionType;
  uniformType: TrainingUniformType;
  menstrualPhase: MenstrualPhase;
  coach: string;
  techniques: string[];
  categories: TrainingCategory[];
  identities: TrainingIdentity[];
  focus: string;
  notes: string;
  feeling: string;
  summary: string;
  timestamp: number;
};

export type TrainingVerificationStatus = "pending-coach" | "verified-by-coach";

export type TrainingVerificationRecord = {
  id: string;
  logId: string;
  athleteWallet: string | null;
  coachName: string;
  coachWallet: string | null;
  digest: string;
  status: TrainingVerificationStatus;
  requestedAt: number;
  verifiedAt?: number;
  receipt?: string;
  source: "rust-api" | "local-demo";
};

export type TrainingMilestoneKind = "streak" | "volume" | "competition" | "verified";
export type TrainingMilestoneMetric = "streakDays" | "sessions" | "verifiedSessions" | "manual";
export type TrainingMilestoneClaimMode = "auto" | "verified";

export type TrainingMilestoneDefinition = {
  id:
    | "streak-7"
    | "streak-14"
    | "streak-30"
    | "sessions-10"
    | "sessions-50"
    | "sessions-100"
    | "first-competition"
    | "first-placement"
    | "first-championship"
    | "belt-promotion";
  kind: TrainingMilestoneKind;
  metric: TrainingMilestoneMetric;
  target: number;
  claimMode: TrainingMilestoneClaimMode;
};

export type TrainingMilestoneClaim = {
  milestoneId: TrainingMilestoneDefinition["id"];
  walletAddress: string;
  digest: string;
  createdAt: number;
  network: string;
  verificationStatus: "confirmed-devnet";
  txSignature?: string;
  explorerUrl?: string;
  verifiedSessionCount?: number;
};

export const TRAINING_MILESTONES: TrainingMilestoneDefinition[] = [
  { id: "streak-7", kind: "streak", metric: "streakDays", target: 7, claimMode: "auto" },
  { id: "streak-14", kind: "streak", metric: "streakDays", target: 14, claimMode: "auto" },
  { id: "streak-30", kind: "streak", metric: "streakDays", target: 30, claimMode: "auto" },
  { id: "sessions-10", kind: "volume", metric: "sessions", target: 10, claimMode: "auto" },
  { id: "sessions-50", kind: "volume", metric: "sessions", target: 50, claimMode: "auto" },
  { id: "sessions-100", kind: "volume", metric: "sessions", target: 100, claimMode: "auto" },
  { id: "first-competition", kind: "competition", metric: "manual", target: 1, claimMode: "auto" },
  { id: "first-placement", kind: "competition", metric: "manual", target: 1, claimMode: "auto" },
  { id: "first-championship", kind: "competition", metric: "manual", target: 1, claimMode: "auto" },
  { id: "belt-promotion", kind: "verified", metric: "verifiedSessions", target: 3, claimMode: "verified" },
];

export type TrainingLogDraft = {
  date: string;
  durationMinutes: string;
  location: string;
  sessionType: TrainingSessionType;
  uniformType: TrainingUniformType;
  menstrualPhase: MenstrualPhase;
  coach: string;
  techniquesInput: string;
  categories: TrainingCategory[];
  identities: TrainingIdentity[];
  focus: string;
  notes: string;
  feeling: string;
  summary: string;
};

export type TrainingLogPrefill = Partial<TrainingLogDraft>;

export const createEmptyTrainingLogDraft = (date = format(new Date(), "yyyy-MM-dd")): TrainingLogDraft => ({
  date,
  durationMinutes: "",
  location: "",
  sessionType: "团课",
  uniformType: "GI",
  menstrualPhase: "卵泡期",
  coach: "",
  techniquesInput: "",
  categories: [],
  identities: [],
  focus: "",
  notes: "",
  feeling: "",
  summary: "",
});

export const techniquesFromInput = (value: string) =>
  value
    .split(/[,\n，]+/)
    .map((item) => item.trim())
    .filter(Boolean);

export const draftFromLog = (entry: TrainingLogEntry): TrainingLogDraft => ({
  date: entry.date,
  durationMinutes: String(entry.durationMinutes),
  location: entry.location,
  sessionType: entry.sessionType,
  uniformType: entry.uniformType ?? "GI",
  menstrualPhase: entry.menstrualPhase ?? "卵泡期",
  coach: entry.coach,
  techniquesInput: entry.techniques.join(", "),
  categories: entry.categories,
  identities: entry.identities,
  focus: entry.focus,
  notes: entry.notes,
  feeling: entry.feeling,
  summary: entry.summary,
});

const isUniformType = (value: unknown): value is TrainingUniformType =>
  typeof value === "string" && TRAINING_UNIFORM_TYPES.includes(value as TrainingUniformType);

const isMenstrualPhase = (value: unknown): value is MenstrualPhase =>
  typeof value === "string" && MENSTRUAL_PHASES.includes(value as MenstrualPhase);

export const sortTrainingLogs = (logs: TrainingLogEntry[]) =>
  [...logs].sort((a, b) => {
    if (a.date === b.date) return b.timestamp - a.timestamp;
    return b.date.localeCompare(a.date);
  });

export const readTrainingLogs = (scope?: string | null): TrainingLogEntry[] => {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(readScopedStorageItem(TRAINING_LOG_STORAGE_KEY, scope) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return sortTrainingLogs(
      parsed
        .filter((item) => {
          return (
            item &&
            typeof item.id === "string" &&
            typeof item.date === "string" &&
            typeof item.durationMinutes === "number" &&
            typeof item.location === "string" &&
            typeof item.sessionType === "string" &&
            typeof item.coach === "string" &&
            Array.isArray(item.techniques) &&
            Array.isArray(item.categories) &&
            Array.isArray(item.identities) &&
            typeof item.focus === "string" &&
            typeof item.notes === "string" &&
            typeof item.feeling === "string" &&
            typeof item.summary === "string" &&
            typeof item.timestamp === "number"
          );
        })
        .map((item) => ({
          ...item,
          uniformType: isUniformType(item.uniformType) ? item.uniformType : "GI",
          menstrualPhase: isMenstrualPhase(item.menstrualPhase) ? item.menstrualPhase : "卵泡期",
        })),
    );
  } catch {
    return [];
  }
};

export const saveTrainingLogs = (logs: TrainingLogEntry[], scope?: string | null) => {
  if (typeof window === "undefined") return;
  writeScopedStorageItem(TRAINING_LOG_STORAGE_KEY, JSON.stringify(sortTrainingLogs(logs)), scope);
};

export const readTrainingVerifications = (scope?: string | null): Record<string, TrainingVerificationRecord> => {
  if (typeof window === "undefined") return {};

  try {
    const parsed = JSON.parse(readScopedStorageItem(TRAINING_VERIFICATION_STORAGE_KEY, scope) ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => {
        return (
          value &&
          typeof value === "object" &&
          "id" in value &&
          "logId" in value &&
          "coachName" in value &&
          "digest" in value &&
          "status" in value &&
          "requestedAt" in value
        );
      }),
    ) as Record<string, TrainingVerificationRecord>;
  } catch {
    return {};
  }
};

export const saveTrainingVerifications = (
  verifications: Record<string, TrainingVerificationRecord>,
  scope?: string | null,
) => {
  if (typeof window === "undefined") return;
  writeScopedStorageItem(TRAINING_VERIFICATION_STORAGE_KEY, JSON.stringify(verifications), scope);
};

export const readTrainingMilestoneClaims = (scope?: string | null): Record<string, TrainingMilestoneClaim> => {
  if (typeof window === "undefined") return {};

  try {
    const parsed = JSON.parse(readScopedStorageItem(TRAINING_MILESTONE_CLAIM_STORAGE_KEY, scope) ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => {
        return (
          value &&
          typeof value === "object" &&
          "milestoneId" in value &&
          "walletAddress" in value &&
          "digest" in value &&
          "createdAt" in value &&
          "network" in value &&
          "verificationStatus" in value
        );
      }),
    ) as Record<string, TrainingMilestoneClaim>;
  } catch {
    return {};
  }
};

export const saveTrainingMilestoneClaims = (
  claims: Record<string, TrainingMilestoneClaim>,
  scope?: string | null,
) => {
  if (typeof window === "undefined") return;
  writeScopedStorageItem(TRAINING_MILESTONE_CLAIM_STORAGE_KEY, JSON.stringify(claims), scope);
};

export const getTrainingSessionCount = (logs: TrainingLogEntry[]) =>
  sortTrainingLogs(logs).length;

export const getVerifiedTrainingSessionCount = (
  verifications: Record<string, TrainingVerificationRecord>,
) =>
  new Set(
    Object.values(verifications)
      .filter((verification) => verification.status === "verified-by-coach")
      .map((verification) => verification.logId),
  ).size;

export const getMilestoneProgressValue = (
  logs: TrainingLogEntry[],
  milestone: TrainingMilestoneDefinition,
  verifications: Record<string, TrainingVerificationRecord> = {},
) => {
  if (milestone.metric === "streakDays") return getTrainingStreak(logs);
  if (milestone.metric === "sessions") return getTrainingSessionCount(logs);
  if (milestone.metric === "verifiedSessions") return getVerifiedTrainingSessionCount(verifications);
  if (milestone.metric === "manual") return 1;
  return 0;
};

export const createMilestoneDigest = async ({
  milestoneId,
  target,
  currentValue,
  sessionCount,
  streak,
  verifiedSessionCount = 0,
}: {
  milestoneId: TrainingMilestoneDefinition["id"];
  target: number;
  currentValue: number;
  sessionCount: number;
  streak: number;
  verifiedSessionCount?: number;
}) => {
  const encoder = new TextEncoder();
  const payload = JSON.stringify({
    milestoneId,
    target,
    currentValue,
    sessionCount,
    streak,
    verifiedSessionCount,
  });

  const digestBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(payload));
  const bytes = Array.from(new Uint8Array(digestBuffer));
  return bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

export const saveTrainingLogPrefill = (prefill: TrainingLogPrefill, scope?: string | null) => {
  if (typeof window === "undefined") return;
  writeScopedStorageItem(TRAINING_LOG_PREFILL_STORAGE_KEY, JSON.stringify(prefill), scope);
};

export const readTrainingLogPrefill = (scope?: string | null): TrainingLogPrefill | null => {
  if (typeof window === "undefined") return null;

  try {
    const parsed = JSON.parse(readScopedStorageItem(TRAINING_LOG_PREFILL_STORAGE_KEY, scope) ?? "null");
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

export const clearTrainingLogPrefill = (scope?: string | null) => {
  if (typeof window === "undefined") return;
  removeScopedStorageItem(TRAINING_LOG_PREFILL_STORAGE_KEY, scope);
};

export const buildTrainingLogEntry = (
  draft: TrainingLogDraft,
  currentId?: string,
): TrainingLogEntry => ({
  id: currentId ?? `log-${crypto.randomUUID()}`,
  date: draft.date,
  durationMinutes: Number(draft.durationMinutes),
  location: draft.location.trim(),
  sessionType: draft.sessionType,
  uniformType: draft.uniformType,
  menstrualPhase: draft.menstrualPhase,
  coach: draft.coach.trim(),
  techniques: techniquesFromInput(draft.techniquesInput),
  categories: draft.categories,
  identities: draft.identities,
  focus: draft.focus.trim(),
  notes: draft.notes.trim(),
  feeling: draft.feeling.trim(),
  summary: draft.summary.trim(),
  timestamp: Date.now(),
});

export const getTrainingStreak = (logs: TrainingLogEntry[], referenceDate = new Date()) => {
  const uniqueDates = new Set(logs.map((entry) => entry.date));
  if (!uniqueDates.size) return 0;

  const today = format(startOfDay(referenceDate), "yyyy-MM-dd");
  const yesterday = format(subDays(startOfDay(referenceDate), 1), "yyyy-MM-dd");

  let current = uniqueDates.has(today) ? today : uniqueDates.has(yesterday) ? yesterday : "";
  if (!current) return 0;

  let streak = 0;
  while (uniqueDates.has(current)) {
    streak += 1;
    current = format(subDays(parseISO(current), 1), "yyyy-MM-dd");
  }

  return streak;
};

export const getCurrentMonthLogs = (logs: TrainingLogEntry[], monthDate = new Date()) =>
  sortTrainingLogs(logs).filter((entry) => isSameMonth(parseISO(entry.date), monthDate));

export const getMonthHeatmap = (logs: TrainingLogEntry[], monthDate = new Date()) => {
  const monthLogs = getCurrentMonthLogs(logs, monthDate);
  const counts = monthLogs.reduce<Record<string, number>>((accumulator, entry) => {
    accumulator[entry.date] = (accumulator[entry.date] ?? 0) + 1;
    return accumulator;
  }, {});

  return eachDayOfInterval({
    start: startOfMonth(monthDate),
    end: endOfMonth(monthDate),
  }).map((day) => {
    const key = format(day, "yyyy-MM-dd");
    return {
      date: key,
      dayNumber: format(day, "d"),
      weekday: format(day, "EEE"),
      count: counts[key] ?? 0,
      isToday: key === format(new Date(), "yyyy-MM-dd"),
    };
  });
};

export const getLatestTrainingDate = (logs: TrainingLogEntry[]) => {
  if (!logs.length) return "";
  return sortTrainingLogs(logs)[0].date;
};
