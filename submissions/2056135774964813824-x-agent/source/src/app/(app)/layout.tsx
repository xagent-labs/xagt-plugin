import { SidebarShell } from "@/components/app/sidebar-shell";
import { CommandBar } from "@/components/app/command-bar";
import { ActivityPanel } from "@/components/app/activity-panel";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh bg-background">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 grid-bg-fade opacity-[0.35]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -left-32 top-24 h-72 w-72 rounded-full bg-electric/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed right-0 top-1/3 h-80 w-80 rounded-full bg-plasma/10 blur-3xl"
      />

      <SidebarShell />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <CommandBar />
        <main className="relative flex min-w-0 flex-1">
          <div className="min-w-0 flex-1">{children}</div>
          <ActivityPanel />
        </main>
      </div>
    </div>
  );
}
