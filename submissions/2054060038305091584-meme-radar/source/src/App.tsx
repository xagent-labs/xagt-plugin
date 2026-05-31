import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  Check,
  Copy,
  Crosshair,
  Database,
  ExternalLink,
  FileText,
  Flame,
  Gauge,
  GitBranch,
  Github,
  Radar,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  Signal,
  SlidersHorizontal,
} from "lucide-react";
import type { RadarSnapshot, RadarToken, RiskLevel, TokenStage } from "./types";
import {
  classifyToken,
  formatAge,
  formatMoney,
  momentumScore,
  riskTone,
  safetyScore,
  truncateAddress,
  verdictLabel,
} from "./lib/risk";

const riskFilters: Array<RiskLevel | "ALL"> = ["ALL", "LOW", "MEDIUM", "HIGH", "CRITICAL"];
const stageFilters: Array<TokenStage | "ALL"> = ["ALL", "NEW", "MIGRATING", "MIGRATED"];

function riskClass(level: RiskLevel) {
  return `risk-${riskTone[level]}`;
}

function App() {
  const [snapshot, setSnapshot] = useState<RadarSnapshot | null>(null);
  const [tokens, setTokens] = useState<RadarToken[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "ALL">("ALL");
  const [stageFilter, setStageFilter] = useState<TokenStage | "ALL">("ALL");
  const [chainFilter, setChainFilter] = useState("ALL");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function loadSnapshot(mode: "read" | "refresh" = "read") {
    setIsRefreshing(true);
    try {
      const response =
        mode === "refresh"
          ? await fetch("/api/snapshot/refresh", { method: "POST", cache: "no-cache" })
          : await fetch("/api/snapshot", { cache: "no-cache" });
      if (!response.ok) throw new Error("Local API unavailable");
      const data = (await response.json()) as RadarSnapshot;
      applySnapshot(data);
      setToast(data.status?.message ?? "Snapshot loaded.");
    } catch (apiError) {
      const response = await fetch("/data/radar-snapshot.json", { cache: "no-cache" });
      const data = (await response.json()) as RadarSnapshot;
      const fallback =
        mode === "refresh"
          ? {
              ...data,
              status: {
                ok: false,
                mode: "fallback" as const,
                message: "Local refresh API is not running. Loaded the bundled demo snapshot.",
                liveError: apiError instanceof Error ? apiError.message : "Unknown refresh error",
                commandsAttempted: data.status?.commandsAttempted,
              },
            }
          : data;
      applySnapshot(fallback);
      setToast(fallback.status?.message ?? "Demo snapshot loaded.");
    } finally {
      setIsRefreshing(false);
    }
  }

  function applySnapshot(data: RadarSnapshot) {
    setSnapshot(data);
    setTokens(data.tokens);
    setSelectedId((current) => (current && data.tokens.some((token) => token.id === current) ? current : data.tokens[0]?.id ?? null));
  }

  useEffect(() => {
    void loadSnapshot();
  }, []);

  const chains = useMemo(() => ["ALL", ...Array.from(new Set(tokens.map((token) => token.chain)))], [tokens]);

  const visibleTokens = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return tokens
      .filter((token) => {
        const matchesSearch =
          !normalized ||
          token.symbol.toLowerCase().includes(normalized) ||
          token.name.toLowerCase().includes(normalized) ||
          token.address.toLowerCase().includes(normalized);
        const matchesRisk = riskFilter === "ALL" || token.riskLevel === riskFilter;
        const matchesStage = stageFilter === "ALL" || token.stage === stageFilter;
        const matchesChain = chainFilter === "ALL" || token.chain === chainFilter;
        return matchesSearch && matchesRisk && matchesStage && matchesChain;
      })
      .sort((a, b) => {
        const aScore = a.smartMoneyScore * 0.6 + (100 - a.riskScore) * 0.4;
        const bScore = b.smartMoneyScore * 0.6 + (100 - b.riskScore) * 0.4;
        return bScore - aScore;
      });
  }, [chainFilter, query, riskFilter, stageFilter, tokens]);

  const selected = tokens.find((token) => token.id === selectedId) ?? visibleTokens[0] ?? tokens[0];

  const highRiskCount = tokens.filter((token) => token.riskLevel === "HIGH" || token.riskLevel === "CRITICAL").length;
  const watchlistCount = tokens.filter((token) => classifyToken(token) === "Watchlist").length;

  return (
    <main className="app-shell">
      <aside className="side-rail" aria-label="Workspace navigation">
        <div className="brand-mark">
          <Radar size={28} aria-hidden="true" />
        </div>
        <nav>
          <a className="rail-item active" href="#radar" aria-label="Radar">
            <Crosshair size={18} />
            <span>Radar</span>
          </a>
          <a className="rail-item" href="#signals" aria-label="Signals">
            <Signal size={18} />
            <span>Signals</span>
          </a>
          <a className="rail-item" href="#security" aria-label="Security">
            <Shield size={18} />
            <span>Risk</span>
          </a>
          <a className="rail-item" href="https://github.com/" aria-label="GitHub">
            <Github size={18} />
            <span>Repo</span>
          </a>
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>Meme Radar</h1>
            <p>OKX-powered meme-token signal, holder, and security console</p>
          </div>
          <div className="topbar-actions">
            <label className="search-box">
              <Search size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Symbol, name, or contract"
              />
            </label>
            <select value={chainFilter} onChange={(event) => setChainFilter(event.target.value)}>
              {chains.map((chain) => (
                <option key={chain} value={chain}>
                  {chain === "ALL" ? "All chains" : chain}
                </option>
              ))}
            </select>
            <button className="primary-action" type="button" onClick={() => loadSnapshot("refresh")}>
              <RefreshCw size={16} className={isRefreshing ? "spinning" : ""} />
              Refresh snapshot
            </button>
          </div>
        </header>

        <StatusBanner snapshot={snapshot} toast={toast} />

        <section className="metric-strip" aria-label="Snapshot metrics">
          <Metric icon={<Database size={18} />} label="Tokens scanned" value={snapshot?.summary.scanned ?? tokens.length} />
          <Metric icon={<ShieldAlert size={18} />} label="High-risk" value={snapshot?.summary.highRisk ?? highRiskCount} tone="red" />
          <Metric icon={<Signal size={18} />} label="Smart-money hits" value={snapshot?.summary.smartMoneyHits ?? 0} tone="cyan" />
          <Metric icon={<Crosshair size={18} />} label="Watchlist" value={watchlistCount} tone="lime" />
        </section>

        <section className="control-row" aria-label="Filters">
          <div className="filter-group">
            <SlidersHorizontal size={16} />
            {riskFilters.map((level) => (
              <button
                key={level}
                type="button"
                className={riskFilter === level ? "filter active" : "filter"}
                onClick={() => setRiskFilter(level)}
              >
                {level === "ALL" ? "All risk" : level}
              </button>
            ))}
          </div>
          <div className="filter-group">
            {stageFilters.map((stage) => (
              <button
                key={stage}
                type="button"
                className={stageFilter === stage ? "filter active" : "filter"}
                onClick={() => setStageFilter(stage)}
              >
                {stage === "ALL" ? "All stages" : stage}
              </button>
            ))}
          </div>
        </section>

        <section className="main-grid">
          <section className="panel token-panel" aria-label="Token table">
            <div className="panel-heading">
              <div>
                <h2>Live Screening Queue</h2>
                <p>{visibleTokens.length} tokens ranked by signal and risk</p>
              </div>
              <span className="source-pill">{snapshot?.source === "okx-live" ? "OKX live" : "Demo snapshot"}</span>
            </div>
            <TokenTable tokens={visibleTokens} selectedId={selected?.id} onSelect={setSelectedId} />
          </section>

          <section className="panel radar-panel" id="radar" aria-label="Risk radar">
            <div className="panel-heading">
              <div>
                <h2>Risk Map</h2>
                <p>Momentum vs safety position</p>
              </div>
              <Gauge size={20} />
            </div>
            <RadarMap tokens={visibleTokens} selectedId={selected?.id} onSelect={setSelectedId} />
            <SignalTimeline tokens={tokens} />
          </section>

          <section className="panel inspector-panel" id="security" aria-label="Selected token inspector">
            {selected ? <Inspector token={selected} /> : <EmptyInspector />}
          </section>
        </section>

        <section className="skill-pipeline" aria-label="OKX skill pipeline">
          <div>
            <h2>OKX Skill Pipeline</h2>
            <p>{snapshot?.okxSkills.join(" -> ")}</p>
          </div>
          <div className="pipeline-steps">
            <span>Scan launchpads</span>
            <GitBranch size={16} />
            <span>Enrich token data</span>
            <GitBranch size={16} />
            <span>Run security verdict</span>
          </div>
        </section>

        <SubmissionPanel />
      </section>
    </main>
  );
}

function StatusBanner({ snapshot, toast }: { snapshot: RadarSnapshot | null; toast: string | null }) {
  const mode = snapshot?.status?.mode ?? snapshot?.source ?? "demo";
  const ok = snapshot?.status?.ok ?? snapshot?.source === "okx-live";
  return (
    <section className={`status-banner ${ok ? "status-ok" : "status-warn"}`} aria-label="Snapshot status">
      <div>
        {ok ? <Check size={17} /> : <AlertTriangle size={17} />}
        <strong>{mode === "okx-live" ? "OKX live mode" : mode === "fallback" ? "Fallback mode" : "Demo mode"}</strong>
        <span>{toast ?? snapshot?.status?.message ?? "Snapshot ready."}</span>
      </div>
      <small>{snapshot ? new Date(snapshot.generatedAt).toLocaleString() : "Loading..."}</small>
    </section>
  );
}

function Metric({
  icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  tone?: "neutral" | "red" | "cyan" | "lime";
}) {
  return (
    <article className={`metric metric-${tone}`}>
      {icon}
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </article>
  );
}

function TokenTable({
  tokens,
  selectedId,
  onSelect,
}: {
  tokens: RadarToken[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="token-table" role="table">
      <div className="table-head" role="row">
        <span>Token</span>
        <span>Signal</span>
        <span>Risk</span>
        <span>Liquidity</span>
        <span>Stage</span>
      </div>
      {tokens.map((token) => (
        <button
          className={selectedId === token.id ? "token-row selected" : "token-row"}
          key={token.id}
          onClick={() => onSelect(token.id)}
          type="button"
          role="row"
        >
          <span className="token-identity">
            <strong>{token.symbol}</strong>
            <small>{truncateAddress(token.address)}</small>
          </span>
          <span className="signal-cell">
            <Activity size={14} />
            {token.smartMoneyScore}
          </span>
          <span className={`risk-badge ${riskClass(token.riskLevel)}`}>{token.riskLevel}</span>
          <span>{formatMoney(token.liquidity)}</span>
          <span className="stage-cell">{token.stage}</span>
        </button>
      ))}
    </div>
  );
}

function RadarMap({
  tokens,
  selectedId,
  onSelect,
}: {
  tokens: RadarToken[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="radar-map">
      <div className="axis axis-y">Safer</div>
      <div className="axis axis-x">More momentum</div>
      <div className="grid-ring ring-1" />
      <div className="grid-ring ring-2" />
      <div className="grid-ring ring-3" />
      {tokens.map((token) => {
        const x = momentumScore(token);
        const y = 100 - safetyScore(token);
        return (
          <button
            key={token.id}
            type="button"
            className={`radar-dot ${riskClass(token.riskLevel)} ${selectedId === token.id ? "selected" : ""}`}
            style={{ left: `${x}%`, top: `${y}%` }}
            onClick={() => onSelect(token.id)}
            aria-label={`${token.symbol} risk ${token.riskLevel}`}
          >
            <span>{token.symbol}</span>
          </button>
        );
      })}
    </div>
  );
}

function SignalTimeline({ tokens }: { tokens: RadarToken[] }) {
  const top = [...tokens].sort((a, b) => b.smartMoneyScore - a.smartMoneyScore).slice(0, 4);
  return (
    <div className="signal-timeline" id="signals">
      <div className="timeline-title">
        <Flame size={16} />
        <span>Signal tape</span>
      </div>
      {top.map((token) => (
        <div className="timeline-row" key={token.id}>
          <span>{token.symbol}</span>
          <div className="timeline-bar">
            <i style={{ width: `${token.smartMoneyScore}%` }} />
          </div>
          <strong>{token.smartMoneyScore}</strong>
        </div>
      ))}
    </div>
  );
}

function Inspector({ token }: { token: RadarToken }) {
  const action = classifyToken(token);
  return (
    <>
      <div className="panel-heading">
        <div>
          <h2>{token.symbol}</h2>
          <p>{token.name}</p>
        </div>
        <span className={`risk-badge ${riskClass(token.riskLevel)}`}>{action}</span>
      </div>

      <div className="contract-block">
        <span>{token.chain}</span>
        <strong>{truncateAddress(token.address)}</strong>
      </div>

      <div className="inspector-grid">
        <Readout label="Age" value={formatAge(token.ageMinutes)} />
        <Readout label="Market cap" value={formatMoney(token.marketCap)} />
        <Readout label="Volume" value={formatMoney(token.volume24h)} />
        <Readout label="Bonding" value={`${token.bondingProgress}%`} />
      </div>

      <section className="verdict-block">
        <div>
          <AlertTriangle size={18} />
          <span>Security verdict</span>
        </div>
        <strong className={`verdict-${token.securityVerdict}`}>{verdictLabel[token.securityVerdict]}</strong>
      </section>

      <section className="breakdown">
        <h3>Risk breakdown</h3>
        <BreakdownRow label="Overall risk" value={token.riskScore} inverse />
        <BreakdownRow label="Smart-money signal" value={token.smartMoneyScore} />
        <BreakdownRow label="Top-10 concentration" value={token.holders.top10Percent} suffix="%" inverse />
        <BreakdownRow label="New-wallet share" value={token.holders.newWalletPercent} suffix="%" inverse />
      </section>

      <section className="flag-list">
        <h3>Flags</h3>
        {token.flags.map((flag) => (
          <span key={flag}>{flag}</span>
        ))}
      </section>

      <section className="check-list">
        <h3>Recommended next checks</h3>
        {token.recommendedChecks.map((check) => (
          <div key={check}>
            <Shield size={14} />
            <span>{check}</span>
          </div>
        ))}
      </section>

      <footer className="inspector-footer">
        <span>Last OKX snapshot</span>
        <strong>{new Date(token.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong>
      </footer>
    </>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="readout">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function BreakdownRow({
  label,
  value,
  suffix = "",
  inverse = false,
}: {
  label: string;
  value: number;
  suffix?: string;
  inverse?: boolean;
}) {
  const bounded = Math.max(0, Math.min(100, value));
  const tone = inverse ? 100 - bounded : bounded;
  return (
    <div className="breakdown-row">
      <div>
        <span>{label}</span>
        <strong>{value.toFixed(value % 1 === 0 ? 0 : 1)}{suffix}</strong>
      </div>
      <div className="score-track">
        <i className={tone > 68 ? "good" : tone > 42 ? "warn" : "bad"} style={{ width: `${bounded}%` }} />
      </div>
    </div>
  );
}

function EmptyInspector() {
  return (
    <div className="empty-state">
      <Shield size={28} />
      <h2>No token selected</h2>
      <p>Adjust filters or refresh the snapshot.</p>
    </div>
  );
}

function SubmissionPanel() {
  const [copied, setCopied] = useState<string | null>(null);
  const oneLiner =
    "An AI on-chain radar that finds fresh meme tokens and ranks them by smart-money signal, holder structure, and rug risk.";
  const xPost =
    "Built Meme Radar for #XAgentHackathon at MuShanghai: an X-Agent + OKX skills dashboard that helps users screen fresh meme tokens by smart-money signal, holder structure, and rug risk.";

  async function copyText(label: string, text: string) {
    await navigator.clipboard?.writeText(text);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1600);
  }

  return (
    <section className="submission-panel" aria-label="Hackathon submission pack">
      <div>
        <h2>Submission Pack</h2>
        <p>Built for Build X-Agent Hackathon at MuShanghai, powered by X-Agent and OKX skills.</p>
      </div>
      <div className="submission-grid">
        <article>
          <FileText size={18} />
          <span>One-line description</span>
          <strong>{oneLiner}</strong>
          <button type="button" onClick={() => copyText("one-liner", oneLiner)}>
            <Copy size={14} />
            {copied === "one-liner" ? "Copied" : "Copy"}
          </button>
        </article>
        <article>
          <ExternalLink size={18} />
          <span>X post</span>
          <strong>{xPost}</strong>
          <button type="button" onClick={() => copyText("x-post", xPost)}>
            <Copy size={14} />
            {copied === "x-post" ? "Copied" : "Copy"}
          </button>
        </article>
        <article>
          <Github size={18} />
          <span>Submit command</span>
          <strong>npx @xagt/agent-plugin@latest submit</strong>
          <button type="button" onClick={() => copyText("submit", "npx @xagt/agent-plugin@latest submit")}>
            <Copy size={14} />
            {copied === "submit" ? "Copied" : "Copy"}
          </button>
        </article>
      </div>
    </section>
  );
}

export default App;
