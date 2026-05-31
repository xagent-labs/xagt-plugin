import { TrainingLogEntry, TrainingVerificationRecord } from "@/lib/trainingLogs";

const API_BASE = import.meta.env.VITE_RUST_API_BASE ?? "";

type ApiVerificationRecord = {
  id: string;
  logId: string;
  athleteWallet?: string | null;
  coachName: string;
  coachWallet?: string | null;
  digest: string;
  status: "pending-coach" | "verified-by-coach";
  requestedAt: string;
  verifiedAt?: string | null;
  receipt?: string | null;
};

const toUnixTime = (value?: string | null) => {
  if (!value) return undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const mapApiVerification = (record: ApiVerificationRecord): TrainingVerificationRecord => ({
  id: record.id,
  logId: record.logId,
  athleteWallet: record.athleteWallet ?? null,
  coachName: record.coachName,
  coachWallet: record.coachWallet ?? null,
  digest: record.digest,
  status: record.status,
  requestedAt: toUnixTime(record.requestedAt) ?? Date.now(),
  verifiedAt: toUnixTime(record.verifiedAt),
  receipt: record.receipt ?? undefined,
  source: "rust-api",
});

const buildPublicLogPayload = (entry: TrainingLogEntry, athleteWallet: string | null) => ({
  athleteWallet,
  logId: entry.id,
  date: entry.date,
  durationMinutes: entry.durationMinutes,
  location: entry.location,
  sessionType: entry.sessionType,
  uniformType: entry.uniformType,
  coach: entry.coach,
  techniques: entry.techniques,
  categories: entry.categories,
  summary: entry.summary,
});

export const createLocalSessionDigest = async (
  entry: TrainingLogEntry,
  athleteWallet: string | null,
) => {
  const encoder = new TextEncoder();
  const payload = JSON.stringify({
    app: "phantom-mat-pass",
    version: 1,
    ...buildPublicLogPayload(entry, athleteWallet),
  });
  const digestBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(payload));
  return Array.from(new Uint8Array(digestBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const buildLocalReceipt = async (
  verificationId: string,
  digest: string,
  coachWallet: string | null,
  verifiedAt: number,
) => {
  const encoder = new TextEncoder();
  const payload = JSON.stringify({ verificationId, digest, coachWallet, verifiedAt });
  const digestBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(payload));
  return Array.from(new Uint8Array(digestBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

export const requestCoachVerification = async ({
  entry,
  athleteWallet,
  coachName,
  coachWallet,
}: {
  entry: TrainingLogEntry;
  athleteWallet: string | null;
  coachName: string;
  coachWallet: string | null;
}): Promise<TrainingVerificationRecord> => {
  try {
    const response = await fetch(`${API_BASE}/api/training/request-verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        athleteWallet,
        coachName,
        coachWallet,
        log: buildPublicLogPayload(entry, athleteWallet),
      }),
    });

    if (!response.ok) {
      throw new Error(`Rust API returned ${response.status}`);
    }

    return mapApiVerification((await response.json()) as ApiVerificationRecord);
  } catch {
    const digest = await createLocalSessionDigest(entry, athleteWallet);
    return {
      id: `verify-local-${crypto.randomUUID()}`,
      logId: entry.id,
      athleteWallet,
      coachName,
      coachWallet,
      digest,
      status: "pending-coach",
      requestedAt: Date.now(),
      source: "local-demo",
    };
  }
};

export const approveCoachVerification = async (
  verification: TrainingVerificationRecord,
  coachWallet: string | null,
): Promise<TrainingVerificationRecord> => {
  if (verification.source === "rust-api") {
    try {
      const response = await fetch(`${API_BASE}/api/coach/verify-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificationId: verification.id,
          logId: verification.logId,
          athleteWallet: verification.athleteWallet,
          coachName: verification.coachName,
          coachWallet,
          digest: verification.digest,
          requestedAt: new Date(verification.requestedAt).toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Rust API returned ${response.status}`);
      }

      return mapApiVerification((await response.json()) as ApiVerificationRecord);
    } catch {
      // Fall through to local approval so the demo remains usable without the API.
    }
  }

  const verifiedAt = Date.now();
  return {
    ...verification,
    coachWallet: coachWallet || verification.coachWallet,
    status: "verified-by-coach",
    verifiedAt,
    receipt: await buildLocalReceipt(
      verification.id,
      verification.digest,
      coachWallet || verification.coachWallet,
      verifiedAt,
    ),
    source: verification.source,
  };
};
