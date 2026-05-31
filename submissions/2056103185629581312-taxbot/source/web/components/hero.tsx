"use client"
import Link from "next/link"

export default function Hero() {
  return (
    <section style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "120px 40px 80px", background: "#f6f3f1", position: "relative", overflow: "hidden" }}>
      {/* Animated gradient blob */}
      <div style={{ position: "absolute", top: "15%", left: "50%", transform: "translateX(-50%)", width: 600, height: 400, borderRadius: "50%", background: "linear-gradient(rgba(255,148,115,0.15) 7%, rgba(160,181,235,0.2) 84%)", filter: "blur(60px)", pointerEvents: "none", animation: "blobFloat 8s ease-in-out infinite" }} />
      <div style={{ position: "absolute", bottom: "10%", right: "10%", width: 300, height: 300, borderRadius: "50%", background: "rgba(207,218,245,0.3)", filter: "blur(80px)", pointerEvents: "none", animation: "blobFloat 10s ease-in-out infinite reverse" }} />

      <style>{`
        @keyframes blobFloat { 0%,100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(-24px); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(32px); } to { opacity: 1; transform: translateY(0); } }
        .hero-1 { animation: fadeUp 0.7s ease both; }
        .hero-2 { animation: fadeUp 0.7s 0.15s ease both; }
        .hero-3 { animation: fadeUp 0.7s 0.3s ease both; }
        .hero-4 { animation: fadeUp 0.7s 0.45s ease both; }
        .hero-5 { animation: fadeUp 0.7s 0.6s ease both; }
      `}</style>

      <h1 className="hero-1" style={{ fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: "clamp(40px,7vw,80px)", lineHeight: 1.2, letterSpacing: "-0.02em", color: "#000", maxWidth: 800, marginBottom: 24, position: "relative" }}>
        Crypto taxes,<br />filed while you sleep.
      </h1>

      <p className="hero-2" style={{ fontFamily: "var(--font-sans)", fontSize: 16, lineHeight: 1.6, letterSpacing: "-0.02em", color: "#4e4d4d", maxWidth: 480, marginBottom: 40 }}>
        Connect your OKX wallet. TaxBot fetches every transaction, picks the optimal cost-basis method, and auto-generates IRS-ready Form 8949, Schedule D and Schedule 1.
      </p>

      <div className="hero-3" style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <Link href="/dashboard" style={{ textDecoration: "none" }}>
          <button style={{ fontFamily: "var(--font-mono)", fontSize: 15, padding: "14px 28px", borderRadius: 100, background: "#242424", color: "#f6f3f1", border: "none", cursor: "pointer", letterSpacing: "-0.02em", transition: "opacity 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
            Generate My Tax Report
          </button>
        </Link>
        <Link href="#howitworks" style={{ textDecoration: "none" }}>
          <button style={{ fontFamily: "var(--font-mono)", fontSize: 15, padding: "14px 28px", borderRadius: 100, background: "transparent", color: "#242424", border: "1px solid #242424", cursor: "pointer", letterSpacing: "-0.02em", transition: "background 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.04)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            How it works
          </button>
        </Link>
      </div>

      {/* Stats */}
      <div className="hero-5" style={{ marginTop: 80, display: "flex", gap: 64, flexWrap: "wrap", justifyContent: "center" }}>
        {[
          { value: "$21K+", label: "Avg. basis recovered" },
          { value: "HIFO", label: "Auto-optimized method" },
          { value: "60s", label: "Full report generated" },
        ].map(s => (
          <div key={s.label} style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: 32, fontWeight: 400, color: "#000", letterSpacing: "-0.02em", marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#797776", letterSpacing: "0.05em" }}>{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
