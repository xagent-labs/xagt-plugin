"use client";

import { scoreLevel, type ScoreLevel } from "@/lib/types";

interface Props {
  score: number;
  warnAt?: number;
  exitAt?: number;
  size?: number;
}

const LABEL: Record<ScoreLevel, string> = {
  safe: "Safe",
  warn: "Warning",
  danger: "Exit triggered",
};

const CX = 100;
const CY = 100;
const R = 74;
const STROKE_W = 14;
const START_DEG = 135;
const SWEEP = 270;

function toXY(deg: number, r: number = R) {
  const rad = (deg * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function arcPath(fromDeg: number, toDeg: number): string {
  const p1 = toXY(fromDeg);
  const p2 = toXY(toDeg);
  const delta = ((toDeg - fromDeg) + 360) % 360;
  const large = delta > 180 ? 1 : 0;
  return `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
}

function scoreToColor(t: number): string {
  // green (#10b981) → yellow (#eab308) → red (#ef4444)
  if (t < 0.5) {
    const p = t / 0.5;
    const r = Math.round(16 + (234 - 16) * p);
    const g = Math.round(185 + (179 - 185) * p);
    const b = Math.round(129 + (8 - 129) * p);
    return `rgb(${r},${g},${b})`;
  }
  const p = (t - 0.5) / 0.5;
  const r = Math.round(234 + (239 - 234) * p);
  const g = Math.round(179 + (68 - 179) * p);
  const b = Math.round(8 + (68 - 8) * p);
  return `rgb(${r},${g},${b})`;
}

export default function RiskGauge({ score, warnAt = 0.65, exitAt = 0.80, size = 240 }: Props) {
  const level = scoreLevel(score, warnAt, exitAt);
  const label = LABEL[level];
  const color = scoreToColor(score);

  const trackD = arcPath(START_DEG, START_DEG + SWEEP);
  const fillEnd = START_DEG + Math.max(score, 0.005) * SWEEP;
  const fillD = arcPath(START_DEG, fillEnd);
  const dot = toXY(fillEnd);

  const badgeClass =
    level === "danger" ? "status-danger" : level === "warn" ? "status-warn" : "status-safe";

  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        viewBox="0 0 200 160"
        width={size}
        height={size * 0.8}
        className="overflow-visible"
        role="img"
        aria-label={`RugScore ${score.toFixed(2)}, status: ${label}`}
      >
        {/* track */}
        <path
          d={trackD}
          fill="none"
          stroke="#e5e5e5"
          strokeWidth={STROKE_W}
          strokeLinecap="round"
          opacity={0.35}
        />

        {/* filled arc */}
        {score > 0.001 && (
          <path
            d={fillD}
            fill="none"
            stroke={color}
            strokeWidth={STROKE_W}
            strokeLinecap="round"
          />
        )}

        {/* dot at current position */}
        <circle cx={dot.x} cy={dot.y} r={STROKE_W / 2 + 1} fill={color} />

        {/* score text */}
        <text
          x={CX}
          y={CY + 6}
          textAnchor="middle"
          fill={color}
          fontSize={32}
          fontWeight={700}
          fontFamily="inherit"
        >
          {score.toFixed(2)}
        </text>
        <text
          x={CX}
          y={CY + 24}
          textAnchor="middle"
          fill="#a3a3a3"
          fontSize={10}
          fontFamily="inherit"
        >
          RugScore
        </text>
      </svg>
      <span className={`text-xs font-medium px-3 py-1 rounded-[3px] ${badgeClass}`}>{label}</span>
    </div>
  );
}
