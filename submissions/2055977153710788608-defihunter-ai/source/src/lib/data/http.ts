const DEFAULT_TIMEOUT_MS = 12_000;

export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly url: string
  ) {
    super(message);
    this.name = "HttpError";
  }
}

async function fetchJsonOnce<T>(
  url: string,
  init: RequestInit & { timeoutMs?: number }
): Promise<T> {
  const timeoutMs = init.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...init,
      headers: { Accept: "application/json", ...(init.headers ?? {}) },
      signal: controller.signal,
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      throw new HttpError(`HTTP ${res.status}: ${res.statusText}`, res.status, url);
    }

    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new HttpError("Request timeout", 408, url);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchJson<T>(
  url: string,
  init?: RequestInit & { timeoutMs?: number; retries?: number }
): Promise<T> {
  const retries = init?.retries ?? 2;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetchJsonOnce<T>(url, init ?? {});
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }
    }
  }

  throw lastError;
}
