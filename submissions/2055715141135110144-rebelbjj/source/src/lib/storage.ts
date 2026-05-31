export const getScopedStorageKey = (baseKey: string, scope?: string | null) =>
  scope ? `${baseKey}::${scope}` : baseKey;

export const readScopedStorageItem = (baseKey: string, scope?: string | null) => {
  if (typeof window === "undefined") return null;

  const scopedKey = getScopedStorageKey(baseKey, scope);
  const scopedValue = window.localStorage.getItem(scopedKey);
  if (scopedValue !== null) return scopedValue;

  // Fall back to the legacy unscoped key so existing local data still shows up.
  return scope ? window.localStorage.getItem(baseKey) : null;
};

export const writeScopedStorageItem = (
  baseKey: string,
  value: string,
  scope?: string | null,
) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getScopedStorageKey(baseKey, scope), value);
};

export const removeScopedStorageItem = (baseKey: string, scope?: string | null) => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(getScopedStorageKey(baseKey, scope));
};

export const readScopedBooleanRecord = (baseKey: string, scope?: string | null) => {
  const raw = readScopedStorageItem(baseKey, scope);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, boolean>)
      : {};
  } catch {
    return {};
  }
};
