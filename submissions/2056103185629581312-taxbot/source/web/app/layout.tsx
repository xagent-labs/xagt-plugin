import type { Metadata } from "next"
import { IBM_Plex_Mono, Noto_Serif, Inter } from "next/font/google"
import "./globals.css"
import ScrollReveal from "@/components/scroll-reveal"

const mono = IBM_Plex_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400","500"] })
const serif = Noto_Serif({ subsets: ["latin"], variable: "--font-serif", weight: ["400"] })
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", weight: ["400"] })

export const metadata: Metadata = {
  title: "TaxBot — Crypto Tax Agent",
  description: "Connect your OKX wallet. Get IRS-ready Form 8949, Schedule D, and Schedule 1 in seconds.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${mono.variable} ${serif.variable} ${sans.variable}`}>
      <body><ScrollReveal />{children}</body>
    </html>
  )
}
