import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "@/components/ui/sonner";
import { useLocale } from "@/lib/locale";

type SolanaConnectResponse = {
  publicKey?: {
    toString: () => string;
  };
};

type SolanaProvider = {
  isPhantom?: boolean;
  publicKey?: {
    toString: () => string;
  } | null;
  isConnected?: boolean;
  connect: () => Promise<SolanaConnectResponse>;
  disconnect?: () => Promise<void>;
  signTransaction?: (transaction: unknown) => Promise<unknown>;
  signAndSendTransaction?: (
    transaction: unknown,
    options?: Record<string, unknown>,
  ) => Promise<{ signature: string }>;
  on: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener: (event: string, listener: (...args: unknown[]) => void) => void;
};

type OKXInjectedSolanaProvider = {
  publicKey?: {
    toString: () => string;
  } | null;
  connect: () => Promise<SolanaConnectResponse | { publicKey?: string } | string[] | string | undefined>;
  disconnect?: () => Promise<void>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
};

type WalletProviderKind = "phantom" | "okx";

type WalletContextValue = {
  address: string | null;
  chainId: string | null;
  isInstalled: boolean;
  isPhantomInstalled: boolean;
  isOkxAvailable: boolean;
  isConnecting: boolean;
  connectingWallet: WalletProviderKind | null;
  walletProvider: WalletProviderKind | null;
  walletName: string | null;
  connect: () => Promise<void>;
  connectPhantom: () => Promise<void>;
  connectOkx: () => Promise<void>;
  disconnect: () => Promise<void>;
  shortAddress: string | null;
};

const WalletContext = createContext<WalletContextValue | null>(null);
const SOLANA_CHAIN_ID = "Solana";
const OKX_CONNECT_TIMEOUT_MS = 20_000;

export const getPhantomProvider = (): SolanaProvider | null => {
  if (typeof window === "undefined") return null;
  const provider = window.phantom?.solana ?? null;
  return provider?.isPhantom ? provider : null;
};

const getOkxInjectedSolanaProvider = (): OKXInjectedSolanaProvider | null => {
  if (typeof window === "undefined") return null;
  return window.okxwallet?.solana ?? null;
};

const formatAddress = (address: string) =>
  `${address.slice(0, 4)}...${address.slice(-4)}`;

const getWalletName = (provider: WalletProviderKind | null) => {
  if (provider === "phantom") return "Phantom";
  if (provider === "okx") return "OKX";
  return null;
};

const parseOkxInjectedAddress = (
  response: SolanaConnectResponse | { publicKey?: string } | string[] | string | undefined,
  provider: OKXInjectedSolanaProvider,
) => {
  if (typeof response === "string") return response;
  if (Array.isArray(response)) return response[0] ?? null;
  if (response?.publicKey) {
    return typeof response.publicKey === "string"
      ? response.publicKey
      : response.publicKey.toString();
  }
  return provider.publicKey?.toString() ?? null;
};

const withTimeout = async <T,>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string,
) => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const { pick } = useLocale();
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [walletProvider, setWalletProvider] = useState<WalletProviderKind | null>(null);
  const [connectingWallet, setConnectingWallet] = useState<WalletProviderKind | null>(null);
  const [isOkxReady, setIsOkxReady] = useState(false);
  const isPhantomInstalled = !!getPhantomProvider();
  const isOkxAvailable = isOkxReady;
  const isInstalled = isPhantomInstalled || isOkxAvailable;
  const isConnecting = !!connectingWallet;

  useEffect(() => {
    setIsOkxReady(typeof window !== "undefined");
  }, []);

  useEffect(() => {
    const provider = getPhantomProvider();
    if (!provider) return;

    const syncWallet = () => {
      const nextAddress = provider.publicKey?.toString() ?? null;
      setAddress(nextAddress);
      setChainId(nextAddress ? SOLANA_CHAIN_ID : null);
      setWalletProvider(nextAddress ? "phantom" : null);
    };

    syncWallet();

    const handleConnect = () => {
      syncWallet();
    };

    const handleDisconnect = () => {
      setAddress(null);
      setChainId(null);
      setWalletProvider(null);
    };

    const handleAccountChanged = (nextPublicKey: unknown) => {
      const nextAddress =
        nextPublicKey &&
        typeof nextPublicKey === "object" &&
        "toString" in nextPublicKey &&
        typeof nextPublicKey.toString === "function"
          ? nextPublicKey.toString()
          : null;
      setAddress(nextAddress);
      setChainId(nextAddress ? SOLANA_CHAIN_ID : null);
      setWalletProvider(nextAddress ? "phantom" : null);
    };

    provider.on("connect", handleConnect);
    provider.on("disconnect", handleDisconnect);
    provider.on("accountChanged", handleAccountChanged);

    return () => {
      provider.removeListener("connect", handleConnect);
      provider.removeListener("disconnect", handleDisconnect);
      provider.removeListener("accountChanged", handleAccountChanged);
    };
  }, []);

  useEffect(() => {
    const provider = getOkxInjectedSolanaProvider();
    if (!provider?.on || !provider.removeListener) return;

    const syncWallet = (nextPublicKey?: unknown) => {
      const nextAddress =
        nextPublicKey &&
        typeof nextPublicKey === "object" &&
        "toString" in nextPublicKey &&
        typeof nextPublicKey.toString === "function"
          ? nextPublicKey.toString()
          : provider.publicKey?.toString() ?? null;

      if (!nextAddress) {
        setAddress(null);
        setChainId(null);
        setWalletProvider(null);
        return;
      }

      setAddress(nextAddress);
      setChainId(SOLANA_CHAIN_ID);
      setWalletProvider("okx");
    };

    const handleDisconnect = () => {
      setAddress(null);
      setChainId(null);
      setWalletProvider(null);
    };

    provider.on("connect", syncWallet);
    provider.on("accountChanged", syncWallet);
    provider.on("disconnect", handleDisconnect);

    return () => {
      provider.removeListener?.("connect", syncWallet);
      provider.removeListener?.("accountChanged", syncWallet);
      provider.removeListener?.("disconnect", handleDisconnect);
    };
  }, []);

  const connectPhantom = async () => {
    const provider = getPhantomProvider();
    if (!provider) {
      toast.error(
        pick({
          "zh-CN": "尚未检测到 Phantom 钱包。",
          "zh-TW": "尚未偵測到 Phantom 錢包。",
          en: "Phantom wallet is not installed.",
          ja: "Phantom ウォレットが見つかりません。",
        }),
      );
      return;
    }

    setConnectingWallet("phantom");
    try {
      const response = await provider.connect();
      const nextAddress = response.publicKey?.toString() ?? provider.publicKey?.toString() ?? null;
      setAddress(nextAddress);
      setChainId(nextAddress ? SOLANA_CHAIN_ID : null);
      setWalletProvider(nextAddress ? "phantom" : null);

      if (nextAddress) {
        toast.success(
          pick({
            "zh-CN": `Phantom 已连接：${formatAddress(nextAddress)}`,
            "zh-TW": `Phantom 已連接：${formatAddress(nextAddress)}`,
            en: `Phantom connected: ${formatAddress(nextAddress)}`,
            ja: `Phantom 接続完了：${formatAddress(nextAddress)}`,
          }),
        );
      }
    } catch (error) {
      const fallbackMessage = pick({
        "zh-CN": "Phantom 连接已取消。",
        "zh-TW": "Phantom 連接已取消。",
        en: "Phantom connection was cancelled.",
        ja: "Phantom の接続がキャンセルされました。",
      });
      const message =
        error instanceof Error && error.message
          ? error.message
          : fallbackMessage;
      toast.error(message);
    } finally {
      setConnectingWallet(null);
    }
  };

  const connectOkx = async () => {
    setConnectingWallet("okx");
    try {
      const injectedProvider = getOkxInjectedSolanaProvider();
      if (injectedProvider) {
        const response = await withTimeout(
          injectedProvider.connect(),
          OKX_CONNECT_TIMEOUT_MS,
          pick({
            "zh-CN": "OKX 插件授权未完成，已停止等待。请确认 Chrome 里的 OKX 钱包弹窗后再试。",
            "zh-TW": "OKX 外掛授權未完成，已停止等待。請確認 Chrome 裡的 OKX 錢包彈窗後再試。",
            en: "OKX extension authorization did not finish. Approve the OKX Wallet popup in Chrome, then try again.",
            ja: "OKX 拡張機能の認証が完了しませんでした。Chrome の OKX Wallet ポップアップを承認してから再試行してください。",
          }),
        );
        const nextAddress = parseOkxInjectedAddress(response, injectedProvider);
        if (!nextAddress) {
          throw new Error("OKX did not return a Solana account.");
        }

        setAddress(nextAddress);
        setChainId(SOLANA_CHAIN_ID);
        setWalletProvider("okx");
        toast.success(
          pick({
            "zh-CN": `OKX 已连接：${formatAddress(nextAddress)}`,
            "zh-TW": `OKX 已連接：${formatAddress(nextAddress)}`,
            en: `OKX connected: ${formatAddress(nextAddress)}`,
            ja: `OKX 接続完了：${formatAddress(nextAddress)}`,
          }),
        );
        return;
      }

      toast.error(
        pick({
          "zh-CN": "当前浏览器没有检测到 OKX 插件。请在已安装 OKX Wallet 的 Chrome 中打开 http://127.0.0.1:5173/ 再连接。",
          "zh-TW": "目前瀏覽器沒有偵測到 OKX 外掛。請在已安裝 OKX Wallet 的 Chrome 中打開 http://127.0.0.1:5173/ 再連接。",
          en: "No OKX extension was detected in this browser. Open http://127.0.0.1:5173/ in Chrome with OKX Wallet installed, then connect.",
          ja: "このブラウザでは OKX 拡張機能が検出されません。OKX Wallet を入れた Chrome で http://127.0.0.1:5173/ を開いてから接続してください。",
        }),
      );
      return;
    } catch (error) {
      const fallbackMessage = pick({
        "zh-CN": "OKX 钱包连接已取消。",
        "zh-TW": "OKX 錢包連接已取消。",
        en: "OKX wallet connection was cancelled.",
        ja: "OKX ウォレットの接続がキャンセルされました。",
      });
      const message =
        error instanceof Error && error.message
          ? error.message
          : fallbackMessage;
      toast.error(message);
    } finally {
      setConnectingWallet(null);
    }
  };

  const connect = connectPhantom;

  const disconnect = async () => {
    if (walletProvider === "okx") {
      try {
        const injectedProvider = getOkxInjectedSolanaProvider();
        if (injectedProvider?.disconnect) {
          await injectedProvider.disconnect();
        }
        setAddress(null);
        setChainId(null);
        setWalletProvider(null);
        toast.success(
          pick({
            "zh-CN": "OKX 已断开连接。",
            "zh-TW": "OKX 已中斷連接。",
            en: "OKX disconnected.",
            ja: "OKX を切断しました。",
          }),
        );
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : pick({
                "zh-CN": "OKX 断开连接失败。",
                "zh-TW": "OKX 中斷連接失敗。",
                en: "Failed to disconnect OKX.",
                ja: "OKX の切断に失敗しました。",
              });
        toast.error(message);
      }
      return;
    }

    const provider = getPhantomProvider();
    if (!provider?.disconnect) {
      setAddress(null);
      setChainId(null);
      setWalletProvider(null);
      return;
    }

    try {
      await provider.disconnect();
      setAddress(null);
      setChainId(null);
      setWalletProvider(null);
      toast.success(
        pick({
          "zh-CN": "Phantom 已断开连接。",
          "zh-TW": "Phantom 已中斷連接。",
          en: "Phantom disconnected.",
          ja: "Phantom を切断しました。",
        }),
      );
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : pick({
              "zh-CN": "Phantom 断开连接失败。",
              "zh-TW": "Phantom 中斷連接失敗。",
              en: "Failed to disconnect Phantom.",
              ja: "Phantom の切断に失敗しました。",
            });
      toast.error(message);
    }
  };

  const value = useMemo<WalletContextValue>(
    () => ({
      address,
      chainId,
      isInstalled,
      isPhantomInstalled,
      isOkxAvailable,
      isConnecting,
      connectingWallet,
      walletProvider,
      walletName: getWalletName(walletProvider),
      connect,
      connectPhantom,
      connectOkx,
      disconnect,
      shortAddress: address ? formatAddress(address) : null,
    }),
    [address, chainId, connectingWallet, isConnecting, isInstalled, isOkxAvailable, isPhantomInstalled, walletProvider],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within WalletProvider");
  }
  return context;
};

declare global {
  interface Window {
    phantom?: {
      solana?: SolanaProvider;
    };
    okxwallet?: {
      solana?: OKXInjectedSolanaProvider;
    };
  }
}
