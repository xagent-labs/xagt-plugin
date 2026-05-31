import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const font = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  title: "RugWatch — Autonomous Rug Pull Detection",
  description:
    "AI-powered rug pull detection and autonomous exit agent. Monitors 5 on-chain signals, scores risk in real-time, and exits positions automatically on OKX OnchainOS.",
  openGraph: {
    title: "RugWatch — Autonomous Rug Pull Detection",
    description:
      "Monitors 5 on-chain signals, scores risk in real-time, and exits positions automatically.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "RugWatch",
    description:
      "Autonomous rug pull detection and exit agent on OKX OnchainOS.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={font.className}>{children}</body>
    </html>
  );
}
