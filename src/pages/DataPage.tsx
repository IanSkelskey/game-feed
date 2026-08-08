import CodeBlock from "../components/CodeBlock";
import Icon from "../components/Icon";
import useDocumentTitle from "../hooks/useDocumentTitle";
import useLibrary from "../hooks/useLibrary";
import { DATA_URL, SCAFFOLD } from "../config/env";

/** The feed's absolute address, which is what another app has to request. */
const FEED_URL = new URL(DATA_URL, window.location.href).href;
const SITE_ROOT = FEED_URL.replace(/data\/games\.json$/, "");

const FETCH_EXAMPLE = `import type { PlayedGame } from "./types";

const games: PlayedGame[] = await fetch(
  "${FEED_URL}",
).then((response) => response.json());

// Newest session first, so this is the last thing that was played.
const [latest] = games;`;

const TYPE_EXAMPLE = `export interface PlayedGame {
  /** Namespaced ("ra-3291", "steam-440") so ids stay unique when merged. */
  id: string;
  source: "steam" | "retroachievements";
  title: string;
  /** Console name for RetroAchievements, "Steam" for Steam. */
  platform: string;
  iconUrl: string;
  /** Portrait cover art. Absent when no usable art was found. */
  coverUrl?: string;
  lastPlayedAt: string;
  /** Steam only. */
  playtimeMinutes?: number;
  steamType?: SteamAppType;
  /** Whether the game has achievements at all, independent of progress. */
  achievementSupport?: "available" | "none" | "unknown";
  earnedCount: number;
  /** How many the game defines — 0 when it has none, or the lookup failed. */
  totalCount: number;
  /** 0–100, rounded. */
  completionPct: number;
  recentAchievements: EarnedAchievement[];
}`;

/**
 * What the collector calls, and at which version. Documented because a feed is
 * only as stable as the APIs behind it: a reader deciding whether to depend on
 * this should be able to see what it in turn depends on.
 */
const UPSTREAM: { name: string; version: string; provides: string }[] = [
  {
    name: "Steam · IPlayerService/GetOwnedGames",
    version: "v1",
    provides: "Titles, icons, playtime, last-played timestamps",
  },
  {
    name: "Steam · ISteamUserStats/GetPlayerAchievements",
    version: "v1",
    provides: "Which achievements this account has unlocked",
  },
  {
    name: "Steam · ISteamUserStats/GetSchemaForGame",
    version: "v2",
    provides: "What a game defines — the authority behind achievementSupport",
  },
  {
    name: "Steam · IStoreBrowseService/GetItems",
    version: "v1",
    provides: "Library capsule art paths",
  },
  {
    name: "Steam · store appdetails",
    version: "unversioned",
    provides: "Product type, to keep tools and DLC out of the list",
  },
  {
    name: "RetroAchievements · Web API",
    version: "unversioned",
    provides: "Recently played games and per-game achievement progress",
  },
  {
    name: "SteamGridDB",
    version: "v2",
    provides: "Poster art for emulated games (optional)",
  },
];

const ENV_VARS: { name: string; source: string; required: string }[] = [
  {
    name: "STEAM_API_KEY",
    source: "steamcommunity.com/dev/apikey",
    required: "Steam",
  },
  {
    name: "STEAM_ID",
    source: "Your 64-bit SteamID, or the vanity name from your profile URL",
    required: "Steam",
  },
  {
    name: "RETRO_ACHIEVEMENTS_USERNAME",
    source: "Your RetroAchievements account name",
    required: "RetroAchievements",
  },
  {
    name: "RETRO_ACHIEVEMENTS_API_KEY",
    source: "retroachievements.org/settings → Web API Key",
    required: "RetroAchievements",
  },
  {
    name: "STEAM_GRID_DB_API_KEY",
    source: "steamgriddb.com/profile/preferences/api",
    required: "Cover art (optional)",
  },
];

const DataPage = () => {
  useDocumentTitle("Data");

  const library = useLibrary();
  // A real record from this deployment beats a hand-written example — it can
  // never drift out of date with what the feed actually serves.
  const sample = library.status === "ready" ? library.games[0] : undefined;

  return (
    <div className="flex max-w-3xl flex-col gap-10">
      <section>
        <h1 className="font-display text-3xl text-foreground">Using the data</h1>
        <p className="mt-3 text-muted">
          This site is a front end over a static JSON file it also publishes. Everything you can see
          here, another app can read — no key, no rate limit, no server.
        </p>
      </section>

      <section aria-labelledby="endpoint-heading">
        <h2 id="endpoint-heading" className="font-display text-lg text-foreground">
          The endpoint
        </h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          GitHub Pages serves it with <code>Access-Control-Allow-Origin: *</code>, so a browser can
          fetch it cross-origin. (<code>raw.githubusercontent.com</code> does not — use this URL,
          not the raw file.)
        </p>
        <CodeBlock code={FEED_URL} label="the feed URL" />

        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-lg border border-divider bg-raised p-3">
            <dt className="font-medium text-foreground">
              <code>data/games.json</code>
            </dt>
            <dd className="mt-1 text-muted">
              The current library: <code>PlayedGame[]</code>, both sources merged, newest first.
            </dd>
          </div>
          <div className="rounded-lg border border-divider bg-raised p-3">
            <dt className="font-medium text-foreground">
              <code>data/meta.json</code>
            </dt>
            <dd className="mt-1 text-muted">
              <code>collectedAt</code>, <code>gameCount</code>, and which sources contributed. The
              timestamp moves only when the data actually changed, so it reads as &ldquo;current as
              of&rdquo; rather than &ldquo;a script ran&rdquo;.
            </dd>
          </div>
          <div className="rounded-lg border border-divider bg-raised p-3">
            <dt className="font-medium text-foreground">
              <code>data/history/&lt;date&gt;.json</code>
            </dt>
            <dd className="mt-1 text-muted">
              A dated snapshot, written only on the days the data actually changed.
            </dd>
          </div>
          <div className="rounded-lg border border-divider bg-raised p-3">
            <dt className="font-medium text-foreground">
              <code>images/…</code>
            </dt>
            <dd className="mt-1 text-muted">
              The art library. Every image URL in the feed is absolute and points here, so{" "}
              <code>&lt;img src={"{game.coverUrl}"}&gt;</code> needs no rewriting.
            </dd>
          </div>
          <div className="rounded-lg border border-divider bg-raised p-3">
            <dt className="font-medium text-foreground">Caching</dt>
            <dd className="mt-1 text-muted">
              Art is never overwritten once collected, so an image URL always returns the same bytes
              and is safe to cache hard.
            </dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="fetch-heading">
        <h2 id="fetch-heading" className="font-display text-lg text-foreground">
          Fetching it
        </h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          There is no client library and no pagination — it is one array.
        </p>
        <CodeBlock code={FETCH_EXAMPLE} label="the fetch example" language="typescript" />
      </section>

      <section aria-labelledby="shape-heading">
        <h2 id="shape-heading" className="font-display text-lg text-foreground">
          The shape
        </h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          Copy <code>src/types/index.ts</code> into your project — it has no imports, and it is the
          same file the collector writes against, so the two cannot drift.
        </p>
        <CodeBlock code={TYPE_EXAMPLE} label="the PlayedGame type" language="typescript" />

        {sample && (
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-medium text-foreground">
              A live record from this feed
            </h3>
            <CodeBlock
              code={JSON.stringify(
                { ...sample, recentAchievements: sample.recentAchievements.slice(0, 1) },
                null,
                2,
              )}
              label="the sample record"
              language="json"
            />
            <p className="mt-2 text-xs text-muted">
              Trimmed to one achievement for length; the feed carries up to four per game.
            </p>
          </div>
        )}
      </section>

      <section aria-labelledby="upstream-heading">
        <h2 id="upstream-heading" className="font-display text-lg text-foreground">
          What it depends on
        </h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          A feed is only as stable as the APIs behind it. Versioned endpoints announce a change by
          moving to a new path; the unversioned ones can change shape without warning, and are the
          parts most likely to need attention someday.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-divider text-xs uppercase tracking-widest text-muted">
                <th scope="col" className="py-2 pr-4 font-medium">
                  Endpoint
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Version
                </th>
                <th scope="col" className="py-2 font-medium">
                  Provides
                </th>
              </tr>
            </thead>
            <tbody>
              {UPSTREAM.map((api) => (
                <tr key={api.name} className="border-b border-divider align-top">
                  <td className="py-2 pr-4 text-foreground">{api.name}</td>
                  <td className="py-2 pr-4 whitespace-nowrap text-muted">{api.version}</td>
                  <td className="py-2 text-muted">{api.provides}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-sm text-muted">
          Image hosts (<code>media.retroachievements.org</code>, <code>media.steampowered.com</code>
          , <code>shared.cloudflare.steamstatic.com</code>) carry no version either, but each file
          is fetched once and kept, so an outage costs new art only — nothing already published
          moves.
        </p>
      </section>

      <section aria-labelledby="own-heading">
        <h2 id="own-heading" className="font-display text-lg text-foreground">
          Running your own
        </h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          This repository is a template. Fork it, set credentials for whichever sources you use, and
          a workflow collects daily and republishes this site with your library in it.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-divider text-xs uppercase tracking-widest text-muted">
                <th scope="col" className="py-2 pr-4 font-medium">
                  Variable
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Needed for
                </th>
                <th scope="col" className="py-2 font-medium">
                  Where it comes from
                </th>
              </tr>
            </thead>
            <tbody>
              {ENV_VARS.map((variable) => (
                <tr key={variable.name} className="border-b border-divider align-top">
                  <td className="py-2 pr-4">
                    <code className="text-foreground">{variable.name}</code>
                  </td>
                  <td className="py-2 pr-4 text-muted">{variable.required}</td>
                  <td className="py-2 text-muted">{variable.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-sm text-muted">
          Locally they come from your environment; in Actions they come from repository secrets of
          the same names. Your Steam profile <em>and</em> its &ldquo;Game details&rdquo; must both
          be public — with a private profile the API answers success with zero games.
        </p>

        <p className="mt-4 text-sm text-muted">
          <a
            href={SITE_ROOT}
            className="inline-flex items-center gap-1.5 font-medium text-accent hover:text-accent-hover"
          >
            Browse the published files
            <Icon name="external" className="h-3.5 w-3.5" />
          </a>
        </p>
      </section>

      <section aria-labelledby="built-heading">
        <h2 id="built-heading" className="font-display text-lg text-foreground">
          How this site is built
        </h2>
        <p className="mt-1 text-sm text-muted">
          Two halves in one repository. The collector is Node run by <code>tsx</code>, and writes
          the files above. The front end is React 19, Vite and Tailwind v4
          {SCAFFOLD ? (
            <>
              , scaffolded from{" "}
              <a
                href={SCAFFOLD.url}
                className="inline-flex items-center gap-1 font-medium text-accent hover:text-accent-hover"
              >
                {SCAFFOLD.name}
                <Icon name="external" className="h-3.5 w-3.5" />
              </a>{" "}
              — which is where the semantic colour tokens, the accessibility baseline and the verify
              pipeline come from, if you want the same starting point without the game data.
            </>
          ) : (
            "."
          )}
        </p>
        <p className="mt-3 text-sm text-muted">
          Both halves import <code>src/types/index.ts</code>, so the shape written by the collector
          and the shape rendered here cannot drift apart.
        </p>
      </section>
    </div>
  );
};

export default DataPage;
