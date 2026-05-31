"use client";

import dynamic from "next/dynamic";

// disable SSR — this is a pure client-side polling dashboard
const Dashboard = dynamic(() => import("./dashboard"), { ssr: false });

export default function Page() {
  return <Dashboard />;
}
