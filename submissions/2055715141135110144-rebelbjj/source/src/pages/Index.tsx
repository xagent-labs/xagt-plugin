import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Flame,
  Medal,
  NotebookPen,
  Sparkles,
  Target,
  TowerControl,
  Zap,
} from "lucide-react";
import { DAY_PLANS, DAY_STORAGE_KEY } from "@/data/hundredDays";
import { compactSkillLabel } from "@/lib/contentLocale";
import { useIdentity } from "@/lib/identity";
import { useLocale } from "@/lib/locale";
import { readScopedBooleanRecord, writeScopedStorageItem } from "@/lib/storage";
import { getTrainingStreak, readTrainingLogs } from "@/lib/trainingLogs";

const SUIT_CLASSES = ["spade", "diamond", "club", "heart"];

const ROUTE_CARDS = DAY_PLANS.map((plan, index) => ({
  ...plan,
  rotate: [-3.2, -1.1, 1.3, 3.1][index % 4],
  suitClass: SUIT_CLASSES[index % SUIT_CLASSES.length],
}));

const Index = () => {
  const { locale, pick } = useLocale();
  const { storageScope } = useIdentity();
  const [isScopeReady, setIsScopeReady] = useState(true);
  const [cleared, setCleared] = useState<Record<string, boolean>>(() => {
    return readScopedBooleanRecord(DAY_STORAGE_KEY, storageScope);
  });

  useEffect(() => {
    setIsScopeReady(false);
    setCleared(readScopedBooleanRecord(DAY_STORAGE_KEY, storageScope));
    setIsScopeReady(true);
  }, [storageScope]);

  useEffect(() => {
    if (!isScopeReady) return;
    writeScopedStorageItem(DAY_STORAGE_KEY, JSON.stringify(cleared), storageScope);
  }, [cleared, isScopeReady, storageScope]);

  const completed = useMemo(() => Object.values(cleared).filter(Boolean).length, [cleared]);
  const percent = Math.round((completed / DAY_PLANS.length) * 100);
  const trainingStreak = getTrainingStreak(readTrainingLogs(storageScope));
  const nextDay = Math.min(completed + 1, DAY_PLANS.length);

  const homePortals = [
    {
      title: pick({
        "zh-CN": "进度表",
        "zh-TW": "進度表",
        en: "Plan",
        ja: "進行表",
      }),
      english: "100 DAY ROUTE",
      to: "/hundred-days?day=1",
      icon: TowerControl,
      note: pick({
        "zh-CN": "100 天拆成每天可完成的一小步",
        "zh-TW": "100 天拆成每天可完成的一小步",
        en: "A 100-day route broken into small daily goals.",
        ja: "100日を毎日進めやすい小さな目標に分解。",
      }),
    },
    {
      title: pick({
        "zh-CN": "训练日志",
        "zh-TW": "訓練日誌",
        en: "Training Log",
        ja: "練習日誌",
      }),
      english: "TRAINING LOG",
      to: "/training-log",
      icon: NotebookPen,
      note: pick({
        "zh-CN": "把每次课程、滚技和体会记下来",
        "zh-TW": "把每次課程、滾技和體會記下來",
        en: "Save class notes, rolling notes, and what you learned.",
        ja: "クラス内容、スパーの気づき、感想を記録。",
      }),
    },
    {
      title: pick({
        "zh-CN": "训练里程碑",
        "zh-TW": "訓練里程碑",
        en: "Milestones",
        ja: "マイルストーン",
      }),
      english: "PHANTOM MAT PASS",
      to: "/training-milestones",
      icon: Medal,
      note: pick({
        "zh-CN": "第一次参赛、第一次拿名次、第一次夺冠和升带都在这里领取证明",
        "zh-TW": "第一次參賽、第一次拿名次、第一次奪冠和升帶都在這裡領取證明",
        en: "Claim proofs for your first competition, first placement, first championship, and belt promotion.",
        ja: "初出場、初入賞、初優勝、昇帯の節目をここで証明化。",
      }),
    },
    {
      title: pick({
        "zh-CN": "热身转盘",
        "zh-TW": "熱身轉盤",
        en: "Warm-Up Wheel",
        ja: "ウォームアップルーレット",
      }),
      english: "WARM-UP ROULETTE",
      to: "/drills",
      icon: Zap,
      note: pick({
        "zh-CN": "热身不知道做什么时，帮你快速开练",
        "zh-TW": "熱身不知道做什麼時，幫你快速開練",
        en: "A quick way to decide how to start warming up.",
        ja: "何から動くか迷う時に、すぐ始められる。",
      }),
    },
    {
      title: pick({
        "zh-CN": "技巧库",
        "zh-TW": "技巧庫",
        en: "Move Library",
        ja: "技ライブラリ",
      }),
      english: "MOVE DOSSIER",
      to: "/atlas",
      icon: BookOpen,
      note: pick({
        "zh-CN": "按站立 / 防守 / 压制 / 降服整理",
        "zh-TW": "按站立 / 防守 / 壓制 / 降服整理",
        en: "Organized by standing, guard, control, and submissions.",
        ja: "立ち技、防御、コントロール、極めで整理。",
      }),
    },
  ];

  const heroStickers = [
    pick({
      "zh-CN": "私密日志",
      "zh-TW": "私密日誌",
      en: "PRIVATE LOGS",
      ja: "非公開ログ",
    }),
    pick({
      "zh-CN": "链上证明",
      "zh-TW": "鏈上證明",
      en: "ON-CHAIN PROOFS",
      ja: "オンチェーン証明",
    }),
    pick({
      "zh-CN": "宝箱里程碑",
      "zh-TW": "寶箱里程碑",
      en: "LOOT MILESTONES",
      ja: "宝箱マイルストーン",
    }),
  ];

  const rebelNotes = [
    {
      label: "TACTIC 01",
      title: pick({
        "zh-CN": "六个月主线推进",
        "zh-TW": "六個月主線推進",
        en: "Six-Month Route",
        ja: "6か月ルート",
      }),
      detail: pick({
        "zh-CN":
          "把容易乱掉的内容拆成每天可推进的小目标，练起来更稳，也更容易坚持。",
        "zh-TW":
          "把容易亂掉的內容拆成每天可推進的小目標，練起來更穩，也更容易堅持。",
        en: "A structured six-month route for women who want a steadier, more consistent way to learn BJJ.",
        ja: "BJJを体系的に学びたい人向けに、毎日少しずつ進められる6か月ルートを用意。",
      }),
    },
    {
      label: "TACTIC 02",
      title: pick({
        "zh-CN": "训练日志持续留痕",
        "zh-TW": "訓練日誌持續留痕",
        en: "Track Every Session",
        ja: "練習記録を残す",
      }),
      detail: pick({
        "zh-CN":
          "每次上垫后的技术、位置、手感和一句话总结都能留下来，回看时会更清楚自己是怎么慢慢进步的。",
        "zh-TW":
          "每次上墊後的技術、位置、手感和一句話總結都能留下來，回看時會更清楚自己是怎麼慢慢進步的。",
        en: "Keep notes on techniques, positions, and how the session felt so your progress is easier to see later.",
        ja: "技、ポジション、感覚、ひと言メモを残して、あとで自分の変化を見返しやすく。",
      }),
    },
    {
      label: "TACTIC 03",
      title: pick({
        "zh-CN": "热身与技巧统一入口",
        "zh-TW": "熱身與技巧統一入口",
        en: "Warm-Up + Moves Together",
        ja: "ウォームアップと技を一緒に",
      }),
      detail: pick({
        "zh-CN":
          "热身、技巧整理和训练记录放在一起，不用在备忘录、相册和收藏夹之间来回切换。",
        "zh-TW":
          "熱身、技巧整理和訓練記錄放在一起，不用在備忘錄、相冊和收藏夾之間來回切換。",
        en: "Warm-ups, move notes, and training logs live in one place instead of across multiple apps.",
        ja: "ウォームアップ、技メモ、練習記録を1か所にまとめて管理。",
      }),
    },
  ];

  const toggleCard = (event: React.MouseEvent<HTMLButtonElement>, key: string) => {
    event.preventDefault();
    event.stopPropagation();
    setCleared((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <main className="atlas-app atlas-home-app rebel-home-app">
      <div className="atlas-speedlines atlas-speedlines-left" />
      <div className="atlas-speedlines atlas-speedlines-right" />
      <div className="atlas-starburst atlas-starburst-top" />
      <div className="atlas-starburst atlas-starburst-bottom" />

      <div className="atlas-shell">
        <section className="rebel-home-hero atlas-panel">
          <div className="rebel-home-copy">
            <div className="rebel-home-stickers">
              {heroStickers.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>

            <div className="rebel-home-brand-row">
              <img
                src="/brand/phantom-mat-pass-logo.png"
                alt="Phantom Mat Pass logo"
                className="rebel-home-logo"
              />
              <div className="rebel-home-brand-copy">
                <span>PRIVATE TRAINING LOGS</span>
                <strong>SOLANA PROOFS</strong>
              </div>
            </div>

            <p className="rebel-home-overline">
              {pick({
                "zh-CN": "训练身份 / Solana 链上证明",
                "zh-TW": "訓練身份 / Solana 鏈上證明",
                en: "TRAINING IDENTITY / SOLANA PROOFS",
                ja: "トレーニングID / Solana証明",
              })}
            </p>
            <h1 className="rebel-home-title">
              <span>REBEL BJJ</span>
            </h1>
            <p className="rebel-home-subtitle">
              {pick({
                "zh-CN": "我的柔术进化地图",
                "zh-TW": "我的柔術進化地圖",
                en: "My BJJ Growth Map",
                ja: "私の柔術成長マップ",
              })}
            </p>
            <p className="rebel-home-description">
              {pick({
                "zh-CN":
                  "把每一次垫上的挣扎、每一次成功的扫技与降服，都变成永不消失的链上觉醒与可验证的成长印记",
                "zh-TW":
                  "把每一次墊上的掙扎、每一次成功的掃技與降服，都變成永不消失的鏈上覺醒與可驗證的成長印記",
                en: "Turn every hard round, every successful sweep, and every submission into an on-chain awakening and a verifiable mark of growth.",
                ja: "マット上の苦闘、決まったスイープ、一本を、消えないオンチェーンの覚醒と検証可能な成長の印に変える。",
              })}
            </p>

            <div className="rebel-home-cta-row">
              <Link to="/hundred-days?day=1" className="rebel-button rebel-button-primary">
                <Target className="h-4 w-4" />
                <span>
                  {pick({
                    "zh-CN": "进入百日主线",
                    "zh-TW": "進入百日主線",
                    en: "Open 100-Day Plan",
                    ja: "100日プランへ",
                  })}
                </span>
              </Link>
            </div>
          </div>

          <div className="rebel-home-collage">
            <article className="rebel-stat-card rebel-stat-card-main">
              <p>{pick({ "zh-CN": "当前进度", "zh-TW": "當前進度", en: "CURRENT PLAN", ja: "現在の進捗" })}</p>
              <strong>{completed}/100</strong>
              <span>
                {pick({
                  "zh-CN": `${percent}% 完成率`,
                  "zh-TW": `${percent}% 完成率`,
                  en: `${percent}% CLEAR RATE`,
                  ja: `${percent}% 完了率`,
                })}
              </span>
            </article>

            <article className="rebel-stat-card rebel-stat-card-tilt-a">
              <p>STREAK</p>
              <strong>{trainingStreak}</strong>
              <span>
                {pick({
                  "zh-CN": "连续训练天数",
                  "zh-TW": "連續訓練天數",
                  en: "days in a row",
                  ja: "連続練習日数",
                })}
              </span>
            </article>

            <article className="rebel-stat-card rebel-stat-card-tilt-b">
              <p>{pick({ "zh-CN": "下一天", "zh-TW": "下一天", en: "NEXT DAY", ja: "次の日" })}</p>
              <strong>DAY {String(nextDay).padStart(2, "0")}</strong>
              <span>
                {pick({
                  "zh-CN": "下一次练习从这里接上",
                  "zh-TW": "下一次練習從這裡接上",
                  en: "Pick up your next session from here.",
                  ja: "次の練習はここから再開。",
                })}
              </span>
            </article>

            <div className="rebel-home-progress-shell">
              <div className="rebel-home-progress-head">
                <span>ROUTE PROGRESS</span>
                <span>{percent}%</span>
              </div>
              <div className="atlas-progress-track rebel-progress-track">
                <div className="atlas-progress-fill" style={{ width: `${percent}%` }} />
              </div>
              <p>
                {pick({
                  "zh-CN": "记录不是为了给自己压力，而是为了更容易看见每一次变稳、变熟、变敢上的过程。",
                  "zh-TW": "記錄不是為了給自己壓力，而是為了更容易看見每一次變穩、變熟、變敢上的過程。",
                  en: "Tracking helps you notice each small gain in confidence, timing, and consistency.",
                  ja: "記録はプレッシャーではなく、少しずつ安定していく変化を見つけるためのものです。",
                })}
              </p>
            </div>
          </div>
        </section>

        <section className="rebel-home-tabs">
          {homePortals.map((portal) => {
            const Icon = portal.icon;
            return (
              <Link key={portal.to} to={portal.to} className="rebel-home-tab">
                <div className="rebel-home-tab-top">
                  <Icon className="h-4 w-4" />
                  <span>{portal.english}</span>
                </div>
                <h2>{portal.title}</h2>
                <p>{portal.note}</p>
                <div className="rebel-home-tab-arrow">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            );
          })}
        </section>

        <section className="rebel-home-notes">
          {rebelNotes.map((note) => (
            <article key={note.title} className="rebel-note-card">
              <p>{note.label}</p>
              <h3>{note.title}</h3>
              <span>{note.detail}</span>
            </article>
          ))}
        </section>

        <section className="rebel-route-section">
          <div className="rebel-route-head">
            <div>
              <p className="rebel-section-tag">
                {pick({
                  "zh-CN": "100 天计划 / 六个月进度表",
                  "zh-TW": "100 天計劃 / 六個月進度表",
                  en: "100 DAY PLAN / SIX-MONTH ROUTE",
                  ja: "100日プラン / 6か月進行表",
                })}
              </p>
              <h2 className="rebel-section-title">
                {pick({
                  "zh-CN": "BUILD YOUR GAME",
                  "zh-TW": "BUILD YOUR GAME",
                  en: "BUILD YOUR GAME",
                  ja: "BUILD YOUR GAME",
                })}
              </h2>
            </div>
          </div>

          <div className="rebel-star-divider" aria-hidden="true">
            <span>★</span>
            <span>★</span>
            <span>★</span>
            <span>★</span>
            <span>★</span>
          </div>

          <div className="atlas-home-route-panel rebel-route-panel">
            <div className="rebel-route-deck-grid">
              {ROUTE_CARDS.map((card) => {
              const active = !!cleared[card.key];

              return (
                <Link
                  key={card.key}
                  to={`/hundred-days?day=${card.day}`}
                  className={`atlas-route-card rebel-route-card-tile atlas-route-card-${card.suitClass} ${
                    active ? "atlas-route-card-cleared" : ""
                  }`}
                  style={{ "--card-rotate": `${card.rotate}deg` } as React.CSSProperties}
                >
                  <span className="atlas-route-card-corner atlas-route-card-corner-top">
                    {card.suit}
                  </span>
                  <span className="atlas-route-card-corner atlas-route-card-corner-bottom">
                    {card.suit}
                  </span>
                    <div className="atlas-route-card-inner">
                      <div className="atlas-route-card-head">
                        <span>DAY</span>
                        <strong>{String(card.day).padStart(2, "0")}</strong>
                      </div>
                      <div className="atlas-route-card-suit">{card.suit}</div>
                      <div className="atlas-route-card-label">
                        {compactSkillLabel(card.primarySkill, locale)}
                      </div>
                    </div>
                    <button
                      type="button"
                    className={`atlas-route-card-mark ${active ? "atlas-route-card-mark-on" : ""}`}
                      onClick={(event) => toggleCard(event, card.key)}
                      aria-label={`切换 Day ${card.day} 完成状态`}
                    >
                      {active
                        ? pick({
                            "zh-CN": "完成",
                            "zh-TW": "完成",
                            en: "Done",
                            ja: "完了",
                          })
                        : pick({
                            "zh-CN": "待练",
                            "zh-TW": "待練",
                            en: "To Do",
                            ja: "未練習",
                          })}
                    </button>
                  </Link>
              );
              })}
            </div>
          </div>

          <div className="rebel-route-bottom">
            <div className="rebel-route-bottom-left">
              <Flame className="h-4 w-4" />
              <span>
                {pick({
                  "zh-CN": "一天练一点，路线就会慢慢变成你自己的东西。",
                  "zh-TW": "一天練一點，路線就會慢慢變成你自己的東西。",
                  en: "A little every day adds up to a game that really feels like yours.",
                  ja: "少しずつ積み重ねるほど、自分の柔術になっていきます。",
                })}
              </span>
            </div>
            <div className="rebel-route-bottom-right">
              <Link to="/drills" className="rebel-bottom-link">
                <Zap className="h-4 w-4" />
                <span>
                  {pick({
                    "zh-CN": "热身转盘",
                    "zh-TW": "熱身轉盤",
                    en: "Warm-Up Wheel",
                    ja: "熱身ルーレット",
                  })}
                </span>
              </Link>
              <Link to="/atlas" className="rebel-bottom-link">
                <Sparkles className="h-4 w-4" />
                <span>
                  {pick({
                    "zh-CN": "技巧库",
                    "zh-TW": "技巧庫",
                    en: "Move Library",
                    ja: "技ライブラリ",
                  })}
                </span>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default Index;
