import Navbar from "@/components/navbar"
import Hero from "@/components/hero"
import HowItWorks from "@/components/how-it-works"
import Features from "@/components/features"
import CTA from "@/components/cta"

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <HowItWorks />
      <Features />
      <CTA />
      <footer className="py-8 text-center text-xs border-t" style={{ color: "#797776", borderColor: "rgba(0,0,0,0.08)", fontFamily: "var(--font-mono)" }}>
        TaxBot 2025
      </footer>
    </main>
  )
}
