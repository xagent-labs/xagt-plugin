/**
 * Narrative aggregator — clusters real public RSS items into the
 * NARRATIVE_CATEGORIES buckets. No synthetic data, no extrapolation; counts,
 * momentum and sparklines are all derived from the actual feed payload.
 */
import type { Narrative } from "@/lib/types";
import { NARRATIVE_CATEGORIES } from "@/lib/narratives";
import type { RSSItem } from "@/lib/sources/rss";

const BULLISH = [
  "surge", "soars", "rally", "rallies", "all-time", "ath", "breakout", "approval",
  "approved", "bullish", "gains", "rises", "rebounds", "jumps", "record", "wins",
];
const BEARISH = [
  "crash", "drop", "plunge", "plummet", "exploit", "hack", "hacked", "rug",
  "lawsuit", "sec", "fraud", "ban", "delist", "delisted", "bearish", "loss",
  "losses", "tumbles", "slides", "collapse",
];

const HALF_LIFE_HOURS = 12;
const SPARK_BUCKETS = 24;

export function aggregateNarratives(items: RSSItem[]): Narrative[] {
  const now = Date.now();
  const bucketMs = (24 * 3600 * 1000) / SPARK_BUCKETS;

  return NARRATIVE_CATEGORIES.map((cat) => {
    const matchedIndices: number[] = [];
    const ages: number[] = [];
    let bull = 0;
    let bear = 0;

    items.forEach((it, idx) => {
      const hay = (it.title + " " + (it.summary ?? "")).toLowerCase();
      if (!cat.keywords.some((k) => hay.includes(k))) return;
      matchedIndices.push(idx);
      const t = new Date(it.publishedAt).getTime();
      const ageH = Math.max(0, (now - t) / 3_600_000);
      ages.push(ageH);
      if (BULLISH.some((w) => hay.includes(w))) bull += 1;
      if (BEARISH.some((w) => hay.includes(w))) bear += 1;
    });

    const mentions = matchedIndices.length;

    // Momentum: exponentially-decayed mentions over the window, capped to 0-100.
    const decayed = ages.reduce(
      (acc, h) => acc + Math.pow(0.5, h / HALF_LIFE_HOURS),
      0,
    );
    const momentum = Math.min(100, Math.round(decayed * 12));

    // Sentiment in [-1,1] from bullish vs. bearish keyword counts.
    const sentDen = bull + bear;
    const sentimentSigned = sentDen === 0 ? 0 : (bull - bear) / sentDen;
    // NarrativeCard renders this as a percentage — express in [0,1] like before.
    const sentiment = (sentimentSigned + 1) / 2;

    // Spark: 24 hourly buckets of mention counts over the last 24h.
    const spark = new Array<number>(SPARK_BUCKETS).fill(0);
    for (const h of ages) {
      if (h >= 24) continue;
      const bucket = Math.min(SPARK_BUCKETS - 1, Math.floor(h / (bucketMs / 3_600_000)));
      spark[SPARK_BUCKETS - 1 - bucket] += 1;
    }

    return {
      id: cat.id,
      name: cat.name,
      description: cat.description,
      color: cat.color,
      topTokens: cat.topTokens,
      momentum,
      sentiment,
      mentions,
      // We don't have token-level on-chain volume from RSS alone — keep 0
      // rather than fabricate. UI hides the tile when volume24h === 0.
      volume24h: 0,
      spark,
    } satisfies Narrative;
  });
}
