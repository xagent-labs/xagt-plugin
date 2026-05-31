import { FormEvent, useEffect, useRef, useState } from "react";
import { format, getDay, parseISO } from "date-fns";
import { Award, Download, Flame, NotebookPen, Plus, Save, Trash2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { AtlasFeatureTabs } from "@/components/AtlasFeatureTabs";
import { useIdentity } from "@/lib/identity";
import { useLocale } from "@/lib/locale";
import { toast } from "@/components/ui/sonner";
import {
  buildTrainingLogEntry,
  clearTrainingLogPrefill,
  createEmptyTrainingLogDraft,
  draftFromLog,
  getCurrentMonthLogs,
  getLatestTrainingDate,
  getMonthHeatmap,
  getTrainingStreak,
  readTrainingLogPrefill,
  readTrainingLogs,
  readTrainingVerifications,
  saveTrainingLogs,
  saveTrainingVerifications,
  sortTrainingLogs,
  techniquesFromInput,
  TRAINING_CATEGORIES,
  TRAINING_IDENTITIES,
  TRAINING_SESSION_TYPES,
  TRAINING_UNIFORM_TYPES,
  MENSTRUAL_PHASES,
  TrainingCategory,
  TrainingIdentity,
  TrainingLogDraft,
  TrainingVerificationRecord,
} from "@/lib/trainingLogs";

const TrainingLog = () => {
  const { pick } = useLocale();
  const { address, storageScope } = useIdentity();
  const [searchParams, setSearchParams] = useSearchParams();
  const [logs, setLogs] = useState(() => readTrainingLogs(storageScope));
  const [draft, setDraft] = useState(() => createEmptyTrainingLogDraft());
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [verifications, setVerifications] = useState<Record<string, TrainingVerificationRecord>>(() => readTrainingVerifications(storageScope));
  const [isExporting, setIsExporting] = useState(false);
  const [isScopeReady, setIsScopeReady] = useState(true);
  const exportRef = useRef<HTMLDivElement>(null);
  const appliedPrefillRef = useRef(false);

  useEffect(() => {
    if (!isScopeReady) return;
    saveTrainingLogs(logs, storageScope);
  }, [isScopeReady, logs, storageScope]);

  useEffect(() => {
    if (!isScopeReady) return;
    saveTrainingVerifications(verifications, storageScope);
  }, [isScopeReady, storageScope, verifications]);

  useEffect(() => {
    setIsScopeReady(false);
    setLogs(readTrainingLogs(storageScope));
    setVerifications(readTrainingVerifications(storageScope));
    setSelectedLogId(null);
    setDraft(createEmptyTrainingLogDraft());
    appliedPrefillRef.current = false;
    setIsScopeReady(true);
  }, [storageScope]);

  useEffect(() => {
    if (appliedPrefillRef.current) return;
    if (searchParams.get("prefill") !== "warmup") return;

    const prefill = readTrainingLogPrefill(storageScope);
    appliedPrefillRef.current = true;

    if (!prefill) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("prefill");
      setSearchParams(nextParams, { replace: true });
      return;
    }

    const baseDate = typeof prefill.date === "string" ? prefill.date : format(new Date(), "yyyy-MM-dd");
    setSelectedLogId(null);
    setDraft({
      ...createEmptyTrainingLogDraft(baseDate),
      ...prefill,
    });
    clearTrainingLogPrefill(storageScope);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("prefill");
    setSearchParams(nextParams, { replace: true });
    toast.success(
      pick({
        "zh-CN": "热身转盘结果已带入今日训练日志。",
        "zh-TW": "熱身轉盤結果已帶入今日訓練日誌。",
        en: "Warm-up result added to today’s training log.",
        ja: "ウォームアップ結果を今日の練習日誌に反映しました。",
      }),
    );
  }, [pick, searchParams, setSearchParams, storageScope]);

  const sortedLogs = sortTrainingLogs(logs);
  const currentMonthLogs = getCurrentMonthLogs(sortedLogs);
  const heatmapDays = getMonthHeatmap(sortedLogs);
  const streak = getTrainingStreak(sortedLogs);
  const latestTrainingDate = getLatestTrainingDate(sortedLogs);
  const monthLabel = format(new Date(), "yyyy.MM");
  const firstHeatmapOffset = heatmapDays.length ? getDay(parseISO(heatmapDays[0].date)) : 0;
  const activeDaysThisMonth = new Set(currentMonthLogs.map((entry) => entry.date)).size;
  const totalMinutesThisMonth = currentMonthLogs.reduce((sum, entry) => sum + entry.durationMinutes, 0);
  const techniquePreview = techniquesFromInput(draft.techniquesInput);
  const verificationList = Object.values(verifications);
  const verifiedLogIds = new Set(
    verificationList
      .filter((verification) => verification.status === "verified-by-coach")
      .map((verification) => verification.logId),
  );
  const pendingLogIds = new Set(
    verificationList
      .filter((verification) => verification.status === "pending-coach")
      .map((verification) => verification.logId),
  );
  const selectedLog = selectedLogId ? sortedLogs.find((entry) => entry.id === selectedLogId) ?? null : null;
  const verifiedSessionCount = verifiedLogIds.size;

  const weekdayLabels = pick({
    "zh-CN": ["日", "一", "二", "三", "四", "五", "六"],
    "zh-TW": ["日", "一", "二", "三", "四", "五", "六"],
    en: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"],
    ja: ["日", "月", "火", "水", "木", "金", "土"],
  });

  const sessionTypeLabels = {
    私教课: pick({ "zh-CN": "私教课", "zh-TW": "私教課", en: "Private", ja: "プライベート" }),
    团课: pick({ "zh-CN": "团课", "zh-TW": "團課", en: "Group Class", ja: "クラス" }),
    开放滚: pick({ "zh-CN": "开放滚", "zh-TW": "開放滾", en: "Open Mat", ja: "オープンマット" }),
    自练: pick({ "zh-CN": "自练", "zh-TW": "自練", en: "Solo Practice", ja: "自主練" }),
  } as const;

  const uniformTypeLabels = {
    GI: pick({ "zh-CN": "GI", "zh-TW": "GI", en: "GI", ja: "GI" }),
    "NO GI": pick({ "zh-CN": "NO GI", "zh-TW": "NO GI", en: "NO GI", ja: "NO GI" }),
  } as const;

  const menstrualPhaseLabels = {
    月经期: pick({ "zh-CN": "月经期", "zh-TW": "月經期", en: "Menstrual", ja: "月経期" }),
    卵泡期: pick({ "zh-CN": "卵泡期", "zh-TW": "卵泡期", en: "Follicular", ja: "卵胞期" }),
    排卵期: pick({ "zh-CN": "排卵期", "zh-TW": "排卵期", en: "Ovulatory", ja: "排卵期" }),
    黄体期: pick({ "zh-CN": "黄体期", "zh-TW": "黃體期", en: "Luteal", ja: "黄体期" }),
  } as const;

  const categoryLabels = {
    站立: pick({ "zh-CN": "站立", "zh-TW": "站立", en: "Standing", ja: "立ち技" }),
    防守: pick({ "zh-CN": "防守", "zh-TW": "防守", en: "Defense", ja: "防御" }),
    压制: pick({ "zh-CN": "压制", "zh-TW": "壓制", en: "Control", ja: "コントロール" }),
    降服: pick({ "zh-CN": "降服", "zh-TW": "降服", en: "Submission", ja: "極め" }),
    扫技: pick({ "zh-CN": "扫技", "zh-TW": "掃技", en: "Sweep", ja: "スイープ" }),
    逃脱: pick({ "zh-CN": "逃脱", "zh-TW": "逃脫", en: "Escape", ja: "エスケープ" }),
    过腿: pick({ "zh-CN": "过腿", "zh-TW": "過腿", en: "Passing", ja: "パス" }),
    位置控制: pick({ "zh-CN": "位置控制", "zh-TW": "位置控制", en: "Positional Control", ja: "ポジションコントロール" }),
  } as const;

  const identityLabels = {
    Top: pick({ "zh-CN": "Top", "zh-TW": "Top", en: "Top", ja: "トップ" }),
    Bottom: pick({ "zh-CN": "Bottom", "zh-TW": "Bottom", en: "Bottom", ja: "ボトム" }),
    进攻方: pick({ "zh-CN": "进攻方", "zh-TW": "進攻方", en: "Attacking", ja: "攻め" }),
    防守方: pick({ "zh-CN": "防守方", "zh-TW": "防守方", en: "Defending", ja: "守り" }),
    自由滚: pick({ "zh-CN": "自由滚", "zh-TW": "自由滾", en: "Free Roll", ja: "フリーロール" }),
  } as const;

  const updateDraft = <K extends keyof TrainingLogDraft>(key: K, value: TrainingLogDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const toggleSelection = (
    key: "categories" | "identities",
    value: TrainingCategory | TrainingIdentity,
  ) => {
    setDraft((prev) => {
      const currentValues = prev[key];
      const exists = currentValues.includes(value as never);
      return {
        ...prev,
        [key]: exists ? currentValues.filter((item) => item !== value) : [...currentValues, value],
      };
    });
  };

  const resetDraft = (date = format(new Date(), "yyyy-MM-dd")) => {
    setSelectedLogId(null);
    setDraft(createEmptyTrainingLogDraft(date));
  };

  const selectLog = (id: string) => {
    const target = sortedLogs.find((entry) => entry.id === id);
    if (!target) return;
    setSelectedLogId(target.id);
    setDraft(draftFromLog(target));
  };

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const durationMinutes = Number(draft.durationMinutes);

    if (!draft.date) {
      toast.error(
        pick({
          "zh-CN": "请先填写训练日期。",
          "zh-TW": "請先填寫訓練日期。",
          en: "Please choose a training date first.",
          ja: "まず練習日を入力してください。",
        }),
      );
      return;
    }

    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      toast.error(
        pick({
          "zh-CN": "课程时长需要是大于 0 的分钟数。",
          "zh-TW": "課程時長需要是大於 0 的分鐘數。",
          en: "Duration must be a number greater than 0.",
          ja: "練習時間は 0 より大きい分数で入力してください。",
        }),
      );
      return;
    }

    const entry = buildTrainingLogEntry(draft, selectedLogId ?? undefined);
    setLogs((prev) => {
      if (selectedLogId) {
        return sortTrainingLogs(prev.map((item) => (item.id === selectedLogId ? entry : item)));
      }
      return sortTrainingLogs([entry, ...prev]);
    });

    setSelectedLogId(entry.id);
    setDraft(draftFromLog(entry));
    toast.success(
      selectedLogId
        ? pick({
            "zh-CN": "训练记录已更新。",
            "zh-TW": "訓練記錄已更新。",
            en: "Training log updated.",
            ja: "練習記録を更新しました。",
          })
        : pick({
            "zh-CN": "新的训练记录已经写进日志。",
            "zh-TW": "新的訓練記錄已經寫進日誌。",
            en: "New training log saved.",
            ja: "新しい練習記録を保存しました。",
          }),
    );
  };

  const handleDelete = () => {
    if (!selectedLogId) return;
    const target = sortedLogs.find((entry) => entry.id === selectedLogId);
    if (!target) return;

    if (!window.confirm(
      pick({
        "zh-CN": `确认删除 ${target.date} 这条训练记录吗？`,
        "zh-TW": `確認刪除 ${target.date} 這條訓練記錄嗎？`,
        en: `Delete the training log from ${target.date}?`,
        ja: `${target.date} の練習記録を削除しますか？`,
      }),
    )) {
      return;
    }

    setLogs((prev) => prev.filter((entry) => entry.id !== selectedLogId));
    setVerifications((prev) => {
      const next = { ...prev };
      delete next[selectedLogId];
      return next;
    });
    resetDraft();
    toast.success(
      pick({
        "zh-CN": "记录已删除。",
        "zh-TW": "記錄已刪除。",
        en: "Training log deleted.",
        ja: "練習記録を削除しました。",
      }),
    );
  };

  const handleExportPdf = async () => {
    if (!currentMonthLogs.length) {
      toast.error(
        pick({
          "zh-CN": "本月还没有训练记录可导出。",
          "zh-TW": "本月還沒有訓練記錄可導出。",
          en: "There are no training logs to export this month.",
          ja: "今月はまだエクスポートできる練習記録がありません。",
        }),
      );
      return;
    }

    if (!exportRef.current) return;

    setIsExporting(true);
    try {
      const module = await import("html2pdf.js");
      const html2pdf = (module.default ?? module) as {
        (): {
          set: (options: Record<string, unknown>) => {
            from: (element: HTMLElement) => { save: () => Promise<void> };
          };
        };
      };

      await html2pdf()
        .set({
          margin: 10,
          filename: `phantom-training-diary-${format(new Date(), "yyyy-MM")}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, backgroundColor: "#050505", useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(exportRef.current)
        .save();

      toast.success(
        pick({
          "zh-CN": "本月训练日志 PDF 已导出。",
          "zh-TW": "本月訓練日誌 PDF 已導出。",
          en: "Monthly training PDF exported.",
          ja: "今月の練習PDFを出力しました。",
        }),
      );
    } catch {
      toast.error(
        pick({
          "zh-CN": "PDF 导出失败，请稍后再试。",
          "zh-TW": "PDF 導出失敗，請稍後再試。",
          en: "PDF export failed. Please try again.",
          ja: "PDFの出力に失敗しました。後でもう一度お試しください。",
        }),
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <main className="atlas-app phantom-diary-stage">
      <div className="atlas-speedlines atlas-speedlines-left" />
      <div className="atlas-speedlines atlas-speedlines-right" />
      <div className="atlas-starburst atlas-starburst-top" />
      <div className="atlas-starburst atlas-starburst-bottom" />
      <div className="atlas-mask atlas-mask-top" />
      <div className="atlas-mask atlas-mask-bottom" />
      <div className="atlas-silhouette atlas-silhouette-left" />
      <div className="atlas-silhouette atlas-silhouette-right" />

      <div className="atlas-shell">
        <header className="atlas-hero atlas-panel phantom-diary-hero">
          <div className="atlas-hero-copy">
            <div className="atlas-chip">
              {pick({
                "zh-CN": "BJJ NOTEBOOK / 柔术训练日志",
                "zh-TW": "BJJ NOTEBOOK / 柔術訓練日誌",
                en: "BJJ NOTEBOOK",
                ja: "BJJ ノート",
              })}
            </div>
            <p className="atlas-kicker">
              {pick({
                "zh-CN": "自动保存 / 刷新不丢失 / 支持本月 PDF 导出",
                "zh-TW": "自動保存 / 重新整理不丟失 / 支援本月 PDF 導出",
                en: "Auto-saved / persists after refresh / monthly PDF export",
                ja: "自動保存 / リロード後も保持 / 月次PDF書き出し",
              })}
            </p>
            <h1 className="atlas-title persona-page-title">
              {pick({ "zh-CN": "TRAINING", "zh-TW": "TRAINING", en: "TRAINING", ja: "TRAINING" })}
              <span>{pick({ "zh-CN": " DIARY", "zh-TW": " DIARY", en: " DIARY", ja: " DIARY" })}</span>
            </h1>
            <p className="atlas-description">
              {pick({
                "zh-CN": "这页继续负责记录每一次上垫的内容。训练日志是高频私密层，链上证明已经单独移到里程碑页面，只在真正值得纪念的时刻领取。",
                "zh-TW": "這頁繼續負責記錄每一次上墊的內容。訓練日誌是高頻私密層，鏈上證明已經單獨移到里程碑頁面，只在真正值得紀念的時刻領取。",
                en: "This page stays focused on daily private training notes. On-chain proofs now live on the separate milestones page and only appear for moments worth commemorating.",
                ja: "このページは日々の非公開練習記録に集中します。オンチェーン証明は独立したマイルストーンページに移り、本当に節目となる瞬間だけで受け取ります。",
              })}
            </p>
          </div>

          <section className="atlas-progress-box phantom-diary-summary-panel">
            <div className="atlas-ribbon">
              {pick({
                "zh-CN": "MONTHLY SUMMARY / 本月记录",
                "zh-TW": "MONTHLY SUMMARY / 本月記錄",
                en: "MONTHLY SUMMARY",
                ja: "月間サマリー",
              })}
            </div>

            <div className="phantom-diary-stat-grid">
              <article className="phantom-diary-stat-card">
                <span>{pick({ "zh-CN": "📓 本月记录", "zh-TW": "📓 本月記錄", en: "📓 Entries", ja: "📓 記録数" })}</span>
                <strong>{currentMonthLogs.length}</strong>
                <small>{pick({ "zh-CN": "条记录", "zh-TW": "條記錄", en: "entries", ja: "件" })}</small>
              </article>
              <article className="phantom-diary-stat-card">
                <span>{pick({ "zh-CN": "🔥 连续训练", "zh-TW": "🔥 連續訓練", en: "🔥 Streak", ja: "🔥 連続練習" })}</span>
                <strong>{streak}</strong>
                <small>{pick({ "zh-CN": "天", "zh-TW": "天", en: "days", ja: "日" })}</small>
              </article>
              <article className="phantom-diary-stat-card">
                <span>{pick({ "zh-CN": "📅 活跃天数", "zh-TW": "📅 活躍天數", en: "📅 Active Days", ja: "📅 活動日" })}</span>
                <strong>{activeDaysThisMonth}</strong>
                <small>{pick({ "zh-CN": "天", "zh-TW": "天", en: "days", ja: "日" })}</small>
              </article>
              <article className="phantom-diary-stat-card">
                <span>{pick({ "zh-CN": "⏱️ 本月时长", "zh-TW": "⏱️ 本月時長", en: "⏱️ Minutes", ja: "⏱️ 時間" })}</span>
                <strong>{totalMinutesThisMonth}</strong>
                <small>{pick({ "zh-CN": "分钟", "zh-TW": "分鐘", en: "mins", ja: "分" })}</small>
              </article>
              <article className="phantom-diary-stat-card">
                <span>{pick({ "zh-CN": "🏅 升带验证", "zh-TW": "🏅 升帶驗證", en: "🏅 Belt Verification", ja: "🏅 昇帯確認" })}</span>
                <strong>{verifiedSessionCount}</strong>
                <small>{pick({ "zh-CN": "节课", "zh-TW": "堂課", en: "sessions", ja: "回" })}</small>
              </article>
            </div>

            <p className="phantom-diary-meta-line">
              {latestTrainingDate
                ? pick({
                    "zh-CN": `最近一次记录：${format(parseISO(latestTrainingDate), "yyyy.MM.dd")} / 每天练过什么留在这里，值得纪念的节点去里程碑页领取。`,
                    "zh-TW": `最近一次記錄：${format(parseISO(latestTrainingDate), "yyyy.MM.dd")} / 每天練過什麼留在這裡，值得紀念的節點去里程碑頁領取。`,
                    en: `Latest entry: ${format(parseISO(latestTrainingDate), "yyyy.MM.dd")} / keep daily work here and claim milestone moments on the separate page.`,
                    ja: `最新記録：${format(parseISO(latestTrainingDate), "yyyy.MM.dd")} / 日々の積み重ねはここに、節目の証明は別ページで受け取りましょう。`,
                  })
                : pick({
                    "zh-CN": "还没有训练记录，就从下一次上课开始写下第一条。",
                    "zh-TW": "還沒有訓練記錄，就從下一次上課開始寫下第一條。",
                    en: "No entries yet. Start with the next class.",
                    ja: "まだ記録がありません。次のクラスから始めましょう。",
                  })}
            </p>

            <div className="phantom-diary-action-row">
              <button type="button" className="atlas-home-cta phantom-diary-action" onClick={() => resetDraft()}>
                <Plus className="h-4 w-4" />
                <span>{pick({ "zh-CN": "新建训练记录", "zh-TW": "新建訓練記錄", en: "New Log", ja: "新規記録" })}</span>
              </button>
              <button
                type="button"
                className="atlas-home-cta phantom-diary-action phantom-diary-action-dark"
                onClick={handleExportPdf}
                disabled={!currentMonthLogs.length || isExporting}
              >
                <Download className="h-4 w-4" />
                <span>
                  {isExporting
                    ? pick({ "zh-CN": "导出中...", "zh-TW": "導出中...", en: "Exporting...", ja: "出力中..." })
                    : pick({ "zh-CN": "导出本月 PDF", "zh-TW": "導出本月 PDF", en: "Export PDF", ja: "PDF出力" })}
                </span>
              </button>
            </div>
          </section>
        </header>

        <AtlasFeatureTabs />

        <section className="phantom-diary-layout">
          <aside className="phantom-diary-sidebar">
            <section className="atlas-panel atlas-knowledge phantom-diary-side-panel">
              <div className="atlas-section-head">
                <p className="atlas-section-tag">{pick({ "zh-CN": "HISTORY LIST / 历史记录", "zh-TW": "HISTORY LIST / 歷史記錄", en: "HISTORY LIST", ja: "履歴" })}</p>
                <h2 className="atlas-section-title">{pick({ "zh-CN": "最近记录", "zh-TW": "最近記錄", en: "Recent Logs", ja: "最近の記録" })}</h2>
              </div>
              <div className="phantom-history-list">
                {sortedLogs.length ? (
                  sortedLogs.map((entry) => {
                    const active = entry.id === selectedLogId;
                    return (
                      <button key={entry.id} type="button" className={`phantom-history-card ${active ? "phantom-history-card-active" : ""}`} onClick={() => selectLog(entry.id)}>
                        <div className="phantom-history-card-top">
                          <span>📅 {format(parseISO(entry.date), "MM.dd / EEE")}</span>
                          <span>{sessionTypeLabels[entry.sessionType]}</span>
                        </div>
                        <h3>{entry.summary || pick({ "zh-CN": "未填写一句话总结", "zh-TW": "未填寫一句話總結", en: "No one-line summary", ja: "ひと言まとめ未入力" })}</h3>
                        <p>
                          📍 {entry.location || pick({ "zh-CN": "地点待补充", "zh-TW": "地點待補充", en: "Location TBD", ja: "場所未入力" })} / 👨‍🏫 {entry.coach || pick({ "zh-CN": "教练待补充", "zh-TW": "教練待補充", en: "Coach TBD", ja: "コーチ未入力" })}
                        </p>
                        <div className="phantom-history-card-tags">
                          <span>⏱️ {entry.durationMinutes} min</span>
                          <span>🥋 {uniformTypeLabels[entry.uniformType]}</span>
                          <span>🌙 {menstrualPhaseLabels[entry.menstrualPhase]}</span>
                          <span>🧩 {entry.techniques.length || 0} {pick({ "zh-CN": "技术", "zh-TW": "技術", en: "moves", ja: "技" })}</span>
                          <span>
                            {verifiedLogIds.has(entry.id)
                              ? pick({ "zh-CN": "✅ 教练已验证", "zh-TW": "✅ 教練已驗證", en: "✅ Coach verified", ja: "✅ コーチ確認済み" })
                              : pendingLogIds.has(entry.id)
                                ? pick({ "zh-CN": "⏳ 等待教练", "zh-TW": "⏳ 等待教練", en: "⏳ Coach pending", ja: "⏳ コーチ待ち" })
                                : pick({ "zh-CN": "🔒 私密日志", "zh-TW": "🔒 私密日誌", en: "🔒 Private", ja: "🔒 非公開" })}
                          </span>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="phantom-empty-card">
                    <NotebookPen className="h-5 w-5" />
                    <p>{pick({ "zh-CN": "第一条日志还没写下。开始记录后，这里会按日期倒序自动归档。", "zh-TW": "第一條日誌還沒寫下。開始記錄後，這裡會按日期倒序自動歸檔。", en: "Your first training log will appear here once you start saving entries.", ja: "最初の練習記録を保存すると、ここに表示されます。" })}</p>
                  </div>
                )}
              </div>
            </section>

            <section className="atlas-panel atlas-knowledge phantom-diary-side-panel">
              <div className="atlas-section-head">
                <p className="atlas-section-tag">{pick({ "zh-CN": "HEATMAP / 本月训练热力图", "zh-TW": "HEATMAP / 本月訓練熱力圖", en: "HEATMAP", ja: "ヒートマップ" })}</p>
                <h2 className="atlas-section-title">{monthLabel}</h2>
              </div>
              <div className="phantom-heatmap-weekdays">
                {weekdayLabels.map((label) => <span key={label}>{label}</span>)}
              </div>
              <div className="phantom-heatmap-grid">
                {Array.from({ length: firstHeatmapOffset }).map((_, index) => <span key={`gap-${index}`} className="phantom-heatmap-gap" aria-hidden="true" />)}
                {heatmapDays.map((day) => {
                  const levelClass =
                    day.count >= 3 ? "phantom-heatmap-cell-hot"
                      : day.count === 2 ? "phantom-heatmap-cell-warm"
                        : day.count === 1 ? "phantom-heatmap-cell-on"
                          : "";

                  return (
                    <div
                      key={day.date}
                      className={["phantom-heatmap-cell", levelClass, day.isToday ? "phantom-heatmap-cell-today" : ""].filter(Boolean).join(" ")}
                      title={pick({
                        "zh-CN": `${day.date} / ${day.count ? `${day.count} 次训练` : "休整日"}`,
                        "zh-TW": `${day.date} / ${day.count ? `${day.count} 次訓練` : "休整日"}`,
                        en: `${day.date} / ${day.count ? `${day.count} sessions` : "Rest day"}`,
                        ja: `${day.date} / ${day.count ? `${day.count} 回練習` : "休み"}`,
                      })}
                    >
                      <span>{day.dayNumber}</span>
                    </div>
                  );
                })}
              </div>
              <div className="phantom-heatmap-legend">
                <span>{pick({ "zh-CN": "⚪ 休整", "zh-TW": "⚪ 休整", en: "⚪ Rest", ja: "⚪ 休み" })}</span>
                <span>{pick({ "zh-CN": "🔴 1 次", "zh-TW": "🔴 1 次", en: "🔴 1", ja: "🔴 1回" })}</span>
                <span>{pick({ "zh-CN": "🟥 2 次", "zh-TW": "🟥 2 次", en: "🟥 2", ja: "🟥 2回" })}</span>
                <span>{pick({ "zh-CN": "🔥 3+ 次", "zh-TW": "🔥 3+ 次", en: "🔥 3+", ja: "🔥 3回+" })}</span>
              </div>
            </section>

            <section ref={exportRef} className="atlas-panel atlas-knowledge phantom-diary-side-panel phantom-export-sheet">
              <div className="atlas-section-head">
                <p className="atlas-section-tag">{pick({ "zh-CN": "PDF SHEET / 月度导出页", "zh-TW": "PDF SHEET / 月度導出頁", en: "PDF SHEET", ja: "PDFシート" })}</p>
                <h2 className="atlas-section-title">MONTHLY TRAINING REPORT</h2>
              </div>
              <div className="phantom-export-intro">
                <p>{pick({ "zh-CN": `📅 月份：${monthLabel}`, "zh-TW": `📅 月份：${monthLabel}`, en: `📅 Month: ${monthLabel}`, ja: `📅 月：${monthLabel}` })}</p>
                <p>{pick({ "zh-CN": `🔥 当前 streak：${streak} 天`, "zh-TW": `🔥 當前 streak：${streak} 天`, en: `🔥 Current streak: ${streak} days`, ja: `🔥 連続練習：${streak}日` })}</p>
                <p>{pick({ "zh-CN": `⏱️ 本月总时长：${totalMinutesThisMonth} 分钟`, "zh-TW": `⏱️ 本月總時長：${totalMinutesThisMonth} 分鐘`, en: `⏱️ Total this month: ${totalMinutesThisMonth} mins`, ja: `⏱️ 今月合計：${totalMinutesThisMonth}分` })}</p>
              </div>
              <div className="phantom-export-list">
                {currentMonthLogs.length ? (
                  currentMonthLogs.map((entry) => (
                    <article key={entry.id} className="phantom-export-card">
                      <div className="phantom-export-card-head">
                        <strong>{format(parseISO(entry.date), "yyyy.MM.dd")}</strong>
                        <span>{sessionTypeLabels[entry.sessionType]}</span>
                      </div>
                      <p>🥋 {pick({ "zh-CN": "训练类型", "zh-TW": "訓練類型", en: "Uniform", ja: "トレーニング種別" })}：{uniformTypeLabels[entry.uniformType]} / 🌙 {menstrualPhaseLabels[entry.menstrualPhase]}</p>
                      <p>📍 {entry.location || pick({ "zh-CN": "地点未填写", "zh-TW": "地點未填寫", en: "Location empty", ja: "場所未入力" })} / 👨‍🏫 {entry.coach || pick({ "zh-CN": "教练未填写", "zh-TW": "教練未填寫", en: "Coach empty", ja: "コーチ未入力" })}</p>
                      <p>🥋 {pick({ "zh-CN": "技术", "zh-TW": "技術", en: "Moves", ja: "技" })}：{entry.techniques.join(" / ") || pick({ "zh-CN": "未填写", "zh-TW": "未填寫", en: "Empty", ja: "未入力" })}</p>
                      <p>🎯 {pick({ "zh-CN": "重点", "zh-TW": "重點", en: "Focus", ja: "重点" })}：{entry.focus || pick({ "zh-CN": "未填写", "zh-TW": "未填寫", en: "Empty", ja: "未入力" })}</p>
                      <p>📝 {pick({ "zh-CN": "总结", "zh-TW": "總結", en: "Summary", ja: "まとめ" })}：{entry.summary || pick({ "zh-CN": "未填写", "zh-TW": "未填寫", en: "Empty", ja: "未入力" })}</p>
                    </article>
                  ))
                ) : (
                  <p className="phantom-export-empty">{pick({ "zh-CN": "本月暂无训练记录。", "zh-TW": "本月暫無訓練記錄。", en: "No training logs this month.", ja: "今月の練習記録はまだありません。" })}</p>
                )}
              </div>
            </section>
          </aside>

          <section className="atlas-panel atlas-knowledge phantom-diary-form-panel">
            <div className="atlas-section-head atlas-section-head-wide">
              <div>
                <p className="atlas-section-tag">{pick({ "zh-CN": "LOG FORM / 训练记录表", "zh-TW": "LOG FORM / 訓練記錄表", en: "LOG FORM", ja: "記録フォーム" })}</p>
                <h2 className="atlas-section-title">
                  {selectedLogId
                    ? pick({ "zh-CN": "编辑当前记录", "zh-TW": "編輯當前記錄", en: "Edit Current Log", ja: "記録を編集" })
                    : pick({ "zh-CN": "新增一条训练日志", "zh-TW": "新增一條訓練日誌", en: "Add Training Log", ja: "新しい記録を追加" })}
                </h2>
              </div>
              <div className="phantom-form-badge">
                {selectedLogId
                  ? pick({ "zh-CN": "📝 正在编辑", "zh-TW": "📝 正在編輯", en: "📝 Editing", ja: "📝 編集中" })
                  : pick({ "zh-CN": "📓 新建记录", "zh-TW": "📓 新建記錄", en: "📓 New Entry", ja: "📓 新規記録" })}
              </div>
            </div>

            <form className="phantom-diary-form" onSubmit={handleSave}>
              <div className="phantom-field-grid phantom-field-grid-three">
                <label className="phantom-field">
                  <span>{pick({ "zh-CN": "📅 日期", "zh-TW": "📅 日期", en: "📅 Date", ja: "📅 日付" })}</span>
                  <input type="date" value={draft.date} onChange={(event) => updateDraft("date", event.target.value)} required />
                </label>
                <label className="phantom-field">
                  <span>{pick({ "zh-CN": "⏱️ 课程时长（分钟）", "zh-TW": "⏱️ 課程時長（分鐘）", en: "⏱️ Duration (mins)", ja: "⏱️ 練習時間（分）" })}</span>
                  <input type="number" min="1" value={draft.durationMinutes} onChange={(event) => updateDraft("durationMinutes", event.target.value)} placeholder="90" required />
                </label>
                <label className="phantom-field">
                  <span>{pick({ "zh-CN": "📍 课程地点", "zh-TW": "📍 課程地點", en: "📍 Location", ja: "📍 場所" })}</span>
                  <input type="text" value={draft.location} onChange={(event) => updateDraft("location", event.target.value)} placeholder={pick({ "zh-CN": "俱乐部 / 学校 / 家里", "zh-TW": "俱樂部 / 學校 / 家裡", en: "Gym / school / home", ja: "ジム / 学校 / 自宅" })} />
                </label>
              </div>

              <div className="phantom-field-grid phantom-field-grid-three">
                <label className="phantom-field">
                  <span>{pick({ "zh-CN": "📚 课程性质", "zh-TW": "📚 課程性質", en: "📚 Session Type", ja: "📚 練習タイプ" })}</span>
                  <select value={draft.sessionType} onChange={(event) => updateDraft("sessionType", event.target.value as never)}>
                    {TRAINING_SESSION_TYPES.map((type) => <option key={type} value={type}>{sessionTypeLabels[type]}</option>)}
                  </select>
                </label>
                <label className="phantom-field">
                  <span>{pick({ "zh-CN": "🥋 有无道服", "zh-TW": "🥋 有無道服", en: "🥋 GI / NO GI", ja: "🥋 GI / NO GI" })}</span>
                  <select value={draft.uniformType} onChange={(event) => updateDraft("uniformType", event.target.value as never)}>
                    {TRAINING_UNIFORM_TYPES.map((type) => <option key={type} value={type}>{uniformTypeLabels[type]}</option>)}
                  </select>
                </label>
                <label className="phantom-field">
                  <span>{pick({ "zh-CN": "🌙 生理周期", "zh-TW": "🌙 生理週期", en: "🌙 Cycle Phase", ja: "🌙 生理周期" })}</span>
                  <select value={draft.menstrualPhase} onChange={(event) => updateDraft("menstrualPhase", event.target.value as never)}>
                    {MENSTRUAL_PHASES.map((phase) => <option key={phase} value={phase}>{menstrualPhaseLabels[phase]}</option>)}
                  </select>
                </label>
              </div>

              <div className="phantom-field-grid phantom-field-grid-two">
                <label className="phantom-field">
                  <span>{pick({ "zh-CN": "👨‍🏫 教练名称", "zh-TW": "👨‍🏫 教練名稱", en: "👨‍🏫 Coach", ja: "👨‍🏫 コーチ" })}</span>
                  <input type="text" value={draft.coach} onChange={(event) => updateDraft("coach", event.target.value)} placeholder={pick({ "zh-CN": "例如：王教练", "zh-TW": "例如：王教練", en: "e.g. Coach Wang", ja: "例：王コーチ" })} />
                </label>
                <label className="phantom-field">
                  <span>{pick({ "zh-CN": "🎯 今日重点", "zh-TW": "🎯 今日重點", en: "🎯 Focus", ja: "🎯 今日の重点" })}</span>
                  <input type="text" value={draft.focus} onChange={(event) => updateDraft("focus", event.target.value)} placeholder={pick({ "zh-CN": "例如：站立进入别急，先破势再抱腿", "zh-TW": "例如：站立進入別急，先破勢再抱腿", en: "e.g. slow down the standing entry and break posture first", ja: "例：組みに急がず、まず崩してから入る" })} />
                </label>
              </div>

              <label className="phantom-field">
                <span>{pick({ "zh-CN": "🥋 今天学习的技术名称（可多个，用逗号分隔）", "zh-TW": "🥋 今天學習的技術名稱（可多個，用逗號分隔）", en: "🥋 Techniques learned today (comma separated)", ja: "🥋 今日の技（カンマ区切り）" })}</span>
                <input type="text" value={draft.techniquesInput} onChange={(event) => updateDraft("techniquesInput", event.target.value)} placeholder="single leg, knee cut pass, kimura trap" />
              </label>

              <div className="phantom-chip-preview">
                {techniquePreview.length ? (
                  techniquePreview.map((technique) => <span key={technique} className="phantom-preview-chip">{technique}</span>)
                ) : (
                  <span className="phantom-preview-chip phantom-preview-chip-muted">
                    {pick({ "zh-CN": "还没有技术标签，输入后会在这里预览", "zh-TW": "還沒有技術標籤，輸入後會在這裡預覽", en: "Technique tags will preview here.", ja: "技タグのプレビューがここに表示されます。" })}
                  </span>
                )}
              </div>

              <section className="phantom-tag-section">
                <div className="phantom-tag-section-head">
                  <h3>{pick({ "zh-CN": "🧩 技术分类", "zh-TW": "🧩 技術分類", en: "🧩 Categories", ja: "🧩 技の分類" })}</h3>
                  <p>{pick({ "zh-CN": "可多选，方便你以后按主题回看", "zh-TW": "可多選，方便你以後按主題回看", en: "Pick multiple to review by theme later.", ja: "複数選択すると後でテーマ別に見返しやすくなります。" })}</p>
                </div>
                <div className="phantom-tag-grid">
                  {TRAINING_CATEGORIES.map((category) => (
                    <button key={category} type="button" className={`phantom-tag-button ${draft.categories.includes(category) ? "phantom-tag-button-active" : ""}`} onClick={() => toggleSelection("categories", category)}>
                      {categoryLabels[category]}
                    </button>
                  ))}
                </div>
              </section>

              <section className="phantom-tag-section">
                <div className="phantom-tag-section-head">
                  <h3>{pick({ "zh-CN": "⚔️ 今天的身份", "zh-TW": "⚔️ 今天的身份", en: "⚔️ Roles Today", ja: "⚔️ 今日の立場" })}</h3>
                  <p>{pick({ "zh-CN": "把你今天经常出现的位置和角色记下来", "zh-TW": "把你今天經常出現的位置和角色記下來", en: "Mark the roles and positions you spent time in today.", ja: "今日よくいたポジションや役割を記録します。" })}</p>
                </div>
                <div className="phantom-tag-grid">
                  {TRAINING_IDENTITIES.map((identity) => (
                    <button key={identity} type="button" className={`phantom-tag-button ${draft.identities.includes(identity) ? "phantom-tag-button-active" : ""}`} onClick={() => toggleSelection("identities", identity)}>
                      {identityLabels[identity]}
                    </button>
                  ))}
                </div>
              </section>

              <div className="phantom-field-grid phantom-field-grid-two">
                <label className="phantom-field">
                  <span>{pick({ "zh-CN": "📝 今天的笔记", "zh-TW": "📝 今天的筆記", en: "📝 Notes", ja: "📝 メモ" })}</span>
                  <textarea rows={6} value={draft.notes} onChange={(event) => updateDraft("notes", event.target.value)} placeholder={pick({ "zh-CN": "记录老师讲的关键细节、自己卡住的点、滚技里被抓到的漏洞。", "zh-TW": "記錄老師講的關鍵細節、自己卡住的點、滾技裡被抓到的漏洞。", en: "Write down key details from class, problem spots, and what broke down in rolling.", ja: "クラスの要点、詰まった点、スパーで崩れた部分をメモします。" })} />
                </label>
                <label className="phantom-field">
                  <span>{pick({ "zh-CN": "💭 今天的实践感受", "zh-TW": "💭 今天的實踐感受", en: "💭 How It Felt", ja: "💭 今日の感覚" })}</span>
                  <textarea rows={6} value={draft.feeling} onChange={(event) => updateDraft("feeling", event.target.value)} placeholder={pick({ "zh-CN": "可以加 emoji：😵 动作乱了 / 😎 找到节奏 / 🔥 压制更稳 / 😭 体能崩了", "zh-TW": "可以加 emoji：😵 動作亂了 / 😎 找到節奏 / 🔥 壓制更穩 / 😭 體能崩了", en: "You can use emoji too: 😵 messy / 😎 found rhythm / 🔥 more stable / 😭 cardio collapsed", ja: "絵文字もOK：😵 崩れた / 😎 リズムが出た / 🔥 安定した / 😭 体力切れ" })} />
                </label>
              </div>

              <label className="phantom-field">
                <span>{pick({ "zh-CN": "📣 今天的一个总结", "zh-TW": "📣 今天的一個總結", en: "📣 One-Line Summary", ja: "📣 ひとことまとめ" })}</span>
                <textarea rows={4} value={draft.summary} onChange={(event) => updateDraft("summary", event.target.value)} placeholder={pick({ "zh-CN": "一句话或短段，比如：今天终于把切膝过腿和头位控制连到一起了。", "zh-TW": "一句話或短段，比如：今天終於把切膝過腿和頭位控制連到一起了。", en: "A sentence or short note, e.g. knee-cut passing finally linked with head position control.", ja: "ひとこと、または短い一文。例：今日はニーカットと頭の位置がつながった。" })} />
              </label>

              <div className="phantom-milestone-note">
                <Award className="h-4 w-4" />
                <span>
                  {pick({
                    "zh-CN": "训练日志继续私密保存。比赛、名次、冠军和升带这些节点才会提交公开摘要和 proof digest，不包含笔记、感受和生理周期。",
                    "zh-TW": "訓練日誌繼續私密保存。比賽、名次、冠軍和升帶這些節點才會提交公開摘要和 proof digest，不包含筆記、感受和生理週期。",
                    en: "Training logs stay private. Only competition, placement, championship, and belt-promotion milestones send a public summary and proof digest.",
                    ja: "練習記録は非公開のままです。試合、入賞、優勝、昇帯の節目だけが公開サマリーと proof digest を送ります。",
                  })}
                </span>
              </div>

              <div className="phantom-form-actions">
                <button type="submit" className="atlas-home-cta phantom-diary-action">
                  <Save className="h-4 w-4" />
                  <span>{selectedLogId ? pick({ "zh-CN": "保存修改", "zh-TW": "保存修改", en: "Save Changes", ja: "変更を保存" }) : pick({ "zh-CN": "存入日志", "zh-TW": "存入日誌", en: "Save Log", ja: "保存する" })}</span>
                </button>
                <button type="button" className="atlas-home-cta phantom-diary-action phantom-diary-action-dark" onClick={() => resetDraft(draft.date)}>
                  <Plus className="h-4 w-4" />
                  <span>{pick({ "zh-CN": "清空为新记录", "zh-TW": "清空為新記錄", en: "Reset for New Log", ja: "新しい記録にリセット" })}</span>
                </button>
                <button type="button" className="atlas-home-cta phantom-diary-action phantom-diary-action-danger" onClick={handleDelete} disabled={!selectedLogId}>
                  <Trash2 className="h-4 w-4" />
                  <span>{pick({ "zh-CN": "删除当前记录", "zh-TW": "刪除當前記錄", en: "Delete Current Log", ja: "現在の記録を削除" })}</span>
                </button>
              </div>
            </form>

            <div className="phantom-diary-tipline">
              <Flame className="h-4 w-4" />
              <span>
                {pick({
                  "zh-CN": "写日志时别只记“今天不行”。试着写下一个做对的点，再写一个下次要提醒自己的点。",
                  "zh-TW": "寫日誌時別只記「今天不行」。試著寫下一個做對的點，再寫一個下次要提醒自己的點。",
                  en: "Try not to write only what went wrong. Add one thing you did well and one reminder for next time.",
                  ja: "うまくいかなかったことだけでなく、できたこと1つと次回の改善点1つも書いてみましょう。",
                })}
              </span>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
};

export default TrainingLog;
