import type { Metadata } from "next";
import dynamic from "next/dynamic";

const DemoView = dynamic(() => import("./demo-view"), { ssr: false });

export const metadata: Metadata = {
  title: "RugWatch — Live Demo",
  description:
    "See RugWatch detect a rug pull in real-time. Interactive demo — no wallet needed.",
  openGraph: {
    title: "RugWatch — Live Demo",
    description: "Watch an autonomous rug detection and exit in action.",
  },
};

export default function DemoPage() {
  return <DemoView />;
}
