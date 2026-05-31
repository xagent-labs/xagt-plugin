import { Shield, Swords, Target } from "lucide-react";
import { AtlasFeatureTabs } from "@/components/AtlasFeatureTabs";
import { useLocale } from "@/lib/locale";

const Atlas = () => {
  const { pick } = useLocale();
  const areas = [
    {
      title: pick({
        "zh-CN": "站立 STANDING",
        "zh-TW": "站立 STANDING",
        en: "Standing",
        ja: "スタンディング",
      }),
      icon: Swords,
      bullets: [
        pick({ "zh-CN": "姿势 posture", "zh-TW": "姿勢 posture", en: "Posture", ja: "姿勢" }),
        pick({ "zh-CN": "抢把 grip fighting", "zh-TW": "搶把 grip fighting", en: "Grip fighting", ja: "グリップファイト" }),
        pick({ "zh-CN": "双腿抱摔 double leg", "zh-TW": "雙腿抱摔 double leg", en: "Double leg", ja: "ダブルレッグ" }),
        pick({ "zh-CN": "单腿抱摔 single leg", "zh-TW": "單腿抱摔 single leg", en: "Single leg", ja: "シングルレッグ" }),
      ],
    },
    {
      title: pick({
        "zh-CN": "防守 GUARD",
        "zh-TW": "防守 GUARD",
        en: "Guard",
        ja: "ガード",
      }),
      icon: Shield,
      bullets: ["Closed guard", "Half guard", "Open guard", "Single leg X"],
    },
    {
      title: pick({
        "zh-CN": "压制 CONTROL",
        "zh-TW": "壓制 CONTROL",
        en: "Control",
        ja: "コントロール",
      }),
      icon: Target,
      bullets: ["Side control", "Mount", "Back mount", "Knee on belly"],
    },
  ];

  return (
    <main className="atlas-app">
      <div className="atlas-shell">
        <header className="atlas-hero atlas-panel">
          <div className="atlas-hero-copy">
            <div className="atlas-chip">MOVE LIBRARY</div>
            <p className="atlas-kicker">
              {pick({
                "zh-CN": "位置 / 基础 / 复盘",
                "zh-TW": "位置 / 基礎 / 復盤",
                en: "POSITIONS / BASICS / REVIEW",
                ja: "ポジション / 基本 / 振り返り",
              })}
            </p>
            <h1 className="atlas-title">
              BJJ
              <span>
                {pick({
                  "zh-CN": " BASICS",
                  "zh-TW": " BASICS",
                  en: " BASICS",
                  ja: " BASICS",
                })}
              </span>
            </h1>
            <p className="atlas-description">
              {pick({
                "zh-CN": "这里把课上常见的位置和技术按主题收好，方便你在课前预习、课后回看，或写训练日志时快速对照。",
                "zh-TW": "這裡把課上常見的位置和技術按主題收好，方便你在課前預習、課後回看，或寫訓練日誌時快速對照。",
                en: "A small move library for reviewing positions and techniques before or after class.",
                ja: "クラス前後に見返しやすい、ポジションと技の小さなライブラリです。",
              })}
            </p>
          </div>
        </header>

        <AtlasFeatureTabs />

        <section className="atlas-home-grid">
          {areas.map((area) => {
            const Icon = area.icon;
            return (
              <article key={area.title} className="atlas-home-portal atlas-home-portal-static">
                <div className="atlas-home-portal-top">
                  <Icon className="h-5 w-5" />
                  <span>{area.title}</span>
                </div>
                <ul className="atlas-bullets atlas-bullets-tall">
                  {area.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
};

export default Atlas;
