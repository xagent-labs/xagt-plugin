const features = [
  { title: "FIFO / LIFO / HIFO Auto-Optimizer", body: "Tests all three methods, picks the one that minimizes your tax bill automatically." },
  { title: "1099-DA Reconciliation", body: "Flags every mismatch between broker reports and your actual cost basis. Auto-adjusts Form 8949." },
  { title: "Tax-Loss Harvesting Scanner", body: "Monitors unrealized losses. No wash-sale rule for crypto — sell, realize the loss, rebuy immediately." },
  { title: "IRS-Ready PDF Output", body: "Form 8949, Schedule D, Schedule 1 generated in seconds. Ready for your accountant or e-file." },
  { title: "X Layer Audit Trail", body: "SHA-256 hash of your ledger written to X Layer (Chain ID 196). Tamper-proof, verifiable on-chain." },
  { title: "Read-Only. Always.", body: "TaxBot only requests VIEW permissions. Your funds are safe. We cannot trade, withdraw, or move anything." },
]

export default function Features() {
  return (
    <section id="features" style={{ padding: "100px 40px", background: "#f6f3f1", borderTop: "1px solid rgba(0,0,0,0.08)" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <p className="reveal" style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.05em", color: "#797776", textTransform: "uppercase", marginBottom: 16 }}>
          Features
        </p>
        <h2 className="reveal reveal-delay-1" style={{ fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: "clamp(28px,4vw,40px)", letterSpacing: "-0.02em", color: "#000", marginBottom: 56, lineHeight: 1.2 }}>
          Everything the IRS expects.<br />Nothing you do manually.
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 1, background: "rgba(0,0,0,0.08)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 40, overflow: "hidden" }}>
          {features.map((f, i) => (
            <div key={f.title} className={`reveal reveal-delay-${(i % 3) + 1}`} style={{ background: "#f6f3f1", padding: 40 }}>
              <h3 style={{ fontFamily: "var(--font-mono)", fontWeight: 500, fontSize: 15, color: "#000", marginBottom: 12, letterSpacing: "-0.02em", lineHeight: 1.4 }}>{f.title}</h3>
              <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, lineHeight: 1.6, color: "#4e4d4d", letterSpacing: "-0.02em" }}>{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
