"use client"
import { useState } from "react"
import { FileText, TrendingDown, AlertTriangle, Shield, Download, ChevronRight, CheckCircle, Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"

type Step = "connect" | "processing" | "results"

const DEMO = {
  stGains: 17190, ltGains: 0, ordinaryIncome: 470, netGain: 17190,
  method: "HIFO", savedVsFifo: 12710, txCount: 14,
  reconciliation: { reported: 32500, taxbot: 11500, recovered: 21000 },
  harvest: { asset: "SOL", loss: 600, saving: 180 },
}

const fmt = (n: number) => "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid rgba(0,0,0,0.08)",
  borderRadius: 20, padding: "28px 24px",
}

export default function Dashboard() {
  const [step, setStep] = useState<Step>("connect")
  const [apiKey, setApiKey] = useState("")
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState("")

  async function runAnalysis() {
    setStep("processing")
    const steps: [number, string][] = [
      [15, "Connecting to OKX API..."],
      [35, "Fetching spot trades & earn rewards..."],
      [55, "Classifying 14 transactions..."],
      [75, "Optimizing cost basis (FIFO vs LIFO vs HIFO)..."],
      [90, "Generating Form 8949, Schedule D, Schedule 1..."],
      [100, "Writing audit trail to X Layer (Chain 196)..."],
    ]
    for (const [pct, label] of steps) {
      await new Promise(r => setTimeout(r, 750))
      setProgress(pct); setProgressLabel(label)
    }
    await new Promise(r => setTimeout(r, 500))
    setStep("results")
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f6f3f1" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px", height: 64, borderBottom: "1px solid rgba(0,0,0,0.08)", background: "#f6f3f1" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#f6f3f1", fontSize: 12, fontWeight: 700 }}>T</span>
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 500, fontSize: 15, color: "#000", letterSpacing: "-0.02em" }}>TaxBot</span>
        </Link>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#797776", letterSpacing: "0.1em" }}>2025 TAX YEAR</span>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "56px 24px" }}>

        {/* CONNECT */}
        {step === "connect" && (
          <div>
            <h1 style={{ fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: "clamp(28px,4vw,42px)", letterSpacing: "-0.03em", color: "#000", marginBottom: 10, lineHeight: 1.2 }}>
              Generate your tax report
            </h1>
            <p style={{ fontSize: 15, color: "#4e4d4d", marginBottom: 40, lineHeight: 1.6, fontFamily: "var(--font-sans)" }}>
              Connect your OKX wallet or run with demo data. No account needed.
            </p>

            {/* API key card */}
            <div style={{ ...card, marginBottom: 20 }}>
              <h2 style={{ fontFamily: "var(--font-mono)", fontWeight: 500, fontSize: 13, color: "#000", marginBottom: 20, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Connect OKX (Read-Only)
              </h2>
              <label style={{ display: "block", fontSize: 12, color: "#797776", marginBottom: 8, fontFamily: "var(--font-mono)" }}>OKX API Key</label>
              <input
                value={apiKey} onChange={e => setApiKey(e.target.value)}
                placeholder="Paste your read-only API key..."
                style={{
                  width: "100%", padding: "12px 16px", borderRadius: 10, fontSize: 14,
                  background: "#f6f3f1", border: "1px solid rgba(0,0,0,0.12)",
                  color: "#000", outline: "none", fontFamily: "var(--font-sans)",
                  marginBottom: 12,
                }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#797776", fontFamily: "var(--font-mono)" }}>
                <Shield size={11} /> TaxBot only requests VIEW permissions. Your funds are safe.
              </div>
            </div>

            <button onClick={runAnalysis} style={{
              width: "100%", padding: "16px 24px", borderRadius: 100, border: "none", cursor: "pointer",
              background: "#242424", color: "#f6f3f1", fontFamily: "var(--font-mono)", fontWeight: 500, fontSize: 15,
              letterSpacing: "-0.02em", marginTop: 20, transition: "opacity 0.15s",
            }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
              {apiKey ? "Connect OKX & Generate Report" : "Generate Report"}
            </button>
          </div>
        )}

        {/* PROCESSING */}
        {step === "processing" && (
          <div style={{ textAlign: "center", paddingTop: 60 }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#cfdaf5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 32px" }}>
              <Loader2 size={30} color="#242424" style={{ animation: "spin 1s linear infinite" }} />
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            <h2 style={{ fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: 32, color: "#000", marginBottom: 12 }}>
              Analyzing your transactions...
            </h2>
            <p style={{ fontSize: 14, color: "#4e4d4d", marginBottom: 36, minHeight: 20, fontFamily: "var(--font-sans)" }}>{progressLabel}</p>
            <div style={{ maxWidth: 360, margin: "0 auto", height: 6, borderRadius: 99, background: "rgba(0,0,0,0.08)", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 99, background: "#242424", width: `${progress}%`, transition: "width 0.7s ease" }} />
            </div>
            <p style={{ marginTop: 12, fontFamily: "var(--font-mono)", fontSize: 11, color: "#797776" }}>{progress}% complete</p>
          </div>
        )}

        {/* RESULTS */}
        {step === "results" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 36 }}>
              <CheckCircle size={22} color="#242424" />
              <h1 style={{ fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: 32, color: "#000" }}>
                Your 2025 Tax Summary
              </h1>
            </div>

            {/* 3 metric cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
              {[
                { label: "Short-term Gains", value: fmt(DEMO.stGains), sub: "Ordinary income rate" },
                { label: "Long-term Gains", value: fmt(DEMO.ltGains), sub: "Preferential rate" },
                { label: "Ordinary Income", value: fmt(DEMO.ordinaryIncome), sub: "Staking & rewards" },
              ].map(c => (
                <div key={c.label} style={{ ...card, padding: "20px 18px" }}>
                  <p style={{ fontSize: 11, color: "#797776", marginBottom: 8, fontFamily: "var(--font-mono)" }}>{c.label}</p>
                  <p style={{ fontSize: 22, fontWeight: 700, color: "#000", marginBottom: 4, letterSpacing: "-0.02em", fontFamily: "var(--font-serif)" }}>{c.value}</p>
                  <p style={{ fontSize: 11, color: "#797776", fontFamily: "var(--font-mono)" }}>{c.sub}</p>
                </div>
              ))}
            </div>

            {/* Net total */}
            <div style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 16 }}>
              <div>
                <p style={{ fontSize: 12, color: "#797776", marginBottom: 6, fontFamily: "var(--font-mono)" }}>Total Taxable Amount</p>
                <p style={{ fontSize: 36, fontWeight: 700, color: "#000", letterSpacing: "-0.03em", fontFamily: "var(--font-serif)" }}>
                  {fmt(DEMO.netGain + DEMO.ordinaryIncome)}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ display: "inline-block", padding: "6px 14px", borderRadius: 99, background: "#cfdaf5", color: "#242424", fontSize: 13, fontFamily: "var(--font-mono)", marginBottom: 6 }}>
                  {DEMO.method} Selected
                </span>
                <p style={{ fontSize: 13, color: "#4e4d4d", fontFamily: "var(--font-sans)" }}>
                  Saves <span style={{ color: "#000", fontWeight: 600 }}>{fmt(DEMO.savedVsFifo)}</span> vs FIFO
                </p>
              </div>
            </div>

            {/* 1099-DA alert */}
            <div style={{ borderRadius: 16, padding: "20px 20px", marginBottom: 12, background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.3)" }}>
              <div style={{ display: "flex", gap: 12 }}>
                <AlertTriangle size={16} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14, color: "#000", marginBottom: 6, fontFamily: "var(--font-mono)" }}>1099-DA Reconciliation</p>
                  <p style={{ fontSize: 13, color: "#4e4d4d", lineHeight: 1.6, fontFamily: "var(--font-sans)" }}>
                    Broker reports <strong style={{ color: "#000" }}>{fmt(DEMO.reconciliation.reported)}</strong> gain with $0 basis.
                    TaxBot calculates <strong style={{ color: "#000" }}>{fmt(DEMO.reconciliation.taxbot)}</strong> gain.{" "}
                    <span style={{ color: "#242424", fontWeight: 600 }}>Recovered {fmt(DEMO.reconciliation.recovered)} in missing cost basis</span> — auto-adjusted on Form 8949.
                  </p>
                </div>
              </div>
            </div>

            {/* Harvest */}
            <div style={{ borderRadius: 16, padding: "20px 20px", marginBottom: 24, background: "#cfdaf5", border: "1px solid rgba(0,0,0,0.08)" }}>
              <div style={{ display: "flex", gap: 12 }}>
                <TrendingDown size={16} color="#242424" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14, color: "#000", marginBottom: 6, fontFamily: "var(--font-mono)" }}>Tax-Loss Harvest Opportunity</p>
                  <p style={{ fontSize: 13, color: "#4e4d4d", lineHeight: 1.6, fontFamily: "var(--font-sans)" }}>
                    Sell {DEMO.harvest.asset} → realize <strong style={{ color: "#000" }}>{fmt(DEMO.harvest.loss)}</strong> loss →
                    save <span style={{ color: "#000", fontWeight: 600 }}>~{fmt(DEMO.harvest.saving)}</span> in taxes.
                    No wash-sale rule for crypto.
                  </p>
                </div>
              </div>
            </div>

            {/* Downloads */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
              {["Form 8949", "Schedule D", "Schedule 1"].map(f => (
                <button key={f} style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "14px 12px", borderRadius: 10, cursor: "pointer",
                  background: "#fff", border: "1px solid rgba(0,0,0,0.12)",
                  color: "#242424", fontFamily: "var(--font-mono)", fontWeight: 500, fontSize: 13,
                  transition: "background 0.15s",
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#f6f3f1")}
                  onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                  <Download size={13} color="#242424" /> {f}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#797776", marginBottom: 24, fontFamily: "var(--font-mono)" }}>
              <Shield size={11} />
              Ledger hash: <span>0xad3892...2a010</span> · Published to X Layer (Chain 196)
            </div>

            <button onClick={() => { setStep("connect"); setProgress(0) }}
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#4e4d4d", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "var(--font-mono)" }}>
              <ArrowLeft size={13} /> Start over
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
