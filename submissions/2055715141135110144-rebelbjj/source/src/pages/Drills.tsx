import { Repeat } from "lucide-react";
import { AtlasFeatureTabs } from "@/components/AtlasFeatureTabs";
import WarmUpRoulette from "@/components/WarmUpRoulette";
import { useLocale } from "@/lib/locale";

const Drills = () => {
  const { pick } = useLocale();
  const drillSections = [
    {
      title: pick({
        "zh-CN": "SOLO DRILLS / 自练",
        "zh-TW": "SOLO DRILLS / 自練",
        en: "Solo Drills",
        ja: "ソロドリル",
      }),
      items: ["Shrimping", "Bridging", "Technical Stand-Up"],
    },
    {
      title: pick({
        "zh-CN": "PARTNER FLOW / 双人流动",
        "zh-TW": "PARTNER FLOW / 雙人流動",
        en: "Partner Flow",
        ja: "パートナーフロー",
      }),
      items: ["Guard Retention Drill", "Pummeling for Underhooks", "Flow Rolling"],
    },
    {
      title: pick({
        "zh-CN": "POSITION DRILLS / 位置专项",
        "zh-TW": "POSITION DRILLS / 位置專項",
        en: "Position Drills",
        ja: "ポジションドリル",
      }),
      items: ["Mount Circuit", "Mount Escape Circuit", "Passing Drill"],
    },
    {
      title: pick({
        "zh-CN": "SUBMISSION CHAINS / 降服串联",
        "zh-TW": "SUBMISSION CHAINS / 降服串聯",
        en: "Submission Chains",
        ja: "極めの連携",
      }),
      items: ["Armbar Chain", "Triangle Setup", "Submission Flow"],
    },
  ];

  return (
    <main className="atlas-app">
      <div className="atlas-shell">
        <header className="atlas-hero atlas-panel">
          <div className="atlas-hero-copy">
            <div className="atlas-chip">WARM-UP ROOM</div>
            <p className="atlas-kicker">
              {pick({
                "zh-CN": "先动起来 / 慢慢进入状态",
                "zh-TW": "先動起來 / 慢慢進入狀態",
                en: "MOVE FIRST / START EASY / GET READY",
                ja: "まず動く / ゆっくり入る / 準備する",
              })}
            </p>
            <h1 className="atlas-title">
              WARM-UP
              <span>
                {pick({
                  "zh-CN": " ROOM",
                  "zh-TW": " ROOM",
                  en: " ROOM",
                  ja: " ROOM",
                })}
              </span>
            </h1>
            <p className="atlas-description">
              {pick({
                "zh-CN": "上垫前不知道先做什么时，来这里抽热身，或者挑一组基础动作，先把身体和注意力慢慢带进训练状态。",
                "zh-TW": "上墊前不知道先做什麼時，來這裡抽熱身，或者挑一組基礎動作，先把身體和注意力慢慢帶進訓練狀態。",
                en: "Use the roulette or pick a drill set to ease into training before class or sparring.",
                ja: "クラスやスパー前に、ルーレットや基礎ドリルで身体をゆっくり練習モードへ。",
              })}
            </p>
          </div>
        </header>

        <AtlasFeatureTabs />

        <WarmUpRoulette />

        <section className="atlas-home-grid">
          {drillSections.map((section) => (
            <article key={section.title} className="atlas-home-portal atlas-home-portal-static">
              <div className="atlas-home-portal-top">
                <Repeat className="h-5 w-5" />
                <span>{section.title}</span>
              </div>
              <ul className="atlas-bullets atlas-bullets-tall">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
};

export default Drills;
