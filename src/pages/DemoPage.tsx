import { useState } from "react";
import { API_URL, BASE_PATH } from "../config/env";
import useDocumentTitle from "../hooks/useDocumentTitle";
import type { DemoStatus } from "../types";
import { fetchWithTimeout } from "../utils/fetchWithTimeout";

type RequestState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: DemoStatus }
  | { status: "error"; message: string };

// Falls back to a static file in `public/` so the demo works with no backend.
const ENDPOINT = API_URL ? `${API_URL}/status` : `${BASE_PATH}demo-data.json`;

/** Throws during render so the route-level <ErrorBoundary> has something to catch. */
const Boom = () => {
  throw new Error("Demo error thrown from <Boom /> in DemoPage.");
};

const DemoPage = () => {
  useDocumentTitle("Demo");

  const [request, setRequest] = useState<RequestState>({ status: "idle" });
  const [crashed, setCrashed] = useState(false);

  const handleLoad = async () => {
    setRequest({ status: "loading" });
    try {
      const res = await fetchWithTimeout(ENDPOINT, { timeoutMs: 5_000 });
      if (!res.ok) {
        setRequest({ status: "error", message: `Request failed with status ${res.status}.` });
        return;
      }
      setRequest({ status: "success", data: (await res.json()) as DemoStatus });
    } catch (error) {
      setRequest({
        status: "error",
        message: error instanceof Error ? error.message : "Network request failed.",
      });
    }
  };

  return (
    <section aria-labelledby="demo-heading" className="flex flex-col gap-6">
      <div>
        <h1 id="demo-heading" className="text-4xl font-bold text-foreground">
          Built-ins
        </h1>
        <p className="mt-3 max-w-prose text-muted">
          Every primitive the template ships with, exercised at least once. This route is
          lazy-loaded, so reaching it on a cold chunk renders <code>RouteFallback</code> first.
        </p>
      </div>

      <article className="rounded-lg border border-divider bg-raised p-4">
        <h2 className="font-semibold text-foreground">fetchWithTimeout + config/env</h2>
        <p className="mt-1 text-sm text-muted">
          Requests <code>{ENDPOINT}</code> with a 5s <code>AbortController</code> timeout. The URL
          comes from <code>API_URL</code> when set, otherwise from <code>BASE_PATH</code> — both
          read through <code>src/config/env.ts</code>.
        </p>
        <button
          type="button"
          onClick={handleLoad}
          disabled={request.status === "loading"}
          className="mt-4 rounded-md bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-hover disabled:opacity-60"
        >
          {request.status === "loading" ? "Loading…" : "Send request"}
        </button>

        <div aria-live="polite" className="mt-4 text-sm">
          {request.status === "success" && (
            <p className="text-muted">
              <span className="font-medium text-foreground">{request.data.service}</span> —{" "}
              {request.data.status}. {request.data.message}
            </p>
          )}
          {request.status === "error" && (
            <p role="alert" className="text-error">
              {request.message}
            </p>
          )}
        </div>
      </article>

      <article className="rounded-lg border border-divider bg-raised p-4">
        <h2 className="font-semibold text-foreground">ErrorBoundary</h2>
        <p className="mt-1 text-sm text-muted">
          Throws from a child component. The route-level boundary in <code>App.tsx</code> catches
          it, keeps the header and footer mounted, and clears itself whenever <code>resetKey</code>{" "}
          changes — dismiss the card, or navigate away and back.
        </p>
        <button
          type="button"
          onClick={() => setCrashed(true)}
          className="mt-4 rounded-md border border-divider px-4 py-2 text-sm font-medium text-foreground hover:border-border-accent"
        >
          Trigger a render error
        </button>
        {crashed && <Boom />}
      </article>

      <article className="rounded-lg border border-divider bg-raised p-4">
        <h2 className="font-semibold text-foreground">Semantic tokens</h2>
        <p className="mt-1 text-sm text-muted">
          Each swatch below is a token from <code>@theme</code> in <code>src/index.css</code>. They
          re-map automatically under <code>prefers-color-scheme: dark</code> — no <code>dark:</code>{" "}
          variants involved.
        </p>
        {/* The `·` separators are the one legitimate use of `text-faint`: decorative chrome. */}
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div className="flex items-baseline gap-2">
            <dt className="text-foreground">text-foreground</dt>
            <span aria-hidden className="text-faint">
              ·
            </span>
            <dd className="text-muted">primary text</dd>
          </div>
          <div className="flex items-baseline gap-2">
            <dt className="text-muted">text-muted</dt>
            <span aria-hidden className="text-faint">
              ·
            </span>
            <dd className="text-muted">secondary text, meets AA</dd>
          </div>
          <div className="flex items-baseline gap-2">
            <dt className="text-accent">text-accent</dt>
            <span aria-hidden className="text-faint">
              ·
            </span>
            <dd className="text-muted">brand</dd>
          </div>
          <div className="flex items-baseline gap-2">
            <dt className="text-error">text-error</dt>
            <span aria-hidden className="text-faint">
              ·
            </span>
            <dd className="text-muted">validation / destructive</dd>
          </div>
        </dl>
      </article>
    </section>
  );
};

export default DemoPage;
