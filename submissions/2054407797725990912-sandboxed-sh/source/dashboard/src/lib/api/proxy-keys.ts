/**
 * Proxy API Keys - Generate and manage long-lived API keys for external tools
 * to authenticate against the /v1 proxy endpoint.
 */

import { apiGet, apiPost, apiDel } from "./core";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProxyApiKeySummary {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
}

export interface ProxyApiKeyCreated {
  id: string;
  name: string;
  /** The full API key — only returned once at creation time. */
  key: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export async function listProxyApiKeys(): Promise<ProxyApiKeySummary[]> {
  return apiGet("/api/proxy-keys", "Failed to list proxy API keys");
}

export async function createProxyApiKey(name: string): Promise<ProxyApiKeyCreated> {
  return apiPost("/api/proxy-keys", { name }, "Failed to create proxy API key");
}

export async function deleteProxyApiKey(id: string): Promise<void> {
  return apiDel(`/api/proxy-keys/${encodeURIComponent(id)}`, "Failed to delete proxy API key");
}
