import { FormEvent, useState } from "react";
import { Globe, Mail, Wallet } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useIdentity } from "@/lib/identity";
import { useLocale } from "@/lib/locale";

export const GlobalTopBar = () => {
  const { locale, setLocale, localeOptions, pick } = useLocale();
  const {
    address,
    shortAddress,
    isInstalled,
    isPhantomInstalled,
    isOkxAvailable,
    isConnecting,
    connectingWallet,
    walletName,
    connectPhantom,
    connectOkx,
    disconnect,
    chainId,
    emailIdentity,
    signInWithEmail,
    signOutEmail,
  } = useIdentity();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [emailInput, setEmailInput] = useState(emailIdentity?.email ?? "");

  const languageLabel = pick({
    "zh-CN": "语言",
    "zh-TW": "語言",
    en: "Language",
    ja: "言語",
  });

  const walletLabel = pick({
    "zh-CN": "钱包",
    "zh-TW": "錢包",
    en: "Wallet",
    ja: "ウォレット",
  });

  const emailLabel = pick({
    "zh-CN": "邮箱",
    "zh-TW": "信箱",
    en: "Email",
    ja: "メール",
  });

  const connectPhantomLabel = pick({
    "zh-CN": connectingWallet === "phantom" ? "连接中..." : "连接 Phantom",
    "zh-TW": connectingWallet === "phantom" ? "連接中..." : "連接 Phantom",
    en: connectingWallet === "phantom" ? "Connecting..." : "Connect Phantom",
    ja: connectingWallet === "phantom" ? "接続中..." : "Phantom Connect",
  });

  const connectOkxLabel = pick({
    "zh-CN": connectingWallet === "okx" ? "连接中..." : "连接 OKX 钱包",
    "zh-TW": connectingWallet === "okx" ? "連接中..." : "連接 OKX 錢包",
    en: connectingWallet === "okx" ? "Connecting..." : "Connect OKX Wallet",
    ja: connectingWallet === "okx" ? "接続中..." : "OKX Wallet Connect",
  });

  const missingWalletLabel = pick({
    "zh-CN": "钱包未就绪",
    "zh-TW": "錢包未就緒",
    en: "Wallet Missing",
    ja: "ウォレット未準備",
  });

  const localeBadge = {
    "zh-CN": "简",
    "zh-TW": "繁",
    en: "EN",
    ja: "日",
  }[locale];

  const localeTitle = `${languageLabel}: ${
    localeOptions.find((option) => option.value === locale)?.label ?? locale
  }`;

  const walletTitle = address && chainId
    ? `${walletLabel}: ${walletName ?? "Wallet"} ${shortAddress} / ${chainId}`
    : isInstalled
      ? pick({
          "zh-CN": "选择 Phantom 或 OKX 钱包",
          "zh-TW": "選擇 Phantom 或 OKX 錢包",
          en: "Choose Phantom or OKX Wallet",
          ja: "Phantom または OKX Wallet を選択",
        })
      : missingWalletLabel;

  const emailTitle = emailIdentity?.email
    ? `${emailLabel}: ${emailIdentity.email}`
    : pick({
        "zh-CN": "使用邮箱保存训练档案",
        "zh-TW": "使用信箱保存訓練檔案",
        en: "Use email to save your training dossier",
        ja: "メールで練習記録を保存",
      });

  const emailBadge = emailIdentity?.email
    ? emailIdentity.email.slice(0, 2).toUpperCase()
    : "ID";

  const handleEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const success = await signInWithEmail(emailInput);
    if (success) setIsAuthOpen(false);
  };

  return (
    <>
      <div className="global-topbar">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="global-icon-button shine"
              aria-label={languageLabel}
              title={localeTitle}
            >
              <Globe className="h-4 w-4" />
              <span className="global-icon-badge">{localeBadge}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="global-mini-menu">
            {localeOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                className={`global-mini-menu-item ${locale === option.value ? "global-mini-menu-item-active" : ""}`}
                onSelect={() => setLocale(option.value)}
              >
                <span>{option.label}</span>
                <span className="global-mini-menu-mark">{locale === option.value ? "●" : ""}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          type="button"
          className={`global-icon-button shine ${emailIdentity ? "global-icon-button-connected" : ""}`}
          aria-label={emailLabel}
          title={emailTitle}
          onClick={() => setIsAuthOpen(true)}
        >
          <Mail className="h-4 w-4" />
          <span className="global-icon-badge">{emailBadge}</span>
          <span
            className={`global-status-dot ${
              emailIdentity ? "global-status-dot-connected" : "global-status-dot-missing"
            }`}
          />
        </button>

        <div className="global-wallet-wrap">
          <button
            type="button"
            className={`global-icon-button global-wallet-icon-button shine ${address ? "global-icon-button-connected" : ""}`}
            onClick={() => {
              setIsAuthOpen(true);
            }}
            disabled={isConnecting}
            aria-label={walletLabel}
            title={walletTitle}
          >
            <Wallet className="h-4 w-4" />
            <span
              className={`global-status-dot ${
                address ? "global-status-dot-connected" : isInstalled ? "global-status-dot-ready" : "global-status-dot-missing"
              }`}
            />
          </button>
        </div>
      </div>

      <Dialog open={isAuthOpen} onOpenChange={setIsAuthOpen}>
        <DialogContent className="global-auth-dialog">
          <DialogHeader className="global-auth-head">
            <DialogTitle className="global-auth-title">
              {pick({
                "zh-CN": "PHANTOM ID / 身份面板",
                "zh-TW": "PHANTOM ID / 身份面板",
                en: "PHANTOM ID / Identity Panel",
                ja: "PHANTOM ID / 身分パネル",
              })}
            </DialogTitle>
            <DialogDescription className="global-auth-description">
              {pick({
                "zh-CN": "邮箱负责保存训练档案，钱包负责 Solana Devnet 上链与 milestone claim。",
                "zh-TW": "信箱負責保存訓練檔案，錢包負責 Solana Devnet 上鏈與 milestone claim。",
                en: "Email keeps your training dossier. Wallet handles Solana Devnet claims.",
                ja: "メールは練習記録用、ウォレットは Solana Devnet の claim 用です。",
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="global-auth-grid">
            <section className="global-auth-card">
              <div className="global-auth-card-top">
                <span className="global-auth-kicker">EMAIL DOSSIER</span>
                <span className={`global-auth-pill ${emailIdentity ? "global-auth-pill-live" : ""}`}>
                  {emailIdentity
                    ? pick({ "zh-CN": "已启用", "zh-TW": "已啟用", en: "Active", ja: "有効" })
                    : pick({ "zh-CN": "未登录", "zh-TW": "未登入", en: "Inactive", ja: "未ログイン" })}
                </span>
              </div>
              <p className="global-auth-copy">
                {emailIdentity?.email
                  ? emailIdentity.email
                  : pick({
                      "zh-CN": "用邮箱区分不同训练档案，适合日常记录和设备内切换。",
                      "zh-TW": "用信箱區分不同訓練檔案，適合日常記錄和裝置內切換。",
                      en: "Use email to separate training dossiers for daily tracking on this device.",
                      ja: "メールで練習記録を分けて、この端末内で切り替えられます。",
                    })}
              </p>
              <form className="global-auth-form" onSubmit={handleEmailSubmit}>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(event) => setEmailInput(event.target.value)}
                  placeholder="you@academy.com"
                  className="global-auth-input"
                />
                <div className="global-auth-actions">
                  <button type="submit" className="global-auth-button">
                    {pick({
                      "zh-CN": "邮箱登录",
                      "zh-TW": "信箱登入",
                      en: "Email Sign In",
                      ja: "メールで入る",
                    })}
                  </button>
                  {emailIdentity ? (
                    <button
                      type="button"
                      className="global-auth-button global-auth-button-secondary"
                      onClick={() => {
                        signOutEmail();
                        setEmailInput("");
                      }}
                    >
                      {pick({
                        "zh-CN": "退出邮箱",
                        "zh-TW": "登出信箱",
                        en: "Sign Out",
                        ja: "サインアウト",
                      })}
                    </button>
                  ) : null}
                </div>
              </form>
            </section>

            <section className="global-auth-card">
              <div className="global-auth-card-top">
                <span className="global-auth-kicker">SOLANA OPERATOR</span>
                <span className={`global-auth-pill ${address ? "global-auth-pill-live" : ""}`}>
                  {address
                    ? pick({ "zh-CN": "已连接", "zh-TW": "已連接", en: "Connected", ja: "接続済み" })
                    : pick({ "zh-CN": "未连接", "zh-TW": "未連接", en: "Offline", ja: "未接続" })}
                </span>
              </div>
              <p className="global-auth-copy">
                {address
                  ? `${walletName ?? "Wallet"} ${shortAddress} / ${chainId}`
                  : pick({
                      "zh-CN": "连接 Phantom 进行 Devnet 签名，或用 OKX 钱包建立 Solana 训练身份。",
                      "zh-TW": "連接 Phantom 進行 Devnet 簽名，或用 OKX 錢包建立 Solana 訓練身份。",
                      en: "Connect Phantom for Devnet signing, or use OKX Wallet for your Solana training identity.",
                      ja: "Devnet 署名は Phantom、Solana トレーニングID は OKX Wallet でも使えます。",
                    })}
              </p>
              <div className="global-auth-actions">
                <button
                  type="button"
                  className="global-auth-button"
                  onClick={() => {
                    if (address && walletName === "Phantom") {
                      void disconnect();
                      return;
                    }
                    void connectPhantom();
                  }}
                  disabled={!isPhantomInstalled || isConnecting}
                >
                  {address && walletName === "Phantom"
                    ? pick({ "zh-CN": "断开 Phantom", "zh-TW": "中斷 Phantom", en: "Disconnect Phantom", ja: "Phantom を切断" })
                    : connectPhantomLabel}
                </button>
                <button
                  type="button"
                  className="global-auth-button global-auth-button-okx"
                  onClick={() => {
                    if (address && walletName === "OKX") {
                      void disconnect();
                      return;
                    }
                    void connectOkx();
                  }}
                  disabled={!isOkxAvailable || isConnecting}
                >
                  {address && walletName === "OKX"
                    ? pick({ "zh-CN": "断开 OKX", "zh-TW": "中斷 OKX", en: "Disconnect OKX", ja: "OKX を切断" })
                    : connectOkxLabel}
                </button>
              </div>
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
