"use client"
import Link from "next/link"

export default function CTA() {
  return (
    <section style={{ padding: "100px 40px", background: "#f6f3f1", borderTop: "1px solid rgba(0,0,0,0.08)" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
        <h2 className="reveal" style={{ fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: "clamp(28px,4vw,48px)", letterSpacing: "-0.02em", color: "#000", marginBottom: 20, lineHeight: 1.2 }}>
          Stop overpaying the IRS.
        </h2>
        <p className="reveal reveal-delay-1" style={{ fontFamily: "var(--font-sans)", fontSize: 16, color: "#4e4d4d", marginBottom: 40, lineHeight: 1.6, letterSpacing: "-0.02em" }}>
          Form 1099-DA is live. The IRS has your exchange data. Make sure your cost basis is correct before they flag a discrepancy.
        </p>
        <div className="reveal reveal-delay-2" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/dashboard" style={{ textDecoration: "none" }}>
            <button style={{ fontFamily: "var(--font-mono)", fontSize: 15, padding: "14px 28px", borderRadius: 100, background: "#242424", color: "#f6f3f1", border: "none", cursor: "pointer", letterSpacing: "-0.02em", transition: "opacity 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
              Generate My Tax Report
            </button>
          </Link>
        </div>
        <p className="reveal reveal-delay-3" style={{ marginTop: 16, fontFamily: "var(--font-mono)", fontSize: 12, color: "#797776", letterSpacing: "0.02em" }}>
          No account needed · Read-only API key · Works with demo data
        </p>
      </div>
    </section>
  )
}
