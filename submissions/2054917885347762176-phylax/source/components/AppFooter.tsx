export function AppFooter() {
  return (
    <footer className="border-t border-border bg-white/60 backdrop-blur py-4 px-4 sm:px-6">
      <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} PhylaX</span>
        <span className="hidden sm:inline" aria-hidden>·</span>
        <span>OKX Onchain OS</span>
        <span className="hidden sm:inline" aria-hidden>·</span>
        <span>Simulation-first</span>
      </div>
    </footer>
  );
}
