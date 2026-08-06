type FetchWithTimeoutOptions = RequestInit & {
  /** Timeout in milliseconds. Defaults to 10_000. */
  timeoutMs?: number;
};

/**
 * `fetch` with an AbortController-backed timeout.
 *
 * - Aborts and rejects with a `TimeoutError`-like error when the timeout elapses.
 * - Respects a caller-supplied `signal` (both abort sources are honored).
 *
 * The caller is still responsible for checking `res.ok` and handling
 * non-2xx responses.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  { timeoutMs = 10_000, signal, ...init }: FetchWithTimeoutOptions = {},
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new Error("Request timed out")), timeoutMs);

  // Chain any caller-supplied signal into our controller.
  const onExternalAbort = () => controller.abort(signal?.reason);
  if (signal) {
    if (signal.aborted) controller.abort(signal.reason);
    else signal.addEventListener("abort", onExternalAbort, { once: true });
  }

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener("abort", onExternalAbort);
  }
}
