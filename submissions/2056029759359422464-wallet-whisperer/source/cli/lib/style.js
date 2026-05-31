// Zero-dependency ANSI styling + box-drawing helpers.
// Respects NO_COLOR and falls back to plain text when stdout is not a TTY.

const supportsColor = process.stdout.isTTY && !process.env.NO_COLOR;

const codes = {
  reset: 0,
  bold: 1,
  dim: 2,
  italic: 3,
  underline: 4,
  inverse: 7,
};

const fg = {
  black: 30, red: 31, green: 32, yellow: 33, blue: 34, magenta: 35, cyan: 36, white: 37,
  gray: 90, brightRed: 91, brightGreen: 92, brightYellow: 93, brightBlue: 94, brightMagenta: 95, brightCyan: 96, brightWhite: 97,
};

const bg = { bgBlack: 40, bgRed: 41, bgGreen: 42, bgYellow: 43, bgBlue: 44, bgMagenta: 45, bgCyan: 46, bgWhite: 47 };

function wrap(code) {
  return (text) => (supportsColor ? `\x1b[${code}m${text}\x1b[0m` : String(text));
}

export const c = {
  bold: wrap(codes.bold),
  dim: wrap(codes.dim),
  italic: wrap(codes.italic),
  underline: wrap(codes.underline),
  red: wrap(fg.red),
  green: wrap(fg.green),
  yellow: wrap(fg.yellow),
  blue: wrap(fg.blue),
  cyan: wrap(fg.cyan),
  magenta: wrap(fg.magenta),
  gray: wrap(fg.gray),
  brightCyan: wrap(fg.brightCyan),
  brightGreen: wrap(fg.brightGreen),
  brightYellow: wrap(fg.brightYellow),
  brightRed: wrap(fg.brightRed),
  brightWhite: wrap(fg.brightWhite),
};

// Compose styles: e.g. boldCyan = (t) => c.bold(c.brightCyan(t))
export const boldCyan = (t) => c.bold(c.brightCyan(t));
export const boldGreen = (t) => c.bold(c.brightGreen(t));
export const boldRed = (t) => c.bold(c.brightRed(t));
export const boldYellow = (t) => c.bold(c.brightYellow(t));

export function scoreColor(score) {
  if (score >= 7) return boldGreen;
  if (score >= 5) return boldCyan;
  if (score >= 4) return boldYellow;
  return boldRed;
}

export function pnlColor(value) {
  if (value > 0) return c.brightGreen;
  if (value < 0) return c.brightRed;
  return c.gray;
}

// Box drawing
const BOX = {
  tl: '┌', tr: '┐', bl: '└', br: '┘',
  h: '─', v: '│',
  ml: '├', mr: '┤', mt: '┬', mb: '┴', cross: '┼',
  dh: '═', dv: '║',
};

export function rule(label, color = c.cyan, width = 60) {
  const inner = label ? ` ${label} ` : '';
  const pad = Math.max(0, width - inner.length - 2);
  const leftPad = Math.floor(pad / 2);
  const rightPad = pad - leftPad;
  return color(BOX.h.repeat(leftPad) + inner + BOX.h.repeat(rightPad));
}

export function box(lines, opts = {}) {
  const color = opts.color ?? c.cyan;
  const padX = opts.padX ?? 2;
  // Width is computed from longest visible line (strip ANSI).
  const visible = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');
  const widest = Math.max(...lines.map((l) => visible(l).length));
  const inner = widest + padX * 2;
  const top = color(BOX.tl + BOX.h.repeat(inner) + BOX.tr);
  const bottom = color(BOX.bl + BOX.h.repeat(inner) + BOX.br);
  const padded = lines.map((l) => {
    const pad = widest - visible(l).length;
    return color(BOX.v) + ' '.repeat(padX) + l + ' '.repeat(pad + padX) + color(BOX.v);
  });
  return [top, ...padded, bottom].join('\n');
}

// Horizontal bar (e.g. for sector tilt). value is 0..1.
export function bar(value, width = 14, filledColor = c.cyan, emptyColor = c.gray) {
  const v = Math.max(0, Math.min(1, value));
  const filled = Math.round(v * width);
  return filledColor('█'.repeat(filled)) + emptyColor('░'.repeat(width - filled));
}

// Sparkline for an array of numbers
export function sparkline(values) {
  const chars = '▁▂▃▄▅▆▇█';
  if (!values.length) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values.map((v) => chars[Math.min(7, Math.floor(((v - min) / range) * 8))]).join('');
}

// Spinner that writes to stderr (so it does not pollute piped stdout).
export function startSpinner(message) {
  if (!process.stderr.isTTY || process.env.NO_COLOR) {
    process.stderr.write(`${message}\n`);
    return () => {};
  }
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  process.stderr.write('\x1B[?25l'); // hide cursor
  const id = setInterval(() => {
    process.stderr.write(`\r${c.brightCyan(frames[i % frames.length])} ${message}`);
    i++;
  }, 80);
  return () => {
    clearInterval(id);
    process.stderr.write('\r\x1B[K');     // clear line
    process.stderr.write('\x1B[?25h');    // show cursor
  };
}

// Render a labelled value pair with consistent column widths.
export function pair(label, value, labelWidth = 16) {
  return `  ${c.gray(label.padEnd(labelWidth))}${value}`;
}
