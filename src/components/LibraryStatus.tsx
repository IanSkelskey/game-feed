import { Link } from "react-router";
import { SHOW_DOCS_PAGE } from "../config/env";
import type { LibraryState } from "../types";
import CodeBlock from "./CodeBlock";

type LibraryStatusProps = {
  /** Every state except `ready` — pages render their own content for that. */
  state: Exclude<LibraryState, { status: "ready" }>;
};

const SETUP = `# 1. Credentials (PowerShell, once per machine)
setx STEAM_API_KEY "..."
setx STEAM_ID      "..."

# 2. Collect
npm run collect`;

/**
 * Everything the library can be other than loaded.
 *
 * A fresh fork lands on `empty`, which is why that branch is setup
 * instructions rather than an apology: for most people the first thing this
 * app ever renders is this screen.
 */
const LibraryStatus = ({ state }: LibraryStatusProps) => {
  if (state.status === "loading") {
    return (
      <p role="status" aria-live="polite" className="py-16 text-center text-muted">
        Loading the library…
      </p>
    );
  }

  if (state.status === "error") {
    return (
      <div className="rounded-lg border border-error/30 bg-raised p-6">
        <h2 className="font-display text-lg text-foreground">The library didn&apos;t load</h2>
        <p role="alert" className="mt-2 text-sm text-error">
          {state.message}
        </p>
        {/* Both branches of this page point at /docs for the detail, so both
            have to stand on their own when a fork has hidden it. */}
        <p className="mt-3 text-sm text-muted">
          The feed is read from <code>data/games.json</code> on this site. If you are running
          locally, check that a collection has been committed
          {SHOW_DOCS_PAGE && (
            <>
              {" "}
              — see the{" "}
              <Link to="/docs" className="font-medium text-accent hover:text-accent-hover">
                docs
              </Link>
            </>
          )}
          .
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-divider bg-raised p-6">
      <h2 className="font-display text-lg text-foreground">No games collected yet</h2>
      <p className="mt-2 max-w-prose text-sm text-muted">
        This is what a fresh fork looks like. Set credentials for at least one source, run the
        collector, and this page fills with your own library — nothing else needs configuring.
      </p>
      <div className="mt-4 max-w-prose">
        <CodeBlock code={SETUP} label="the setup commands" />
      </div>
      <p className="mt-4 text-sm text-muted">
        RetroAchievements works the same way, with <code>RETRO_ACHIEVEMENTS_USERNAME</code> and{" "}
        <code>RETRO_ACHIEVEMENTS_API_KEY</code>.{" "}
        {SHOW_DOCS_PAGE ? (
          <>
            The{" "}
            <Link to="/docs" className="font-medium text-accent hover:text-accent-hover">
              docs
            </Link>{" "}
            list every variable and what it unlocks.
          </>
        ) : (
          // Not `.env.example` — that file carries only the VITE_ variables;
          // the credentials are deliberately absent from it.
          <>The repository&apos;s README lists every variable and what it unlocks.</>
        )}
      </p>
    </div>
  );
};

export default LibraryStatus;
