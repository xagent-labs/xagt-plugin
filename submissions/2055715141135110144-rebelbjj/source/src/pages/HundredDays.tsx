import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Flame, Swords } from "lucide-react";
import { AtlasFeatureTabs } from "@/components/AtlasFeatureTabs";
import { compactSkillLabel, localizeMixedLabel, localizeQuestTitle } from "@/lib/contentLocale";
import { useIdentity } from "@/lib/identity";
import { useLocale } from "@/lib/locale";
import { readScopedBooleanRecord, writeScopedStorageItem } from "@/lib/storage";
import {
  DAY_PLANS,
  DAY_STORAGE_KEY,
  HUNDRED_DAY_CHAPTERS,
  QUEST_STORAGE_KEY,
  getDayPlan,
} from "@/data/hundredDays";
import { getTrainingStreak, readTrainingLogs } from "@/lib/trainingLogs";

const useProgressState = (storageKey: string, scope: string) => {
  const [isScopeReady, setIsScopeReady] = useState(true);
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    return readScopedBooleanRecord(storageKey, scope);
  });

  useEffect(() => {
    if (!isScopeReady) return;
    writeScopedStorageItem(storageKey, JSON.stringify(checked), scope);
  }, [checked, isScopeReady, scope, storageKey]);

  useEffect(() => {
    setIsScopeReady(false);
    setChecked(readScopedBooleanRecord(storageKey, scope));
    setIsScopeReady(true);
  }, [scope, storageKey]);

  const toggle = (key: string) => {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return { checked, toggle };
};

const HundredDays = () => {
  const { locale, pick } = useLocale();
  const { storageScope } = useIdentity();
  const [searchParams, setSearchParams] = useSearchParams();
  const dayParam = Number(searchParams.get("day") ?? "1");
  const safeDay = Number.isFinite(dayParam) && dayParam >= 1 && dayParam <= 100 ? dayParam : 1;

  const { checked: questChecked, toggle: toggleQuest } = useProgressState(QUEST_STORAGE_KEY, storageScope);
  const { checked: dayChecked, toggle: toggleDay } = useProgressState(DAY_STORAGE_KEY, storageScope);

  const selectedDay = useMemo(() => getDayPlan(safeDay), [safeDay]);

  const dungeonKeys = useMemo(
    () =>
      HUNDRED_DAY_CHAPTERS.flatMap((chapter) =>
        chapter.quests.map((quest) => `dungeon-${quest.id}`),
      ),
    [],
  );
  const dungeonCompleted = dungeonKeys.filter((key) => questChecked[key]).length;
  const dungeonPercent = Math.round((dungeonCompleted / dungeonKeys.length) * 100);

  const clearedDays = DAY_PLANS.filter((plan) => dayChecked[plan.key]).length;
  const dayPercent = Math.round((clearedDays / DAY_PLANS.length) * 100);
  const trainingStreak = getTrainingStreak(readTrainingLogs(storageScope));

  const jumpToDay = (day: number) => {
    setSearchParams({ day: String(day) });
  };

  const currentQuestKey = `dungeon-${selectedDay.questId}`;
  const currentDayCleared = !!dayChecked[selectedDay.key];
  const currentQuestCleared = !!questChecked[currentQuestKey];
  const isChineseLocale = locale === "zh-CN" || locale === "zh-TW";
  const questTitle = localizeQuestTitle(selectedDay.questTitle, selectedDay.questEnglish, locale);
  const zoneLabel = isChineseLocale ? selectedDay.zone : selectedDay.questEnglish;
  const missionLabel = isChineseLocale
    ? selectedDay.mission
    : pick({
        "zh-CN": selectedDay.mission,
        "zh-TW": selectedDay.mission,
        en: ["Tech Study", "Flow Route", "Positional Spar", "Chain Build", "Review Loop"][(selectedDay.day - 1) % 5],
        ja: ["技の確認", "流れの接続", "限定スパー", "連携づくり", "振り返り"][(selectedDay.day - 1) % 5],
      });
  const dayOneLine = isChineseLocale
    ? selectedDay.oneLine
    : pick({
        "zh-CN": selectedDay.oneLine,
        "zh-TW": selectedDay.oneLine,
        en: `Practice ${localizeMixedLabel(selectedDay.primarySkill, locale)} inside ${selectedDay.questEnglish} until the next step feels connected.`,
        ja: `${localizeMixedLabel(selectedDay.primarySkill, locale)} を ${selectedDay.questEnglish} の流れの中で練習し、次の動きにつなげます。`,
      });
  const chapterSummary = isChineseLocale
    ? selectedDay.chapterSummary
    : pick({
        "zh-CN": selectedDay.chapterSummary,
        "zh-TW": selectedDay.chapterSummary,
        en: `This section focuses on ${selectedDay.questEnglish} and the route built around ${localizeMixedLabel(selectedDay.primarySkill, locale)}.`,
        ja: `${selectedDay.questEnglish} を中心に、${localizeMixedLabel(selectedDay.primarySkill, locale)} をつなげる週です。`,
      });
  const focusSummary = isChineseLocale
    ? selectedDay.focus
    : pick({
        "zh-CN": selectedDay.focus,
        "zh-TW": selectedDay.focus,
        en: `Primary route: ${localizeMixedLabel(selectedDay.primarySkill, locale)} + ${localizeMixedLabel(selectedDay.supportSkill, locale)}`,
        ja: `主な流れ：${localizeMixedLabel(selectedDay.primarySkill, locale)} + ${localizeMixedLabel(selectedDay.supportSkill, locale)}`,
      });
  const trainingBlocks = isChineseLocale
    ? selectedDay.trainingBlocks
    : [
        pick({
          "zh-CN": selectedDay.trainingBlocks[0],
          "zh-TW": selectedDay.trainingBlocks[0],
          en: `Warm-Up: Spend 5 minutes moving through ${localizeMixedLabel(selectedDay.primarySkill, locale)} slowly.`,
          ja: `ウォームアップ：${localizeMixedLabel(selectedDay.primarySkill, locale)} を5分ゆっくり動きます。`,
        }),
        pick({
          "zh-CN": selectedDay.trainingBlocks[1],
          "zh-TW": selectedDay.trainingBlocks[1],
          en: `Main Route: Drill ${localizeMixedLabel(selectedDay.primarySkill, locale)} into ${localizeMixedLabel(selectedDay.supportSkill, locale)}.`,
          ja: `メイン：${localizeMixedLabel(selectedDay.primarySkill, locale)} から ${localizeMixedLabel(selectedDay.supportSkill, locale)} へつなげて練習。`,
        }),
        pick({
          "zh-CN": selectedDay.trainingBlocks[2],
          "zh-TW": selectedDay.trainingBlocks[2],
          en: `Positional Rounds: Start from ${selectedDay.questEnglish} for 2 to 3 short rounds.`,
          ja: `${selectedDay.questEnglish} から 2〜3 本の限定ラウンド。`,
        }),
        pick({
          "zh-CN": selectedDay.trainingBlocks[3],
          "zh-TW": selectedDay.trainingBlocks[3],
          en: "Review: Write down what connected and what still broke first.",
          ja: "振り返り：つながった点と、最初に切れた点を書きます。",
        }),
        pick({
          "zh-CN": selectedDay.trainingBlocks[4],
          "zh-TW": selectedDay.trainingBlocks[4],
          en: "Finish with one extra quality rep or a final route check.",
          ja: "最後に質の高い1本か、ルートの最終確認を行います。",
        }),
      ];
  const bossText = isChineseLocale
    ? selectedDay.boss
    : pick({
        "zh-CN": selectedDay.boss,
        "zh-TW": selectedDay.boss,
        en: "Complete one clear rep from today’s route before you stop.",
        ja: "今日のルートを1回きれいにつなげて終えること。",
      });

  return (
    <main className="atlas-app">
      <div className="atlas-speedlines atlas-speedlines-left" />
      <div className="atlas-speedlines atlas-speedlines-right" />
      <div className="atlas-starburst atlas-starburst-top" />
      <div className="atlas-starburst atlas-starburst-bottom" />
      <div className="atlas-mask atlas-mask-top" />
      <div className="atlas-mask atlas-mask-bottom" />
      <div className="atlas-silhouette atlas-silhouette-left" />
      <div className="atlas-silhouette atlas-silhouette-right" />

      <div className="atlas-shell">
        <header className="atlas-hero atlas-panel">
          <div className="atlas-hero-copy">
            <div className="atlas-chip">
              {pick({
                "zh-CN": "100 DAY PLAN / 柔术入门路线",
                "zh-TW": "100 DAY PLAN / 柔術入門路線",
                en: "100 DAY PLAN",
                ja: "100日プラン",
              })}
            </div>
            <p className="atlas-kicker">
              {pick({
                "zh-CN": "DAY BY DAY / 每次只专注今天这一张牌",
                "zh-TW": "DAY BY DAY / 每次只專注今天這一張牌",
                en: "DAY BY DAY / focus on one card at a time",
                ja: "DAY BY DAY / 今日はこの1枚に集中",
              })}
            </p>
            <h1 className="atlas-title">
              DAY
              <span> {String(selectedDay.day).padStart(2, "0")}</span>
            </h1>
            <p className="atlas-description">
              {pick({
                "zh-CN": "把 100 天当成一个渐进式学习计划。每天只看当天内容，比较不容易乱，也更适合在课后慢慢复盘。",
                "zh-TW": "把 100 天當成一個漸進式學習計劃。每天只看當天內容，比較不容易亂，也更適合在課後慢慢復盤。",
                en: "Treat the route as a progressive 100-day plan. Focus on today’s card and review it after class.",
                ja: "100日を少しずつ進める学習プランとして使い、今日はこの1日だけに集中します。",
              })}
            </p>
          </div>

          <div className="atlas-progress-box">
            <div className="atlas-ribbon">
              {pick({
                "zh-CN": "PROGRESS / 每日推进",
                "zh-TW": "PROGRESS / 每日推進",
                en: "PROGRESS",
                ja: "進捗",
              })}
            </div>
            <div className="atlas-progress-meta">
              <span>{clearedDays}/100 DAYS</span>
              <span>{dayPercent}%</span>
            </div>
            <div className="atlas-progress-track">
              <div className="atlas-progress-fill" style={{ width: `${dayPercent}%` }} />
            </div>
            <p className="atlas-progress-note">
              {pick({
                "zh-CN": `今天重点在 ${selectedDay.zone}。先把当天内容练顺，比一次记住很多东西更有用。`,
                "zh-TW": `今天重點在 ${selectedDay.zone}。先把當天內容練順，比一次記住很多東西更有用。`,
                en: `Today focuses on ${zoneLabel}. A clean rep matters more than trying to remember everything at once.`,
                ja: `今日の重点は ${zoneLabel}。一度に全部覚えるより、まず1本をきれいに通すことが大切です。`,
              })}
            </p>
            <div className="atlas-day-streak">
              {pick({
                "zh-CN": `🔥 连续训练 / ${trainingStreak} 天`,
                "zh-TW": `🔥 連續訓練 / ${trainingStreak} 天`,
                en: `🔥 Streak / ${trainingStreak} days`,
                ja: `🔥 連続練習 / ${trainingStreak}日`,
              })}
            </div>
          </div>
        </header>

        <AtlasFeatureTabs progressDay={selectedDay.day} />

        <section className="atlas-day-focus-grid">
          <article className="atlas-panel atlas-knowledge atlas-day-feature">
            <div className="atlas-day-feature-head">
              <div className="atlas-dungeon-badge">
                {zoneLabel} / {selectedDay.suit}
              </div>
              <div className="atlas-day-badges">
                <span>DAY {String(selectedDay.day).padStart(2, "0")}</span>
                <span>{missionLabel}</span>
              </div>
            </div>

            <div className="atlas-day-title-wrap">
              <h2>{questTitle}</h2>
              <p>{selectedDay.questEnglish}</p>
            </div>

            <div className="atlas-day-layout">
              <section className="atlas-day-card atlas-day-card-prime">
                <div className="atlas-mini-head">
                  <h4>{pick({ "zh-CN": "今日任务", "zh-TW": "今日任務", en: "Today Focus", ja: "今日の課題" })}</h4>
                  <p>{pick({ "zh-CN": "Today Focus", "zh-TW": "Today Focus", en: "Today Focus", ja: "Today Focus" })}</p>
                </div>
                <p className="atlas-modal-paragraph">{dayOneLine}</p>
                <div className="atlas-day-skill-pair">
                  <div className="atlas-skill-chip atlas-skill-chip-static" aria-hidden="true">
                    MAIN / {compactSkillLabel(selectedDay.primarySkill, locale)}
                  </div>
                  <div className="atlas-skill-chip atlas-skill-chip-static" aria-hidden="true">
                    SUPPORT / {compactSkillLabel(selectedDay.supportSkill, locale)}
                  </div>
                </div>
                <div className="atlas-mantra">
                  <Swords className="h-4 w-4" />
                  <span>
                    {isChineseLocale
                      ? selectedDay.cue
                      : pick({
                          "zh-CN": selectedDay.cue,
                          "zh-TW": selectedDay.cue,
                          en: "Stay calm, keep structure, and connect the next step.",
                          ja: "落ち着いて形を保ち、次の動きにつなげる。",
                        })}
                  </span>
                </div>
              </section>

              <section className="atlas-day-card">
                <div className="atlas-mini-head">
                  <h4>{pick({ "zh-CN": "训练分段", "zh-TW": "訓練分段", en: "Session Blocks", ja: "練習ブロック" })}</h4>
                  <p>{pick({ "zh-CN": "Session Blocks", "zh-TW": "Session Blocks", en: "Session Blocks", ja: "Session Blocks" })}</p>
                </div>
                <ol className="atlas-number-list">
                  {trainingBlocks.map((block) => (
                    <li key={block}>{block}</li>
                  ))}
                </ol>
              </section>

              <section className="atlas-day-card">
                <div className="atlas-mini-head">
                  <h4>{pick({ "zh-CN": "本周主题", "zh-TW": "本週主題", en: "This Week", ja: "今週のテーマ" })}</h4>
                  <p>{pick({ "zh-CN": "This Week", "zh-TW": "This Week", en: "This Week", ja: "This Week" })}</p>
                </div>
                <p className="atlas-modal-paragraph">{chapterSummary}</p>
                <div className="atlas-day-meta-grid">
                  <div className="atlas-day-meta-box">
                    <span>ARC</span>
                    <strong>{isChineseLocale ? selectedDay.chapterSubtitle : selectedDay.chapterTitle}</strong>
                  </div>
                  <div className="atlas-day-meta-box">
                    <span>QUEST DAYS</span>
                    <strong>{selectedDay.questDays}</strong>
                  </div>
                  <div className="atlas-day-meta-box">
                    <span>FOCUS</span>
                    <strong>{focusSummary}</strong>
                  </div>
                </div>
              </section>

              <section className="atlas-day-card atlas-day-card-boss">
                <div className="atlas-mini-head">
                  <h4>{pick({ "zh-CN": "今日自查", "zh-TW": "今日自查", en: "Check Point", ja: "確認ポイント" })}</h4>
                  <p>{pick({ "zh-CN": "Check Point", "zh-TW": "Check Point", en: "Check Point", ja: "Check Point" })}</p>
                </div>
                <div className="atlas-region-boss">
                  <div className="atlas-region-boss-tag">
                    {pick({ "zh-CN": "TODAY CHECK", "zh-TW": "TODAY CHECK", en: "TODAY CHECK", ja: "TODAY CHECK" })}
                  </div>
                  <div className="atlas-region-boss-name">{bossText}</div>
                </div>
                <div className="atlas-day-actions">
                  <button
                    type="button"
                    className={
                      currentDayCleared
                        ? "atlas-unlock-toggle atlas-unlock-toggle-on"
                        : "atlas-unlock-toggle"
                    }
                    onClick={() => toggleDay(selectedDay.key)}
                  >
                    {currentDayCleared
                      ? pick({ "zh-CN": "今日已完成", "zh-TW": "今日已完成", en: "Day Complete", ja: "今日完了" })
                      : pick({ "zh-CN": "标记今日完成", "zh-TW": "標記今日完成", en: "Mark Day Complete", ja: "今日完了にする" })}
                  </button>
                  <button
                    type="button"
                    className={
                      currentQuestCleared
                        ? "atlas-unlock-toggle atlas-unlock-toggle-on"
                        : "atlas-unlock-toggle"
                    }
                    onClick={() => toggleQuest(currentQuestKey)}
                  >
                    {currentQuestCleared
                      ? pick({ "zh-CN": "本周已完成", "zh-TW": "本週已完成", en: "Week Complete", ja: "今週完了" })
                      : pick({ "zh-CN": "标记本周完成", "zh-TW": "標記本週完成", en: "Mark Week Complete", ja: "今週完了にする" })}
                  </button>
                </div>
              </section>
            </div>
          </article>

          <aside className="atlas-panel atlas-knowledge atlas-day-sidebar">
            <div className="atlas-section-head">
              <p className="atlas-section-tag">{pick({ "zh-CN": "DAY LIST / 每日列表", "zh-TW": "DAY LIST / 每日列表", en: "DAY LIST", ja: "日付一覧" })}</p>
              <h3 className="atlas-section-title">{pick({ "zh-CN": "选择日期", "zh-TW": "選擇日期", en: "Choose a Day", ja: "日付を選ぶ" })}</h3>
            </div>

            <div className="atlas-day-mini-grid">
              {DAY_PLANS.map((plan) => {
                const active = plan.day === selectedDay.day;
                const cleared = !!dayChecked[plan.key];
                return (
                  <button
                    key={plan.key}
                    type="button"
                    className={[
                      "atlas-day-mini-card",
                      active ? "atlas-day-mini-card-active" : "",
                      cleared ? "atlas-day-mini-card-cleared" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => jumpToDay(plan.day)}
                  >
                    <span>{String(plan.day).padStart(2, "0")}</span>
                    <strong>{plan.suit}</strong>
                    <em>{compactSkillLabel(plan.primarySkill, locale)}</em>
                  </button>
                );
              })}
            </div>

            <div className="atlas-dungeon-boss">
              <Flame className="h-4 w-4" />
              <span>
                {pick({
                  "zh-CN": `${dungeonCompleted}/${dungeonKeys.length} 个周主题已完成`,
                  "zh-TW": `${dungeonCompleted}/${dungeonKeys.length} 個週主題已完成`,
                  en: `${dungeonCompleted}/${dungeonKeys.length} weekly sections cleared`,
                  ja: `${dungeonCompleted}/${dungeonKeys.length} 週テーマ完了`,
                })}
              </span>
            </div>
          </aside>
        </section>
      </div>

    </main>
  );
};

export default HundredDays;
