const steps = [
  { n: "01", title: "Connect OKX", body: "Paste your read-only API key. TaxBot pulls spot trades, earn rewards, converts, deposits and withdrawals via OKX API v5 — no CSV exports needed." },
  { n: "02", title: "AI Classifies", body: "Every transaction tagged: capital gain, ordinary income, transfer, or non-taxable. Crypto-to-crypto swaps flagged automatically." },
  { n: "03", title: "HIFO Optimized", body: "Tests FIFO, LIFO, and HIFO — picks the method that minimizes your tax bill. Scans for tax-loss harvesting opportunities." },
  { n: "04", title: "Download Forms", body: "Form 8949, Schedule D, Schedule 1 as PDFs. Ledger hash published to X Layer for tamper-proof audit defense." },
]

export default function HowItWorks() {
  return (
    <section id="howitworks" style={{ padding: "100px 40px", background: "#f6f3f1" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <p className="reveal" style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.05em", color: "#797776", textTransform: "uppercase", marginBottom: 16 }}>
          How It Works
        </p>
        <h2 className="reveal reveal-delay-1" style={{ fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: "clamp(28px,4vw,40px)", letterSpacing: "-0.02em", color: "#000", marginBottom: 56, lineHeight: 1.2 }}>
          Four steps to a clean filing
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {steps.map((s, i) => (
            <div key={s.n} className={`reveal reveal-delay-${i + 1}`} style={{ background: "#cfdaf5", borderRadius: 40, padding: 40 }}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#797776", letterSpacing: "0.05em", marginBottom: 20 }}>{s.n}</p>
              <h3 style={{ fontFamily: "var(--font-mono)", fontWeight: 500, fontSize: 16, color: "#000", marginBottom: 12, letterSpacing: "-0.02em" }}>{s.title}</h3>
              <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, lineHeight: 1.6, color: "#4e4d4d", letterSpacing: "-0.02em" }}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
