/**
 * @file collector/lib/http.ts
 * @description Rate-limit-aware JSON and binary fetching.
 *
 * Walking a few dozen endpoints in a row is enough to trip most public APIs, so
 * requests are spaced out and a 429 backs off and retries rather than silently
 * yielding no data.
 */

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Carries the HTTP status so callers can tell expected 400s from real 403s. */
export class ApiError extends Error {
  // Declared and assigned rather than a constructor parameter property, which
  // `erasableSyntaxOnly` rejects — it is syntax that has to be compiled away
  // rather than simply stripped.
  readonly status: number;

  constructor(status: number, endpoint: string) {
    super(`${endpoint} returned ${status}`);
    this.name = "ApiError";
    this.status = status;
  }
}

const RETRYABLE = new Set([429, 500, 502, 503, 504]);

export interface JsonClientOptions {
  baseUrl: string;
  /** Params sent with every request — authentication, usually. */
  defaultParams?: Record<string, string>;
  /** Headers sent with every request, for APIs that authenticate that way. */
  headers?: Record<string, string>;
  /** Pause before each request, to stay under the API's rate limit. */
  delayMs?: number;
}

export const createJsonClient = ({
  baseUrl,
  defaultParams = {},
  headers,
  delayMs = 300,
}: JsonClientOptions) => {
  const maxRetries = 3;

  const call = async (
    endpoint: string,
    params: Record<string, string> = {},
    attempt = 1,
  ): Promise<unknown> => {
    await sleep(delayMs);

    const query = new URLSearchParams({ ...defaultParams, ...params });
    const suffix = query.toString() ? `?${query}` : "";
    const response = await fetch(`${baseUrl}/${endpoint}${suffix}`, {
      headers,
    });

    if (RETRYABLE.has(response.status) && attempt <= maxRetries) {
      // Steam and SteamGridDB send Retry-After on 429; honour it when present
      // rather than guessing and getting limited again.
      const header = Number(response.headers.get("retry-after"));
      const backoff = header > 0 ? header * 1000 : 2000 * attempt;
      console.warn(`  ~ ${endpoint} returned ${response.status}, retrying in ${backoff}ms`);
      await sleep(backoff);
      return call(endpoint, params, attempt + 1);
    }

    if (!response.ok) {
      throw new ApiError(response.status, endpoint);
    }
    return response.json();
  };

  return (endpoint: string, params?: Record<string, string>) => call(endpoint, params);
};

/** Fetches binary content. Returns null on any failure — art is optional. */
export const download = async (url: string) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    const body = Buffer.from(await response.arrayBuffer());
    // Some CDNs answer 200 with an empty body under load. Storing that would
    // poison the library, which never re-downloads.
    if (body.byteLength === 0) {
      return null;
    }
    return { body, contentType: response.headers.get("content-type") };
  } catch {
    return null;
  }
};
