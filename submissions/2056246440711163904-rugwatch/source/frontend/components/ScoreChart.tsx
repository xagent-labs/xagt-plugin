"use client";

import { type ScorePoint, scoreLevel } from "@/lib/types";

interface Props {
  history: ScorePoint[];
  warnAt?: number;
  exitAt?: number;
  width?: number;
  height?: number;
}

export default function ScoreChart({
  history,
  warnAt = 0.65,
  exitAt = 0.80,
  width = 600,
  height = 80,
}: Props) {
  if (history.length < 2) {
    return (
      <div className="card">
        <p className="label-col mb-2">Score history</p>
        <p className="text-sm text-neutral-400 py-6 text-center">Collecting data…</p>
      </div>
    );
  }

  const pad = { t: 10, r: 8, b: 22, l: 40 };
  const w = width - pad.l - pad.r;
  const h = height - pad.t - pad.b;

  const points = history.map((p, i) => ({
    x: (i / (history.length - 1)) * w,
    y: h - p.score * h,
    score: p.score,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${h} L 0 ${h} Z`;

  const lastScore = history[history.length - 1].score;
  const level = scoreLevel(lastScore, warnAt, exitAt);
  const color = level === "danger" ? "#ef4444" : level === "warn" ? "#f97316" : "#10b981";

  const warnY = h - warnAt * h;
  const exitY = h - exitAt * h;
  const yLabels = [0, 0.25, 0.5, 0.75, 1.0];

  return (
    <div className="card">
      <p className="label-col mb-3">Score history</p>
      <svg width={width} height={height} role="img" aria-label="RugScore history chart">
        <defs>
          <linearGradient id="score-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.12} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <g transform={`translate(${pad.l},${pad.t})`}>
          {yLabels.map((v) => {
            const y = h - v * h;
            return (
              <g key={v}>
                <line x1={0} y1={y} x2={w} y2={y} stroke="#f5f5f5" strokeWidth={1} />
                <text x={-6} y={y + 3} fill="#d4d4d4" fontSize={9} textAnchor="end" fontFamily="inherit">
                  {v.toFixed(2)}
                </text>
              </g>
            );
          })}
          <line x1={0} y1={warnY} x2={w} y2={warnY} stroke="#f97316" strokeWidth={0.75} strokeDasharray="3,3" opacity={0.5} />
          <line x1={0} y1={exitY} x2={w} y2={exitY} stroke="#ef4444" strokeWidth={0.75} strokeDasharray="3,3" opacity={0.5} />
          <path d={areaD} fill="url(#score-fill)" />
          <path d={pathD} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
          <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={3} fill={color} />
        </g>
      </svg>
    </div>
  );
}
