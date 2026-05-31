import { cn } from '@/lib/utils';

type LoadingRingSize = 'sm' | 'md' | 'lg';
type LoadingRingTone = 'accent' | 'muted';

const SIZE_CLASSES: Record<LoadingRingSize, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-2',
};

const TONE_CLASSES: Record<LoadingRingTone, string> = {
  accent: 'border-white/20 border-t-indigo-400',
  muted: 'border-white/15 border-t-white/60',
};

interface LoadingRingProps {
  size?: LoadingRingSize;
  tone?: LoadingRingTone;
  className?: string;
  'aria-label'?: string;
}

// Canonical full-screen / panel-level loading indicator. Inline activity (e.g.
// per-row spinners inside lists, button busy states) should stick to the
// lucide Loader2 icon — the ring's heavier ink is meant for "the page is
// loading" moments, not for live activity within already-painted UI.
export function LoadingRing({
  size = 'md',
  tone = 'accent',
  className,
  'aria-label': ariaLabel = 'Loading',
}: LoadingRingProps) {
  return (
    <div
      role="status"
      aria-label={ariaLabel}
      className={cn(
        'animate-spin rounded-full',
        SIZE_CLASSES[size],
        TONE_CLASSES[tone],
        className,
      )}
    />
  );
}

export function FullScreenLoader({ tone = 'accent' }: { tone?: LoadingRingTone }) {
  return (
    <div
      className="min-h-screen bg-background text-foreground"
      aria-label="Loading"
    >
      <div className="flex min-h-screen items-center justify-center">
        <LoadingRing size="md" tone={tone} />
      </div>
    </div>
  );
}
