export type TextSelection = {
  start: number;
  end: number;
};

function clampIndex(value: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > max) return max;
  return Math.floor(value);
}

export function insertTextAtSelection(
  value: string,
  insertText: string,
  selection: TextSelection,
): { value: string; cursor: number } {
  const safeValue = value ?? "";
  const safeInsert = insertText ?? "";
  const max = safeValue.length;

  const start = clampIndex(Math.min(selection.start, selection.end), max);
  const end = clampIndex(Math.max(selection.start, selection.end), max);

  const nextValue = `${safeValue.slice(0, start)}${safeInsert}${safeValue.slice(end)}`;
  return {
    value: nextValue,
    cursor: start + safeInsert.length,
  };
}
