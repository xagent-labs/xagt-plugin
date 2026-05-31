/**
 * Real browser wallet connection via EIP-1193.
 *
 * Security constraints:
 *   - No private keys handled by the app
 *   - No seed phrase / mnemonic requested
 *   - No server-side wallet for user trades
 *   - All signing happens in the user's browser extension
 *
 * Priority:
 *   1. OKX Wallet provider (window.okxwallet?.ethereum)
 *   2. Generic EIP-1193 (window.ethereum)
 */

"use client";

import { useState, useCallback, useMemo } from "react";

// Minimal EIP-1193 interface — only what we need
interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
}

export interface WalletState {
  /** Whether a wallet provider was detected at all */
  providerDetected: boolean;
  /** Which provider is being used */
  providerName: "OKX Wallet" | "Browser Wallet" | null;
  /** Whether the user has connected (approved account access) */
  connected: boolean;
  /** The connected address (checksummed or lowercase) */
  address: string | null;
  /** The chain ID the wallet is currently on (hex string like "0xc4" for 196) */
  chainIdHex: string | null;
  /** Numeric chain ID */
  chainId: number | null;
  /** Whether the wallet is on the correct chain for the selected PhylaX chain */
  correctNetwork: boolean;
  /** Native balance in human-readable form (e.g. "1.234") */
  nativeBalance: string | null;
  /** Connection error message */
  error: string | null;
  /** Whether a connection request is in progress */
  connecting: boolean;
}

const INITIAL_STATE: WalletState = {
  providerDetected: false,
  providerName: null,
  connected: false,
  address: null,
  chainIdHex: null,
  chainId: null,
  correctNetwork: false,
  nativeBalance: null,
  error: null,
  connecting: false,
};

function getProvider(): { provider: Eip1193Provider; name: "OKX Wallet" | "Browser Wallet" } | null {
  if (typeof window === "undefined") return null;

  // Prefer OKX Wallet
  const okx = (window as unknown as Record<string, unknown>).okxwallet as
    | { ethereum?: Eip1193Provider }
    | undefined;
  if (okx?.ethereum?.request) {
    return { provider: okx.ethereum, name: "OKX Wallet" };
  }

  // Fallback to generic EIP-1193
  const eth = (window as unknown as Record<string, unknown>).ethereum as Eip1193Provider | undefined;
  if (eth?.request) {
    return { provider: eth, name: "Browser Wallet" };
  }

  return null;
}

export function useWallet(expectedChainId: number) {
  const [state, setState] = useState<WalletState>(() => {
    // Lazy initializer — runs once, detects provider without useEffect
    const p = getProvider();
    return {
      ...INITIAL_STATE,
      providerDetected: !!p,
      providerName: p?.name ?? null,
    };
  });

  // Derived value — no useEffect needed
  const correctNetwork = useMemo(
    () => state.chainId === expectedChainId,
    [state.chainId, expectedChainId]
  );

  const fetchBalance = useCallback(async (provider: Eip1193Provider, address: string) => {
    try {
      const balHex = (await provider.request({
        method: "eth_getBalance",
        params: [address, "latest"],
      })) as string;
      const wei = BigInt(balHex);
      const eth = Number(wei) / 1e18;
      setState((s) => ({ ...s, nativeBalance: eth.toFixed(6) }));
    } catch {
      setState((s) => ({ ...s, nativeBalance: null }));
    }
  }, []);

  const connect = useCallback(async () => {
    const p = getProvider();
    if (!p) {
      setState((s) => ({
        ...s,
        error: "No EIP-1193 wallet detected. Install OKX Wallet or MetaMask.",
        connecting: false,
      }));
      return;
    }

    setState((s) => ({ ...s, connecting: true, error: null }));

    try {
      // Request accounts
      const accounts = (await p.provider.request({
        method: "eth_requestAccounts",
      })) as string[];

      if (!accounts || accounts.length === 0) {
        setState((s) => ({
          ...s,
          connecting: false,
          error: "No accounts returned. User may have rejected the request.",
        }));
        return;
      }

      const address = accounts[0];

      // Get chain ID
      const chainIdHex = (await p.provider.request({
        method: "eth_chainId",
      })) as string;
      const chainId = parseInt(chainIdHex, 16);

      setState((s) => ({
        ...s,
        providerDetected: true,
        providerName: p.name,
        connected: true,
        address,
        chainIdHex,
        chainId,
        correctNetwork: chainId === expectedChainId,
        error: null,
        connecting: false,
      }));

      // Fetch balance
      await fetchBalance(p.provider, address);

      // Listen for chain/account changes
      if (p.provider.on) {
        p.provider.on("chainChanged", (newChainHex: unknown) => {
          const hex = String(newChainHex);
          const id = parseInt(hex, 16);
          setState((s) => ({
            ...s,
            chainIdHex: hex,
            chainId: id,
            correctNetwork: id === expectedChainId,
          }));
        });
        p.provider.on("accountsChanged", (accs: unknown) => {
          const arr = accs as string[];
          if (!arr || arr.length === 0) {
            setState(INITIAL_STATE);
          } else {
            setState((s) => ({ ...s, address: arr[0] }));
            fetchBalance(p.provider, arr[0]);
          }
        });
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message.includes("User rejected")
            ? "Connection rejected by user."
            : err.message
          : "Failed to connect wallet.";
      setState((s) => ({
        ...s,
        connecting: false,
        error: msg,
      }));
    }
  }, [expectedChainId, fetchBalance]);

  const disconnect = useCallback(() => {
    setState({
      ...INITIAL_STATE,
      providerDetected: !!getProvider(),
      providerName: getProvider()?.name ?? null,
    });
  }, []);

  return { ...state, correctNetwork, connect, disconnect };
}
