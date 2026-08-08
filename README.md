# My Game Stats

<!--
  Badge URLs are repository-specific — GitHub has no relative form for them.
  After using this template, replace `IanSkelskey/game-feed` in the three
  lines below with your own owner/repository.
-->

[![CI](https://github.com/IanSkelskey/game-feed/actions/workflows/ci.yml/badge.svg)](https://github.com/IanSkelskey/game-feed/actions/workflows/ci.yml)
[![Collect and publish](https://github.com/IanSkelskey/game-feed/actions/workflows/collect.yml/badge.svg)](https://github.com/IanSkelskey/game-feed/actions/workflows/collect.yml)
[![Deploy](https://github.com/IanSkelskey/game-feed/actions/workflows/deploy.yml/badge.svg)](https://github.com/IanSkelskey/game-feed/actions/workflows/deploy.yml)

A template for publishing your own gaming history. It collects what you have
been playing from **Steam** and **RetroAchievements**, keeps its own copy of the
cover art and achievement badges, and publishes the lot as a browsable site
**and** a static JSON feed any other app can read.

Everything runs on GitHub: a scheduled Action collects, commits, and deploys.
There is no server, no database, and no key to hand out.

```
┌──────────────┐   npm run collect   ┌───────────────┐   npm run build   ┌────────────┐
│ Steam APIs   │────────────────────▶│ data/         │──────────────────▶│ GitHub     │
│ RetroAchieve │                     │ images/       │                   │ Pages      │
│ SteamGridDB  │                     │ (committed)   │                   │ site+feed  │
└──────────────┘                     └───────────────┘                   └────────────┘
```

## Quick start

1. **Use this template** to make your own repository.
2. **Settings → Pages → Source: GitHub Actions.**
3. **Settings → Secrets and variables → Actions**, and add secrets for whichever
   sources you want. Each source is independent — set only Steam, only
   RetroAchievements, or both.

   | Secret                                                      | Needed for           | Where it comes from                                                                    |
   | ----------------------------------------------------------- | -------------------- | -------------------------------------------------------------------------------------- |
   | `STEAM_API_KEY`                                             | Steam                | [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey)                 |
   | `STEAM_ID`                                                  | Steam                | Your 64-bit SteamID, or the vanity name from your profile URL — both work              |
   | `RETRO_ACHIEVEMENTS_USERNAME`, `RETRO_ACHIEVEMENTS_API_KEY` | RetroAchievements    | [retroachievements.org/settings](https://retroachievements.org/settings) → Web API Key |
   | `STEAM_GRID_DB_API_KEY`                                     | Cover art (optional) | [SteamGridDB preferences](https://www.steamgriddb.com/profile/preferences/api)         |

4. **Actions → Collect and publish → Run workflow.** After it finishes your site
   is live at `https://<user>.github.io/<repo>/`, with the feed at
   `…/data/games.json`.

Two gotchas, both Steam's:

- Your profile **and** its "Game details" must both be Public. With a valid key
  but a private profile the API returns success with zero games.
- Without `STEAM_GRID_DB_API_KEY` everything still collects; emulated games just
  have no cover art. Steam games use Steam's own capsule art either way.

## Configuration

[`site.config.ts`](site.config.ts) at the repo root is the one file you are
expected to edit. Both halves import it, so there is no second place for the
collector and the front end to disagree.

```ts
export const siteConfig: SiteConfig = {
  site: { name: "My Game Stats", author: { … }, scaffold: { … } },
  collect: { gameLimit: 50, fetchCount: 50, achievementsPerGame: 4, playtime: true },
  display: { playtime: true },
};
```

The two sections answer different questions:

| Section   | Question                                  | Effect                                                   |
| --------- | ----------------------------------------- | -------------------------------------------------------- |
| `collect` | What should end up in the published feed? | Changes `data/games.json` on the next run — for everyone |
| `display` | What should this site show from it?       | Changes this site only; the feed still carries the field |

`collect.playtime: false` omits `playtimeMinutes` from the feed entirely, so
nothing reading it can show what was never gathered. `display.playtime: false`
keeps collecting but hides it here: the figure on each card and detail page, the
Time played tile, the Most played chart, and the "Most played" sort — which is
also dropped from the sort control, so a saved `?sort=playtime` link falls back
to the default instead of reordering the grid by an invisible value.

Reach for `collect` when the answer is "that is nobody's business", and
`display` when it is "not on my front page".

### Adding an option

1. Add the field to `SiteConfig` in [src/types/index.ts](src/types/index.ts),
   with a comment saying what it affects.
2. Give it a value in `site.config.ts`.
3. Surface it — `src/config/env.ts` for anything the app renders,
   `collector/config.ts` for anything the collector does. Components read
   `src/config/env.ts` and never the config file directly, so there is one
   import path to grep.

The type is what makes this safe: an unknown key or a wrong value type fails
`npm run typecheck` rather than being silently ignored.

## The sample data

`public/sample-games.json` is a small **sample library** the app falls back to
when nothing has been collected yet, so a fresh fork renders a real-looking site
on its first `npm run dev`. Its image URLs point at the original CDNs rather
than at this repository, and a banner across the top says it is sample data.

The collector never writes that file — it writes `data/games.json` — so the
fallback survives however many times you collect. As soon as a collection
exists it wins, the banner disappears, and nothing needs deleting.

### A note on image URLs

The feed stores **absolute** image URLs, so another app can render
`game.coverUrl` with no rewriting. Those URLs name your published site, which
does not exist yet on a fresh fork — so the app rewrites anything under its own
`images/` onto the current origin ([src/utils/art.ts](src/utils/art.ts)). Covers
therefore appear locally the moment you collect, long before the first deploy.

## Running it locally

```bash
npm install
npm run dev          # the site, on the sample data
```

To collect for real, credentials come from your environment — no `.env` file,
because these are real secrets and `VITE_*` variables end up in the client
bundle. On Windows the collector also reads them straight from the registry, so
a terminal opened before you set them still works without a restart:

```powershell
setx STEAM_API_KEY               "..."
setx STEAM_ID                    "..."
setx RETRO_ACHIEVEMENTS_USERNAME "..."
setx RETRO_ACHIEVEMENTS_API_KEY  "..."
setx STEAM_GRID_DB_API_KEY       "..."

npm run collect
```

macOS and Linux: `export` the same names, or prefix a single run.

## Consuming the feed

The site is a front end over a file it also publishes, so anything on screen is
available to another app:

```ts
const games = await fetch("https://<user>.github.io/<repo>/data/games.json").then((response) =>
  response.json(),
);
```

GitHub Pages serves `Access-Control-Allow-Origin: *`, so this works from a
browser. `raw.githubusercontent.com` does not — use the Pages URL.

| Path                             | What it is                                                  |
| -------------------------------- | ----------------------------------------------------------- |
| `data/games.json`                | `PlayedGame[]`, both sources merged, newest first           |
| `data/meta.json`                 | `FeedMeta` — when the data last changed, and how many games |
| `data/history/<YYYY-MM-DD>.json` | A dated snapshot, written when the data changed             |
| `images/…`                       | The art library                                             |

[`src/types/index.ts`](src/types/index.ts) is the contract. It has no imports,
so it can be copied into a consuming project verbatim — and the collector
imports the same file, so the published shape cannot drift from the declared
one. Image fields (`iconUrl`, `coverUrl`, `badgeUrl`) are absolute URLs onto
your own site, so `<img src={game.coverUrl}>` works with no rewriting.

The `/data` route on the running site says all of this too, with the URLs
already filled in for wherever it is deployed.

## The image library

```
images/{covers,icons,badges}/{steam,retroachievements}/<id>.<ext>
```

Append-only, on two rules:

- **Never re-downloaded.** A file already on disk is never fetched again, so a
  daily run costs one request per genuinely new image.
- **Never overwritten.** Art collected once stays forever, even after the game
  drops out of the recently-played window. A published URL always points at the
  same bytes, so it is safe to cache hard.

Extensions vary by source (RetroAchievements serves PNG, Steam JPG), which is
why the JSON carries full URLs rather than ids to interpolate.

## Upstream APIs

Everything the collector depends on, and which version of it. Nothing here is
vendored or wrapped in a client library — these are plain `fetch` calls, so a
breaking change upstream shows up as a failed collection rather than a silent
one.

### Steam Web API — `api.steampowered.com`

Needs `STEAM_API_KEY`. Each endpoint carries its version in the path, so a
future revision arrives as a new path rather than a changed response.

| Endpoint                                | Version | Provides                                                       |
| --------------------------------------- | ------- | -------------------------------------------------------------- |
| `ISteamUser/ResolveVanityURL`           | **v1**  | Vanity name → 64-bit SteamID, so `STEAM_ID` accepts either     |
| `IPlayerService/GetOwnedGames`          | **v1**  | Titles, icon hashes, playtime, last-played timestamps          |
| `ISteamUserStats/GetPlayerAchievements` | **v1**  | Which achievements this account has unlocked                   |
| `ISteamUserStats/GetSchemaForGame`      | **v2**  | The achievements a game _defines_ — names, descriptions, icons |
| `IStoreBrowseService/GetItems`          | **v1**  | Library-capsule art paths, batched 25 appids at a time         |

`GetSchemaForGame` is the authority on whether a game has achievements at all.
`GetPlayerAchievements` cannot answer that — it returns 400 both for a game with
no achievements and for one this account has never generated stats for, which is
why `achievementSupport` is derived from the schema instead.

### Unversioned dependencies

These have no version in the path, so they can change shape without warning.
They are the parts most likely to need attention someday:

| Dependency                                                                                   | Provides                           | Notes                                                                                            |
| -------------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------ |
| `store.steampowered.com/api/appdetails`                                                      | Steam product type (game vs. tool) | Undocumented storefront endpoint, no key. Failure is tolerated — a game is kept rather than lost |
| `retroachievements.org/API/API_*.php`                                                        | Recently played, per-game progress | RetroAchievements' Web API is unversioned PHP endpoints                                          |
| `media.retroachievements.org`, `media.steampowered.com`, `shared.cloudflare.steamstatic.com` | Icons, badges, capsule art         | Image hosts. Fetched once and cached locally, so an outage costs new art only                    |

### SteamGridDB — `steamgriddb.com/api/v2`

**v2**, optional (`STEAM_GRID_DB_API_KEY`). Supplies 600×900 poster art for
emulated games and for the few Steam titles that publish no capsule. Without the
key everything still collects; those games simply have no cover.

## How it is put together

```
collector/            # Node, run by tsx — writes data/ and images/
├── collect.ts        # entry point: run each source, merge, write
├── config.ts         # limits, and the published base URL
├── lib/              # http, the art library, SteamGridDB, Windows env
└── sources/          # steam.ts, retroachievements.ts
src/                  # React app — reads data/games.json
├── pages/            # Overview, Library, Game, Data
├── components/       # cards, charts, meters, the icon choke point
├── types/index.ts    # the shared contract (collector + app)
└── utils/            # formatting, filtering, aggregation
data/, images/        # the collector's output — committed, and published
```

`data/` and `images/` sit at the repo root rather than in `public/` because they
are output, not source: the collect workflow replaces them wholesale, and they
are meaningful on their own as a feed. The `collected-data` plugin in
[vite.config.ts](vite.config.ts) serves them in dev and copies them into
`dist/` at build, so both halves ship as one site.

### Scripts

| Script              | Purpose                                                              |
| ------------------- | -------------------------------------------------------------------- |
| `npm run dev`       | Start the Vite dev server.                                           |
| `npm run collect`   | Fetch from every configured source; write `data/` and `images/`.     |
| `npm run build`     | Type-check and produce a production build.                           |
| `npm run preview`   | Preview the production build locally. **Audit this, not `dev`.**     |
| `npm run lint`      | Run ESLint.                                                          |
| `npm run typecheck` | Run `tsc -b --noEmit` across the app, the collector, and the config. |
| `npm run verify`    | Prettier-check → lint → typecheck → build. Must pass before merge.   |

### Workflows

| Workflow      | When                                  | What                                                 |
| ------------- | ------------------------------------- | ---------------------------------------------------- |
| `collect.yml` | Daily at 07:23 UTC, or on demand      | Collect → commit and tag if changed → build → deploy |
| `deploy.yml`  | Push to `main` (ignoring data/images) | Build → deploy                                       |
| `ci.yml`      | Push and PR                           | `npm run verify`                                     |

### Why the template never collects

`collect.yml` guards its job with

```yaml
if: >-
  github.repository != 'IanSkelskey/game-feed' &&
  github.event.repository.is_template != true
```

The template has no library to collect, so an unguarded daily cron would post a
failing run every morning. A copy made with **Use this template** has a
different `github.repository`, so it starts collecting with nothing to edit.

Worth knowing: GitHub disables scheduled workflows in **forks**, but a template
copy is not a fork — its schedule runs from day one. That is why the guard is
explicit rather than left to GitHub.

If you keep this repository as a template _and_ want it to collect your own
library, delete the `if:` block. If you would rather not touch the workflow at
all, **Actions → Collect and publish → ⋯ → Disable workflow** does the same
thing from the UI, though that setting lives on the repository rather than in
the files a copy inherits.

Both deploy jobs derive `BASE_PATH` from the repository name — `/repo/` for a
project page, `/` for a `<user>.github.io` user page — so neither needs editing.
The collector derives the matching absolute URL for image links the same way.
For a custom domain, set `SITE_BASE` and `BASE_PATH` explicitly.

Deep links survive a hard refresh via the
[rafgraph SPA redirect trick](https://github.com/rafgraph/spa-github-pages):
`dist/404.html` is generated at build time with the resolved base baked in, and
a small inline script in [index.html](index.html) decodes the path before React
boots.

## Conventions

Front-end conventions are documented in
[.github/copilot-instructions.md](.github/copilot-instructions.md) — semantic
color tokens (never raw palette classes, never `dark:` variants), the icon
choke point, accessibility rules, and the quality gates. Run `npm run verify`
before committing.

Most of those conventions are not this repository's own: the front end was
scaffolded from
[react-ts-starter](https://github.com/IanSkelskey/react-ts-starter), which is
where the token system, the accessibility baseline, the lazy-route shell and the
`prettier → lint → typecheck → build` pipeline come from. Start there if you
want the same foundation without the game data; start here if you want the game
data too.

## License

MIT — see [LICENSE](LICENSE). Game titles, cover art, and achievement badges
belong to their respective publishers; this repository only caches them for
personal display.
