import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Flame, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useIdentity } from "@/lib/identity";
import { useLocale } from "@/lib/locale";
import { toast } from "@/components/ui/sonner";
import { saveTrainingLogPrefill } from "@/lib/trainingLogs";

type WarmUpSegment = {
  id: string;
  title: string;
  english: string;
  shortLines: string[];
  prescription: string;
  flavor: string;
  recordNote: string;
  background: string;
  border: string;
  text: string;
  accent: string;
  weight: number;
  kind: "standard" | "penalty" | "reward" | "jackpot";
};

type Picker = <T>(variants: { "zh-CN": T; "zh-TW"?: T; en?: T; ja?: T }) => T;

const buildWarmUpSegments = (pick: Picker): WarmUpSegment[] => [
  {
    id: "shrimping",
    title: pick({ "zh-CN": "虾行", "zh-TW": "蝦行", en: "Shrimping", ja: "エビ" }),
    english: "Shrimping / Hip Escape",
    shortLines: pick({
      "zh-CN": ["虾行", "Hip Escape"],
      "zh-TW": ["蝦行", "Hip Escape"],
      en: ["Shrimping", "Hip Escape"],
      ja: ["エビ", "Hip Escape"],
    }),
    prescription: pick({
      "zh-CN": "推荐：12 次每侧，或 20 米往返 x 2",
      "zh-TW": "推薦：12 次每側，或 20 米往返 x 2",
      en: "Suggested: 12 reps each side, or 2 x 20m down-and-back",
      ja: "目安：左右12回、または20m往復 x 2",
    }),
    flavor: pick({
      "zh-CN": "先把髋部和侧向移动叫醒，等会做逃脱和防守会更顺。",
      "zh-TW": "先把髖部和側向移動叫醒，等會做逃脫和防守會更順。",
      en: "Wake up your hips and lateral movement first so escapes feel smoother later.",
      ja: "まず股関節と横移動を起こしておくと、後のエスケープがやりやすくなります。",
    }),
    recordNote: pick({
      "zh-CN": "热身转盘抽中：虾行 Shrimping / Hip Escape，完成 12 次每侧或 20 米往返 x 2。",
      "zh-TW": "熱身轉盤抽中：蝦行 Shrimping / Hip Escape，完成 12 次每側或 20 米往返 x 2。",
      en: "Warm-up wheel: Shrimping / Hip Escape, completed 12 reps each side or 2 x 20m down-and-back.",
      ja: "ウォームアップルーレット：エビ / Hip Escape、左右12回または20m往復 x 2 を実施。",
    }),
    background: "#111111",
    border: "#FFFFFF",
    text: "#FFFFFF",
    accent: "#00F0FF",
    weight: 1,
    kind: "standard",
  },
  {
    id: "technical-standup",
    title: pick({ "zh-CN": "技术起身", "zh-TW": "技術起身", en: "Technical Stand Up", ja: "テクニカルスタンドアップ" }),
    english: "Technical Stand Up / Tactical Get-Up",
    shortLines: pick({
      "zh-CN": ["技术起身", "Tactical Get-Up"],
      "zh-TW": ["技術起身", "Tactical Get-Up"],
      en: ["Technical", "Tactical Get-Up"],
      ja: ["テクニカル", "Get-Up"],
    }),
    prescription: pick({
      "zh-CN": "推荐：8 次每侧，动作干净比速度重要",
      "zh-TW": "推薦：8 次每側，動作乾淨比速度重要",
      en: "Suggested: 8 reps each side, clean mechanics over speed",
      ja: "目安：左右8回、速さより丁寧さを優先",
    }),
    flavor: pick({
      "zh-CN": "稳稳起身，比急着站快更重要。把动作做干净就很好。",
      "zh-TW": "穩穩起身，比急著站快更重要。把動作做乾淨就很好。",
      en: "A steady stand-up matters more than rushing. Clean reps are enough.",
      ja: "急いで立つより、安定して立つことが大切。丁寧にできれば十分です。",
    }),
    recordNote: pick({
      "zh-CN": "热身转盘抽中：技术起身 Technical Stand Up / Tactical Get-Up，完成 8 次每侧。",
      "zh-TW": "熱身轉盤抽中：技術起身 Technical Stand Up / Tactical Get-Up，完成 8 次每側。",
      en: "Warm-up wheel: Technical Stand Up / Tactical Get-Up, completed 8 reps each side.",
      ja: "ウォームアップルーレット：テクニカルスタンドアップ、左右8回を実施。",
    }),
    background: "#D92323",
    border: "#FFFFFF",
    text: "#FFFFFF",
    accent: "#00F0FF",
    weight: 1,
    kind: "standard",
  },
  {
    id: "forward-roll",
    title: pick({ "zh-CN": "前滚翻", "zh-TW": "前滾翻", en: "Forward Roll", ja: "前転" }),
    english: "Forward Roll",
    shortLines: pick({
      "zh-CN": ["前滚翻", "Forward Roll"],
      "zh-TW": ["前滾翻", "Forward Roll"],
      en: ["Forward", "Roll"],
      ja: ["前転", "Forward Roll"],
    }),
    prescription: pick({
      "zh-CN": "推荐：6-8 次，保持圆背顺滑过肩",
      "zh-TW": "推薦：6-8 次，保持圓背順滑過肩",
      en: "Suggested: 6-8 reps with a smooth shoulder roll",
      ja: "目安：6〜8回、肩を丸くしてスムーズに",
    }),
    flavor: pick({
      "zh-CN": "把身体滚顺，后面的转换会轻松很多。",
      "zh-TW": "把身體滾順，後面的轉換會輕鬆很多。",
      en: "A smoother roll makes later transitions much easier.",
      ja: "前転を滑らかにしておくと、その後の切り替えが楽になります。",
    }),
    recordNote: pick({
      "zh-CN": "热身转盘抽中：前滚翻 Forward Roll，完成 6-8 次。",
      "zh-TW": "熱身轉盤抽中：前滾翻 Forward Roll，完成 6-8 次。",
      en: "Warm-up wheel: Forward Roll, completed 6-8 reps.",
      ja: "ウォームアップルーレット：前転、6〜8回を実施。",
    }),
    background: "#F4F4F4",
    border: "#111111",
    text: "#111111",
    accent: "#D92323",
    weight: 1,
    kind: "standard",
  },
  {
    id: "backward-roll",
    title: pick({ "zh-CN": "后滚翻", "zh-TW": "後滾翻", en: "Backward Roll", ja: "後転" }),
    english: "Backward Roll",
    shortLines: pick({
      "zh-CN": ["后滚翻", "Backward Roll"],
      "zh-TW": ["後滾翻", "Backward Roll"],
      en: ["Backward", "Roll"],
      ja: ["後転", "Backward Roll"],
    }),
    prescription: pick({
      "zh-CN": "推荐：6 次，重心后送，别慌张硬压脖子",
      "zh-TW": "推薦：6 次，重心後送，別慌張硬壓脖子",
      en: "Suggested: 6 reps, send your weight back without crunching the neck",
      ja: "目安：6回、重心を後ろへ。首を無理に押し込まない",
    }),
    flavor: pick({
      "zh-CN": "向后滚也要放松，重心找到后会更有安全感。",
      "zh-TW": "向後滾也要放鬆，重心找到後會更有安全感。",
      en: "Relax into the backward roll and the movement feels much safer.",
      ja: "後転でも力まず、重心を見つけると安心して動けます。",
    }),
    recordNote: pick({
      "zh-CN": "热身转盘抽中：后滚翻 Backward Roll，完成 6 次。",
      "zh-TW": "熱身轉盤抽中：後滾翻 Backward Roll，完成 6 次。",
      en: "Warm-up wheel: Backward Roll, completed 6 reps.",
      ja: "ウォームアップルーレット：後転、6回を実施。",
    }),
    background: "#111111",
    border: "#FFFFFF",
    text: "#FFFFFF",
    accent: "#00F0FF",
    weight: 1,
    kind: "standard",
  },
  {
    id: "side-roll",
    title: pick({ "zh-CN": "侧滚翻", "zh-TW": "側滾翻", en: "Side Roll", ja: "横回転" }),
    english: "Side Roll",
    shortLines: pick({
      "zh-CN": ["侧滚翻", "Side Roll"],
      "zh-TW": ["側滾翻", "Side Roll"],
      en: ["Side", "Roll"],
      ja: ["横回転", "Side Roll"],
    }),
    prescription: pick({
      "zh-CN": "推荐：6 次每侧，找准肩线和侧向转换",
      "zh-TW": "推薦：6 次每側，找準肩線和側向轉換",
      en: "Suggested: 6 reps each side, focusing on shoulder line and direction change",
      ja: "目安：左右6回、肩のラインと方向転換を意識",
    }),
    flavor: pick({
      "zh-CN": "左右都滚一遍，身体会更快进入转换状态。",
      "zh-TW": "左右都滾一遍，身體會更快進入轉換狀態。",
      en: "Rolling both ways helps your body settle into transitions faster.",
      ja: "左右どちらも行うと、切り替えに入りやすくなります。",
    }),
    recordNote: pick({
      "zh-CN": "热身转盘抽中：侧滚翻 Side Roll，完成 6 次每侧。",
      "zh-TW": "熱身轉盤抽中：側滾翻 Side Roll，完成 6 次每側。",
      en: "Warm-up wheel: Side Roll, completed 6 reps each side.",
      ja: "ウォームアップルーレット：横回転、左右6回を実施。",
    }),
    background: "#D92323",
    border: "#FFFFFF",
    text: "#FFFFFF",
    accent: "#F4F4F4",
    weight: 1,
    kind: "standard",
  },
  {
    id: "inchworm-pushup",
    title: pick({ "zh-CN": "英寸虫爬行", "zh-TW": "英寸蟲爬行", en: "Inchworm + Push-up", ja: "インチワーム + 腕立て" }),
    english: "Inchworm + Push-up",
    shortLines: pick({
      "zh-CN": ["英寸虫", "+ Push-up"],
      "zh-TW": ["英寸蟲", "+ Push-up"],
      en: ["Inchworm", "+ Push-up"],
      ja: ["インチワーム", "+ Push-up"],
    }),
    prescription: pick({
      "zh-CN": "推荐：6 轮，手脚拉开后加 1 次标准俯卧撑",
      "zh-TW": "推薦：6 輪，手腳拉開後加 1 次標準俯臥撐",
      en: "Suggested: 6 rounds with one clean push-up each rep",
      ja: "目安：6ラウンド、毎回1回の腕立てを追加",
    }),
    flavor: pick({
      "zh-CN": "把肩、核心和腿后侧一起热开，整个人会更快醒过来。",
      "zh-TW": "把肩、核心和腿後側一起熱開，整個人會更快醒過來。",
      en: "It wakes up your shoulders, core, and hamstrings all at once.",
      ja: "肩、体幹、ハムストリングを一気に起こせます。",
    }),
    recordNote: pick({
      "zh-CN": "热身转盘抽中：Inchworm + Push-up，完成 6 轮。",
      "zh-TW": "熱身轉盤抽中：Inchworm + Push-up，完成 6 輪。",
      en: "Warm-up wheel: Inchworm + Push-up, completed 6 rounds.",
      ja: "ウォームアップルーレット：インチワーム + 腕立て、6ラウンドを実施。",
    }),
    background: "#111111",
    border: "#FFFFFF",
    text: "#FFFFFF",
    accent: "#D92323",
    weight: 1,
    kind: "standard",
  },
  {
    id: "crawl-and-standup",
    title: pick({ "zh-CN": "爬行 + 交替技术起身", "zh-TW": "爬行 + 交替技術起身", en: "Crawl + Alternating Stand-Up", ja: "クロール + 交互スタンドアップ" }),
    english: "Crawling + Alternating Technical Stand Up",
    shortLines: pick({
      "zh-CN": ["爬行 +", "交替起身"],
      "zh-TW": ["爬行 +", "交替起身"],
      en: ["Crawl +", "Stand-Up"],
      ja: ["クロール +", "起き上がり"],
    }),
    prescription: pick({
      "zh-CN": "推荐：3 轮，每轮 20-30 秒爬行后接左右交替起身",
      "zh-TW": "推薦：3 輪，每輪 20-30 秒爬行後接左右交替起身",
      en: "Suggested: 3 rounds of 20-30s crawling plus alternating stand-ups",
      ja: "目安：3ラウンド、20〜30秒のクロール後に左右交互スタンドアップ",
    }),
    flavor: pick({
      "zh-CN": "低位移动接起身，很适合先把全身协调连起来。",
      "zh-TW": "低位移動接起身，很適合先把全身協調連起來。",
      en: "A great full-body connector for low movement into standing.",
      ja: "低い移動から立ち上がりまで、全身の連動を作りやすいです。",
    }),
    recordNote: pick({
      "zh-CN": "热身转盘抽中：爬行 + 交替技术起身 Crawling + Alternating Technical Stand Up，完成 3 轮。",
      "zh-TW": "熱身轉盤抽中：爬行 + 交替技術起身 Crawling + Alternating Technical Stand Up，完成 3 輪。",
      en: "Warm-up wheel: Crawling + Alternating Technical Stand Up, completed 3 rounds.",
      ja: "ウォームアップルーレット：クロール + 交互スタンドアップ、3ラウンドを実施。",
    }),
    background: "#F4F4F4",
    border: "#111111",
    text: "#111111",
    accent: "#D92323",
    weight: 1,
    kind: "standard",
  },
  {
    id: "circle-run",
    title: pick({ "zh-CN": "绕头跑", "zh-TW": "繞頭跑", en: "Circle Run", ja: "サークルラン" }),
    english: "Circle Run",
    shortLines: pick({
      "zh-CN": ["绕头跑", "Circle Run"],
      "zh-TW": ["繞頭跑", "Circle Run"],
      en: ["Circle", "Run"],
      ja: ["サークル", "Run"],
    }),
    prescription: pick({
      "zh-CN": "推荐：45-60 秒，轻快绕垫子跑，脚步别沉",
      "zh-TW": "推薦：45-60 秒，輕快繞墊子跑，腳步別沉",
      en: "Suggested: 45-60 seconds of light, quick running around the mat",
      ja: "目安：45〜60秒、軽く素早くマット周りを走る",
    }),
    flavor: pick({
      "zh-CN": "先把呼吸和脚步提起来，再进主课会更舒服。",
      "zh-TW": "先把呼吸和腳步提起來，再進主課會更舒服。",
      en: "Raise your breathing and foot rhythm first so class feels smoother.",
      ja: "呼吸と足さばきを先に上げておくと、その後が楽になります。",
    }),
    recordNote: pick({
      "zh-CN": "热身转盘抽中：绕头跑 Circle Run，完成 45-60 秒。",
      "zh-TW": "熱身轉盤抽中：繞頭跑 Circle Run，完成 45-60 秒。",
      en: "Warm-up wheel: Circle Run, completed 45-60 seconds.",
      ja: "ウォームアップルーレット：サークルラン、45〜60秒を実施。",
    }),
    background: "#111111",
    border: "#FFFFFF",
    text: "#FFFFFF",
    accent: "#00F0FF",
    weight: 1,
    kind: "standard",
  },
  {
    id: "bridge",
    title: pick({ "zh-CN": "架桥", "zh-TW": "架橋", en: "Bridge", ja: "ブリッジ" }),
    english: "Bridge",
    shortLines: pick({
      "zh-CN": ["架桥", "Bridge"],
      "zh-TW": ["架橋", "Bridge"],
      en: ["Bridge", "Bridge"],
      ja: ["ブリッジ", "Bridge"],
    }),
    prescription: pick({
      "zh-CN": "推荐：12 次，顶髋、压脚、把发力线路打直",
      "zh-TW": "推薦：12 次，頂髖、壓腳、把發力線路打直",
      en: "Suggested: 12 reps, driving the hips up through the feet",
      ja: "目安：12回、足で押して股関節を高く上げる",
    }),
    flavor: pick({
      "zh-CN": "把髋和后链叫醒，下位发力和逃脱都会更顺。",
      "zh-TW": "把髖和後鏈叫醒，下位發力和逃脫都會更順。",
      en: "Wake up the hips and posterior chain for stronger escapes from bottom.",
      ja: "股関節と後ろ側を起こすと、下からの発力やエスケープが楽になります。",
    }),
    recordNote: pick({
      "zh-CN": "热身转盘抽中：架桥 Bridge，完成 12 次。",
      "zh-TW": "熱身轉盤抽中：架橋 Bridge，完成 12 次。",
      en: "Warm-up wheel: Bridge, completed 12 reps.",
      ja: "ウォームアップルーレット：ブリッジ、12回を実施。",
    }),
    background: "#D92323",
    border: "#FFFFFF",
    text: "#FFFFFF",
    accent: "#F4F4F4",
    weight: 1,
    kind: "standard",
  },
  {
    id: "granby-roll",
    title: pick({ "zh-CN": "翻上", "zh-TW": "翻上", en: "Granby Roll", ja: "グランビーロール" }),
    english: "Granby Roll / Inversion",
    shortLines: pick({
      "zh-CN": ["翻上", "Granby"],
      "zh-TW": ["翻上", "Granby"],
      en: ["Granby", "Inversion"],
      ja: ["グランビー", "Roll"],
    }),
    prescription: pick({
      "zh-CN": "推荐：6 次每侧，先慢一点，找到翻肩和收膝路线",
      "zh-TW": "推薦：6 次每側，先慢一點，找到翻肩和收膝路線",
      en: "Suggested: 6 reps each side, slow enough to find the shoulder roll and knee tuck",
      ja: "目安：左右6回。肩の抜き方と膝の引きつけをゆっくり確認",
    }),
    flavor: pick({
      "zh-CN": "把翻肩、倒置和找角度先热开，后面做防守转换会更顺。",
      "zh-TW": "把翻肩、倒置和找角度先熱開，後面做防守轉換會更順。",
      en: "Warm up the shoulder turn and inversion angle first so defensive transitions feel smoother later.",
      ja: "肩の返しと倒立気味の角度を先に起こしておくと、防御の切り替えが楽になります。",
    }),
    recordNote: pick({
      "zh-CN": "热身转盘抽中：翻上 Granby Roll / Inversion，完成 6 次每侧。",
      "zh-TW": "熱身轉盤抽中：翻上 Granby Roll / Inversion，完成 6 次每側。",
      en: "Warm-up wheel: Granby Roll / Inversion, completed 6 reps each side.",
      ja: "ウォームアップルーレット：グランビーロール / Inversion、左右6回を実施。",
    }),
    background: "#F4F4F4",
    border: "#111111",
    text: "#111111",
    accent: "#00F0FF",
    weight: 1,
    kind: "standard",
  },
  {
    id: "partner-carry",
    title: pick({ "zh-CN": "背人", "zh-TW": "背人", en: "Partner Carry", ja: "パートナー担ぎ" }),
    english: "Partner Carry / Piggyback Carry",
    shortLines: pick({
      "zh-CN": ["背人", "Carry"],
      "zh-TW": ["背人", "Carry"],
      en: ["Partner", "Carry"],
      ja: ["担ぎ", "Carry"],
    }),
    prescription: pick({
      "zh-CN": "推荐：20-30 秒一组，或左右各背 1 趟，先稳再走",
      "zh-TW": "推薦：20-30 秒一組，或左右各背 1 趟，先穩再走",
      en: "Suggested: 20-30 seconds per round, or one carry each side with control first",
      ja: "目安：20〜30秒、または左右1本ずつ。まずは安定を優先",
    }),
    flavor: pick({
      "zh-CN": "把核心、髋和脚步一起叫醒，抱人和发力会更有整体感。",
      "zh-TW": "把核心、髖和腳步一起叫醒，抱人和發力會更有整體感。",
      en: "Wake up your core, hips, and footwork together so carrying and lifting feel more connected.",
      ja: "体幹、股関節、足運びを一緒に起こして、抱える感覚をつなげます。",
    }),
    recordNote: pick({
      "zh-CN": "热身转盘抽中：背人 Partner Carry / Piggyback Carry，完成 20-30 秒一组或左右各 1 趟。",
      "zh-TW": "熱身轉盤抽中：背人 Partner Carry / Piggyback Carry，完成 20-30 秒一組或左右各 1 趟。",
      en: "Warm-up wheel: Partner Carry / Piggyback Carry, completed 20-30 seconds or one carry each side.",
      ja: "ウォームアップルーレット：パートナー担ぎ、20〜30秒または左右1本ずつを実施。",
    }),
    background: "#111111",
    border: "#FFFFFF",
    text: "#FFFFFF",
    accent: "#F472B6",
    weight: 1,
    kind: "standard",
  },
  {
    id: "one-more-set",
    title: pick({ "zh-CN": "再来一组！", "zh-TW": "再來一組！", en: "One More Set!", ja: "もう1セット！" }),
    english: "One More Set",
    shortLines: pick({
      "zh-CN": ["再来一组", "Penalty"],
      "zh-TW": ["再來一組", "Penalty"],
      en: ["One More", "Penalty"],
      ja: ["もう1回", "Penalty"],
    }),
    prescription: pick({
      "zh-CN": "惩罚：把抽中的动作额外再做 1 轮，或多加 30 秒",
      "zh-TW": "懲罰：把抽中的動作額外再做 1 輪，或多加 30 秒",
      en: "Penalty: add one extra round or 30 extra seconds to the selected movement",
      ja: "ペナルティ：選ばれた動作を1ラウンド追加、または30秒追加",
    }),
    flavor: pick({
      "zh-CN": "多一组就当加热到位，做完再进主课。",
      "zh-TW": "多一組就當加熱到位，做完再進主課。",
      en: "Think of it as finishing your warm-up properly before class.",
      ja: "しっかり体を温めきってから主練習へ入る合図です。",
    }),
    recordNote: pick({
      "zh-CN": "热身转盘抽中：再来一组！One More Set，额外追加 1 轮或 30 秒。",
      "zh-TW": "熱身轉盤抽中：再來一組！One More Set，額外追加 1 輪或 30 秒。",
      en: "Warm-up wheel: One More Set!, added one extra round or 30 seconds.",
      ja: "ウォームアップルーレット：もう1セット！ 1ラウンドまたは30秒を追加。",
    }),
    background: "#111111",
    border: "#D92323",
    text: "#FFFFFF",
    accent: "#D92323",
    weight: 0.88,
    kind: "penalty",
  },
  {
    id: "skip-one-set",
    title: pick({ "zh-CN": "免除一组！", "zh-TW": "免除一組！", en: "Skip One Set!", ja: "1セット免除！" }),
    english: "Skip One Set",
    shortLines: pick({
      "zh-CN": ["免除一组", "Reward"],
      "zh-TW": ["免除一組", "Reward"],
      en: ["Skip One", "Reward"],
      ja: ["1セット免除", "Reward"],
    }),
    prescription: pick({
      "zh-CN": "奖励：下一个热身动作减半，或省去 1 轮",
      "zh-TW": "獎勵：下一個熱身動作減半，或省去 1 輪",
      en: "Reward: cut the next warm-up in half or skip one round",
      ja: "ご褒美：次のウォームアップを半分にするか、1ラウンド省略",
    }),
    flavor: pick({
      "zh-CN": "今天可以省一点体能，把状态留给后面的训练。",
      "zh-TW": "今天可以省一點體能，把狀態留給後面的訓練。",
      en: "Save a little energy and keep the good stuff for the main session.",
      ja: "少し体力を残して、主練習に回しても大丈夫です。",
    }),
    recordNote: pick({
      "zh-CN": "热身转盘抽中：免除一组！Skip One Set，下一个热身动作减半或免去 1 轮。",
      "zh-TW": "熱身轉盤抽中：免除一組！Skip One Set，下一個熱身動作減半或免去 1 輪。",
      en: "Warm-up wheel: Skip One Set!, halved or skipped the next warm-up round.",
      ja: "ウォームアップルーレット：1セット免除！ 次のラウンドを半分、または1ラウンド省略。",
    }),
    background: "#F4F4F4",
    border: "#111111",
    text: "#111111",
    accent: "#00F0FF",
    weight: 0.72,
    kind: "reward",
  },
  {
    id: "no-warmup",
    title: pick({ "zh-CN": "今天不用热身！", "zh-TW": "今天不用熱身！", en: "No Warm-Up Today!", ja: "今日は熱身なし！" }),
    english: "No Warm-Up Today",
    shortLines: pick({
      "zh-CN": ["今天不用", "热身！"],
      "zh-TW": ["今天不用", "熱身！"],
      en: ["No Warm-Up", "Today!"],
      ja: ["今日は", "熱身なし！"],
    }),
    prescription: pick({
      "zh-CN": "隐藏大奖：改做 60 秒呼吸调整，直接进入主训练",
      "zh-TW": "隱藏大獎：改做 60 秒呼吸調整，直接進入主訓練",
      en: "Jackpot: take 60 seconds to breathe and go straight into training",
      ja: "当たり：60秒呼吸を整えて、そのまま主練習へ",
    }),
    flavor: pick({
      "zh-CN": "今天抽到隐藏奖励，做 60 秒呼吸调整后直接开始也可以。",
      "zh-TW": "今天抽到隱藏獎勵，做 60 秒呼吸調整後直接開始也可以。",
      en: "You hit the hidden reward. A short reset and you can start right away.",
      ja: "隠しボーナスです。60秒呼吸を整えたら、そのまま始めて大丈夫。",
    }),
    recordNote: pick({
      "zh-CN": "热身转盘抽中隐藏大奖：今天不用热身！No Warm-Up Today，改做 60 秒呼吸调整后直接开始主训练。",
      "zh-TW": "熱身轉盤抽中隱藏大獎：今天不用熱身！No Warm-Up Today，改做 60 秒呼吸調整後直接開始主訓練。",
      en: "Warm-up wheel jackpot: No Warm-Up Today! Took 60 seconds to reset breathing before training.",
      ja: "ウォームアップルーレットの当たり：今日は熱身なし！ 60秒呼吸を整えてから主練習へ。",
    }),
    background: "#F2D56B",
    border: "#FFFFFF",
    text: "#241000",
    accent: "#D92323",
    weight: 0.28,
    kind: "jackpot",
  },
];

const POINTER_ANGLE = -Math.PI / 2;
const CANVAS_SIZE = 760;

const easeOutQuint = (value: number) => 1 - (1 - value) ** 5;

const normalizeAngle = (value: number) => {
  const turn = Math.PI * 2;
  return ((value % turn) + turn) % turn;
};

const chooseWeightedSegment = (segments: WarmUpSegment[]) => {
  const total = segments.reduce((sum, segment) => sum + segment.weight, 0);
  let threshold = Math.random() * total;

  for (const segment of segments) {
    threshold -= segment.weight;
    if (threshold <= 0) return segment;
  }

  return segments[segments.length - 1];
};

const getSegmentFromRotation = (
  rotation: number,
  segments: Array<WarmUpSegment & { startAngle: number; endAngle: number; centerAngle: number }>,
) => {
  const localAngle = normalizeAngle(POINTER_ANGLE - rotation);

  return (
    segments.find((segment) => {
      const start = normalizeAngle(segment.startAngle);
      const end = normalizeAngle(segment.endAngle);

      if (start <= end) {
        return localAngle >= start && localAngle < end;
      }

      return localAngle >= start || localAngle < end;
    }) ?? segments[segments.length - 1]
  );
};

const drawRoulette = (
  canvas: HTMLCanvasElement,
  segments: Array<WarmUpSegment & { startAngle: number; endAngle: number; centerAngle: number }>,
  rotation: number,
) => {
  const context = canvas.getContext("2d");
  if (!context) return;

  const ratio = window.devicePixelRatio || 1;
  canvas.width = CANVAS_SIZE * ratio;
  canvas.height = CANVAS_SIZE * ratio;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);

  const center = CANVAS_SIZE / 2;
  const radius = CANVAS_SIZE / 2 - 16;
  context.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  context.save();
  context.translate(center, center);
  context.rotate(rotation);

  const lineOneFontSize = segments.length > 12 ? 18 : 22;
  const lineTwoFontSize = segments.length > 12 ? 11 : 13;
  const lineRadius = segments.length > 12 ? radius * 0.62 : radius * 0.64;
  const lineOneOffset = segments.length > 12 ? -20 : -24;
  const lineTwoOffset = segments.length > 12 ? 8 : 10;

  segments.forEach((segment) => {
    context.beginPath();
    context.moveTo(0, 0);
    context.arc(0, 0, radius, segment.startAngle, segment.endAngle);
    context.closePath();
    context.fillStyle = segment.background;
    context.fill();
    context.lineWidth = 6;
    context.strokeStyle = segment.border;
    context.stroke();

    context.save();
    context.rotate(segment.centerAngle);
    context.translate(lineRadius, 0);
    context.rotate(Math.PI / 2);

    context.fillStyle = segment.text;
    context.textAlign = "center";
    context.textBaseline = "middle";

    context.font = `900 ${lineOneFontSize}px "Noto Sans SC", sans-serif`;
    context.fillText(segment.shortLines[0], 0, lineOneOffset);

    context.font = `700 ${lineTwoFontSize}px "Press Start 2P", monospace`;
    context.fillStyle = segment.accent;
    context.fillText(segment.shortLines[1], 0, lineTwoOffset);
    context.restore();
  });

  context.restore();

  context.beginPath();
  context.arc(center, center, radius + 3, 0, Math.PI * 2);
  context.strokeStyle = "#000000";
  context.lineWidth = 18;
  context.stroke();

  context.beginPath();
  context.arc(center, center, radius + 14, 0, Math.PI * 2);
  context.strokeStyle = "#F472B6";
  context.lineWidth = 8;
  context.stroke();

  context.beginPath();
  context.arc(center, center, radius - 22, 0, Math.PI * 2);
  context.strokeStyle = "rgba(255,255,255,0.18)";
  context.lineWidth = 5;
  context.stroke();

  context.beginPath();
  context.arc(center, center, 102, 0, Math.PI * 2);
  context.fillStyle = "#0A0A0F";
  context.fill();
  context.strokeStyle = "#FFFFFF";
  context.lineWidth = 7;
  context.stroke();
};

const WarmUpRoulette = () => {
  const { pick } = useLocale();
  const { storageScope } = useIdentity();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const rotationRef = useRef(0);
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<WarmUpSegment | null>(null);
  const [isResultOpen, setIsResultOpen] = useState(false);

  const warmUpSegments = useMemo(() => buildWarmUpSegments(pick), [pick]);

  const totalWeight = useMemo(
    () => warmUpSegments.reduce((sum, segment) => sum + segment.weight, 0),
    [warmUpSegments],
  );

  const geometry = useMemo(() => {
    let cursor = POINTER_ANGLE;
    return warmUpSegments.map((segment) => {
      const span = (segment.weight / totalWeight) * Math.PI * 2;
      const startAngle = cursor;
      const endAngle = cursor + span;
      cursor = endAngle;

      return {
        ...segment,
        startAngle,
        endAngle,
        centerAngle: startAngle + span / 2,
      };
    });
  }, [totalWeight, warmUpSegments]);

  useEffect(() => {
    rotationRef.current = rotation;
  }, [rotation]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawRoulette(canvas, geometry, rotation);
  }, [geometry, rotation]);

  useEffect(() => {
    return () => {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const spinRoulette = () => {
    if (isSpinning) return;

    const selected = chooseWeightedSegment(warmUpSegments);
    const selectedGeometry = geometry.find((segment) => segment.id === selected.id);
    if (!selectedGeometry) return;

    setIsSpinning(true);
    setResult(null);
    setIsResultOpen(false);

    const startRotation = rotationRef.current;
    const currentNormalized = normalizeAngle(startRotation);
    const targetNormalized = normalizeAngle(POINTER_ANGLE - selectedGeometry.centerAngle);
    let delta = targetNormalized - currentNormalized;
    if (delta < 0) delta += Math.PI * 2;

    const extraTurns = (selected.kind === "jackpot" ? 8.8 : 7.4) * Math.PI * 2;
    const finalRotation = startRotation + delta + extraTurns;
    const duration = 4300 + Math.random() * 700;
    const startTime = performance.now();

    const animate = (time: number) => {
      const progress = Math.min((time - startTime) / duration, 1);
      const eased = easeOutQuint(progress);
      const nextRotation = startRotation + (finalRotation - startRotation) * eased;
      setRotation(nextRotation);

      if (progress < 1) {
        frameRef.current = window.requestAnimationFrame(animate);
        return;
      }

      const landedSegment = getSegmentFromRotation(finalRotation, geometry);
      setIsSpinning(false);
      setRotation(finalRotation);
      setResult(landedSegment);
      setIsResultOpen(true);
      toast.success(
        landedSegment.kind === "jackpot"
          ? pick({
              "zh-CN": "抽到隐藏奖励。",
              "zh-TW": "抽到隱藏獎勵。",
              en: "Hidden reward unlocked.",
              ja: "隠しボーナスが出ました。",
            })
          : pick({
              "zh-CN": "热身动作已确定。",
              "zh-TW": "熱身動作已確定。",
              en: "Warm-up move selected.",
              ja: "ウォームアップが決まりました。",
            }),
      );
    };

    frameRef.current = window.requestAnimationFrame(animate);
  };

  const handleSpinAgain = () => {
    setIsResultOpen(false);
    window.setTimeout(() => spinRoulette(), 140);
  };

  const handleRecordToLog = () => {
    if (!result) return;

    saveTrainingLogPrefill({
      date: format(new Date(), "yyyy-MM-dd"),
      sessionType: pick({
        "zh-CN": "自练",
        "zh-TW": "自練",
        en: "Solo practice",
        ja: "自主練",
      }),
      focus: `热身转盘 / ${result.title}`,
      notes: result.recordNote,
      feeling:
        result.kind === "jackpot"
          ? pick({
              "zh-CN": "😌 今天抽到隐藏奖励，先做呼吸调整再进入主课。",
              "zh-TW": "😌 今天抽到隱藏獎勵，先做呼吸調整再進入主課。",
              en: "😌 Hit the hidden reward and went straight into class after a short breathing reset.",
              ja: "😌 隠しボーナスで、呼吸を整えてからそのまま主練習へ。",
            })
          : pick({
              "zh-CN": "🙂 按转盘完成了热身，开练前更容易进入状态。",
              "zh-TW": "🙂 按轉盤完成了熱身，開練前更容易進入狀態。",
              en: "🙂 Finished the warm-up from the wheel and felt easier to settle into training.",
              ja: "🙂 ルーレット通りに熱身して、練習に入りやすくなった。",
            }),
      summary:
        result.kind === "jackpot"
          ? pick({
              "zh-CN": `热身转盘：${result.title}`,
              "zh-TW": `熱身轉盤：${result.title}`,
              en: `Warm-up wheel: ${result.title}`,
              ja: `ウォームアップルーレット：${result.title}`,
            })
          : pick({
              "zh-CN": `热身转盘：${result.title} / ${result.english}`,
              "zh-TW": `熱身轉盤：${result.title} / ${result.english}`,
              en: `Warm-up wheel: ${result.title} / ${result.english}`,
              ja: `ウォームアップルーレット：${result.title} / ${result.english}`,
            }),
    }, storageScope);

    setIsResultOpen(false);
    navigate("/training-log?prefill=warmup");
  };

  const lastResultTone = result?.kind === "jackpot"
    ? pick({
        "zh-CN": "今天可以轻松一点，稳稳开始主课。",
        "zh-TW": "今天可以輕鬆一點，穩穩開始主課。",
        en: "You can start class lightly and settle in.",
        ja: "今日は少し楽に、落ち着いて主練習へ入れます。",
      })
    : pick({
        "zh-CN": "热身已经决定好了，接下来专心把动作做完整。",
        "zh-TW": "熱身已經決定好了，接下來專心把動作做完整。",
        en: "The warm-up is decided. Now just do it cleanly.",
        ja: "ウォームアップは決まりました。あとは丁寧にやるだけです。",
      });

  return (
    <section className="warmup-roulette-shell atlas-panel">
      <div className="warmup-roulette-hero">
        <div>
          <div className="atlas-chip">
            {pick({
              "zh-CN": "WARM-UP EVENT / 热身随机事件",
              "zh-TW": "WARM-UP EVENT / 熱身隨機事件",
              en: "WARM-UP EVENT",
              ja: "WARM-UP EVENT / ウォームアップ抽選",
            })}
          </div>
          <p className="atlas-kicker">
            {pick({
              "zh-CN": "不知道先做什么时，就让转盘帮你开始",
              "zh-TW": "不知道先做什麼時，就讓轉盤幫你開始",
              en: "Let the wheel choose your first warm-up when you do not want to overthink it.",
              ja: "何から始めるか迷う時は、ルーレットに決めてもらう。",
            })}
          </p>
          <h2 className="warmup-roulette-title">REBEL MAT WARM-UP ROULETTE</h2>
          <p className="warmup-roulette-subtitle">
            {pick({
              "zh-CN": "热身转盘 · 开练前先动起来",
              "zh-TW": "熱身轉盤 · 開練前先動起來",
              en: "Warm-Up Wheel · Move Before You Train",
              ja: "ウォームアップルーレット · まず身体を動かす",
            })}
          </p>
          <p className="atlas-description">
            {pick({
              "zh-CN": "不知道先做哪个热身时，就让转盘帮你快速开始。目标不是制造压力，而是减少犹豫，让身体更快进入训练状态。",
              "zh-TW": "不知道先做哪個熱身時，就讓轉盤幫你快速開始。目標不是製造壓力，而是減少猶豫，讓身體更快進入訓練狀態。",
              en: "Use the wheel to reduce hesitation before training and get your body moving faster.",
              ja: "練習前の迷いを減らして、身体を早く動かし始めるためのルーレットです。",
            })}
          </p>
        </div>

        <div className="warmup-roulette-status">
          <div className="warmup-roulette-mantra">
            <Flame className="h-4 w-4" />
            <span>
              {pick({
                "zh-CN": "先动起来，再进入状态。",
                "zh-TW": "先動起來，再進入狀態。",
                en: "Move first, settle in after.",
                ja: "まず動いて、それから整える。",
              })}
            </span>
          </div>
          <p className="warmup-roulette-status-copy">
            {isSpinning
              ? pick({
                  "zh-CN": "看着指针，等它帮你选出今天第一个动作。",
                  "zh-TW": "看著指針，等它幫你選出今天第一個動作。",
                  en: "Watch the pointer and let it pick your first move.",
                  ja: "針を見ながら、最初の動きを待ちます。",
                })
              : pick({
                  "zh-CN": "点击后会转 4-5 秒再停下。适合开练前帮自己快速做决定。",
                  "zh-TW": "點擊後會轉 4-5 秒再停下。適合開練前幫自己快速做決定。",
                  en: "Tap to spin for 4-5 seconds and let it decide your warm-up.",
                  ja: "押すと4〜5秒回転して止まり、今日の熱身を決めてくれます。",
                })}
          </p>
        </div>
      </div>

      <div className="warmup-roulette-stage">
        <div className={`warmup-roulette-wheel-frame ${isSpinning ? "warmup-roulette-wheel-frame-live" : ""}`}>
          <div className="warmup-roulette-pointer" aria-hidden="true">
            <div className="warmup-roulette-pointer-core" />
          </div>
          <canvas
            ref={canvasRef}
            className="warmup-roulette-canvas"
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            aria-label="热身大转盘"
          />
          <button
            type="button"
            className="warmup-roulette-center-button"
            onClick={spinRoulette}
            disabled={isSpinning}
          >
            <span>
              {isSpinning
                ? pick({
                    "zh-CN": "转动中",
                    "zh-TW": "轉動中",
                    en: "Spinning",
                    ja: "回転中",
                  })
                : pick({
                    "zh-CN": "开始转盘",
                    "zh-TW": "開始轉盤",
                    en: "Spin Now",
                    ja: "回してみる",
                  })}
            </span>
          </button>
        </div>

        <aside className="warmup-roulette-intel">
          <div className="warmup-roulette-intel-card">
            <p className="warmup-roulette-intel-tag">
              {pick({
                "zh-CN": "RESULT MEMORY / 上次结果",
                "zh-TW": "RESULT MEMORY / 上次結果",
                en: "RESULT MEMORY",
                ja: "前回の結果",
              })}
            </p>
            {result ? (
              <>
                <h3>{result.title}</h3>
                <p>{result.english}</p>
                <strong>{result.prescription}</strong>
              </>
            ) : (
              <>
                <h3>
                  {pick({
                    "zh-CN": "还没有抽签结果",
                    "zh-TW": "還沒有抽籤結果",
                    en: "No result yet",
                    ja: "まだ結果はありません",
                  })}
                </h3>
                <p>
                  {pick({
                    "zh-CN": "先转一下，决定今天从哪个热身动作开始。",
                    "zh-TW": "先轉一下，決定今天從哪個熱身動作開始。",
                    en: "Spin once to choose how you want to start warming up today.",
                    ja: "まず1回回して、今日の最初の熱身を決めましょう。",
                  })}
                </p>
                <strong>
                  {pick({
                    "zh-CN": "结果会显示在这里。",
                    "zh-TW": "結果會顯示在這裡。",
                    en: "Your result will appear here.",
                    ja: "結果はここに表示されます。",
                  })}
                </strong>
              </>
            )}
          </div>

          <div className="warmup-roulette-intel-card">
            <p className="warmup-roulette-intel-tag">
              {pick({
                "zh-CN": "FIELD NOTES / 热身规则",
                "zh-TW": "FIELD NOTES / 熱身規則",
                en: "FIELD NOTES",
                ja: "ルール",
              })}
            </p>
            <ul className="warmup-roulette-rules">
              <li>
                {pick({
                  "zh-CN": "普通动作：按推荐次数或时长执行。",
                  "zh-TW": "普通動作：按推薦次數或時長執行。",
                  en: "Normal result: do the suggested reps or time.",
                  ja: "通常結果：目安の回数または時間で行う。",
                })}
              </li>
              <li>
                {pick({
                  "zh-CN": "再来一组：原动作额外多做 1 轮，或多加 30 秒。",
                  "zh-TW": "再來一組：原動作額外多做 1 輪，或多加 30 秒。",
                  en: "One More Set: add an extra round or 30 seconds.",
                  ja: "もう1セット：1ラウンド、または30秒追加。",
                })}
              </li>
              <li>
                {pick({
                  "zh-CN": "免除一组：下一项热身减半，或少做 1 轮。",
                  "zh-TW": "免除一組：下一項熱身減半，或少做 1 輪。",
                  en: "Skip One Set: cut the next warm-up in half or skip one round.",
                  ja: "1セット免除：次の熱身を半分、または1ラウンド省略。",
                })}
              </li>
              <li>
                {pick({
                  "zh-CN": "今天不用热身：做 60 秒呼吸调整后，直接进入主训练。",
                  "zh-TW": "今天不用熱身：做 60 秒呼吸調整後，直接進入主訓練。",
                  en: "No Warm-Up Today: reset with 60 seconds of breathing, then start training.",
                  ja: "今日は熱身なし：60秒呼吸を整えてから主練習へ。",
                })}
              </li>
            </ul>
          </div>
        </aside>
      </div>

      <Dialog open={isResultOpen} onOpenChange={setIsResultOpen}>
        <DialogContent className={`warmup-result-modal ${result?.kind === "jackpot" ? "warmup-result-modal-jackpot" : ""}`}>
          {result && (
            <>
              <DialogHeader className="warmup-result-head">
                <div className="warmup-result-chip">
                  {result.kind === "jackpot"
                    ? pick({
                        "zh-CN": "隐藏大奖",
                        "zh-TW": "隱藏大獎",
                        en: "HIDDEN JACKPOT",
                        ja: "隠しボーナス",
                      })
                    : pick({
                        "zh-CN": "本次结果",
                        "zh-TW": "本次結果",
                        en: "SPIN RESULT",
                        ja: "結果",
                      })}
                </div>
                <DialogTitle className="warmup-result-title">{result.title}</DialogTitle>
                <DialogDescription className="warmup-result-english">
                  {result.english}
                </DialogDescription>
              </DialogHeader>

              <div className="warmup-result-body">
                {result.kind === "jackpot" && (
                  <div className="warmup-result-celebration" aria-hidden="true">
                    <Sparkles className="h-5 w-5" />
                    <span>
                      {pick({
                        "zh-CN": "幸运大奖",
                        "zh-TW": "幸運大獎",
                        en: "LUCKY DRAW",
                        ja: "ラッキードロー",
                      })}
                    </span>
                    <Sparkles className="h-5 w-5" />
                  </div>
                )}

                <p className="warmup-result-prescription">{result.prescription}</p>
                <p className="warmup-result-flavor">{result.flavor}</p>
                <p className="warmup-result-mantra">{lastResultTone}</p>
              </div>

              <DialogFooter className="warmup-result-actions">
                <button type="button" className="warmup-result-button" onClick={handleSpinAgain}>
                  {pick({
                    "zh-CN": "再转一次",
                    "zh-TW": "再轉一次",
                    en: "Spin Again",
                    ja: "もう一回",
                  })}
                </button>
                <button type="button" className="warmup-result-button warmup-result-button-accent" onClick={handleRecordToLog}>
                  {pick({
                    "zh-CN": "记录到今日训练日志",
                    "zh-TW": "記錄到今日訓練日誌",
                    en: "Save to Training Log",
                    ja: "練習日誌に保存",
                  })}
                </button>
                <button type="button" className="warmup-result-button warmup-result-button-ghost" onClick={() => setIsResultOpen(false)}>
                  {pick({
                    "zh-CN": "关闭",
                    "zh-TW": "關閉",
                    en: "Close",
                    ja: "閉じる",
                  })}
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default WarmUpRoulette;
