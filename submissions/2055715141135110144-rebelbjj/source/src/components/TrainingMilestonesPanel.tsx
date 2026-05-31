import { useEffect, useMemo, useState } from "react";
import { Award, Diamond, Spade, Club, Heart, Gem } from "lucide-react";
import { useIdentity } from "@/lib/identity";
import { useLocale } from "@/lib/locale";
import {
  createMilestoneDigest,
  getMilestoneProgressValue,
  getTrainingSessionCount,
  getTrainingStreak,
  getVerifiedTrainingSessionCount,
  readTrainingLogs,
  readTrainingMilestoneClaims,
  readTrainingVerifications,
  saveTrainingMilestoneClaims,
  sortTrainingLogs,
  TRAINING_MILESTONES,
  TrainingMilestoneClaim,
  TrainingMilestoneDefinition,
} from "@/lib/trainingLogs";
import {
  getDevnetWalletStatus,
  requestDevnetAirdrop,
  sendTrainingMemoAttestation,
} from "@/lib/solanaAttestation";
import { buildTrainingRewardSummary } from "@/lib/trainingRewards";
import { toast } from "@/components/ui/sonner";

type MilestoneCard = TrainingMilestoneDefinition & {
  currentValue: number;
  completed: boolean;
  claimed: boolean;
  progressPercent: number;
  claim?: TrainingMilestoneClaim;
};

type TrainingMilestonesPanelProps = {
  variant?: "compact" | "feature";
};

export const TrainingMilestonesPanel = ({ variant = "compact" }: TrainingMilestonesPanelProps) => {
  const { pick } = useLocale();
  const { address, storageScope, hasEmailIdentity, hasWalletIdentity, walletName, walletProvider } = useIdentity();
  const [milestoneClaims, setMilestoneClaims] = useState<Record<string, TrainingMilestoneClaim>>(() => readTrainingMilestoneClaims(storageScope));
  const [isFundingDevnet, setIsFundingDevnet] = useState(false);
  const [claimingMilestoneId, setClaimingMilestoneId] = useState<string | null>(null);
  const [devnetBalance, setDevnetBalance] = useState<number | null>(null);
  const [isScopeReady, setIsScopeReady] = useState(true);
  const sortedLogs = sortTrainingLogs(readTrainingLogs(storageScope));
  const verifications = readTrainingVerifications(storageScope);
  const streak = getTrainingStreak(sortedLogs);
  const totalSessions = getTrainingSessionCount(sortedLogs);
  const verifiedSessionCount = getVerifiedTrainingSessionCount(verifications);
  const isPhantomWallet = walletProvider === "phantom";
  const devnetSignerAddress = isPhantomWallet ? address : null;
  const rewardSummary = useMemo(
    () => buildTrainingRewardSummary(sortedLogs, milestoneClaims),
    [milestoneClaims, sortedLogs],
  );

  useEffect(() => {
    if (!isScopeReady) return;
    saveTrainingMilestoneClaims(milestoneClaims, storageScope);
  }, [isScopeReady, milestoneClaims, storageScope]);

  useEffect(() => {
    setIsScopeReady(false);
    setMilestoneClaims(readTrainingMilestoneClaims(storageScope));
    setIsScopeReady(true);
  }, [storageScope]);

  useEffect(() => {
    if (!devnetSignerAddress) {
      setDevnetBalance(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const status = await getDevnetWalletStatus(devnetSignerAddress);
        if (!cancelled) setDevnetBalance(status.sol);
      } catch {
        if (!cancelled) setDevnetBalance(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [devnetSignerAddress]);

  const milestoneCards = useMemo<MilestoneCard[]>(() => {
    return TRAINING_MILESTONES.map((milestone) => {
      const currentValue = getMilestoneProgressValue(sortedLogs, milestone, verifications);
      const claim = milestoneClaims[milestone.id];
      return {
        ...milestone,
        currentValue,
        completed: currentValue >= milestone.target,
        claimed: !!claim,
        progressPercent: Math.min(100, Math.round((currentValue / milestone.target) * 100)),
        claim,
      };
    });
  }, [milestoneClaims, sortedLogs, verifications]);

  const handleClaimDevnetSol = async () => {
    if (!devnetSignerAddress) {
      toast.error(
        pick({
          "zh-CN": "请先连接 Phantom。OKX 可作为身份登录，但当前 Devnet proof 仍用 Phantom 签名。",
          "zh-TW": "請先連接 Phantom。OKX 可作為身份登入，但目前 Devnet proof 仍用 Phantom 簽名。",
          en: "Connect Phantom first. OKX can be used for identity login, but Devnet proofs still use Phantom signing.",
          ja: "先に Phantom を接続してください。OKX はIDログイン用で、Devnet proof は Phantom 署名を使います。",
        }),
      );
      return;
    }

    setIsFundingDevnet(true);
    try {
      const result = await requestDevnetAirdrop(devnetSignerAddress);
      setDevnetBalance(result.sol);
      toast.success(
        pick({
          "zh-CN": `已领取 Devnet SOL。当前余额约 ${result.sol.toFixed(3)} SOL。`,
          "zh-TW": `已領取 Devnet SOL。當前餘額約 ${result.sol.toFixed(3)} SOL。`,
          en: `Devnet SOL received. Current balance: about ${result.sol.toFixed(3)} SOL.`,
          ja: `Devnet SOL を受け取りました。現在の残高は約 ${result.sol.toFixed(3)} SOL です。`,
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      toast.error(
        message ||
          pick({
            "zh-CN": "Devnet 空投领取失败，请稍后再试。",
            "zh-TW": "Devnet 空投領取失敗，請稍後再試。",
            en: "Failed to claim Devnet SOL. Please try again shortly.",
            ja: "Devnet SOL の受け取りに失敗しました。しばらくしてからもう一度お試しください。",
          }),
      );
    } finally {
      setIsFundingDevnet(false);
    }
  };

  const handleClaimMilestone = async (milestone: TrainingMilestoneDefinition) => {
    if (!devnetSignerAddress) {
      toast.error(
        pick({
          "zh-CN": "请先连接 Phantom，再领取训练里程碑证明。OKX 登录已支持，但这个 Devnet proof 仍需要 Phantom 签名。",
          "zh-TW": "請先連接 Phantom，再領取訓練里程碑證明。OKX 登入已支援，但這個 Devnet proof 仍需要 Phantom 簽名。",
          en: "Connect Phantom before claiming a milestone proof. OKX login is supported, but this Devnet proof still needs Phantom signing.",
          ja: "マイルストーン証明を受け取る前に Phantom を接続してください。OKX ログインは対応済みですが、この Devnet proof は Phantom 署名が必要です。",
        }),
      );
      return;
    }

    if (milestone.claimMode === "verified" && verifiedSessionCount < milestone.target) {
      toast.error(
        pick({
          "zh-CN": "这个里程碑需要更多教练验证记录。",
          "zh-TW": "這個里程碑需要更多教練驗證記錄。",
          en: "This milestone needs more coach-verified sessions.",
          ja: "このマイルストーンには、さらにコーチ確認済みの練習が必要です。",
        }),
      );
      return;
    }

    if (milestoneClaims[milestone.id]) {
      toast.error(
        pick({
          "zh-CN": "这个里程碑已经领取过了。",
          "zh-TW": "這個里程碑已經領取過了。",
          en: "This milestone has already been claimed.",
          ja: "このマイルストーンはすでに受け取り済みです。",
        }),
      );
      return;
    }

    const walletStatus = await getDevnetWalletStatus(devnetSignerAddress);
    setDevnetBalance(walletStatus.sol);
    if (walletStatus.needsAirdrop) {
      toast.error(
        pick({
          "zh-CN": "当前 Devnet 余额不足。先领取 Devnet SOL，再回来 claim 这个 milestone。",
          "zh-TW": "當前 Devnet 餘額不足。先領取 Devnet SOL，再回來 claim 這個 milestone。",
          en: "Your Devnet balance is too low. Claim Devnet SOL first, then come back to claim this milestone.",
          ja: "Devnet 残高が不足しています。先に Devnet SOL を受け取ってから、このマイルストーンを claim してください。",
        }),
      );
      return;
    }

    const currentValue = getMilestoneProgressValue(sortedLogs, milestone, verifications);
    if (currentValue < milestone.target) {
      toast.error(
        pick({
          "zh-CN": "这个 milestone 还没达成。",
          "zh-TW": "這個 milestone 還沒達成。",
          en: "This milestone is not unlocked yet.",
          ja: "このマイルストーンはまだ解放されていません。",
        }),
      );
      return;
    }

    setClaimingMilestoneId(milestone.id);
    try {
      const digest = await createMilestoneDigest({
        milestoneId: milestone.id,
        target: milestone.target,
        currentValue,
        sessionCount: totalSessions,
        streak,
        verifiedSessionCount,
      });

      const attestation = await sendTrainingMemoAttestation(
        devnetSignerAddress,
        milestone,
        digest,
        currentValue,
        totalSessions,
        streak,
        verifiedSessionCount,
      );

      setMilestoneClaims((prev) => ({
        ...prev,
        [milestone.id]: {
          milestoneId: milestone.id,
          walletAddress: devnetSignerAddress,
          digest,
          createdAt: Date.now(),
          network: attestation.networkLabel,
          verificationStatus: "confirmed-devnet",
          txSignature: attestation.signature,
          explorerUrl: attestation.explorerUrl,
          verifiedSessionCount,
        },
      }));

      toast.success(
        pick({
          "zh-CN": "训练里程碑证明已写入 Solana Devnet。",
          "zh-TW": "訓練里程碑證明已寫入 Solana Devnet。",
          en: "Milestone proof was written to Solana Devnet.",
          ja: "マイルストーン証明を Solana Devnet に書き込みました。",
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      const expired = message.toLowerCase().includes("block height exceeded") || message.toLowerCase().includes("expired");
      const fundsIssue =
        message.toLowerCase().includes("attempt to debit an account but found no record of a prior credit") ||
        message.toLowerCase().includes("insufficient funds");

      const expiredMessage = pick({
        "zh-CN": "这笔 Devnet 交易确认超时了。请再点一次 claim，并尽快在 Phantom 弹窗里确认。",
        "zh-TW": "這筆 Devnet 交易確認超時了。請再點一次 claim，並盡快在 Phantom 彈窗裡確認。",
        en: "This Devnet transaction expired before confirmation. Try claiming again and approve the Phantom popup quickly.",
        ja: "この Devnet 取引は確認前に期限切れになりました。もう一度 claim して、Phantom の確認をすぐ完了してください。",
      });

      const fundsMessage = pick({
        "zh-CN": "当前 Devnet 钱包没有可用 SOL。先领取 Devnet SOL，再回来 claim milestone。",
        "zh-TW": "當前 Devnet 錢包沒有可用 SOL。先領取 Devnet SOL，再回來 claim milestone。",
        en: "This Devnet wallet does not have usable SOL yet. Claim Devnet SOL first, then come back to claim the milestone.",
        ja: "この Devnet ウォレットには使える SOL がありません。先に Devnet SOL を受け取ってから、もう一度 claim してください。",
      });

      const fallbackMessage = pick({
        "zh-CN": "里程碑证明发送失败，请确认 Phantom 已切到 Devnet 并完成钱包签名。",
        "zh-TW": "里程碑證明發送失敗，請確認 Phantom 已切到 Devnet 並完成錢包簽名。",
        en: "Failed to send the milestone proof. Make sure Phantom is on Devnet and approve the wallet signature.",
        ja: "マイルストーン証明の送信に失敗しました。Phantom が Devnet になっていることと、ウォレット署名を確認してください。",
      });

      toast.error(fundsIssue ? fundsMessage : expired ? expiredMessage : message || fallbackMessage);
    } finally {
      setClaimingMilestoneId(null);
    }
  };

  const milestoneLabel = (milestone: TrainingMilestoneDefinition) => {
    switch (milestone.id) {
      case "streak-7":
        return pick({ "zh-CN": "连续训练 7 天", "zh-TW": "連續訓練 7 天", en: "7-Day Streak", ja: "7日連続練習" });
      case "streak-14":
        return pick({ "zh-CN": "连续训练 14 天", "zh-TW": "連續訓練 14 天", en: "14-Day Streak", ja: "14日連続練習" });
      case "streak-30":
        return pick({ "zh-CN": "连续训练 30 天", "zh-TW": "連續訓練 30 天", en: "30-Day Streak", ja: "30日連続練習" });
      case "sessions-10":
        return pick({ "zh-CN": "累计 10 次训练", "zh-TW": "累計 10 次訓練", en: "10 Sessions", ja: "累計10回練習" });
      case "sessions-50":
        return pick({ "zh-CN": "累计 50 次训练", "zh-TW": "累計 50 次訓練", en: "50 Sessions", ja: "累計50回練習" });
      case "sessions-100":
        return pick({ "zh-CN": "累计 100 次训练", "zh-TW": "累計 100 次訓練", en: "100 Sessions", ja: "累計100回練習" });
      case "first-competition":
        return pick({ "zh-CN": "第一次参加柔术比赛", "zh-TW": "第一次參加柔術比賽", en: "First BJJ Competition", ja: "初めての柔術大会出場" });
      case "first-placement":
        return pick({ "zh-CN": "第一次在比赛中拿到名次", "zh-TW": "第一次在比賽中拿到名次", en: "First Placement", ja: "初入賞" });
      case "first-championship":
        return pick({ "zh-CN": "第一次在比赛中拿到冠军", "zh-TW": "第一次在比賽中拿到冠軍", en: "First Championship", ja: "初優勝" });
      case "belt-promotion":
        return pick({ "zh-CN": "升带", "zh-TW": "升帶", en: "Belt Promotion", ja: "昇帯" });
      default:
        return milestone.id;
    }
  };

  const milestoneDescription = (milestone: TrainingMilestoneDefinition) => {
    switch (milestone.id) {
      case "streak-7":
      case "streak-14":
      case "streak-30":
        return pick({
          "zh-CN": "把日复一日地上垫，变成一个真正可以展示的训练韧性 proof。",
          "zh-TW": "把日復一日地上墊，變成一個真正可以展示的訓練韌性 proof。",
          en: "Turn steady mat time into a visible proof of training consistency.",
          ja: "日々の継続を、見せられる練習の一貫性 proof に変えます。",
        });
      case "sessions-10":
      case "sessions-50":
      case "sessions-100":
        return pick({
          "zh-CN": "用累计训练量，而不是单次情绪，来证明你真的练了多久。",
          "zh-TW": "用累計訓練量，而不是單次情緒，來證明你真的練了多久。",
          en: "Use accumulated volume, not one-off feelings, to show how much work you have really put in.",
          ja: "一回ごとの感情ではなく、積み上げた練習量で努力を示します。",
        });
      case "first-competition":
        return pick({
          "zh-CN": "第一次站上赛场，把出场本身也封成一张可领的档案。",
          "zh-TW": "第一次站上賽場，把出場本身也封成一張可領的檔案。",
          en: "Seal your first appearance on the mat as a claimable archive.",
          ja: "初めて試合に出た瞬間を、そのまま claim できる記録にします。",
        });
      case "first-placement":
        return pick({
          "zh-CN": "第一次拿到名次，把成绩和现场感一起存进里程碑。",
          "zh-TW": "第一次拿到名次，把成績和現場感一起存進里程碑。",
          en: "Lock your first placement into the milestone cabinet.",
          ja: "初めての入賞を、そのままマイルストーンに封印します。",
        });
      case "first-championship":
        return pick({
          "zh-CN": "第一次夺冠时，直接给这页冠军瞬间上锁。",
          "zh-TW": "第一次奪冠時，直接給這頁冠軍瞬間上鎖。",
          en: "Turn your first title into a locked trophy page.",
          ja: "初優勝の瞬間を、そのままトロフィーページに固定します。",
        });
      case "belt-promotion":
        return pick({
          "zh-CN": "升带需要教练验证记录，不再只靠自己申报。",
          "zh-TW": "升帶需要教練驗證記錄，不再只靠自己申報。",
          en: "Belt promotion needs coach-verified sessions, not self-report alone.",
          ja: "昇帯には自己申告ではなく、コーチ確認済みの記録が必要です。",
        });
      default:
        return milestone.id;
    }
  };

  const featureMilestoneCards = milestoneCards;
  const featuredMilestone = featureMilestoneCards.find((milestone) => !milestone.claimed) ?? featureMilestoneCards[0] ?? milestoneCards[0];
  const secondaryMilestones = featureMilestoneCards.filter((milestone) => milestone.id !== featuredMilestone?.id);
  const rewardPreview = rewardSummary.unlocks.slice(0, 3);
  const stepList = [
    {
      id: "step-1",
      label: pick({ "zh-CN": "档案建立", "zh-TW": "檔案建立", en: "DOSSIER", ja: "記録作成" }),
      active: hasEmailIdentity,
    },
    {
      id: "step-2",
      label: pick({ "zh-CN": "本周任务", "zh-TW": "本週任務", en: "QUESTS", ja: "任務" }),
      active: rewardSummary.quests.some((quest) => quest.completed),
    },
    {
      id: "step-3",
      label: pick({ "zh-CN": "链上封存", "zh-TW": "鏈上封存", en: "SEAL", ja: "封印" }),
      active: rewardSummary.claimedProofCount > 0,
    },
    {
      id: "step-4",
      label: pick({ "zh-CN": "黑客松展示", "zh-TW": "黑客松展示", en: "SHOWCASE", ja: "展示" }),
      active: rewardSummary.claimedProofCount >= 3,
    },
  ];

  const compactProgressLabel = (value: number, target: number) =>
    pick({
      "zh-CN": `${Math.min(value, target)} / ${target}`,
      "zh-TW": `${Math.min(value, target)} / ${target}`,
      en: `${Math.min(value, target)} / ${target}`,
      ja: `${Math.min(value, target)} / ${target}`,
    });

  return (
    <>
      <div className={variant === "feature" ? "phantom-milestone-page-shell" : ""}>
        {variant === "feature" ? (
          <section className="phantom-objective-sheet">
            <div className="phantom-objective-topline">
              <span className="phantom-objective-banner">
                {pick({
                  "zh-CN": "路程目标 / 项目目标",
                  "zh-TW": "路程目標 / 項目目標",
                  en: "ROADMAP TARGET / OPERATION GOAL",
                  ja: "ロードマップ目標 / 作戦目標",
                })}
              </span>
              <span className="phantom-objective-level-badge">LV.{rewardSummary.level}</span>
            </div>

            <div className="phantom-objective-layout">
              <article className="phantom-objective-poster">
                <div className="phantom-objective-poster-frame">
                  <div className="phantom-objective-poster-art">
                    <div className="phantom-objective-slash phantom-objective-slash-a" />
                    <div className="phantom-objective-slash phantom-objective-slash-b" />
                    <div className="phantom-objective-slash phantom-objective-slash-c" />
                    <div className="phantom-objective-rank-burst">
                      <span>LV.{rewardSummary.level}</span>
                    </div>
                    <div className="phantom-objective-wanted-stamp">CLAIM</div>
                    <div className="phantom-objective-cardfan">
                      <div className="phantom-objective-card phantom-objective-card-a"><Spade className="h-5 w-5" /><strong>A</strong></div>
                      <div className="phantom-objective-card phantom-objective-card-b"><Heart className="h-5 w-5" /><strong>K</strong></div>
                      <div className="phantom-objective-card phantom-objective-card-c"><Club className="h-5 w-5" /><strong>Q</strong></div>
                      <div className="phantom-objective-card phantom-objective-card-d"><Diamond className="h-5 w-5" /><strong>J</strong></div>
                    </div>
                    <div className="phantom-objective-lootchest">
                      <div className="phantom-objective-lootchest-lid" />
                      <div className="phantom-objective-lootchest-core">
                        <Gem className="h-6 w-6" />
                      </div>
                      <div className="phantom-objective-lootchest-keyhole" />
                    </div>
                    <div className="phantom-objective-card phantom-objective-float-card phantom-objective-float-card-a"><Spade className="h-5 w-5" /><strong>7</strong></div>
                    <div className="phantom-objective-card phantom-objective-float-card phantom-objective-float-card-b"><Diamond className="h-5 w-5" /><strong>10</strong></div>
                    <div className="phantom-objective-poster-slogan">
                      <strong>REBEL LOOT</strong>
                      <span>MAT THIEF</span>
                    </div>
                    <div className="phantom-objective-proof-ticket">
                      <small>BELT VERIFY</small>
                      <strong>{verifiedSessionCount}</strong>
                    </div>
                  </div>
                </div>
                <div className="phantom-objective-poster-meta">
                  <p>{pick({ "zh-CN": "主任务", "zh-TW": "主任務", en: "MAIN OBJECTIVE", ja: "主目標" })}</p>
                  <h3>{featuredMilestone ? milestoneLabel(featuredMilestone) : pick({ "zh-CN": "训练里程碑", "zh-TW": "訓練里程碑", en: "Training Milestone", ja: "トレーニングマイルストーン" })}</h3>
                  <span>
                    {featuredMilestone
                      ? milestoneDescription(featuredMilestone)
                      : pick({
                          "zh-CN": "先建立训练档案，再把值得纪念的节点封存到链上。",
                          "zh-TW": "先建立訓練檔案，再把值得紀念的節點封存到鏈上。",
                          en: "Build the dossier first, then seal the moments worth remembering on-chain.",
                          ja: "まず記録を積み上げて、残す価値のある瞬間をオンチェーンに封印します。",
                        })}
                  </span>
                </div>
              </article>

              <section className="phantom-objective-mission">
                <div className="phantom-objective-stepbar">
                  {stepList.map((step, index) => (
                    <div
                      key={step.id}
                      className={`phantom-objective-step ${step.active ? "phantom-objective-step-active" : ""}`}
                    >
                      <strong>{index + 1}</strong>
                      <span>{step.label}</span>
                    </div>
                  ))}
                </div>

                <div className="phantom-objective-goal-card">
                  <div className="phantom-objective-goal-head">
                    <div>
                      <p>{pick({ "zh-CN": "完成目标 / 第二阶段所有任务", "zh-TW": "完成目標 / 第二階段所有任務", en: "COMPLETE GOAL / PHASE TWO TASKS", ja: "目標達成 / 第2段階タスク" })}</p>
                      <h3>{rewardSummary.rankTitle}</h3>
                    </div>
                    <span className="phantom-objective-chain-tag">{rewardSummary.chainBonusLabel}</span>
                  </div>

                  <div className="phantom-objective-goal-bar">
                    <div
                      className="phantom-objective-goal-bar-fill"
                      style={{ width: `${Math.min(100, Math.round((rewardSummary.xpIntoLevel / rewardSummary.xpForNextLevel) * 100))}%` }}
                    />
                  </div>

                  <div className="phantom-objective-goal-grid">
                    <article className="phantom-objective-stat">
                      <span>{pick({ "zh-CN": "主角升至", "zh-TW": "主角升至", en: "RANK UP TO", ja: "ランク到達" })}</span>
                      <strong>LV.{rewardSummary.level}</strong>
                      <small>{pick({ "zh-CN": `${rewardSummary.xpIntoLevel}/${rewardSummary.xpForNextLevel} XP`, "zh-TW": `${rewardSummary.xpIntoLevel}/${rewardSummary.xpForNextLevel} XP`, en: `${rewardSummary.xpIntoLevel}/${rewardSummary.xpForNextLevel} XP`, ja: `${rewardSummary.xpIntoLevel}/${rewardSummary.xpForNextLevel} XP` })}</small>
                    </article>
                    <article className="phantom-objective-stat">
                      <span>{pick({ "zh-CN": "连续训练", "zh-TW": "連續訓練", en: "STREAK", ja: "連続練習" })}</span>
                      <strong>{rewardSummary.streak}</strong>
                      <small>{pick({ "zh-CN": "天", "zh-TW": "天", en: "days", ja: "日" })}</small>
                    </article>
                    <article className="phantom-objective-stat">
                      <span>{pick({ "zh-CN": "链上证明", "zh-TW": "鏈上證明", en: "ON-CHAIN", ja: "オンチェーン" })}</span>
                      <strong>{rewardSummary.claimedProofCount}</strong>
                      <small>{pick({ "zh-CN": "条", "zh-TW": "條", en: "proofs", ja: "件" })}</small>
                    </article>
                    <article className="phantom-objective-stat">
                      <span>{pick({ "zh-CN": "升带验证", "zh-TW": "升帶驗證", en: "BELT VERIFY", ja: "昇帯確認" })}</span>
                      <strong>{verifiedSessionCount}</strong>
                      <small>{pick({ "zh-CN": "节课", "zh-TW": "堂課", en: "verified", ja: "確認済み" })}</small>
                    </article>
                  </div>
                </div>

                <div className="phantom-objective-quest-panel">
                  {rewardSummary.quests.map((quest) => {
                    const percent = Math.min(100, Math.round((quest.progress / quest.target) * 100));
                    return (
                      <article key={quest.id} className={`phantom-objective-quest-row ${quest.completed ? "phantom-objective-quest-row-complete" : ""}`}>
                        <div className="phantom-objective-quest-copy">
                          <strong>{quest.title}</strong>
                          <p>{quest.description}</p>
                        </div>
                        <div className="phantom-objective-quest-progress">
                          <span>{quest.completed ? "CLEAR" : `${quest.progress}/${quest.target}`}</span>
                          <div className="phantom-objective-mini-bar">
                            <div className="phantom-objective-mini-bar-fill" style={{ width: `${percent}%` }} />
                          </div>
                          <small>{quest.rewardLabel}</small>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="phantom-objective-reward-strip">
                  {rewardPreview.map((unlock, index) => (
                    <article
                      key={unlock.id}
                      className={`phantom-objective-loot phantom-objective-loot-${(index % 3) + 1} ${unlock.unlocked ? "phantom-objective-loot-live" : ""}`}
                    >
                      <div className="phantom-objective-loot-icon">
                        <Gem className="h-5 w-5" />
                      </div>
                      <strong>{unlock.title}</strong>
                      <span>{unlock.requirementLabel}</span>
                    </article>
                  ))}
                </div>

                <div className="phantom-objective-ops-row">
                  <div className="phantom-identity-chips">
                    <span className={`phantom-identity-chip ${hasEmailIdentity ? "phantom-identity-chip-live" : ""}`}>
                      {hasEmailIdentity
                        ? pick({ "zh-CN": "邮箱档案已启用", "zh-TW": "信箱檔案已啟用", en: "Email dossier active", ja: "メール記録 有効" })
                        : pick({ "zh-CN": "建议先启用邮箱档案", "zh-TW": "建議先啟用信箱檔案", en: "Recommended: enable email dossier", ja: "まずメール記録を有効化" })}
                    </span>
                    <span className={`phantom-identity-chip ${hasWalletIdentity ? "phantom-identity-chip-live" : ""}`}>
                      {hasWalletIdentity
                        ? pick({
                            "zh-CN": `${walletName ?? "钱包"} 已连接`,
                            "zh-TW": `${walletName ?? "錢包"} 已連接`,
                            en: `${walletName ?? "Wallet"} connected`,
                            ja: `${walletName ?? "ウォレット"} 接続済み`,
                          })
                        : pick({ "zh-CN": "钱包尚未连接", "zh-TW": "錢包尚未連接", en: "Wallet not connected", ja: "ウォレット未接続" })}
                    </span>
                    {devnetSignerAddress ? (
                      <span className="phantom-identity-chip phantom-identity-chip-live">
                        {devnetBalance === null
                          ? pick({ "zh-CN": "Devnet 检查中", "zh-TW": "Devnet 檢查中", en: "Devnet checking", ja: "Devnet確認中" })
                          : pick({
                              "zh-CN": `余额 ${devnetBalance.toFixed(3)} SOL`,
                              "zh-TW": `餘額 ${devnetBalance.toFixed(3)} SOL`,
                              en: `Balance ${devnetBalance.toFixed(3)} SOL`,
                              ja: `残高 ${devnetBalance.toFixed(3)} SOL`,
                            })}
                      </span>
                    ) : null}
                  </div>

                  {devnetSignerAddress ? (
                    <button
                      type="button"
                      className="phantom-proof-link phantom-proof-button phantom-objective-devnet-button"
                      onClick={() => void handleClaimDevnetSol()}
                      disabled={isFundingDevnet}
                    >
                      {isFundingDevnet
                        ? pick({ "zh-CN": "领取中...", "zh-TW": "領取中...", en: "Claiming...", ja: "受け取り中..." })
                        : pick({ "zh-CN": "领取 Devnet SOL", "zh-TW": "領取 Devnet SOL", en: "Claim Devnet SOL", ja: "Devnet SOL を受け取る" })}
                    </button>
                  ) : null}
                </div>
              </section>
            </div>
          </section>
        ) : (
          <div className="phantom-empty-card">
            <p>
                  {address || hasEmailIdentity
                    ? pick({
                        "zh-CN": "平时先安心写日志，等第一次参赛、第一次名次、第一次夺冠或升带时，再来这里领取奖励与链上 proof。",
                        "zh-TW": "平時先安心寫日誌，等第一次參賽、第一次名次、第一次奪冠或升帶時，再來這裡領取獎勵與鏈上 proof。",
                        en: "Keep daily notes first, then return when your first competition, placement, championship, or belt promotion unlocks rewards and on-chain proofs.",
                        ja: "日々の記録を続けて、初出場、初入賞、初優勝、昇帯の節目にここで報酬とオンチェーン proof を受け取ります。",
                      })
                : pick({
                    "zh-CN": "先用邮箱建立训练档案，再用 Phantom 负责 milestone 上链。这样日常记录和链上时刻会各司其职。",
                    "zh-TW": "先用信箱建立訓練檔案，再用 Phantom 負責 milestone 上鏈。這樣日常記錄和鏈上時刻會各司其職。",
                    en: "Use email for your training dossier first, then use Phantom for milestone claims. Daily tracking and on-chain moments stay cleanly separated.",
                    ja: "まずメールで練習記録を作り、Phantom でマイルストーンを claim します。日々の記録とオンチェーンの瞬間を分けて管理できます。",
                  })}
            </p>
          </div>
        )}

        <div className={variant === "feature" ? "phantom-objective-subgrid" : "phantom-milestone-list"}>
          {milestoneCards.map((milestone, index) => (
            <article
              key={milestone.id}
              className={variant === "feature" ? `phantom-objective-sidecard phantom-milestone-wanted-${index % 4} ${featuredMilestone?.id === milestone.id ? "phantom-objective-sidecard-featured" : ""}` : "phantom-milestone-card"}
            >
              <div className="phantom-milestone-top">
                <span className="phantom-milestone-badge">
                  {milestone.kind === "streak"
                    ? pick({ "zh-CN": "STREAK", "zh-TW": "STREAK", en: "STREAK", ja: "STREAK" })
                    : milestone.kind === "volume"
                      ? pick({ "zh-CN": "VOLUME", "zh-TW": "VOLUME", en: "VOLUME", ja: "VOLUME" })
                      : milestone.kind === "competition"
                        ? pick({ "zh-CN": "MATCH", "zh-TW": "MATCH", en: "MATCH", ja: "MATCH" })
                      : pick({ "zh-CN": "VERIFY", "zh-TW": "VERIFY", en: "VERIFY", ja: "VERIFY" })}
                </span>
                <span>
                  {milestone.claimed
                    ? pick({ "zh-CN": "已领取", "zh-TW": "已領取", en: "Claimed", ja: "受け取り済み" })
                    : milestone.completed
                        ? pick({ "zh-CN": "可领取", "zh-TW": "可領取", en: "Ready to Claim", ja: "受け取り可能" })
                        : pick({ "zh-CN": "进行中", "zh-TW": "進行中", en: "In Progress", ja: "進行中" })}
                </span>
              </div>
              <h3>{milestoneLabel(milestone)}</h3>
              <p>{milestoneDescription(milestone)}</p>
              <>
                <div className="phantom-milestone-meter">
                  <div className="phantom-milestone-meter-fill" style={{ width: `${milestone.progressPercent}%` }} />
                </div>
                <div className="phantom-milestone-meta">
                  <span>
                    {pick({
                      "zh-CN": `进度：${compactProgressLabel(milestone.currentValue, milestone.target)}`,
                      "zh-TW": `進度：${compactProgressLabel(milestone.currentValue, milestone.target)}`,
                      en: `Progress: ${compactProgressLabel(milestone.currentValue, milestone.target)}`,
                      ja: `進捗：${compactProgressLabel(milestone.currentValue, milestone.target)}`,
                    })}
                  </span>
                </div>
              </>
              {milestone.claim?.txSignature ? (
                <a
                  href={milestone.claim.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="phantom-proof-link"
                >
                  {pick({
                    "zh-CN": "查看链上证明",
                    "zh-TW": "查看鏈上證明",
                    en: "View Proof",
                    ja: "証明を見る",
                  })}
                </a>
              ) : null}
              <div className="phantom-milestone-actions">
                <button
                  type="button"
                  className="atlas-home-cta phantom-diary-action phantom-objective-claim-button"
                  onClick={() => void handleClaimMilestone(milestone)}
                  disabled={
                    milestone.claimed ||
                    !milestone.completed ||
                    claimingMilestoneId === milestone.id
                  }
                >
                  <Award className="h-4 w-4" />
                  <span>
                    {claimingMilestoneId === milestone.id
                      ? pick({ "zh-CN": "领取中...", "zh-TW": "領取中...", en: "Claiming...", ja: "受け取り中..." })
                      : milestone.claimed
                        ? pick({ "zh-CN": "已领取", "zh-TW": "已領取", en: "Claimed", ja: "受け取り済み" })
                        : pick({ "zh-CN": "Claim Milestone", "zh-TW": "Claim Milestone", en: "Claim Milestone", ja: "Milestone を claim" })}
                  </span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </>
  );
};
