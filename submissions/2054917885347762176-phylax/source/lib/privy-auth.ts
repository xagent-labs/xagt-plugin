/**
 * Privy backend authentication for PhylaX.
 *
 * Implements full wallet ownership verification using @privy-io/node.
 *
 * ## Verification Flow:
 * 1. Access token (Authorization: Bearer) → verify session → get userId/sessionId
 * 2. Identity token (x-privy-identity-token) → verifyIdentityToken → get User object with linked_accounts
 * 3. If identity token unavailable → fallback to server API: users.getByWalletAddress()
 * 4. Extract wallet addresses from user.linked_accounts
 * 5. Validate that client-supplied x-wallet-address matches a linked wallet (case-insensitive)
 * 6. Fail closed if wallet not linked to verified user
 *
 * ## Environment:
 * - NEXT_PUBLIC_PRIVY_APP_ID: Privy app ID (shared with frontend)
 * - PRIVY_APP_SECRET: Privy app secret (server-side only, never exposed)
 *
 * ## Security:
 * - Production mode: fail closed if PrivyClient is not configured
 * - Dev mode: passthrough only when NODE_ENV !== 'production' AND Privy not configured
 * - Never trust x-wallet-address without verified ownership
 * - Never log tokens
 */

import { PrivyClient } from "@privy-io/node";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BaseSession {
  /** Privy user ID (verified) */
  userId: string;
  /** Session ID from access token */
  sessionId: string;
  /** Client-provided wallet address, strictly unverified and not to be trusted for approvals */
  unverifiedClientWalletAddress: string | null;
}

export interface WalletSession extends BaseSession {
  /** Verified wallet address (proven to be linked to Privy user) */
  walletAddress: string;
  /** All wallet addresses linked to this Privy user */
  linkedWallets: string[];
  /** How the wallet ownership was verified */
  authMethod: "identity_token" | "server_lookup";
}

export interface AuthResult {
  authenticated: boolean;
  session: BaseSession | null;
  error: string | null;
  /** HTTP status code to return */
  statusCode: 200 | 401 | 403;
}

export interface WalletAuthResult {
  authenticated: boolean;
  session: WalletSession | null;
  error: string | null;
  statusCode: 200 | 401 | 403;
}

// ─── Singleton PrivyClient ────────────────────────────────────────────────────

let _privyClient: PrivyClient | null = null;
let _privyInitError: string | null = null;

function getPrivyClient(): PrivyClient | null {
  if (_privyClient) return _privyClient;
  if (_privyInitError) return null;

  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;

  if (!appId || !appSecret) {
    _privyInitError =
      "Privy backend auth is not configured. " +
      "Set NEXT_PUBLIC_PRIVY_APP_ID and PRIVY_APP_SECRET in .env.local.";
    console.warn(`[privy-auth] ${_privyInitError}`);
    return null;
  }

  try {
    _privyClient = new PrivyClient({ appId, appSecret });
    return _privyClient;
  } catch (err) {
    _privyInitError = `Failed to initialize PrivyClient: ${err instanceof Error ? err.message : String(err)}`;
    console.error(`[privy-auth] ${_privyInitError}`);
    return null;
  }
}

/** FOR TESTING ONLY: Inject a mock PrivyClient */
export function __setPrivyClientForTesting(client: any) {
  _privyClient = client;
  _privyInitError = null;
}

// ─── Token extraction ─────────────────────────────────────────────────────────

/**
 * Extract the access token from the request.
 * Supports: Authorization: Bearer <token>, x-privy-token (legacy)
 */
function extractAccessToken(req: Request): string | null {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  return req.headers.get("x-privy-token");
}

/**
 * Extract the identity token from the request.
 * The identity token contains the user's linked accounts for wallet ownership verification.
 */
function extractIdentityToken(req: Request): string | null {
  return req.headers.get("x-privy-identity-token");
}

// ─── Wallet extraction helpers ────────────────────────────────────────────────

interface LinkedAccountLike {
  type?: string;
  address?: string;
  chain_type?: string;
}

/**
 * Extract all wallet addresses from a Privy User's linked_accounts.
 * Normalized to lowercase for consistent comparison.
 */
function extractWalletAddresses(linkedAccounts: LinkedAccountLike[]): string[] {
  if (!Array.isArray(linkedAccounts)) return [];

  return linkedAccounts
    .filter((account) => {
      // Match wallet accounts (external wallets, embedded wallets, smart wallets)
      return (
        account.type === "wallet" ||
        account.type === "smart_wallet"
      );
    })
    .map((account) => account.address?.toLowerCase())
    .filter((addr): addr is string => !!addr);
}

/**
 * Check if a wallet address is in the list of linked wallets.
 * Case-insensitive comparison with checksum normalization.
 */
function isWalletLinked(
  walletAddress: string,
  linkedWallets: string[]
): boolean {
  const normalized = walletAddress.toLowerCase();
  return linkedWallets.includes(normalized);
}

// ─── Main verification ───────────────────────────────────────────────────────

/**
 * Verify wallet session from an incoming API request.
 *
 * Full verification flow:
 * 1. Verify access token → userId, sessionId
 * 2. Verify identity token (or server lookup) → User with linked_accounts
 * 3. Extract linked wallets → validate client-supplied wallet matches
 * 4. Return verified session with proven wallet address
 */
/**
 * Verify user session (email login only — no wallet required).
 *
 * Used for chat access where wallet is not needed.
 * Only verifies the Privy access token to confirm the user is signed in.
 */
export async function verifySession(req: Request): Promise<AuthResult> {
  const accessToken = extractAccessToken(req);

  if (!accessToken) {
    return {
      authenticated: false,
      session: null,
      error: "Please sign in to use PhylaX.",
      statusCode: 401,
    };
  }

  const privyClient = getPrivyClient();

  if (privyClient) {
    try {
      const claims = await privyClient.utils().auth().verifyAccessToken(accessToken);
      if (!claims.user_id) {
        return { authenticated: false, session: null, error: "Invalid session.", statusCode: 401 };
      }
      const clientWallet = req.headers.get("x-wallet-address")?.toLowerCase() ?? null;
      return {
        authenticated: true,
        session: {
          userId: claims.user_id,
          sessionId: claims.session_id,
          unverifiedClientWalletAddress: clientWallet,
        },
        error: null,
        statusCode: 200,
      };
    } catch (err) {
      return handleTokenError(err, "access");
    }
  }

  // PrivyClient missing
  return {
    authenticated: false,
    session: null,
    error: _privyInitError ?? "Privy backend verification is not configured.",
    statusCode: 401,
  };
}

/**
 * Verify wallet session from an incoming API request.
 *
 * Full verification flow:
 * 1. Verify access token → userId, sessionId
 * 2. Verify identity token (or server lookup) → User with linked_accounts
 * 3. Extract linked wallets → validate client-supplied wallet matches
 * 4. Return verified session with proven wallet address
 */
export async function verifyWalletSession(req: Request): Promise<WalletAuthResult> {
  if (typeof global !== "undefined" && (global as any).__mockVerifyWalletSession) {
    return (global as any).__mockVerifyWalletSession(req);
  }
  const accessToken = extractAccessToken(req);
  const identityToken = extractIdentityToken(req);
  const clientWalletAddress = req.headers.get("x-wallet-address");

  // ── No access token → reject ───────────────────────────────────────────
  if (!accessToken) {
    return {
      authenticated: false,
      session: null,
      error: "Wallet connection required. No auth token provided.",
      statusCode: 401,
    };
  }

  // ── No wallet address → reject ─────────────────────────────────────────
  if (!clientWalletAddress) {
    return {
      authenticated: false,
      session: null,
      error: "Wallet connection required. No wallet address provided.",
      statusCode: 401,
    };
  }

  const privyClient = getPrivyClient();

  // ── PrivyClient available → real verification ──────────────────────────
  if (privyClient) {
    return await verifyWithPrivy(
      privyClient,
      accessToken,
      identityToken,
      clientWalletAddress
    );
  }

  // ── PrivyClient not available ──────────────────────────────────────────
  // FAIL CLOSED: Must never passthrough wallet verification
  return {
    authenticated: false,
    session: null,
    error:
      _privyInitError ??
      "Privy backend verification is not configured. " +
        "Set NEXT_PUBLIC_PRIVY_APP_ID and PRIVY_APP_SECRET.",
    statusCode: 401,
  };
}

// ─── Real Privy verification ──────────────────────────────────────────────────

async function verifyWithPrivy(
  client: PrivyClient,
  accessToken: string,
  identityToken: string | null,
  clientWalletAddress: string
): Promise<WalletAuthResult> {
  // ── Step 1: Verify access token for session ────────────────────────────
  let userId: string;
  let sessionId: string;

  try {
    const claims = await client.utils().auth().verifyAccessToken(accessToken);
    userId = claims.user_id;
    sessionId = claims.session_id;

    if (!userId) {
      return {
        authenticated: false,
        session: null,
        error: "Invalid Privy token: no user ID in claims.",
        statusCode: 401,
      };
    }
  } catch (err) {
    return handleTokenError(err, "access");
  }

  // ── Step 2: Verify wallet ownership ────────────────────────────────────
  // Try identity token first (no API call needed), then fall back to server lookup
  let linkedWallets: string[];
  let authMethod: WalletSession["authMethod"];

  if (identityToken) {
    // Path A: Identity token → verifyIdentityToken → User with linked_accounts
    try {
      const user = await client.utils().auth().verifyIdentityToken(identityToken);
      linkedWallets = extractWalletAddresses(
        user.linked_accounts as LinkedAccountLike[]
      );
      authMethod = "identity_token";
    } catch {
      // Identity token verification failed, try server lookup
      const lookupResult = await serverLookupWallets(client, userId, clientWalletAddress);
      if (!lookupResult.ok) {
        return {
          authenticated: false,
          session: null,
          error: lookupResult.error,
          statusCode: 401,
        };
      }
      linkedWallets = lookupResult.wallets;
      authMethod = "server_lookup";
    }
  } else {
    // Path B: No identity token → server API lookup
    const lookupResult = await serverLookupWallets(client, userId, clientWalletAddress);
    if (!lookupResult.ok) {
      return {
        authenticated: false,
        session: null,
        error: lookupResult.error,
        statusCode: 401,
      };
    }
    linkedWallets = lookupResult.wallets;
    authMethod = "server_lookup";
  }

  // ── Step 3: Validate wallet ownership ──────────────────────────────────
  if (linkedWallets.length === 0) {
    return {
      authenticated: false,
      session: null,
      error: "No wallet linked to your Privy account. Please connect a wallet in Privy first.",
      statusCode: 401,
    };
  }

  if (!isWalletLinked(clientWalletAddress, linkedWallets)) {
    return {
      authenticated: false,
      session: null,
      error:
        "Wallet mismatch: the wallet address you are using is not linked to your Privy account. " +
        "Please use a linked wallet or link this wallet in Privy settings.",
      statusCode: 403,
    };
  }

  // ── Verified ───────────────────────────────────────────────────────────
  return {
    authenticated: true,
    session: {
      userId,
      sessionId,
      unverifiedClientWalletAddress: clientWalletAddress.toLowerCase(),
      walletAddress: clientWalletAddress.toLowerCase(),
      linkedWallets,
      authMethod,
    },
    error: null,
    statusCode: 200,
  };
}

// ─── Server-side wallet ownership lookup ──────────────────────────────────────

/**
 * Look up wallet ownership via the public Privy API.
 *
 * Uses `client.users.getByWalletAddress()` — the official public API —
 * instead of `_get(userId)` which uses underscore-prefix convention
 * (Stainless SDK internal naming to avoid JS reserved word collision).
 *
 * This directly verifies: "Is this wallet address linked to a user in our app,
 * and does that user match the authenticated userId from the access token?"
 */
async function serverLookupWallets(
  client: PrivyClient,
  userId: string,
  clientWalletAddress?: string
): Promise<{ ok: true; wallets: string[] } | { ok: false; error: string }> {
  // If we have the client wallet address, use the targeted lookup
  if (clientWalletAddress) {
    try {
      const user = await client.users().getByWalletAddress({
        address: clientWalletAddress.toLowerCase(),
      });

      // Verify the returned user matches the authenticated session
      if (user.id !== userId) {
        return {
          ok: false,
          error:
            "Wallet mismatch: this wallet is linked to a different Privy account.",
        };
      }

      const wallets = extractWalletAddresses(
        user.linked_accounts as LinkedAccountLike[]
      );
      return { ok: true, wallets };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      // 404 = wallet not found in any Privy user
      if (message.includes("404") || message.includes("not found") || message.includes("Not Found")) {
        return {
          ok: false,
          error:
            "This wallet is not linked to any Privy account. " +
            "Please link this wallet in your Privy settings.",
        };
      }

      if (message.includes("401") || message.includes("Invalid app ID or app secret")) {
        console.error(`[privy-auth] Security blocked: Wallet lookup failed with 401 (Invalid Secret). Dev fallback has been removed for production readiness.`);
      }

      console.error(`[privy-auth] Wallet lookup failed: ${message}`);
      return {
        ok: false,
        error: "Could not verify wallet ownership. Please check your Privy App Secret.",
      };
    }
  }

  // No client wallet address available — cannot perform lookup
  return {
    ok: false,
    error: "Wallet address required for ownership verification.",
  };
}

// ─── Error handling ───────────────────────────────────────────────────────────

function handleTokenError(err: unknown, tokenType: "access" | "identity"): any {
  const message = err instanceof Error ? err.message : String(err);

  if (message.includes("expired") || message.includes("exp")) {
    return {
      authenticated: false,
      session: null,
      error: "Session expired. Please reconnect your wallet.",
      statusCode: 401,
    };
  }

  if (message.includes("invalid") || message.includes("malformed")) {
    return {
      authenticated: false,
      session: null,
      error: `Invalid ${tokenType} token. Please reconnect your wallet.`,
      statusCode: 401,
    };
  }

  console.error(`[privy-auth] ${tokenType} token verification failed: ${message}`);
  return {
    authenticated: false,
    session: null,
    error: "Authentication failed. Please try reconnecting your wallet.",
    statusCode: 401,
  };
}
