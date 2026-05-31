"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Logo } from "../logo";

type Step =
  | { kind: "thought"; text: string }
  | { kind: "skill"; skill: string; state: "run" | "done" | "error"; source?: string; note?: string };

// The full OKX onchainOS skill suite the agent can orchestrate.
// `keys` lists every name variant the event stream uses for that
// skill (the LLM-tool route and the deterministic route differ).
const SKILL_SUITE = [
  {
    id: "security",
    name: "Security",
    desc: "honeypot / rug / tax",
    keys: ["okx-security", "okx_security_scan"],
  },
  {
    id: "market",
    name: "Token + Market",
    desc: "liquidity, dev history",
    keys: ["okx-token/market", "okx_token_report"],
  },
  {
    id: "clusters",
    name: "Clusters",
    desc: "holder concentration",
    keys: ["okx-clusters", "okx_holder_clusters"],
  },
  {
    id: "signals",
    name: "Signals",
    desc: "smart-money flow",
    keys: ["okx-signals", "okx_smart_money"],
  },
  {
    id: "memepump",
    name: "Memepump",
    desc: "bundler / sniper risk",
    keys: ["okx-memepump", "okx_meme_risk"],
  },
  {
    id: "defi",
    name: "DeFi",
    desc: "yield alternatives",
    keys: ["okx-defi", "okx_defi_alternatives"],
  },
] as const;

type SkillCell = {
  state: "idle" | "run" | "done" | "error";
  source?: string;
  note?: string;
};

// Reduce the streamed step log into the latest state for one skill.
function skillStateFor(steps: Step[], keys: readonly string[]): SkillCell {
  let cell: SkillCell = { state: "idle" };
  for (const s of steps) {
    if (s.kind !== "skill" || !keys.includes(s.skill)) continue;
    if (s.state === "run") cell = { state: "run" };
    else if (s.state === "done")
      cell = { state: "done", source: s.source, note: s.note };
    else if (s.state === "error")
      cell = { state: "error", note: s.note };
  }
  return cell;
}

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

// True when the run was served by the public hosted preview (no
// onchainos binary on the serverless host, so skills returned curated
// sample data). We surface this loudly instead of letting a truncated
// per-row note imply something is broken.
function isHostedPreview(steps: Step[]): boolean {
  return steps.some(
    (s) =>
      s.kind === "skill" &&
      typeof (s as any).note === "string" &&
      /hosted preview/i.test((s as any).note),
  );
}

// The long fallback note repeats on every row. Collapse it to a short
// chip; the banner above the console carries the full explanation.
function shortNote(note?: string): string | undefined {
  if (!note) return note;
  if (/hosted preview/i.test(note)) return "sample data";
  return note;
}

const LIVE_CHIPS = [
  { label: "USDC", q: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" },
  { label: "WETH", q: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2" },
  { label: "WBTC", q: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599" },
  { label: "PEPE", q: "0x6982508145454ce325ddbe47a25d4ec3d2311933" },
];

export default function TryIt() {
  const [symbol, setSymbol] = useState("");
  const [busy, setBusy] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [verdict, setVerdict] = useState<any>(null);
  const [dataSource, setDataSource] = useState<string>("");
  const [lastSymbol, setLastSymbol] = useState("");
  const [exec, setExec] = useState<any>(null); // execution events
  const [amount, setAmount] = useState("0.5");
  const traceEnd = useRef<HTMLDivElement>(null);

  function push(s: Step) {
    setSteps((prev) => {
      // collapse skill run→done into one row
      if (s.kind === "skill" && (s.state === "done" || s.state === "error")) {
        const i = [...prev]
          .reverse()
          .findIndex((p) => p.kind === "skill" && (p as any).skill === s.skill && (p as any).state === "run");
        if (i >= 0) {
          const idx = prev.length - 1 - i;
          const next = [...prev];
          next[idx] = s;
          return next;
        }
      }
      return [...prev, s];
    });
    setTimeout(() => traceEnd.current?.scrollIntoView({ behavior: "smooth" }), 30);
  }

  async function analyze(sym?: string) {
    const s = (sym || symbol).trim();
    if (!s || busy) return;
    setBusy(true);
    setSteps([]);
    setVerdict(null);
    setDataSource("");
    setExec(null);
    setLastSymbol(s);

    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: s, prompt: `should I buy ${s}?` }),
    });
    if (!res.body) {
      setBusy(false);
      return;
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const parts = buf.split("\n\n");
      buf = parts.pop() || "";
      for (const p of parts) {
        const line = p.replace(/^data: /, "").trim();
        if (!line) continue;
        let ev: any;
        try {
          ev = JSON.parse(line);
        } catch {
          continue;
        }
        if (ev.type === "thought") push({ kind: "thought", text: ev.text });
        else if (ev.type === "note") push({ kind: "thought", text: ev.text });
        else if (ev.type === "skill_start")
          push({ kind: "skill", skill: ev.skill, state: "run" });
        else if (ev.type === "skill_done")
          push({ kind: "skill", skill: ev.skill, state: "done", source: ev.source, note: ev.note });
        else if (ev.type === "skill_error")
          push({ kind: "skill", skill: ev.skill, state: "error", note: ev.error });
        else if (ev.type === "verdict") {
          setVerdict(ev.verdict);
          setDataSource(ev.dataSource);
        } else if (
          ev.type === "execution_blocked" ||
          ev.type === "execution_offered" ||
          ev.type === "execution_unavailable" ||
          ev.type === "swap_quote" ||
          ev.type === "awaiting_confirmation" ||
          ev.type === "swap_broadcast" ||
          ev.type === "execution_error"
        ) {
          setExec((prev: any) => ({ ...(prev || {}), [ev.type]: ev }));
        } else if (ev.type === "fatal")
          push({ kind: "thought", text: "Error: " + ev.error });
      }
    }
    setBusy(false);
  }

  // Gated buy. `confirmed` is only ever true when the user clicks the
  // explicit Broadcast button — the agent never self-confirms.
  async function buy(confirmed: boolean) {
    if (!lastSymbol || busy) return;
    setBusy(true);
    if (!confirmed) setExec(null);
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol: lastSymbol,
        buy: true,
        amount,
        // omit payToken — the agent picks the chain-correct one
        confirmed,
      }),
    });
    if (!res.body) {
      setBusy(false);
      return;
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const parts = buf.split("\n\n");
      buf = parts.pop() || "";
      for (const p of parts) {
        const line = p.replace(/^data: /, "").trim();
        if (!line) continue;
        let ev: any;
        try {
          ev = JSON.parse(line);
        } catch {
          continue;
        }
        if (
          ev.type?.startsWith("execution_") ||
          ev.type === "swap_quote" ||
          ev.type === "awaiting_confirmation" ||
          ev.type === "swap_broadcast"
        ) {
          setExec((prev: any) => ({ ...(prev || {}), [ev.type]: ev }));
        }
      }
    }
    setBusy(false);
  }

  return (
    <>
      <nav className="nav">
        <Link href="/" className="wordmark">
          <Logo />
          Smart Trade Copilot
        </Link>
        <span className="nav-cluster">
          <Link href="/#how">How it works</Link>
          <a
            href="https://github.com/victorjayeoba/Smart-Trade-Copilot"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </span>
        <span className="links">
          <Link href="/" className="btn-secondary">
            ← Home
          </Link>
        </span>
      </nav>

      <main className="app">
        <header className="app-head">
          <span className="app-eyebrow">Live analyzer</span>
          <h1>Analyze a token</h1>
          <p>
            Paste any real contract address for a fully-live OKX onchainOS
            analysis, or load a scenario. Every datapoint is tagged{" "}
            <span className="tag tag-live">live</span> or{" "}
            <span className="tag tag-demo">demo</span> — nothing is faked.
          </p>
        </header>

        <div className="panel">
          <div className="search">
            <span className="search-ic">⌕</span>
            <input
              className="search-in"
              placeholder="Real token contract address — e.g. 0xa0b8…eb48 (USDC), or a symbol"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && analyze()}
              disabled={busy}
              spellCheck={false}
            />
            <button className="cta" onClick={() => analyze()} disabled={busy}>
              {busy ? "Analyzing…" : "Analyze"}
            </button>
          </div>

          <div className="chip-row">
            <span className="chip-row-label">Try</span>
            {LIVE_CHIPS.map((c) => (
              <button
                key={c.label}
                className="chip chip-live"
                onClick={() => !busy && (setSymbol(c.q), analyze(c.q))}
                disabled={busy}
                title="Real token — fully live OKX onchainOS data"
              >
                {c.label}
                <span className="chip-tag">LIVE</span>
              </button>
            ))}
            <button
              className="chip chip-scenario"
              onClick={() => !busy && (setSymbol("RUGPULL"), analyze("RUGPULL"))}
              disabled={busy}
              title="Curated honeypot scenario — every datapoint is tagged 'demo' in the trace, never disguised as live."
            >
              RUGPULL
              <span className="chip-tag">SCENARIO</span>
            </button>
          </div>

          <p className="panel-hint">
            The first four are{" "}
            <span className="hl">real on-chain tokens analysed fully live</span>{" "}
            on OKX onchainOS (each datapoint tagged{" "}
            <span className="tag tag-live">live</span>); the verdict is whatever
            the real data says. <span className="hl">RUGPULL</span> is a curated
            honeypot scenario (tagged <span className="tag tag-demo">demo</span>,
            never shown as live) so you can see the deterministic safety core
            hard-veto and block execution.
          </p>
        </div>

        <section className="console">
          <div className="console-cap">
            <span className="console-dot" />
            OKX onchainOS · live skill console
            <span className="console-meta">
              {busy
                ? "agent running…"
                : steps.length
                  ? "run complete"
                  : "idle — pick a token above"}
            </span>
          </div>

          {/* Hosted-preview banner. The public site has no onchainos
              binary, so skills serve curated sample data. Say so plainly
              and point to the two ways to see it fully live. */}
          {!busy && isHostedPreview(steps) && (
            <div className="preview-banner">
              <span className="preview-banner-tag">HOSTED PREVIEW</span>
              <div className="preview-banner-body">
                <b>This is the live demo running on sample data.</b> The
                public host can’t run the OKX <code>onchainos</code> engine,
                so the agent’s flow, reasoning and deterministic safety core
                are fully real — but the on-chain datapoints are curated
                samples (tagged <span className="tag tag-demo">demo</span>,
                never disguised as live).
                <br />
                To run it <b>fully live</b> against real OKX onchainOS data,{" "}
                <a
                  href="https://github.com/victorjayeoba/Smart-Trade-Copilot#run-locally"
                  target="_blank"
                  rel="noreferrer"
                >
                  download the code and run it locally
                </a>{" "}
                — or watch the demo video for a live walkthrough.
              </div>
            </div>
          )}

          {/* The full OKX skill suite, shown upfront so judges see
              every tool the agent can reach. Each row reflects the
              latest streamed state for that skill. */}
          <div className="skill-grid">
            {SKILL_SUITE.map((sk) => {
              const st = skillStateFor(steps, sk.keys);
              const skipped = st.state === "done" && st.source === "skip";
              const rowState = skipped ? "skip" : st.state;
              return (
                <div key={sk.id} className={`skill-row ${rowState}`}>
                  <span className="sk-ic">
                    {st.state === "run"
                      ? "◴"
                      : skipped
                        ? "–"
                        : st.state === "done"
                          ? "✔"
                          : st.state === "error"
                            ? "✕"
                            : "○"}
                  </span>
                  <span className="sk-name">
                    OKX <b>{sk.name}</b>
                    <span className="sk-desc">{sk.desc}</span>
                  </span>
                  {st.note && (
                    <span className="sk-note" title={st.note}>
                      {shortNote(st.note)}
                    </span>
                  )}
                  <span
                    className={`sk-tag ${
                      skipped
                        ? "idle"
                        : st.source === "live"
                          ? "live"
                          : st.source === "demo"
                            ? "demo"
                            : st.state === "run"
                              ? "wait"
                              : "idle"
                    }`}
                  >
                    {skipped
                      ? "SKIPPED"
                      : st.source
                        ? st.source.toUpperCase()
                        : st.state === "run"
                          ? "CALLING"
                          : st.state === "done"
                            ? "OK"
                            : "—"}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Agent reasoning stream — proves the LLM is choosing. */}
          {steps.some((s) => s.kind === "thought") && (
            <div className="console-log">
              {steps.map((s, i) =>
                s.kind === "thought" ? (
                  <div key={i} className="log-line">
                    <span className="lc">»</span> {s.text}
                  </div>
                ) : null,
              )}
              <div ref={traceEnd} />
            </div>
          )}
        </section>

        {verdict && (
          <section className={`verdict ${verdict.verdict}`}>
            <div className="verdict-head">
              <h2>
                {verdict.verdict === "BUY"
                  ? "🟢"
                  : verdict.verdict === "CAUTION"
                    ? "🟡"
                    : "🔴"}{" "}
                {verdict.verdict}
              </h2>
              <span className="verdict-src">source · {dataSource}</span>
            </div>
            {verdict.biggestRisk ? (
              <p className="big-risk">
                <b>Biggest risk — {verdict.biggestRisk.tag}:</b>{" "}
                {verdict.biggestRisk.detail}
              </p>
            ) : (
              <p className="big-risk">No blocking risk detected.</p>
            )}
            <div className="findings">
              {verdict.reasons?.map((r: any, i: number) => (
                <div key={i} className="finding">
                  <span className="t">
                    {r.weight === "veto" ? "■" : "▲"} {r.tag}
                  </span>{" "}
                  — {r.detail}
                </div>
              ))}
              {verdict.positives?.map((p: string, i: number) => (
                <div key={"p" + i} className="finding pos">
                  + {p}
                </div>
              ))}
            </div>
            <div className="moat">
              <b>Why you can trust this verdict:</b> the LLM agent gathered the
              evidence autonomously, but this ruling was computed by a
              deterministic, unit-tested safety core the model is contractually
              forbidden from overriding. Security can hard-veto; a scan that
              doesn’t complete is never treated as a pass.
            </div>

            {/* Execution is structurally gated: this panel does not even
                render on AVOID — there is no buy path for a vetoed token. */}
            {verdict.verdict === "AVOID" ? (
              <div className="exec blocked">
                🔒 Execution path is <b>structurally unreachable</b> — the agent
                cannot swap a token the safety core vetoed. No override exists.
              </div>
            ) : (
              <div className="exec">
                <div className="exec-head">
                  Execute buy on{" "}
                  <b>
                    {exec?.execution_offered?.chain
                      ? exec.execution_offered.chain === "xlayer"
                        ? "X Layer"
                        : cap(exec.execution_offered.chain)
                      : "the token's chain"}
                  </b>{" "}
                  (OKX Agentic Wallet)
                </div>
                <div className="exec-row">
                  <input
                    className="amount-in"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={busy}
                  />
                  <span className="pay">
                    {exec?.execution_offered?.payToken || "pay"} →
                  </span>
                  <button
                    className="cta"
                    onClick={() => buy(false)}
                    disabled={busy}
                  >
                    {busy ? "…" : "Get quote"}
                  </button>
                </div>

                {exec?.execution_unavailable && (
                  <p className="exec-note">
                    ⚠ {exec.execution_unavailable.reason}
                  </p>
                )}
                {exec?.execution_offered && !exec?.execution_unavailable && (
                  <p className="exec-note ok">
                    ✔ Verdict permits execution — quoting…
                  </p>
                )}
                {exec?.swap_quote && (
                  <div className="quote">
                    Quote: ~<b>{String(exec.swap_quote.toAmount ?? "?")}</b> out
                    · price impact{" "}
                    {String(exec.swap_quote.priceImpactPct ?? "?")}%
                    {exec.swap_quote.isHoneypot && (
                      <span className="src error"> HONEYPOT — blocked</span>
                    )}
                  </div>
                )}
                {exec?.awaiting_confirmation && !exec?.swap_broadcast && (
                  <div className="confirm">
                    <p>{exec.awaiting_confirmation.text}</p>
                    <button
                      className="cta danger"
                      onClick={() => buy(true)}
                      disabled={busy}
                    >
                      {busy ? "Broadcasting…" : "✓ Yes, broadcast for real"}
                    </button>
                  </div>
                )}
                {exec?.swap_broadcast && (
                  <p className="exec-note ok">
                    ✔ Broadcast — tx{" "}
                    <code>{exec.swap_broadcast.txHash || "(see explorer)"}</code>{" "}
                    · {exec.swap_broadcast.note}
                  </p>
                )}
                {exec?.execution_error && (
                  <p className="exec-note">✕ {exec.execution_error.error}</p>
                )}
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="footer">
        Powered by OKX onchainOS · X&nbsp;Layer · the agent calls{" "}
        <code>security · token · clusters · signals · memepump · defi</code> as
        tools.
        <br />
        Also ships as an OKX Plugin Store skill and a standalone CLI ·{" "}
        <a
          href="https://github.com/victorjayeoba/Smart-Trade-Copilot"
          target="_blank"
          rel="noreferrer"
        >
          source on GitHub
        </a>
      </footer>
    </>
  );
}
