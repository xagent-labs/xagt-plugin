import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Trade Copilot — Autonomous Trade-Safety Agent",
  description:
    "An autonomous AI agent with a non-overridable deterministic safety core. Powered by OKX onchainOS on X Layer.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300..800;1,300..800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
