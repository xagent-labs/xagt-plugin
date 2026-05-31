import { AtlasFeatureTabs } from "@/components/AtlasFeatureTabs";
import { TrainingMilestonesPanel } from "@/components/TrainingMilestonesPanel";
import { useLocale } from "@/lib/locale";

const TrainingMilestones = () => {
  const { pick } = useLocale();

  return (
    <main className="atlas-app phantom-heist-stage">
      <div className="atlas-speedlines atlas-speedlines-left" />
      <div className="atlas-speedlines atlas-speedlines-right" />
      <div className="atlas-starburst atlas-starburst-top" />
      <div className="atlas-starburst atlas-starburst-bottom" />
      <div className="phantom-heist-cutout phantom-heist-cutout-a" />
      <div className="phantom-heist-cutout phantom-heist-cutout-b" />
      <div className="phantom-heist-tape phantom-heist-tape-a" />
      <div className="phantom-heist-tape phantom-heist-tape-b" />
      <div className="phantom-heist-stamp phantom-heist-stamp-a">WANTED</div>
      <div className="phantom-heist-stamp phantom-heist-stamp-b">CLAIM</div>

      <div className="atlas-shell phantom-heist-shell">
        <header className="atlas-panel phantom-heist-hero">
          <div className="phantom-heist-grid">
            <section className="phantom-heist-copy">
              <div className="phantom-heist-kicker">
                {pick({
                  "zh-CN": "PHANTOM MAT PASS / 训练里程碑档案",
                  "zh-TW": "PHANTOM MAT PASS / 訓練里程碑檔案",
                  en: "PHANTOM MAT PASS / MILESTONE DOSSIER",
                  ja: "PHANTOM MAT PASS / マイルストーン記録",
                })}
              </div>
              <h1 className="phantom-heist-title">
                <span>MILESTONE</span>
                <strong>HEIST</strong>
              </h1>
              <p className="phantom-heist-subtitle">
                {pick({
                  "zh-CN": "日常训练只负责私密保存；第一次参赛、第一次拿名次、第一次夺冠可以自己封存，升带才需要教练确认。",
                  "zh-TW": "日常訓練只負責私密保存；第一次參賽、第一次拿名次、第一次奪冠可以自己封存，升帶才需要教練確認。",
                  en: "Daily training stays private. Your first competition, first placement, and first championship can be self-claimed, while belt promotion still needs coach verification.",
                  ja: "日々の練習は非公開のまま。初出場、初入賞、初優勝は自分で封印でき、昇帯だけはコーチ確認が必要です。",
                })}
              </p>
              <div className="phantom-heist-manifest">
                <span>{pick({ "zh-CN": "隐私日志", "zh-TW": "隱私日誌", en: "PRIVATE LOG", ja: "非公開記録" })}</span>
                <span>{pick({ "zh-CN": "比赛档案", "zh-TW": "比賽檔案", en: "MATCH DOSSIER", ja: "試合記録" })}</span>
                <span>{pick({ "zh-CN": "升带验证", "zh-TW": "升帶驗證", en: "BELT VERIFY", ja: "昇帯確認" })}</span>
                <span>{pick({ "zh-CN": "Solana 奖励", "zh-TW": "Solana 獎勵", en: "SOLANA REWARDS", ja: "Solana 報酬" })}</span>
              </div>
            </section>

            <aside className="phantom-heist-board">
              <div className="phantom-heist-wanted">
                <div className="phantom-heist-lootpile">
                  <div className="phantom-heist-lootcard phantom-heist-lootcard-a">A</div>
                  <div className="phantom-heist-lootcard phantom-heist-lootcard-b">K</div>
                  <div className="phantom-heist-lootcard phantom-heist-lootcard-c">J</div>
                  <div className="phantom-heist-chest">
                    <div className="phantom-heist-chest-lid" />
                    <div className="phantom-heist-chest-core" />
                  </div>
                  <div className="phantom-heist-lootbeam" />
                </div>
                <div className="phantom-heist-file">
                  <p>{pick({ "zh-CN": "目标类型", "zh-TW": "目標類型", en: "TARGET TYPE", ja: "ターゲット種別" })}</p>
                  <strong>{pick({ "zh-CN": "训练里程碑", "zh-TW": "訓練里程碑", en: "TRAINING MILESTONES", ja: "練習マイルストーン" })}</strong>
                  <span>{pick({ "zh-CN": "作案方式：达成后 Claim", "zh-TW": "作案方式：達成後 Claim", en: "METHOD: Unlock then Claim", ja: "方式：達成後に Claim" })}</span>
                  <div className="phantom-heist-file-tags">
                    <span>{pick({ "zh-CN": "宝箱掉落", "zh-TW": "寶箱掉落", en: "CHEST DROP", ja: "チェスト報酬" })}</span>
                    <span>{pick({ "zh-CN": "扑克牌任务", "zh-TW": "撲克牌任務", en: "CARD QUEST", ja: "カード任務" })}</span>
                    <span>{pick({ "zh-CN": "红印章认证", "zh-TW": "紅印章認證", en: "STAMPED PROOF", ja: "印章証明" })}</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </header>

        <AtlasFeatureTabs />

        <section className="phantom-heist-main">
          <section className="atlas-panel atlas-knowledge phantom-heist-panel">
            <div className="atlas-section-head">
              <p className="atlas-section-tag">
                {pick({
                  "zh-CN": "ROGUES GALLERY / 可领取档案",
                  "zh-TW": "ROGUES GALLERY / 可領取檔案",
                  en: "ROGUES GALLERY",
                  ja: "ROGUES GALLERY",
                })}
              </p>
              <h2 className="atlas-section-title">
                {pick({
                  "zh-CN": "训练里程碑",
                  "zh-TW": "訓練里程碑",
                  en: "Training Milestones",
                  ja: "トレーニングマイルストーン",
                })}
              </h2>
            </div>
            <TrainingMilestonesPanel variant="feature" />
          </section>
        </section>
      </div>
    </main>
  );
};

export default TrainingMilestones;
