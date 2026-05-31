import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "X-Agent · Autonomous AI crypto intelligence",
  description:
    "Open-source AI research engine for crypto. Autonomous agents crawl the web, audit on-chain data and synthesize source-backed intelligence. Self-hosted, OpenRouter-powered.",
  keywords: [
    "crypto",
    "ai agent",
    "openrouter",
    "okx",
    "research",
    "narrative",
    "open source",
    "self-hosted",
  ],
  authors: [{ name: "X-Agent" }],
  openGraph: {
    title: "X-Agent · Autonomous AI crypto intelligence",
    description:
      "Open-source AI research engine for crypto. Self-hosted with just an OpenRouter key.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#06080d" },
    { media: "(prefers-color-scheme: light)", color: "#fbfcfe" },
  ],
};

const themeInitScript = `
(function() {
  try {
    var raw = localStorage.getItem('xagent.theme');
    var theme = 'dark';
    if (raw) {
      var parsed = JSON.parse(raw);
      if (parsed && parsed.state && (parsed.state.theme === 'light' || parsed.state.theme === 'dark')) {
        theme = parsed.state.theme;
      }
    }
    var root = document.documentElement;
    if (theme === 'light') root.classList.add('light');
    root.style.colorScheme = theme;
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-dvh font-sans selection:bg-electric/30">
        {children}
      </body>
    </html>
  );
}
