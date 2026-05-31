import { shortAddress, formatUsd, formatPct, formatHold, formatTimestamp } from './persona.js';
import { c, box, rule, bar, scoreColor, pnlColor, pair, boldCyan, boldGreen, boldYellow } from './style.js';

export function renderPersonaCard(address, chain, persona) {
  const out = [];
  out.push('');

  // Header inside a box
  const headerLines = [
    `${c.bold('Wallet Whisper')}   ${c.gray('·')}   ${c.cyan(shortAddress(address))} ${c.gray('(' + chain + ')')}`,
    c.gray(`${persona.closedTrades} closed positions in window  ·  ${persona.overview.buyCount} buys / ${persona.overview.sellCount} sells in last 30d`),
  ];
  out.push(box(headerLines, { color: c.cyan }));
  out.push('');

  // Persona section
  out.push(rule('PERSONA', c.brightCyan, 64));
  out.push(pair('Style', `${c.bold(persona.style)}  ${c.gray('· median hold ' + formatHold(persona.medianHoldSec))}`));
  if (persona.sizing.label === 'Insufficient Data') {
    out.push(pair('Sizing', c.gray('insufficient data')));
  } else {
    const med = formatUsd(persona.sizing.medianSize, 0);
    const lo = formatUsd(persona.sizing.iqrLow, 0);
    const hi = formatUsd(persona.sizing.iqrHigh, 0);
    out.push(pair('Sizing', `${persona.sizing.label}  ${c.gray(`· median ${med}, IQR ${lo}–${hi}`)}`));
  }
  out.push(pair('Sector', persona.sectorTiltLine));
  if (persona.mcTilt.length) {
    const total = persona.mcTilt.reduce((s, b) => s + b.count, 0);
    for (const b of persona.mcTilt.slice(0, 3)) {
      const pct = b.count / total;
      const sparkBar = bar(pct, 18, c.cyan, c.gray);
      out.push(pair(b.label, `${sparkBar} ${c.dim(`${(pct * 100).toFixed(0)}% (${b.count})`)}`));
    }
  }
  out.push('');

  // Edge section
  out.push(rule('EDGE', c.brightCyan, 64));
  const winRateColor = persona.overview.winRatePct >= 55 ? c.brightGreen : persona.overview.winRatePct >= 45 ? c.yellow : c.brightRed;
  out.push(pair('Win rate', `${winRateColor(persona.overview.winRatePct.toFixed(2) + '%')} ${c.gray('30d')}  ·  ${winRateColor((persona.edge.winRate * 100).toFixed(2) + '%')} ${c.gray('last ' + persona.closedTrades + ' closes')}`));
  out.push(pair('Realized PnL', pnlColor(persona.overview.realizedPnl)(formatUsd(persona.overview.realizedPnl)) + ' ' + c.gray('30d')));
  const pf = Number.isFinite(persona.edge.profitFactor) ? persona.edge.profitFactor : null;
  const pfColor = pf === null ? c.brightGreen : pf >= 2 ? c.brightGreen : pf >= 1.2 ? c.yellow : c.brightRed;
  out.push(pair('Profit factor', pfColor(pf === null ? '∞' : pf.toFixed(2))));
  out.push(pair('Expectancy', pnlColor(persona.edge.expectancy)(formatUsd(persona.edge.expectancy)) + ' ' + c.gray('per trade')));
  if (persona.topWinner) {
    const tw = persona.topWinner;
    out.push(pair('Top winner', `${c.bold(tw.tokenSymbol)} ${pnlColor(Number(tw.tokenPnLUsd))(formatUsd(tw.tokenPnLUsd))} ${c.gray('(' + formatPct(tw.tokenPnLPercent) + ')')}`));
  }
  const sColor = scoreColor(persona.edge.score);
  const scoreVisualBar = bar(persona.edge.score / 10, 20, sColor, c.gray);
  out.push(pair('Persona score', `${sColor(persona.edge.score.toFixed(1))} ${c.gray('/ 10')}  ${scoreVisualBar}`));
  out.push('');

  // Behavioral tells
  out.push(rule('BEHAVIORAL TELLS', c.brightCyan, 64));
  if (persona.tells.length === 0) {
    out.push('  ' + c.gray('no notable behavioral signatures detected'));
  } else {
    for (const t of persona.tells) {
      out.push(`  ${c.brightGreen('●')} ${c.bold(t.name)}`);
      out.push(`     ${c.gray(t.evidence)}`);
    }
  }
  out.push('');

  // Verdict
  out.push(rule('VERDICT', c.brightCyan, 64));
  out.push('  ' + verdict(persona));
  out.push('');

  // Next moves
  out.push(rule('NEXT MOVES', c.gray, 64));
  out.push(`  ${c.gray('→')} ${c.bold('replay')} (terminal)`);
  out.push(`      ${c.cyan(`wallet-whisperer replay ${address} --chain ${chain}`)}`);
  if (persona.edge.score >= 4) {
    out.push(`  ${c.gray('→')} ${c.bold('mirror')} (interactive, in Claude Code or Cursor)`);
    out.push(`      ${c.cyan('mirror this wallet ' + address)}`);
  } else {
    out.push(`  ${c.dim('mirror disabled (persona score below the 4/10 safety threshold)')}`);
  }
  out.push('');
  return out.join('\n');
}

function verdict(persona) {
  const pf = Number.isFinite(persona.edge.profitFactor) ? persona.edge.profitFactor.toFixed(2) : '∞';
  const wr = (persona.edge.winRate * 100).toFixed(0);
  const sizingPhrase = persona.sizing.label === 'Flat Sizing' ? 'flat' : 'variable';
  const tellPhrase = persona.tells.length
    ? `Tells: ${persona.tells.map((t) => c.bold(t.name)).join(', ')}.`
    : 'No notable behavioural tells.';
  let scoreNote;
  if (persona.edge.score >= 6) scoreNote = c.brightGreen('Worth mirroring.');
  else if (persona.edge.score >= 4) scoreNote = c.yellow('Mirrorable with tight slippage controls.');
  else scoreNote = c.brightRed('Below the mirror safety threshold (4/10).');
  return `${persona.style} with ${sizingPhrase} sizing. ${c.bold(wr + '%')} win rate, profit factor ${c.bold(pf)}. ${tellPhrase} ${scoreNote}`;
}

export function renderReplay(address, chain, highlights) {
  const out = [];
  out.push('');
  out.push(rule(`BEST ${highlights.best.length} TRADES`, c.brightGreen, 64));
  out.push('');
  for (let i = 0; i < highlights.best.length; i++) {
    renderTrade(out, i + 1, highlights.best[i], true);
  }
  out.push(rule(`WORST ${highlights.worst.length} TRADES`, c.brightRed, 64));
  out.push('');
  for (let i = 0; i < highlights.worst.length; i++) {
    renderTrade(out, i + 1, highlights.worst[i], false);
  }
  return out.join('\n');
}

function renderTrade(out, n, t, isWin) {
  const sign = isWin ? c.brightGreen('+') : c.brightRed('');
  const pnlStr = isWin
    ? c.brightGreen(formatUsd(t.realizedPnlUsd))
    : c.brightRed(formatUsd(t.realizedPnlUsd));
  const pctStr = isWin
    ? c.brightGreen(formatPct(t.realizedPnlPercent))
    : c.brightRed(formatPct(t.realizedPnlPercent));
  out.push(`  ${c.gray(String(n) + '.')} ${sign}${pnlStr}  ${c.gray('·')}  ${pctStr}  ${c.gray('·')}  ${c.bold(t.symbol)}`);
  out.push(`     ${c.gray('Bought')} ${formatUsd(t.buyTxVolume)} ${c.gray('@ ' + priceFmt(t.buyAvgPrice))}  ${c.gray('(' + t.buyTxCount + ' buy' + (t.buyTxCount === 1 ? '' : 's') + ' · ' + formatTimestamp(t.entryTs) + ')')}`);
  out.push(`     ${c.gray('Sold  ')} ${formatUsd(t.sellTxVolume)} ${c.gray('@ ' + priceFmt(t.sellAvgPrice))}  ${c.gray('(' + t.sellTxCount + ' sell' + (t.sellTxCount === 1 ? '' : 's') + ')')}`);
  out.push(`     ${c.gray('Held  ')} ${formatHold(t.holdSec)}`);
  out.push('');
}

function priceFmt(p) {
  if (!Number.isFinite(p) || p <= 0) return '$0';
  if (p >= 1) return `$${p.toFixed(4)}`;
  if (p >= 0.01) return `$${p.toFixed(6)}`;
  return `$${p.toExponential(3)}`;
}
