import { NextResponse } from "next/server";
import { getDataSourceStatus } from "@/lib/data";

async function ping(url: string, timeoutMs = 5000): Promise<{ ok: boolean; ms: number }> {
  const start = Date.now();
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), timeoutMs);
    const res = await fetch(url, { signal: c.signal, next: { revalidate: 0 } });
    clearTimeout(t);
    return { ok: res.ok, ms: Date.now() - start };
  } catch {
    return { ok: false, ms: Date.now() - start };
  }
}

export async function GET() {
  const [llama, gecko] = await Promise.all([
    ping("https://api.llama.fi/v2/chains"),
    ping("https://api.coingecko.com/api/v3/ping"),
  ]);

  return NextResponse.json({
    status: llama.ok && gecko.ok ? "healthy" : "degraded",
    latency: { defillama: llama, coingecko: gecko },
    dataSources: getDataSourceStatus(),
    version: "1.1.0",
    timestamp: new Date().toISOString(),
  });
}
