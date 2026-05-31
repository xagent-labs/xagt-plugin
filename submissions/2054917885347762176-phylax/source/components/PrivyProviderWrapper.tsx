"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import {
  PrivyProvider,
  usePrivy,
  useWallets,
  getAccessToken,
} from "@privy-io/react-auth";

const xLayerChain = {
  id: 196,
  network: "x-layer",
  name: "X Layer",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.xlayer.tech"] },
    public: { http: ["https://rpc.xlayer.tech"] },
  },
  blockExplorers: {
    default: { name: "OKLink", url: "https://www.oklink.com/xlayer" },
  },
};

// ─── Resolve getIdentityToken at module level (not during render) ─────────────

let _getIdentityToken: (() => Promise<string | null>) | null = null;
try {
  // getIdentityToken is a module-level export in some Privy SDK versions.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("@privy-io/react-auth");
  if (typeof mod.getIdentityToken === "function") {
    _getIdentityToken = mod.getIdentityToken;
  }
} catch {
  // not available in this Privy version
}

// ─── Auth context ─────────────────────────────────────────────────────────────

export interface PrivyAuthState {
  /** True once Privy SDK has initialised */
  ready: boolean;
  /** User has completed Privy login */
  authenticated: boolean;
  /** Opens the Privy login modal */
  login: () => void;
  /** Logs out the current user */
  logout: () => Promise<void>;
  /** User's email from Privy (if logged in via email) */
  userEmail: string | null;
  /** First linked wallet address (lowercase) or null */
  walletAddress: string | null;
  /** At least one wallet is linked */
  hasWallet: boolean;
  /** Opens Privy wallet connect/link modal */
  connectWallet: () => void;
  /** Get access token for API calls */
  getAccessToken: () => Promise<string | null>;
  /** Get identity token for wallet ownership verification */
  getIdentityToken: () => Promise<string | null>;
  /** Whether Privy is configured at all */
  privyConfigured: boolean;
}

const nullToken = async () => null as string | null;

const noop = () => { console.warn("[PhylaX] Cannot login — NEXT_PUBLIC_PRIVY_APP_ID is not set."); };
const noopAsync = async () => {};

const DISCONNECTED: PrivyAuthState = {
  ready: true,
  authenticated: false,
  login: noop,
  logout: noopAsync,
  userEmail: null,
  walletAddress: null,
  hasWallet: false,
  connectWallet: noop,
  getAccessToken: nullToken,
  getIdentityToken: nullToken,
  privyConfigured: false,
};

const PrivyAuthContext = createContext<PrivyAuthState>(DISCONNECTED);

/** Consume auth state anywhere below the provider. */
export function usePrivyAuth(): PrivyAuthState {
  return useContext(PrivyAuthContext);
}

// ─── Inner bridge (calls hooks unconditionally at top level) ──────────────────

/**
 * This component is rendered ONLY inside PrivyProvider.
 * All Privy hooks are called unconditionally at the very top of the function.
 * No early returns, no conditionals, no try/catch before hooks.
 */
function PrivyAuthBridge({ children }: { children: ReactNode }) {
  // ── hooks first, unconditionally ──
  const privy = usePrivy();
  const { wallets } = useWallets();

  // ── derive state (no hooks after this point) ──
  // Extract email from Privy user
  const userEmail = privy.user?.email?.address ?? privy.user?.google?.email ?? null;

  const state = useMemo<PrivyAuthState>(() => ({
    ready: privy.ready,
    authenticated: privy.authenticated,
    login: privy.login,
    logout: privy.logout,
    userEmail,
    walletAddress: wallets?.[0]?.address?.toLowerCase() ?? null,
    hasWallet: (wallets?.length ?? 0) > 0,
    connectWallet: privy.connectWallet ?? privy.login,
    getAccessToken: privy.getAccessToken ?? getAccessToken ?? nullToken,
    getIdentityToken: _getIdentityToken ?? nullToken,
    privyConfigured: true,
  }), [privy.ready, privy.authenticated, privy.login, privy.logout, privy.connectWallet, privy.getAccessToken, wallets, userEmail]);

  return (
    <PrivyAuthContext.Provider value={state}>
      {children}
    </PrivyAuthContext.Provider>
  );
}

// ─── Public wrapper ───────────────────────────────────────────────────────────

// Read app ID once at module level — stable across renders
const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";

/**
 * Client-side Privy provider wrapper for Next.js App Router.
 *
 * When NEXT_PUBLIC_PRIVY_APP_ID is missing, renders children with DISCONNECTED
 * auth state (no Privy hooks are called). When configured, wraps children with
 * PrivyProvider → PrivyAuthBridge which calls hooks unconditionally.
 */
export function PrivyProviderWrapper({ children }: { children: ReactNode }) {
  if (!PRIVY_APP_ID) {
    return (
      <PrivyAuthContext.Provider value={DISCONNECTED}>
        {children}
      </PrivyAuthContext.Provider>
    );
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: {
          theme: "light",
          accentColor: "#4F46E5",
        },
        loginMethods: ["wallet", "email"],
        defaultChain: xLayerChain,
        supportedChains: [xLayerChain],
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
      }}
    >
      <PrivyAuthBridge>{children}</PrivyAuthBridge>
    </PrivyProvider>
  );
}
