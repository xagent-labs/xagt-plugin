/**
 * ArgosX — Autonomous DeFi Agent Dashboard v3
 * Glassmorphism · Bloomberg Terminal · OKX Pro aesthetic
 * All 7 features · MetaMask · Auto-Pilot · Oracle AI
 */

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  AreaChart, Area, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
const MOCK_WALLET = "0x742d35Cc6634C0532925a3b8D4C9E9e5E9b8a123";
const SESSION_ID = "oracle-" + Math.random().toString(36).slice(2, 8);

const C = {
  bg:        "#06070f",
  surface:   "#0b0d1a",
  surfaceUp: "#10122080",
  border:    "#1c1f3a",
  borderHi:  "#2a2f5a",
  blue:      "#3b82f6",
  cyan:      "#06d6ff",
  green:     "#10f58c",
  red:       "#f5365c",
  amber:     "#f59e0b",
  purple:    "#a78bfa",
  textPri:   "#e8edf8",
  textSec:   "#64748b",
  textMuted: "#2a3050",
};

const PIE_COLORS = ["#3b82f6","#10f58c","#f59e0b","#a78bfa","#06d6ff","#f5365c"];

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: ${C.bg};
    color: ${C.textPri};
    font-family: 'Inter', system-ui, sans-serif;
    min-height: 100vh;
    overflow-x: hidden;
  }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }

  .grid-bg {
    background-image:
      linear-gradient(${C.border}22 1px, transparent 1px),
      linear-gradient(90deg, ${C.border}22 1px, transparent 1px);
    background-size: 48px 48px;
  }

  .glass {
    background: ${C.surfaceUp};
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid ${C.border};
    border-radius: 16px;
  }

  .grad-border {
    position: relative;
    border-radius: 16px;
    background: ${C.surface};
  }
  .grad-border::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 16px;
    padding: 1px;
    background: linear-gradient(135deg, ${C.blue}44, ${C.cyan}22, ${C.purple}33);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }

  .glow-blue  { text-shadow: 0 0 20px ${C.blue}88; }
  .glow-green { text-shadow: 0 0 20px ${C.green}88; }
  .glow-red   { text-shadow: 0 0 20px ${C.red}88; }
  .glow-cyan  { text-shadow: 0 0 20px ${C.cyan}88; }

  .grad-text {
    background: linear-gradient(90deg, ${C.blue}, ${C.cyan});
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  @keyframes pulse-ring {
    0%   { transform: scale(0.8); opacity: 1; }
    100% { transform: scale(2.2); opacity: 0; }
  }
  .pulse-dot {
    position: relative;
    display: inline-block;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .pulse-dot::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: inherit;
    animation: pulse-ring 1.6s ease-out infinite;
  }

  @keyframes shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }
  .shimmer {
    background: linear-gradient(90deg, ${C.border} 25%, ${C.borderHi} 50%, ${C.border} 75%);
    background-size: 800px 100%;
    animation: shimmer 1.6s infinite;
    border-radius: 6px;
  }

  .btn-primary {
    background: linear-gradient(135deg, ${C.blue}, ${C.cyan}cc);
    border: none;
    border-radius: 10px;
    color: #fff;
    font-family: 'Inter', sans-serif;
    font-weight: 700;
    font-size: 0.8rem;
    letter-spacing: 0.06em;
    cursor: pointer;
    transition: all 0.2s;
  }
  .btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 24px ${C.blue}44, 0 0 0 1px ${C.cyan}44;
  }
  .btn-primary:active { transform: translateY(0); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  .btn-green {
    background: linear-gradient(135deg, #0d9e5c, ${C.green}cc);
    border: none; border-radius: 10px; color: #fff;
    font-family: 'Inter', sans-serif; font-weight: 700;
    font-size: 0.8rem; cursor: pointer; transition: all 0.2s;
  }
  .btn-green:hover { transform: translateY(-1px); box-shadow: 0 8px 24px ${C.green}44; }
  .btn-green:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  .btn-red {
    background: linear-gradient(135deg, #c0243e, ${C.red}cc);
    border: none; border-radius: 10px; color: #fff;
    font-family: 'Inter', sans-serif; font-weight: 700;
    font-size: 0.8rem; cursor: pointer; transition: all 0.2s;
  }
  .btn-red:hover { transform: translateY(-1px); box-shadow: 0 8px 24px ${C.red}44; }
  .btn-red:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  .btn-ghost {
    background: ${C.surfaceUp};
    border: 1px solid ${C.border};
    border-radius: 10px;
    color: ${C.textSec};
    font-family: 'Inter', sans-serif;
    font-weight: 500;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  .btn-ghost:hover {
    border-color: ${C.borderHi};
    color: ${C.textPri};
    background: ${C.border}66;
  }

  .tab-btn {
    background: transparent;
    border: 1px solid transparent;
    border-radius: 10px;
    color: ${C.textSec};
    font-family: 'Inter', sans-serif;
    font-weight: 600;
    font-size: 0.75rem;
    letter-spacing: 0.06em;
    cursor: pointer;
    padding: 8px 16px;
    display: flex;
    align-items: center;
    gap: 7px;
    transition: all 0.15s;
    white-space: nowrap;
  }
  .tab-btn:hover { color: ${C.textPri}; background: ${C.border}44; }
  .tab-active {
    background: linear-gradient(135deg, ${C.blue}22, ${C.cyan}11) !important;
    border: 1px solid ${C.blue}66 !important;
    color: ${C.cyan} !important;
    box-shadow: 0 0 12px ${C.blue}22;
  }

  .num { font-family: 'JetBrains Mono', monospace; }

  .data-row {
    display: grid;
    align-items: center;
    padding: 12px 16px;
    border-radius: 10px;
    transition: background 0.15s;
    cursor: default;
  }
  .data-row:hover { background: ${C.border}44; }

  .signal-bullish   { border-left: 3px solid ${C.green}; }
  .signal-bearish   { border-left: 3px solid ${C.red}; }
  .signal-neutral   { border-left: 3px solid ${C.textMuted}; }
  .signal-mild-bull { border-left: 3px solid ${C.cyan}; }
  .signal-mild-bear { border-left: 3px solid ${C.amber}; }

  .alert-high   { background: ${C.red}0a; border: 1px solid ${C.red}33; border-radius: 10px; }
  .alert-medium { background: ${C.amber}0a; border: 1px solid ${C.amber}33; border-radius: 10px; }

  .input-field {
    background: ${C.surface};
    border: 1px solid ${C.border};
    border-radius: 10px;
    color: ${C.textPri};
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.78rem;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .input-field:focus {
    border-color: ${C.blue}88;
    box-shadow: 0 0 0 3px ${C.blue}11;
  }
  .input-field::placeholder { color: ${C.textMuted}; }

  .swap-area {
    background: ${C.surface};
    border: 1px solid ${C.border};
    border-radius: 12px;
    color: ${C.textPri};
    font-family: 'Inter', sans-serif;
    font-size: 0.9rem;
    outline: none;
    resize: vertical;
    transition: border-color 0.2s, box-shadow 0.2s;
    line-height: 1.6;
    width: 100%;
    padding: 14px 16px;
  }
  .swap-area:focus {
    border-color: ${C.blue}88;
    box-shadow: 0 0 0 3px ${C.blue}11;
  }

  .chain-badge {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.65rem;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 5px;
    letter-spacing: 0.05em;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .fade-up { animation: fadeUp 0.35s ease both; }

  .progress-track {
    background: ${C.border};
    border-radius: 99px;
    overflow: hidden;
    height: 4px;
    width: 100%;
  }
  .progress-fill {
    height: 100%;
    border-radius: 99px;
    background: linear-gradient(90deg, ${C.blue}, ${C.cyan});
    transition: width 0.8s cubic-bezier(0.4,0,0.2,1);
  }

  .log-line {
    padding: 5px 0;
    border-bottom: 1px solid ${C.border}22;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.7rem;
    display: flex;
    gap: 10px;
    line-height: 1.5;
  }

  .chat-bubble-user {
    background: ${C.blue}14;
    border: 1px solid ${C.blue}33;
    border-radius: 12px 12px 4px 12px;
    padding: 12px 16px;
    font-size: 0.85rem;
    line-height: 1.5;
    align-self: flex-end;
    max-width: 82%;
  }
  .chat-bubble-ai {
    background: ${C.surface};
    border: 1px solid ${C.border};
    border-radius: 12px 12px 12px 4px;
    padding: 12px 16px;
    font-size: 0.85rem;
    line-height: 1.5;
    align-self: flex-start;
    max-width: 82%;
  }

  @keyframes floatOrb {
    0%, 100% { transform: translateY(0px) scale(1); }
    50%       { transform: translateY(-30px) scale(1.05); }
  }
  @keyframes heroFadeIn {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes counterUp {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes borderRotate {
    from { background-position: 0% 50%; }
    to   { background-position: 100% 50%; }
  }
  @keyframes scanLine {
    0%   { transform: translateY(-100%); opacity: 0.4; }
    100% { transform: translateY(400px); opacity: 0; }
  }

  .hero-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    pointer-events: none;
    animation: floatOrb 8s ease-in-out infinite;
  }

  .home-feature-card {
    background: ${C.surfaceUp};
    border: 1px solid ${C.border};
    border-radius: 16px;
    padding: 24px;
    transition: all 0.25s;
    cursor: default;
    position: relative;
    overflow: hidden;
  }
  .home-feature-card::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 16px;
    padding: 1px;
    background: linear-gradient(135deg, transparent, transparent);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
    transition: background 0.25s;
  }
  .home-feature-card:hover {
    transform: translateY(-3px);
    border-color: ${C.borderHi};
    background: #0d1022cc;
    box-shadow: 0 16px 40px #00000055;
  }
  .home-feature-card:hover::before {
    background: linear-gradient(135deg, ${C.blue}55, ${C.cyan}33, ${C.purple}44);
  }

  .stat-counter {
    font-family: 'JetBrains Mono', monospace;
    font-size: 2.4rem;
    font-weight: 800;
    line-height: 1;
    animation: counterUp 0.6s ease both;
  }

  .hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    background: ${C.blue}14;
    border: 1px solid ${C.blue}33;
    border-radius: 99px;
    padding: 6px 16px;
    font-size: 0.72rem;
    font-weight: 700;
    color: ${C.cyan};
    letter-spacing: 0.08em;
    margin-bottom: 28px;
  }

  .launch-btn {
    background: linear-gradient(135deg, ${C.blue}, ${C.cyan}cc);
    border: none;
    border-radius: 14px;
    color: #fff;
    font-family: 'Inter', sans-serif;
    font-weight: 800;
    font-size: 1rem;
    letter-spacing: 0.04em;
    cursor: pointer;
    padding: 18px 48px;
    position: relative;
    overflow: hidden;
    transition: all 0.25s;
    box-shadow: 0 8px 32px ${C.blue}55;
  }
  .launch-btn::after {
    content: '';
    position: absolute;
    top: -50%;
    left: -60%;
    width: 40%;
    height: 200%;
    background: rgba(255,255,255,0.15);
    transform: skewX(-20deg);
    transition: left 0.5s;
  }
  .launch-btn:hover { transform: translateY(-2px); box-shadow: 0 16px 48px ${C.blue}66, 0 0 0 1px ${C.cyan}55; }
  .launch-btn:hover::after { left: 140%; }
  .launch-btn:active { transform: translateY(0); }

  .terminal-line {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.72rem;
    color: ${C.green};
    opacity: 0;
    animation: counterUp 0.4s ease both;
    line-height: 1.8;
  }

  .recharts-tooltip-wrapper .recharts-default-tooltip {
    background: ${C.surface} !important;
    border: 1px solid ${C.border} !important;
    border-radius: 10px !important;
    color: ${C.textPri} !important;
    font-family: 'JetBrains Mono', monospace !important;
    font-size: 0.75rem !important;
  }
`;

// ── Helper components ───────────────────────────────────────────────────────

function StatCard({ label, value, sub, color, badge }) {
  return (
    <div className="grad-border fade-up" style={{ padding: "24px", height: "100%" }}>
      <div style={{ fontSize: "0.68rem", fontWeight: 600, color: C.textSec, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 16 }}>
        {label}
      </div>
      <div className="num" style={{ fontSize: "2rem", fontWeight: 700, color: color || C.textPri, lineHeight: 1, marginBottom: 8 }}>
        {value}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {badge && badge}
        {sub && <span style={{ fontSize: "0.72rem", color: C.textSec }}>{sub}</span>}
      </div>
    </div>
  );
}

function RiskBadge({ level }) {
  const map = {
    LOW:      { bg: C.green + "22",  border: C.green + "55",  text: C.green,   label: "LOW RISK" },
    MEDIUM:   { bg: C.amber + "22",  border: C.amber + "55",  text: C.amber,   label: "MEDIUM" },
    HIGH:     { bg: C.red + "22",    border: C.red + "55",    text: C.red,     label: "HIGH RISK" },
    CRITICAL: { bg: C.red + "33",    border: C.red + "88",    text: C.red,     label: "CRITICAL" },
    UNKNOWN:  { bg: C.border,        border: C.borderHi,      text: C.textSec, label: "UNKNOWN" },
  };
  const d = map[level] || map.UNKNOWN;
  return (
    <span style={{ background: d.bg, border: `1px solid ${d.border}`, color: d.text, padding: "3px 10px", borderRadius: 6, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", fontFamily: "'JetBrains Mono', monospace" }}>
      {d.label}
    </span>
  );
}

function SignalPill({ signal }) {
  const map = {
    BULLISH:        { color: C.green,   bg: C.green  + "18", dot: C.green,   label: "BULLISH" },
    MILDLY_BULLISH: { color: C.cyan,    bg: C.cyan   + "18", dot: C.cyan,    label: "MILD BULL" },
    BEARISH:        { color: C.red,     bg: C.red    + "18", dot: C.red,     label: "BEARISH" },
    MILDLY_BEARISH: { color: C.amber,   bg: C.amber  + "18", dot: C.amber,   label: "MILD BEAR" },
    NEUTRAL:        { color: C.textSec, bg: C.border,        dot: C.textSec, label: "NEUTRAL" },
  };
  const d = map[signal] || map.NEUTRAL;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: d.bg, color: d.color, padding: "3px 9px", borderRadius: 6, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em", fontFamily: "'JetBrains Mono', monospace" }}>
      <span className="pulse-dot" style={{ background: d.dot, width: 6, height: 6 }} />
      {d.label}
    </span>
  );
}

function ChainBadge({ chainId }) {
  const map = {
    "1":   { label: "ETH",  bg: "#627EEA22", color: "#627EEA" },
    "56":  { label: "BNB",  bg: "#F3BA2F22", color: "#F3BA2F" },
    "137": { label: "MATIC", bg: "#8247E522", color: "#8247E5" },
  };
  const d = map[chainId] || { label: "C" + chainId, bg: C.border, color: C.textSec };
  return <span className="chain-badge" style={{ background: d.bg, color: d.color }}>{d.label}</span>;
}

function TokenIcon({ symbol }) {
  const colors = {
    ETH:  ["#627EEA","#8FA5EE"], USDT: ["#26A17B","#4FD1A8"],
    MATIC:["#8247E5","#A87AEE"], BNB:  ["#F3BA2F","#F8D467"],
    BTC:  ["#F7931A","#FAB04D"], SOL:  ["#9945FF","#C481FF"],
    ARB:  ["#12AAFF","#5EC8FF"], OP:   ["#FF0420","#FF5577"],
    LINK: ["#2A5ADA","#5080EA"], USDC: ["#2775CA","#5BA0E8"],
  };
  const [c1, c2] = colors[symbol?.toUpperCase()] || [C.blue, C.cyan];
  return (
    <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${c1}, ${c2})`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.8rem", color: "#fff", flexShrink: 0, boxShadow: `0 4px 12px ${c1}44` }}>
      {symbol?.charAt(0)?.toUpperCase() || "?"}
    </div>
  );
}

function LiveDot() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span className="pulse-dot" style={{ background: C.green, width: 8, height: 8 }} />
      <span style={{ fontSize: "0.65rem", color: C.green, fontWeight: 700, letterSpacing: "0.1em" }}>LIVE</span>
    </div>
  );
}

function SectionHeader({ title, right }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
      <span style={{ fontSize: "0.68rem", fontWeight: 700, color: C.textSec, textTransform: "uppercase", letterSpacing: "0.14em" }}>{title}</span>
      {right}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: `linear-gradient(90deg, ${C.border}, transparent)`, margin: "4px 0" }} />;
}

function makeSparkline(base, pct) {
  const pts = [];
  let v = base * (1 - pct / 200);
  for (let i = 0; i < 12; i++) {
    v += (Math.random() - 0.48) * base * 0.015;
    pts.push({ v: parseFloat(v.toFixed(2)) });
  }
  pts[pts.length - 1] = { v: base };
  return pts;
}

function Sparkline({ data, color }) {
  return (
    <ResponsiveContainer width={80} height={32}>
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
        <defs>
          <linearGradient id={`sg${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#sg${color.replace("#","")})`} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Tab icon dots ─────────────────────────────────────────────────────────
function TabDot({ color }) {
  return <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />;
}

// ── Home / Landing Page ────────────────────────────────────────────────────

function HomePage({ onLaunch }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 50);
    return () => clearInterval(id);
  }, []);

  const features = [
    {
      color: C.cyan,
      icon: "[ ~ ]",
      title: "Auto-Pilot Agent",
      desc: "Runs a background loop every 60 seconds. Detects risk, reads signals, executes swaps — no human input required.",
      tag: "AUTONOMOUS",
    },
    {
      color: C.purple,
      icon: "[ ? ]",
      title: "What-If Simulator",
      desc: "Type any trade in plain English. AI projects the exact risk delta and portfolio impact before you commit a single dollar.",
      tag: "AI POWERED",
    },
    {
      color: C.green,
      icon: "[ > ]",
      title: "Natural Language Swap",
      desc: "\"Swap 10 USDT to ETH if gas < 20 gwei\" — LLaMA 3 parses your intent, OKX DEX executes the best route.",
      tag: "OKX DEX",
    },
    {
      color: C.blue,
      icon: "[ * ]",
      title: "Oracle AI Advisor",
      desc: "Persistent memory chatbot that knows your exact portfolio. Asks specific, data-driven questions — no generic advice.",
      tag: "MEMORY",
    },
    {
      color: C.amber,
      icon: "[ ! ]",
      title: "Risk Engine",
      desc: "4-dimensional scoring: concentration, diversification, portfolio size, stablecoin buffer. Score 0-100 updated live.",
      tag: "REAL-TIME",
    },
    {
      color: C.red,
      icon: "[ ^ ]",
      title: "Live Market Signals",
      desc: "Pulls OKX ticker data for 8 major pairs. Classifies BULLISH / BEARISH / NEUTRAL with 24h momentum detection.",
      tag: "OKX API",
    },
  ];

  const stats = [
    { value: "60s", label: "Monitoring Cycle", color: C.cyan },
    { value: "4",   label: "OKX API Skills",   color: C.green },
    { value: "7",   label: "Dashboard Tabs",   color: C.purple },
    { value: "24/7", label: "Autonomous Guard", color: C.amber },
  ];

  const termLines = [
    "> Connecting to OKX Agentic Wallet...",
    "> Loaded 4 OKX skill endpoints",
    "> Risk engine initialized [ OK ]",
    "> Signal scanner ready — 8 pairs",
    "> Oracle AI memory online",
    "> Auto-Pilot standby...",
  ];

  return (
    <div className="grid-bg" style={{ minHeight: "100vh", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* Background orbs */}
      <div className="hero-orb" style={{ width: 500, height: 500, background: C.blue + "18", top: "-100px", left: "-100px", animationDelay: "0s" }} />
      <div className="hero-orb" style={{ width: 400, height: 400, background: C.cyan + "12", top: "30%", right: "-80px", animationDelay: "2.5s" }} />
      <div className="hero-orb" style={{ width: 300, height: 300, background: C.purple + "14", bottom: "10%", left: "20%", animationDelay: "4s" }} />

      {/* Navbar */}
      <nav style={{ padding: "0 40px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C.border}`, background: `${C.bg}cc`, backdropFilter: "blur(20px)", position: "relative", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <img src="/logo-nav.png" alt="ArgosX" style={{ height: 44, objectFit: "contain", filter: "drop-shadow(0 0 12px #06d6ff55)" }} />
        </div>
        <button className="launch-btn" style={{ padding: "10px 28px", fontSize: "0.8rem" }} onClick={onLaunch}>
          Launch Dashboard
        </button>
      </nav>

      {/* Hero */}
      <div style={{ flex: 1, maxWidth: 1200, margin: "0 auto", padding: "60px 40px 20px", width: "100%", position: "relative", zIndex: 2 }}>

        {/* Hero layout — logo left, text right */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center", marginBottom: 56 }}>

          {/* Left — big logo */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 24, animation: "heroFadeIn 0.7s ease both" }}>
            <img
              src="/logo-full.png"
              alt="ArgosX"
              style={{ width: "100%", maxWidth: 480, objectFit: "contain", filter: "drop-shadow(0 0 48px #06d6ff44) drop-shadow(0 0 20px #3b82f633)", animation: "floatOrb 6s ease-in-out infinite" }}
            />
            <div className="hero-badge" style={{ marginBottom: 0 }}>
              <span className="pulse-dot" style={{ background: C.green, width: 7, height: 7 }} />
              BUILD X-AGENT HACKATHON 2026 -- BUILDER TRACK
            </div>
          </div>

          {/* Right — headline + tagline + CTA */}
          <div style={{ animation: "heroFadeIn 0.6s 0.15s ease both", opacity: 0 }}>
            <h1 style={{ fontSize: "clamp(2rem, 3.5vw, 3.4rem)", fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 20 }}>
              <span className="grad-text">Autonomous</span>
              <br />
              <span style={{ color: C.textPri }}>DeFi Agent</span>
            </h1>
            <p style={{ fontSize: "1rem", color: C.textSec, lineHeight: 1.75, marginBottom: 32 }}>
              Monitors your wallet 24/7, detects risks before they hit,
              simulates trades before you execute, and swaps in plain English
              — powered by OKX DEX + Groq LLaMA 3.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button className="launch-btn" onClick={onLaunch}>Launch Dashboard</button>
              <button className="btn-ghost" style={{ padding: "18px 28px", fontSize: "0.88rem", fontWeight: 700 }} onClick={() => window.open("https://github.com/JMadhan1/xagent", "_blank")}>
                View on GitHub
              </button>
            </div>
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="pulse-dot" style={{ background: C.green, width: 7, height: 7 }} />
                <span style={{ fontSize: "0.72rem", color: C.textSec }}>Live at </span>
                <a href="https://xagent-theta.vercel.app/" target="_blank" rel="noreferrer" style={{ fontSize: "0.72rem", color: C.cyan, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, textDecoration: "none", borderBottom: `1px solid ${C.cyan}44` }}>
                  xagent-theta.vercel.app
                </a>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "0.72rem", color: C.textSec }}>Demo </span>
                <a href="https://www.youtube.com/watch?v=801dVSauaRw" target="_blank" rel="noreferrer" style={{ fontSize: "0.72rem", color: C.red, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, textDecoration: "none", borderBottom: `1px solid ${C.red}44` }}>
                  youtube.com/watch?v=801dVSauaRw
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 56, animation: "heroFadeIn 0.6s 0.3s ease both", opacity: 0 }}>
          {stats.map((s, i) => (
            <div key={i} className="grad-border" style={{ padding: "24px 20px", textAlign: "center" }}>
              <div className="stat-counter" style={{ color: s.color, animationDelay: `${i * 0.1}s` }}>{s.value}</div>
              <div style={{ fontSize: "0.68rem", color: C.textSec, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 8 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Feature grid */}
        <div style={{ marginBottom: 24, animation: "heroFadeIn 0.6s 0.35s ease both", opacity: 0 }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: C.textSec, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 20 }}>
            -- FEATURE SUITE
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {features.map((f, i) => (
              <div key={i} className="home-feature-card" style={{ animationDelay: `${i * 0.06}s` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "1.1rem", fontWeight: 700, color: f.color }}>{f.icon}</span>
                  <span style={{ background: f.color + "18", color: f.color, border: `1px solid ${f.color}33`, borderRadius: 5, padding: "2px 8px", fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.1em", fontFamily: "'JetBrains Mono', monospace" }}>{f.tag}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: "0.9rem", color: C.textPri, marginBottom: 8 }}>{f.title}</div>
                <div style={{ fontSize: "0.78rem", color: C.textSec, lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* How It Works */}
        <div style={{ marginBottom: 56, animation: "heroFadeIn 0.6s 0.38s ease both", opacity: 0 }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: C.textSec, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 24 }}>
            -- HOW IT WORKS
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 0, position: "relative" }}>
            {/* connector line */}
            <div style={{ position: "absolute", top: 28, left: "10%", right: "10%", height: 1, background: `linear-gradient(90deg, ${C.blue}44, ${C.cyan}44, ${C.purple}44)`, zIndex: 0 }} />
            {[
              { step: "01", color: C.cyan,   label: "Connect Wallet",    desc: "MetaMask or paste any address. Instantly loads balances across ETH, BNB, Polygon." },
              { step: "02", color: C.green,  label: "Risk Analysis",     desc: "Engine scores your portfolio 0–100 across 4 risk dimensions. Alerts fire immediately." },
              { step: "03", color: C.blue,   label: "Read Live Signals", desc: "OKX market ticker scans 8 pairs. Bullish surges and bearish drops surface in real time." },
              { step: "04", color: C.purple, label: "Simulate or Swap",  desc: "Type a trade in plain English. Simulate first — then execute via OKX DEX aggregator." },
              { step: "05", color: C.amber,  label: "Auto-Pilot Loop",   desc: "Set rules or activate a strategy. Agent runs every 60s, protecting you around the clock." },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "0 12px", position: "relative", zIndex: 1 }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: s.color + "18", border: `2px solid ${s.color}55`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14, position: "relative" }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.85rem", fontWeight: 800, color: s.color }}>{s.step}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: "0.82rem", color: C.textPri, marginBottom: 8, lineHeight: 1.3 }}>{s.label}</div>
                <div style={{ fontSize: "0.72rem", color: C.textSec, lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Architecture flow */}
        <div style={{ marginBottom: 56, animation: "heroFadeIn 0.6s 0.39s ease both", opacity: 0 }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: C.textSec, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 20 }}>
            -- ARCHITECTURE
          </div>
          <div className="grad-border" style={{ padding: "24px 28px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, flexWrap: "wrap" }}>
              {[
                { label: "React UI",          sub: "7 Tabs + MetaMask",           color: C.cyan },
                { label: "FastAPI Backend",   sub: "20+ endpoints",               color: C.blue },
                { label: "OKX Wallet API",    sub: "Wallet / DEX / Gas / Ticker", color: C.green },
                { label: "Groq LLaMA 3",      sub: "NL Swap / Sim / Oracle",      color: C.purple },
              ].map((node, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center" }}>
                  <div style={{ textAlign: "center", padding: "12px 20px" }}>
                    <div style={{ background: node.color + "18", border: `1px solid ${node.color}44`, borderRadius: 10, padding: "10px 18px", minWidth: 140 }}>
                      <div style={{ fontWeight: 700, fontSize: "0.82rem", color: node.color }}>{node.label}</div>
                      <div style={{ fontSize: "0.65rem", color: C.textSec, marginTop: 4 }}>{node.sub}</div>
                    </div>
                  </div>
                  {i < 3 && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                      <div style={{ fontSize: "0.6rem", color: C.textMuted, fontFamily: "'JetBrains Mono',monospace" }}>HTTP</div>
                      <div style={{ color: C.borderHi, fontFamily: "'JetBrains Mono',monospace", fontSize: "1rem" }}>--&gt;</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 16, paddingTop: 14, display: "flex", justifyContent: "center", gap: 32, flexWrap: "wrap" }}>
              {[
                { label: "HMAC-SHA256 Signing",  color: C.amber },
                { label: "Async Background Loop", color: C.green },
                { label: "Session Memory",        color: C.purple },
                { label: "Mock Data Fallback",    color: C.cyan },
              ].map((badge, i) => (
                <span key={i} style={{ fontSize: "0.65rem", color: badge.color, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: badge.color, display: "inline-block" }} />
                  {badge.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Terminal preview + OKX Skills */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 48, animation: "heroFadeIn 0.6s 0.4s ease both", opacity: 0 }}>

          {/* Terminal */}
          <div className="grad-border" style={{ padding: "20px 24px", fontFamily: "'JetBrains Mono', monospace" }}>
            <div style={{ fontSize: "0.65rem", color: C.textSec, letterSpacing: "0.1em", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
              <span className="pulse-dot" style={{ background: C.green, width: 6, height: 6 }} />
              SYSTEM BOOT SEQUENCE
            </div>
            {termLines.map((line, i) => (
              <div key={i} className="terminal-line" style={{ animationDelay: `${0.5 + i * 0.18}s` }}>{line}</div>
            ))}
            <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.72rem", color: C.cyan }}>agent@okx:~$</span>
              <span style={{ width: 8, height: 14, background: C.cyan, display: "inline-block", animation: "pulse-ring 1s step-end infinite" }} />
            </div>
          </div>

          {/* OKX Skills */}
          <div className="grad-border" style={{ padding: "20px 24px" }}>
            <div style={{ fontSize: "0.65rem", color: C.textSec, letterSpacing: "0.1em", marginBottom: 16, fontWeight: 700, textTransform: "uppercase" }}>
              OKX Agentic Wallet Skills
            </div>
            {[
              { label: "Wallet Balances",  path: "/api/v5/wallet/asset/token-balances", color: C.cyan },
              { label: "Market Ticker",    path: "/api/v5/market/ticker",               color: C.green },
              { label: "DEX Aggregator",   path: "/api/v5/dex/aggregator/swap",         color: C.blue },
              { label: "Gas Price Feed",   path: "/api/v5/dex/aggregator/gas-price",    color: C.amber },
            ].map((skill, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < 3 ? `1px solid ${C.border}22` : "none" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: skill.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 600, color: C.textPri }}>{skill.label}</div>
                  <div style={{ fontSize: "0.65rem", color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>{skill.path}</div>
                </div>
                <span style={{ background: C.green + "18", color: C.green, border: `1px solid ${C.green}33`, borderRadius: 5, padding: "2px 7px", fontSize: "0.6rem", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>LIVE</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div style={{ textAlign: "center", paddingBottom: 60, animation: "heroFadeIn 0.6s 0.5s ease both", opacity: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="pulse-dot" style={{ background: C.green, width: 8, height: 8 }} />
              <span style={{ fontSize: "0.7rem", color: C.green, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, letterSpacing: "0.08em" }}>LIVE</span>
              <a href="https://xagent-theta.vercel.app/" target="_blank" rel="noreferrer" style={{ fontSize: "0.7rem", color: C.cyan, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, textDecoration: "none", borderBottom: `1px solid ${C.cyan}44` }}>
                xagent-theta.vercel.app
              </a>
            </div>
            <span style={{ color: C.border }}>|</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "0.7rem", color: C.textSec, fontFamily: "'JetBrains Mono', monospace" }}>DEMO</span>
              <a href="https://www.youtube.com/watch?v=801dVSauaRw" target="_blank" rel="noreferrer" style={{ fontSize: "0.7rem", color: C.red, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, textDecoration: "none", borderBottom: `1px solid ${C.red}44` }}>
                Watch on YouTube
              </a>
            </div>
          </div>
          <button className="launch-btn" onClick={onLaunch} style={{ fontSize: "1.05rem", padding: "20px 60px" }}>
            Open ArgosX
          </button>
        </div>

      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────

export default function App() {
  const [showHome, setShowHome] = useState(true);
  const [wallet, setWallet]           = useState(MOCK_WALLET);
  const [inputWallet, setInputWallet] = useState(MOCK_WALLET);
  const [portfolio, setPortfolio]     = useState(null);
  const [signals, setSignals]         = useState([]);
  const [alerts, setAlerts]           = useState([]);
  const [tab, setTab]                 = useState("portfolio");
  const [loading, setLoading]         = useState(false);
  const [backendOk, setBackendOk]     = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [metaMaskAddr, setMetaMaskAddr] = useState(null);

  // Auto-Pilot state
  const [apRunning, setApRunning]   = useState(false);
  const [apLogs, setApLogs]         = useState([]);
  const [apStats, setApStats]       = useState({});
  const [ruleCondition, setRuleCondition] = useState("");
  const [ruleAction, setRuleAction]       = useState("");
  const [activeStrategy, setActiveStrategy] = useState(null);

  // What-If state
  const [simAction, setSimAction]   = useState("");
  const [simResult, setSimResult]   = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  // Swap state
  const [swapCmd, setSwapCmd]       = useState("");
  const [swapResult, setSwapResult] = useState(null);

  // Oracle state
  const [oracleMsg, setOracleMsg]         = useState("");
  const [oracleHistory, setOracleHistory] = useState([]);
  const [oracleLoading, setOracleLoading] = useState(false);
  const oracleEndRef = useRef(null);

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchAll = async (addr) => {
    setLoading(true);
    try {
      const [pRes, sRes, aRes] = await Promise.all([
        axios.get(`${API}/portfolio/${addr}`).catch(() => null),
        axios.get(`${API}/signals`).catch(() => null),
        axios.get(`${API}/alerts/${addr}`).catch(() => null),
      ]);
      if (pRes?.data) setPortfolio(pRes.data);
      if (sRes?.data) setSignals(sRes.data.signals || []);
      if (aRes?.data) setAlerts(aRes.data.alerts || []);
      setBackendOk(true);
      setLastRefresh(new Date());
    } catch {
      setBackendOk(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchApLogs = async () => {
    try {
      const res = await axios.get(`${API}/autopilot/logs`);
      setApLogs(res.data.logs || []);
      setApStats(res.data.stats || {});
      setApRunning(res.data.running || false);
    } catch {}
  };

  useEffect(() => { fetchAll(wallet); }, [wallet]);
  useEffect(() => {
    const id = setInterval(() => axios.get(`${API}/signals`).then(r => setSignals(r.data.signals || [])).catch(()=>{}), 30000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (tab === "autopilot") {
      fetchApLogs();
      const id = setInterval(fetchApLogs, 10000);
      return () => clearInterval(id);
    }
  }, [tab]);
  useEffect(() => { oracleEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [oracleHistory]);

  // ── MetaMask ──────────────────────────────────────────────────────────────

  const connectWallet = async () => {
    if (!window.ethereum) { alert("MetaMask not found. Install it or paste an address manually."); return; }
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      setMetaMaskAddr(accounts[0]);
      setWallet(accounts[0]);
      setInputWallet(accounts[0]);
    } catch { alert("Connection rejected."); }
  };

  const disconnectWallet = () => {
    setMetaMaskAddr(null);
    setWallet(MOCK_WALLET);
    setInputWallet(MOCK_WALLET);
  };

  useEffect(() => {
    if (!window.ethereum) return;
    window.ethereum.request({ method: "eth_accounts" }).then(acc => {
      if (acc.length) { setMetaMaskAddr(acc[0]); setWallet(acc[0]); setInputWallet(acc[0]); }
    }).catch(()=>{});
    const onChange = (acc) => { if (!acc.length) disconnectWallet(); else { setMetaMaskAddr(acc[0]); setWallet(acc[0]); } };
    window.ethereum.on("accountsChanged", onChange);
    return () => window.ethereum.removeListener("accountsChanged", onChange);
  }, []); // eslint-disable-line

  // ── Auto-Pilot ────────────────────────────────────────────────────────────

  const startAutoPilot = async () => {
    try {
      await axios.post(`${API}/autopilot/start`, { wallet_address: wallet });
      setApRunning(true);
      setTimeout(fetchApLogs, 2000);
    } catch { alert("Failed to start Auto-Pilot"); }
  };

  const stopAutoPilot = async () => {
    try { await axios.post(`${API}/autopilot/stop`); setApRunning(false); setTimeout(fetchApLogs, 1000); } catch {}
  };

  const activateStrategy = async (name) => {
    try {
      await axios.post(`${API}/strategies/${name}/activate`, { wallet_address: wallet });
      setActiveStrategy(name);
      setTimeout(fetchApLogs, 1000);
    } catch { alert("Failed to activate strategy"); }
  };

  const addRule = async () => {
    if (!ruleCondition || !ruleAction) return;
    try {
      await axios.post(`${API}/autopilot/rule`, { condition: ruleCondition, action: ruleAction });
      setRuleCondition(""); setRuleAction("");
      setTimeout(fetchApLogs, 500);
    } catch {}
  };

  // ── What-If ───────────────────────────────────────────────────────────────

  const runSimulation = async () => {
    if (!simAction.trim()) return;
    setSimLoading(true); setSimResult(null);
    try {
      const res = await axios.post(`${API}/simulate`, { wallet_address: wallet, action: simAction });
      setSimResult(res.data);
    } catch {
      setSimResult({ verdict: "NEUTRAL", recommendation: "Backend error. Check server.", projected_risk_level: "UNKNOWN", projected_risk_score: 0, projected_value_change_pct: 0, key_risks: [], key_benefits: [] });
    } finally { setSimLoading(false); }
  };

  // ── Swap ──────────────────────────────────────────────────────────────────

  const handleSwap = async () => {
    if (!swapCmd.trim()) return;
    setLoading(true); setSwapResult(null);
    try {
      const res = await axios.post(`${API}/swap/nl`, { command: swapCmd, wallet_address: wallet });
      setSwapResult(res.data);
    } catch { setSwapResult({ status: "error", message: "Backend unreachable." }); }
    finally { setLoading(false); }
  };

  // ── Oracle ────────────────────────────────────────────────────────────────

  const sendOracle = async () => {
    if (!oracleMsg.trim()) return;
    const msg = oracleMsg;
    setOracleMsg("");
    setOracleHistory(h => [...h, { role: "user", content: msg }]);
    setOracleLoading(true);
    try {
      const res = await axios.post(`${API}/ai/chat`, { message: msg, wallet_address: wallet, session_id: SESSION_ID });
      setOracleHistory(h => [...h, { role: "ai", content: res.data.reply }]);
    } catch {
      setOracleHistory(h => [...h, { role: "ai", content: "Oracle offline - check backend server." }]);
    } finally { setOracleLoading(false); }
  };

  // ── Derived values ────────────────────────────────────────────────────────

  const totalUsd   = portfolio?.portfolio?.total_usd || 0;
  const riskScore  = portfolio?.risk?.score ?? null;
  const riskLevel  = portfolio?.risk?.level || "UNKNOWN";
  const pieData    = portfolio?.portfolio?.tokens?.map(t => ({ name: t.symbol, value: t.usd_value })) || [];

  const logColor = (level) => {
    if (level === "ERROR") return C.red;
    if (level === "ALERT" || level === "ACTION") return C.amber;
    if (level === "SIGNAL") return C.cyan;
    if (level === "START" || level === "STOP" || level === "DONE") return C.green;
    if (level === "STRATEGY") return C.purple;
    return C.textSec;
  };

  const tabs = [
    { id: "portfolio", label: "PORTFOLIO",  dot: C.cyan },
    { id: "signals",   label: "SIGNALS",    dot: C.green },
    { id: "alerts",    label: "ALERTS",     dot: alerts.some(a => a.severity === "HIGH") ? C.red : C.amber, count: alerts.length },
    { id: "autopilot", label: "AUTO-PILOT", dot: apRunning ? C.green : C.textMuted },
    { id: "simulate",  label: "WHAT-IF",    dot: C.purple },
    { id: "swap",      label: "AI SWAP",    dot: C.blue },
    { id: "oracle",    label: "ORACLE AI",  dot: C.cyan },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  if (showHome) {
    return (
      <>
        <style>{GLOBAL_CSS}</style>
        <HomePage onLaunch={() => setShowHome(false)} />
      </>
    );
  }

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div className="grid-bg" style={{ minHeight: "100vh" }}>

        {/* NAV */}
        <nav style={{ position: "sticky", top: 0, zIndex: 100, background: `${C.bg}e8`, backdropFilter: "blur(20px)", borderBottom: `1px solid ${C.border}`, padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <img src="/logo-nav.png" alt="ArgosX" style={{ height: 38, objectFit: "contain", filter: "drop-shadow(0 0 10px #06d6ff44)", cursor: "pointer" }} onClick={() => setShowHome(true)} />
            <div style={{ width: 1, height: 28, background: C.border }} />
            <div style={{ fontSize: "0.58rem", color: C.textSec, letterSpacing: "0.1em", fontWeight: 600, lineHeight: 1.5 }}>
              POWERED BY<br/>X-AGENT + OKX
            </div>
          </div>

          {/* Right controls */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {backendOk !== null && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 4 }}>
                <span className="pulse-dot" style={{ background: backendOk ? C.green : C.red, width: 7, height: 7 }} />
                <span style={{ fontSize: "0.68rem", color: backendOk ? C.green : C.red, fontWeight: 700, letterSpacing: "0.08em" }}>
                  {backendOk ? "CONNECTED" : "OFFLINE"}
                </span>
              </div>
            )}

            {metaMaskAddr ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ background: C.green + "14", border: `1px solid ${C.green}33`, borderRadius: 10, padding: "6px 14px", display: "flex", alignItems: "center", gap: 7 }}>
                  <span className="pulse-dot" style={{ background: C.green, width: 7, height: 7 }} />
                  <span className="num" style={{ fontSize: "0.75rem", color: C.green, fontWeight: 700 }}>
                    {metaMaskAddr.slice(0,6)}...{metaMaskAddr.slice(-4)}
                  </span>
                </div>
                <button className="btn-ghost" style={{ padding: "8px 14px", fontSize: "0.75rem" }} onClick={disconnectWallet}>Disconnect</button>
              </div>
            ) : (
              <button className="btn-primary" style={{ padding: "8px 16px", background: "linear-gradient(135deg, #e2761b, #f6851b)" }} onClick={connectWallet}>
                Connect MetaMask
              </button>
            )}

            <input className="input-field" style={{ width: 280, padding: "8px 14px" }} value={inputWallet} onChange={e => setInputWallet(e.target.value)} placeholder="0x wallet address..." />
            <button className="btn-primary" style={{ padding: "9px 18px" }} onClick={() => setWallet(inputWallet)}>LOAD</button>
            <button className="btn-ghost" style={{ padding: "9px 14px", fontSize: "0.8rem" }} onClick={() => fetchAll(wallet)} title="Refresh">
              {loading ? "..." : "~"}
            </button>
            <button className="btn-ghost" style={{ padding: "9px 14px", fontSize: "0.75rem", color: C.amber, borderColor: C.amber + "44" }} onClick={() => window.open(`${API}/report/${wallet}`, "_blank")}>
              PDF
            </button>
          </div>
        </nav>

        {/* CONTENT */}
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 32px" }}>

          {/* TABS */}
          <div style={{ display: "flex", gap: 4, marginBottom: 28, flexWrap: "wrap" }}>
            {tabs.map(t => (
              <button key={t.id} className={`tab-btn ${tab === t.id ? "tab-active" : ""}`} onClick={() => setTab(t.id)}>
                <TabDot color={t.dot} />
                {t.label}
                {t.count > 0 && (
                  <span style={{ background: C.red + "33", color: C.red, border: `1px solid ${C.red}44`, borderRadius: 99, padding: "0 6px", fontSize: "0.62rem", fontWeight: 800 }}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
            {apRunning && <span style={{ alignSelf: "center", marginLeft: 8, fontSize: "0.68rem", color: C.green, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>-- PILOT ACTIVE</span>}
            {lastRefresh && <span style={{ alignSelf: "center", marginLeft: "auto", fontSize: "0.65rem", color: C.textMuted, fontFamily: "'JetBrains Mono',monospace" }}>Updated {lastRefresh.toLocaleTimeString()}</span>}
          </div>

          {/* ── PORTFOLIO ─────────────────────────────────────────────── */}
          {tab === "portfolio" && (
            <div className="fade-up">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 20 }}>
                <StatCard label="Portfolio Value"
                  value={totalUsd ? `$${totalUsd.toLocaleString("en-US",{maximumFractionDigits:2})}` : "--"}
                  sub={`${portfolio?.portfolio?.token_count||0} assets - multi-chain`}
                  color={C.cyan}
                  badge={portfolio?.portfolio?.is_mock ? <span style={{background:C.amber+"18",border:`1px solid ${C.amber}33`,color:C.amber,borderRadius:5,padding:"2px 8px",fontSize:"0.62rem",fontWeight:700}}>DEMO</span> : null}
                />
                <StatCard label="Risk Score"
                  value={riskScore !== null ? `${riskScore}` : "--"}
                  sub={portfolio?.risk?.summary?.slice(0,45) || ""}
                  color={riskLevel === "LOW" ? C.green : riskLevel === "MEDIUM" ? C.amber : C.red}
                  badge={<RiskBadge level={riskLevel} />}
                />
                <StatCard label="Active Alerts"
                  value={alerts.length}
                  sub={`${alerts.filter(a=>a.severity==="HIGH").length} HIGH - ${alerts.filter(a=>a.severity==="MEDIUM").length} MEDIUM`}
                  color={alerts.some(a=>a.severity==="HIGH") ? C.red : C.amber}
                />
                <StatCard label="Signals Tracked"
                  value={signals.length}
                  sub={`${signals.filter(s=>s.signal?.includes("BULLISH")).length} bullish - ${signals.filter(s=>s.signal?.includes("BEARISH")).length} bearish`}
                  color={C.purple}
                  badge={<LiveDot />}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, marginBottom: 16 }}>
                {/* Token table */}
                <div className="grad-border" style={{ padding: "24px" }}>
                  <SectionHeader title="Token Holdings" />
                  <div style={{ display: "grid", gridTemplateColumns: "36px 1fr 100px 100px 80px 100px", gap: 12, padding: "0 16px 10px", fontSize: "0.65rem", color: C.textSec, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    <span /><span>Asset</span>
                    <span style={{textAlign:"right"}}>Balance</span>
                    <span style={{textAlign:"right"}}>Value</span>
                    <span style={{textAlign:"right"}}>Alloc.</span>
                    <span style={{textAlign:"right"}}>Chain</span>
                  </div>
                  <Divider />
                  {!portfolio && [1,2,3,4].map(i => (
                    <div key={i} style={{ display: "flex", gap: 12, padding: "12px 16px", alignItems: "center" }}>
                      <div className="shimmer" style={{ width:36, height:36, borderRadius:"50%" }} />
                      <div style={{flex:1}}><div className="shimmer" style={{height:14,width:"40%",marginBottom:6}} /><div className="shimmer" style={{height:10,width:"60%"}} /></div>
                    </div>
                  ))}
                  {(portfolio?.portfolio?.tokens || []).map((token, i) => {
                    const pct = totalUsd ? (token.usd_value / totalUsd * 100) : 0;
                    return (
                      <div key={i}>
                        <div className="data-row" style={{ gridTemplateColumns: "36px 1fr 100px 100px 80px 100px", gap: 12 }}>
                          <TokenIcon symbol={token.symbol} />
                          <div>
                            <div style={{fontWeight:700,fontSize:"0.9rem"}}>{token.symbol}</div>
                            <div style={{fontSize:"0.68rem",color:C.textSec,fontFamily:"'JetBrains Mono',monospace"}}>
                              {token.contract === "native" ? "Native" : token.contract.slice(0,10)+"..."}
                            </div>
                          </div>
                          <div className="num" style={{textAlign:"right",fontSize:"0.85rem"}}>{token.balance?.toFixed(4)}</div>
                          <div className="num" style={{textAlign:"right",fontWeight:600}}>${token.usd_value?.toLocaleString()}</div>
                          <div style={{textAlign:"right"}}>
                            <div className="num" style={{fontSize:"0.78rem",color:C.textSec,marginBottom:4}}>{pct.toFixed(1)}%</div>
                            <div className="progress-track"><div className="progress-fill" style={{width:`${Math.min(pct,100)}%`}} /></div>
                          </div>
                          <div style={{textAlign:"right"}}><ChainBadge chainId={token.chain} /></div>
                        </div>
                        {i < (portfolio?.portfolio?.tokens?.length-1) && <Divider />}
                      </div>
                    );
                  })}
                </div>

                {/* Donut */}
                <div className="grad-border" style={{ padding: "24px", display: "flex", flexDirection: "column" }}>
                  <SectionHeader title="Allocation" />
                  {pieData.length > 0 ? (
                    <>
                      <PieChart width={290} height={190}>
                        <Pie data={pieData} cx={145} cy={95} innerRadius={58} outerRadius={88} dataKey="value" strokeWidth={0} paddingAngle={2}>
                          {pieData.map((_,i) => <Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v) => [`$${v.toLocaleString()}`,""]} contentStyle={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,fontFamily:"'JetBrains Mono',monospace",fontSize:"0.75rem"}} />
                      </PieChart>
                      <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:8}}>
                        {pieData.map((d,i) => (
                          <div key={i} style={{display:"flex",alignItems:"center",gap:10}}>
                            <div style={{width:10,height:10,borderRadius:3,background:PIE_COLORS[i%PIE_COLORS.length],flexShrink:0}} />
                            <span style={{flex:1,fontSize:"0.8rem",fontWeight:600}}>{d.name}</span>
                            <span className="num" style={{fontSize:"0.78rem",color:C.textSec}}>{(d.value/totalUsd*100).toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:C.textSec,fontSize:"0.8rem"}}>No data</div>
                  )}
                </div>
              </div>

              {portfolio?.risk && (
                <div className="grad-border" style={{ padding: "24px" }}>
                  <SectionHeader title="Risk Analysis" right={<RiskBadge level={riskLevel} />} />
                  <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12}}>
                    <div style={{padding:"14px 16px",background:C.border+"33",borderRadius:10}}>
                      <div style={{fontSize:"0.65rem",color:C.textSec,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6}}>Risk Score</div>
                      <div className="num" style={{fontSize:"1.2rem",fontWeight:700,color:riskLevel==="LOW"?C.green:riskLevel==="MEDIUM"?C.amber:C.red}}>{riskScore} / 100</div>
                    </div>
                    <div style={{padding:"14px 16px",background:C.border+"33",borderRadius:10}}>
                      <div style={{fontSize:"0.65rem",color:C.textSec,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6}}>Summary</div>
                      <div style={{fontSize:"0.85rem",lineHeight:1.5}}>{portfolio.risk.summary}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── SIGNALS ───────────────────────────────────────────────── */}
          {tab === "signals" && (
            <div className="fade-up">
              <div className="grad-border" style={{ padding: "24px" }}>
                <SectionHeader title="Live DeFi Signals - OKX Market Feed" right={<LiveDot />} />
                <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 90px 90px 100px 90px", gap: 12, padding: "0 16px 10px", fontSize: "0.65rem", color: C.textSec, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  <span>Pair</span><span>Chart</span>
                  <span style={{textAlign:"right"}}>Price</span>
                  <span style={{textAlign:"right"}}>24h</span>
                  <span style={{textAlign:"right"}}>Signal</span>
                  <span style={{textAlign:"right"}}>Volume</span>
                </div>
                <Divider />
                {signals.map((sig, i) => {
                  const pos = sig.change_24h_pct >= 0;
                  const color = pos ? C.green : C.red;
                  const cls = sig.signal === "BULLISH" ? "signal-bullish" : sig.signal === "BEARISH" ? "signal-bearish" : sig.signal === "MILDLY_BULLISH" ? "signal-mild-bull" : sig.signal === "MILDLY_BEARISH" ? "signal-mild-bear" : "signal-neutral";
                  return (
                    <div key={i}>
                      <div className={`data-row ${cls}`} style={{ gridTemplateColumns: "160px 1fr 90px 90px 100px 90px", gap: 12, paddingLeft: 13 }}>
                        <span style={{fontWeight:700,fontSize:"0.88rem",fontFamily:"'JetBrains Mono',monospace"}}>{sig.pair}</span>
                        <Sparkline data={makeSparkline(sig.last_price, sig.change_24h_pct)} color={color} />
                        <span className="num" style={{textAlign:"right",fontSize:"0.82rem"}}>${sig.last_price > 100 ? sig.last_price.toLocaleString("en-US",{maximumFractionDigits:2}) : sig.last_price?.toFixed(4)}</span>
                        <span className="num" style={{textAlign:"right",fontWeight:700,color}}>{pos?"+":""}{sig.change_24h_pct?.toFixed(2)}%</span>
                        <div style={{textAlign:"right"}}><SignalPill signal={sig.signal} /></div>
                        <span className="num" style={{textAlign:"right",fontSize:"0.75rem",color:C.textSec}}>{(sig.volume_24h/1e6).toFixed(1)}M</span>
                      </div>
                      {i < signals.length-1 && <Divider />}
                    </div>
                  );
                })}
                {signals.length === 0 && (
                  <div style={{padding:"40px 0",textAlign:"center",color:C.textSec,fontSize:"0.85rem"}}>
                    No signal data. Start the backend: <code style={{color:C.cyan}}>python main.py</code>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── ALERTS ────────────────────────────────────────────────── */}
          {tab === "alerts" && (
            <div className="fade-up">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16 }}>
                <div className="grad-border" style={{ padding: "24px" }}>
                  <SectionHeader title={`Active Alerts (${alerts.length})`} right={
                    alerts.length > 0
                      ? <span style={{fontSize:"0.68rem",color:C.red,background:C.red+"18",border:`1px solid ${C.red}33`,borderRadius:5,padding:"3px 9px",fontWeight:700}}>{alerts.filter(a=>a.severity==="HIGH").length} CRITICAL</span>
                      : <span style={{fontSize:"0.68rem",color:C.green}}>All Clear</span>
                  } />
                  {alerts.length === 0 && (
                    <div style={{padding:"32px 0",textAlign:"center"}}>
                      <div style={{fontSize:"2rem",marginBottom:8,color:C.green}}>OK</div>
                      <div style={{color:C.green,fontWeight:700,marginBottom:4}}>No active alerts</div>
                      <div style={{color:C.textSec,fontSize:"0.8rem"}}>Portfolio risk profile is healthy</div>
                    </div>
                  )}
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    {alerts.map((alert,i) => (
                      <div key={i} className={alert.severity==="HIGH"?"alert-high":"alert-medium"} style={{padding:"14px 16px",display:"flex",gap:14,alignItems:"flex-start"}}>
                        <div style={{width:32,height:32,borderRadius:8,flexShrink:0,background:alert.severity==="HIGH"?C.red+"22":C.amber+"22",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'JetBrains Mono',monospace",fontWeight:800,fontSize:"0.75rem",color:alert.severity==="HIGH"?C.red:C.amber}}>
                          {alert.severity==="HIGH"?"!!":"!"}
                        </div>
                        <div style={{flex:1}}>
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                            <span style={{fontSize:"0.65rem",fontWeight:800,letterSpacing:"0.1em",color:alert.severity==="HIGH"?C.red:C.amber,fontFamily:"'JetBrains Mono',monospace"}}>{alert.severity}</span>
                            <span style={{fontSize:"0.7rem",fontWeight:700,color:C.textSec,letterSpacing:"0.08em"}}>{alert.type}</span>
                            {alert.asset && <span style={{background:C.border,padding:"1px 7px",borderRadius:4,fontSize:"0.65rem",fontWeight:700}}>{alert.asset}</span>}
                          </div>
                          <div style={{fontSize:"0.85rem",color:C.textPri,lineHeight:1.5}}>{alert.message}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  <div className="grad-border" style={{padding:"20px"}}>
                    <SectionHeader title="Severity Breakdown" />
                    {[{label:"HIGH",color:C.red},{label:"MEDIUM",color:C.amber},{label:"LOW",color:C.cyan}].map(s => (
                      <div key={s.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0"}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <div style={{width:8,height:8,borderRadius:"50%",background:s.color}} />
                          <span style={{fontSize:"0.78rem",fontWeight:600}}>{s.label}</span>
                        </div>
                        <span className="num" style={{fontSize:"0.9rem",fontWeight:700,color:alerts.filter(a=>a.severity===s.label).length?s.color:C.textMuted}}>{alerts.filter(a=>a.severity===s.label).length}</span>
                      </div>
                    ))}
                  </div>
                  <div className="grad-border" style={{padding:"20px"}}>
                    <SectionHeader title="Alert Types" />
                    {["CONCENTRATION","PRICE_MOVEMENT","NO_STABLECOIN","LOW_VALUE"].map(type => {
                      const c = alerts.filter(a=>a.type===type).length;
                      return (
                        <div key={type} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${C.border}33`}}>
                          <span style={{fontSize:"0.7rem",color:C.textSec,fontFamily:"'JetBrains Mono',monospace"}}>{type}</span>
                          <span className="num" style={{fontSize:"0.8rem",fontWeight:700,color:c?C.textPri:C.textMuted}}>{c}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── AUTO-PILOT ────────────────────────────────────────────── */}
          {tab === "autopilot" && (
            <div className="fade-up">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                {/* Control */}
                <div className="grad-border" style={{ padding: "24px" }}>
                  <SectionHeader title="Agent Control" right={
                    <span style={{fontSize:"0.68rem",fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:apRunning?C.green:C.textSec}}>
                      {apRunning ? "-- RUNNING (60s)" : "-- STOPPED"}
                    </span>
                  } />
                  <div style={{display:"flex",gap:10,marginBottom:20}}>
                    <button className="btn-green" style={{padding:"10px 24px",fontSize:"0.82rem",opacity:apRunning?0.5:1}} onClick={startAutoPilot} disabled={apRunning}>START</button>
                    <button className="btn-red" style={{padding:"10px 24px",fontSize:"0.82rem",opacity:!apRunning?0.5:1}} onClick={stopAutoPilot} disabled={!apRunning}>STOP</button>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                    {[
                      {label:"Ticks",value:apStats.ticks||0,color:C.cyan},
                      {label:"Swaps",value:apStats.swaps_executed||0,color:C.green},
                      {label:"Alerts",value:apStats.alerts_triggered||0,color:C.amber},
                    ].map(s => (
                      <div key={s.label} style={{background:C.border+"33",borderRadius:8,padding:"12px",textAlign:"center"}}>
                        <div className="num" style={{fontSize:"1.5rem",fontWeight:700,color:s.color}}>{s.value}</div>
                        <div style={{fontSize:"0.62rem",color:C.textSec,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",marginTop:4}}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Strategies */}
                <div className="grad-border" style={{ padding: "24px" }}>
                  <SectionHeader title="Strategy Templates" />
                  {[
                    {id:"conservative",name:"Conservative Shield",desc:"Hold stablecoins, exit on HIGH risk",color:C.green},
                    {id:"momentum",    name:"Momentum Chaser",   desc:"Buy bullish surges, sell bearish drops",color:C.cyan},
                    {id:"yield",       name:"Yield Maximizer",   desc:"Rotate into top-performing assets",color:C.amber},
                  ].map(st => (
                    <div key={st.id} onClick={() => activateStrategy(st.id)}
                      style={{padding:"12px 14px",borderRadius:10,border:`1px solid ${activeStrategy===st.id?st.color:C.border}`,background:activeStrategy===st.id?st.color+"0f":C.border+"22",cursor:"pointer",marginBottom:8,transition:"all 0.2s"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                        <span style={{fontWeight:700,fontSize:"0.82rem",color:activeStrategy===st.id?st.color:C.textPri}}>{st.name}</span>
                        {activeStrategy===st.id && <span style={{fontSize:"0.65rem",color:st.color,fontWeight:800,fontFamily:"'JetBrains Mono',monospace"}}>ACTIVE</span>}
                      </div>
                      <div style={{fontSize:"0.72rem",color:C.textSec}}>{st.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Rule Builder */}
              <div className="grad-border" style={{ padding: "24px", marginBottom: 16 }}>
                <SectionHeader title="Custom Rule Builder" />
                <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                  <input className="input-field" style={{flex:1,minWidth:200,padding:"9px 14px"}} value={ruleCondition} onChange={e=>setRuleCondition(e.target.value)} placeholder="Condition: e.g. ETH bullish > 5%" />
                  <input className="input-field" style={{flex:1,minWidth:200,padding:"9px 14px"}} value={ruleAction} onChange={e=>setRuleAction(e.target.value)} placeholder="Action: e.g. swap 50 USDT to ETH" />
                  <button className="btn-primary" style={{padding:"9px 20px"}} onClick={addRule}>ADD RULE</button>
                </div>
              </div>

              {/* Live Log */}
              <div className="grad-border" style={{ padding: "24px" }}>
                <SectionHeader title="Live Agent Log" right={<span style={{fontSize:"0.68rem",color:C.textMuted,fontFamily:"'JetBrains Mono',monospace"}}>{apLogs.length} entries</span>} />
                <div style={{height:280,overflowY:"auto"}}>
                  {apLogs.length === 0 && <div style={{color:C.textSec,fontSize:"0.8rem",padding:"20px 0"}}>Start Auto-Pilot to see live logs here.</div>}
                  {[...apLogs].reverse().map((log,i) => (
                    <div key={i} className="log-line">
                      <span style={{color:C.textMuted,minWidth:70}}>{log.time?.slice(11,19)}</span>
                      <span style={{color:logColor(log.level),minWidth:65,fontWeight:700}}>[{log.level}]</span>
                      <span style={{color:C.textSec}}>{log.msg}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── WHAT-IF ───────────────────────────────────────────────── */}
          {tab === "simulate" && (
            <div className="fade-up">
              <div className="grad-border" style={{ padding: "28px", marginBottom: 16 }}>
                <SectionHeader title="What-If Portfolio Simulator" right={
                  <span style={{fontSize:"0.68rem",color:C.purple,background:C.purple+"18",border:`1px solid ${C.purple}33`,borderRadius:5,padding:"3px 9px",fontWeight:700}}>GROQ AI</span>
                } />
                <div style={{fontSize:"0.8rem",color:C.textSec,marginBottom:20,lineHeight:1.6}}>
                  Describe a portfolio action. The AI simulates the risk impact and value change <strong style={{color:C.textPri}}>before</strong> you execute anything.
                </div>
                <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
                  <input className="input-field" style={{flex:1,minWidth:280,padding:"11px 16px"}} value={simAction} onChange={e=>setSimAction(e.target.value)}
                    placeholder="e.g. move 50% of portfolio into ETH" onKeyDown={e=>e.key==="Enter"&&runSimulation()} />
                  <button className="btn-primary" style={{padding:"11px 24px"}} onClick={runSimulation} disabled={simLoading}>
                    {simLoading ? "SIMULATING..." : "SIMULATE"}
                  </button>
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {["move 50% to ETH","convert all to USDT","buy 30% ETH 30% BNB 40% USDT","go all-in on ETH"].map(ex => (
                    <button key={ex} className="btn-ghost" style={{padding:"5px 12px",fontSize:"0.72rem",borderRadius:7,fontFamily:"'JetBrains Mono',monospace"}} onClick={()=>setSimAction(ex)}>{ex}</button>
                  ))}
                </div>
              </div>

              {simResult && (
                <div style={{
                  padding:"24px",borderRadius:16,
                  background: simResult.verdict==="GOOD_MOVE"?C.green+"0a":simResult.verdict==="BAD_MOVE"?C.red+"0a":C.border+"33",
                  border:`1px solid ${simResult.verdict==="GOOD_MOVE"?C.green+"44":simResult.verdict==="BAD_MOVE"?C.red+"44":C.border}`,
                }}>
                  <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:20,flexWrap:"wrap"}}>
                    <span style={{fontWeight:800,fontSize:"1.1rem",color:simResult.verdict==="GOOD_MOVE"?C.green:simResult.verdict==="BAD_MOVE"?C.red:C.amber}}>
                      {simResult.verdict==="GOOD_MOVE"?"[GOOD MOVE]":simResult.verdict==="BAD_MOVE"?"[BAD MOVE]":"[NEUTRAL]"}
                    </span>
                    <RiskBadge level={simResult.projected_risk_level} />
                    <span className="num" style={{fontWeight:700,fontSize:"0.9rem",color:simResult.projected_value_change_pct>0?C.green:C.red}}>
                      {simResult.projected_value_change_pct>0?"+":""}{simResult.projected_value_change_pct?.toFixed(1)}% projected
                    </span>
                    <span className="num" style={{fontSize:"0.82rem",color:C.textSec}}>Risk score: {simResult.projected_risk_score}/100</span>
                  </div>
                  <div style={{fontSize:"0.88rem",marginBottom:20,color:C.textPri,lineHeight:1.6,padding:"12px 16px",background:C.border+"44",borderRadius:8}}>
                    {simResult.recommendation}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                    <div>
                      <div style={{fontSize:"0.65rem",color:C.textSec,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>Key Risks</div>
                      {(simResult.key_risks||[]).map((r,i) => <div key={i} style={{fontSize:"0.8rem",color:C.red,marginBottom:6,paddingLeft:12,borderLeft:`2px solid ${C.red}44`}}>{r}</div>)}
                    </div>
                    <div>
                      <div style={{fontSize:"0.65rem",color:C.textSec,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>Key Benefits</div>
                      {(simResult.key_benefits||[]).map((b,i) => <div key={i} style={{fontSize:"0.8rem",color:C.green,marginBottom:6,paddingLeft:12,borderLeft:`2px solid ${C.green}44`}}>{b}</div>)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── SWAP ──────────────────────────────────────────────────── */}
          {tab === "swap" && (
            <div className="fade-up">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16 }}>
                <div className="grad-border" style={{ padding: "28px" }}>
                  <SectionHeader title="Natural Language Swap - OKX DEX" right={
                    <span style={{fontSize:"0.68rem",color:C.blue,background:C.blue+"18",border:`1px solid ${C.blue}33`,borderRadius:5,padding:"3px 9px",fontWeight:700}}>AI POWERED</span>
                  } />
                  <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:20}}>
                    {["swap 10 USDT to ETH","swap 0.5 ETH to USDC if gas < 20 gwei","buy 50 USDT worth of BNB"].map(ex => (
                      <button key={ex} className="btn-ghost" style={{padding:"6px 12px",fontSize:"0.72rem",borderRadius:8,fontFamily:"'JetBrains Mono',monospace"}} onClick={()=>{setSwapCmd(ex);setSwapResult(null);}}>{ex}</button>
                    ))}
                  </div>
                  <textarea className="swap-area" style={{minHeight:100,marginBottom:16}} value={swapCmd} onChange={e=>setSwapCmd(e.target.value)}
                    placeholder={"Describe your swap in plain English...\nExample: swap 10 USDT to ETH if gas is below 20 gwei"}
                    onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&(e.preventDefault(),handleSwap())} />
                  <button className="btn-primary" style={{width:"100%",padding:"14px",fontSize:"0.88rem",borderRadius:12,letterSpacing:"0.08em",opacity:loading?0.7:1}} onClick={handleSwap} disabled={loading}>
                    {loading ? "PROCESSING..." : "EXECUTE SWAP VIA OKX DEX"}
                  </button>
                  {swapResult && (
                    <div style={{marginTop:20,padding:"18px",borderRadius:12,background:swapResult.result?.status==="executed"?C.green+"08":C.red+"08",border:`1px solid ${swapResult.result?.status==="executed"?C.green+"33":C.red+"33"}`}}>
                      <div style={{fontSize:"0.7rem",color:C.textSec,marginBottom:8,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase"}}>Execution Result</div>
                      {swapResult.result?.message && <div style={{fontSize:"0.9rem",fontWeight:600,color:swapResult.result?.status==="executed"?C.green:C.red,marginBottom:12}}>{swapResult.result.message}</div>}
                      <pre style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"0.72rem",color:C.textSec,lineHeight:1.7,overflow:"auto",maxHeight:200,background:"transparent"}}>{JSON.stringify(swapResult,null,2)}</pre>
                    </div>
                  )}
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:16}}>
                  <div className="grad-border" style={{padding:"20px"}}>
                    <SectionHeader title="How It Works" />
                    {[
                      {n:"01",label:"Parse Intent",desc:"Groq AI extracts tokens, amount and conditions from plain English"},
                      {n:"02",label:"Validate",    desc:"Gas price, balance and condition checks against OKX live data"},
                      {n:"03",label:"Execute",     desc:"OKX DEX Aggregator finds best route and executes on-chain"},
                    ].map(step => (
                      <div key={step.n} style={{display:"flex",gap:14,padding:"10px 0",borderBottom:`1px solid ${C.border}33`}}>
                        <div className="num" style={{fontSize:"0.7rem",color:C.blue,fontWeight:800,minWidth:24}}>{step.n}</div>
                        <div><div style={{fontSize:"0.8rem",fontWeight:700,marginBottom:3}}>{step.label}</div><div style={{fontSize:"0.73rem",color:C.textSec,lineHeight:1.5}}>{step.desc}</div></div>
                      </div>
                    ))}
                  </div>
                  <div className="grad-border" style={{padding:"20px"}}>
                    <SectionHeader title="OKX Gas Tracker" />
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                      {[["Standard","15",C.green],["Fast","25",C.amber],["Instant","40",C.red]].map(([l,v,c]) => (
                        <div key={l} style={{textAlign:"center",padding:"12px 6px",background:C.border+"33",borderRadius:8}}>
                          <div className="num" style={{fontSize:"1.3rem",fontWeight:800,color:c}}>{v}</div>
                          <div style={{fontSize:"0.6rem",color:C.textSec,fontWeight:700,marginTop:4,letterSpacing:"0.08em"}}>{l} GWEI</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── ORACLE AI ─────────────────────────────────────────────── */}
          {tab === "oracle" && (
            <div className="fade-up">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16 }}>
                <div className="grad-border" style={{ padding: "24px" }}>
                  <SectionHeader title="Oracle AI - Memory-Enabled DeFi Advisor" right={
                    <span style={{fontSize:"0.68rem",color:C.cyan,background:C.cyan+"18",border:`1px solid ${C.cyan}33`,borderRadius:5,padding:"3px 9px",fontWeight:700}}>GROQ LLaMA 3</span>
                  } />
                  <div style={{height:380,overflowY:"auto",display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
                    {oracleHistory.length === 0 && (
                      <div style={{color:C.textSec,fontSize:"0.82rem",lineHeight:1.7,padding:"8px 0"}}>
                        Oracle AI has full memory of this session and live access to your portfolio data, risk score, and OKX market signals.<br /><br />
                        Ask anything about your portfolio, risk, signals, or get a swap recommendation.
                      </div>
                    )}
                    {oracleHistory.map((msg,i) => (
                      <div key={i} className={msg.role==="user"?"chat-bubble-user":"chat-bubble-ai"}>
                        <div style={{fontSize:"0.62rem",color:msg.role==="user"?C.blue:C.cyan,fontWeight:700,marginBottom:6,letterSpacing:"0.08em",textTransform:"uppercase",fontFamily:"'JetBrains Mono',monospace"}}>
                          {msg.role==="user"?"YOU":"ORACLE"}
                        </div>
                        <div>{msg.content}</div>
                      </div>
                    ))}
                    {oracleLoading && (
                      <div className="chat-bubble-ai" style={{color:C.textSec}}>
                        <div style={{fontSize:"0.62rem",color:C.cyan,fontWeight:700,marginBottom:6,letterSpacing:"0.08em",fontFamily:"'JetBrains Mono',monospace"}}>ORACLE</div>
                        <span className="shimmer" style={{display:"inline-block",width:120,height:14}} />
                      </div>
                    )}
                    <div ref={oracleEndRef} />
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <input className="input-field" style={{flex:1,padding:"11px 16px"}} value={oracleMsg} onChange={e=>setOracleMsg(e.target.value)}
                      placeholder="Ask Oracle anything about your portfolio..." onKeyDown={e=>e.key==="Enter"&&sendOracle()} />
                    <button className="btn-primary" style={{padding:"11px 20px"}} onClick={sendOracle} disabled={oracleLoading}>SEND</button>
                    <button className="btn-ghost" style={{padding:"11px 14px"}} onClick={()=>setOracleHistory([])}>CLR</button>
                  </div>
                </div>

                {/* Quick prompts */}
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  <div className="grad-border" style={{padding:"20px"}}>
                    <SectionHeader title="Quick Prompts" />
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {[
                        "What is my biggest risk right now?",
                        "Should I buy more ETH based on signals?",
                        "Is my portfolio diversified enough?",
                        "What swap should I make today?",
                        "Summarize my portfolio health",
                        "Is now a good time to rebalance?",
                      ].map(p => (
                        <button key={p} className="btn-ghost" style={{padding:"9px 12px",fontSize:"0.75rem",textAlign:"left",borderRadius:8,lineHeight:1.4}} onClick={()=>setOracleMsg(p)}>{p}</button>
                      ))}
                    </div>
                  </div>
                  <div className="grad-border" style={{padding:"20px"}}>
                    <SectionHeader title="Live Context" />
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {[
                        {label:"Portfolio",value:totalUsd?`$${totalUsd.toLocaleString()}`:"-"},
                        {label:"Risk Level",value:riskLevel,color:riskLevel==="LOW"?C.green:riskLevel==="MEDIUM"?C.amber:C.red},
                        {label:"Risk Score",value:riskScore!==null?`${riskScore}/100`:"-"},
                        {label:"Signals",value:`${signals.length} pairs tracked`},
                        {label:"Auto-Pilot",value:apRunning?"RUNNING":"STOPPED",color:apRunning?C.green:C.textSec},
                      ].map(item => (
                        <div key={item.label} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${C.border}22`}}>
                          <span style={{fontSize:"0.72rem",color:C.textSec}}>{item.label}</span>
                          <span className="num" style={{fontSize:"0.72rem",fontWeight:700,color:item.color||C.textPri}}>{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "12px 32px", display: "flex", justifyContent: "space-between", fontSize: "0.62rem", color: C.textMuted, fontFamily: "'JetBrains Mono',monospace" }}>
          <span>OKX DEFI COMMAND CENTER - BUILD X-AGENT HACKATHON 2026</span>
          <span>POWERED BY X-AGENT - OKX AGENTIC WALLET - GROQ LLaMA 3</span>
          <span>v2.0.0</span>
        </div>
      </div>
    </>
  );
}
