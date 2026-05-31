/** Smart Trade Copilot mark — a safety shield enclosing an upward
 *  trade trendline. Geometric, single-accent, crisp at any size.
 *  `currentColor` drives the shield so it themes with text; the
 *  trendline carries the one green accent. Wrapped in a surface
 *  tile (.logo-tile) so it reads as a real product mark. */
export function Logo({ size = 20 }: { size?: number }) {
  return (
    <span className="logo-tile" aria-hidden="true">
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className="logo-mark"
      >
        <path
          d="M12 2.4 4 5.2v6.1c0 4.7 3.2 8.4 8 10.3 4.8-1.9 8-5.6 8-10.3V5.2L12 2.4Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
          opacity="0.55"
        />
        <path
          d="M7.6 14.4 10.6 11l2.2 2.2 3.6-4"
          stroke="var(--accent-green)"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M13.6 9.2h2.8v2.8"
          stroke="var(--accent-green)"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
