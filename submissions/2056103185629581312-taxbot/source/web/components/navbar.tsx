"use client"
import Link from "next/link"
import { useState } from "react"

export default function Navbar() {
  const [open, setOpen] = useState(false)
  return (
    <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, background: "#f6f3f1", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#f6f3f1", fontSize: 12, fontWeight: 700 }}>T</span>
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 500, fontSize: 15, color: "#000", letterSpacing: "-0.02em" }}>TaxBot</span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {[["Features", "#features"], ["How it Works", "#howitworks"]].map(([label, href]) => (
            <Link key={label} href={href} style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "#242424", textDecoration: "none", padding: "8px 12px", borderRadius: 100, transition: "background 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.05)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              {label}
            </Link>
          ))}
          <Link href="/dashboard" style={{ textDecoration: "none" }}>
            <button style={{ fontFamily: "var(--font-mono)", fontSize: 14, padding: "10px 20px", borderRadius: 100, background: "#242424", color: "#f6f3f1", border: "none", cursor: "pointer", letterSpacing: "-0.02em", transition: "opacity 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
              Open App →
            </button>
          </Link>
        </div>
      </div>
    </nav>
  )
}
