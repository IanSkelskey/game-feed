[← README](../README.md) · [Configuration](configuration.md) · [The feed](feed.md) · **Development**

# Development

```bash
npm install
npm run dev          # the site, on the sample data
```

To collect for real, credentials come from your environment — no `.env` file,
because these are real secrets and `VITE_*` variables end up in the client
bundle (see [SECURITY.md](../SECURITY.md)). On Windows the collector also reads
them straight from the registry, so a terminal opened before you set them still
works without a restart:

```powershell
setx STEAM_API_KEY               "..."
setx STEAM_ID                    "..."
setx RETRO_ACHIEVEMENTS_USERNAME "..."
setx RETRO_ACHIEVEMENTS_API_KEY  "..."
setx STEAM_GRID_DB_API_KEY       "..."

npm run collect
```

macOS and Linux: `export` the same names, or prefix a single run.

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
`images/` onto the current origin ([src/utils/art.ts](../src/utils/art.ts)).
Covers therefore appear locally the moment you collect, long before the first
deploy.

## How it is put together

```
collector/            # Node, run by tsx — writes data/ and images/
├── collect.ts        # entry point: run each source, merge, write
├── config.ts         # limits, and the published base URL
├── lib/              # http, the art library, SteamGridDB, Windows env
└── sources/          # steam.ts, retroachievements.ts
src/                  # React app — reads data/games.json
├── pages/            # Overview, Library, Game, Docs
├── components/       # cards, charts, meters, the icon choke point
├── types/index.ts    # the shared contract (collector + app)
└── utils/            # formatting, filtering, aggregation
data/, images/        # the collector's output — committed, and published
```

`data/` and `images/` sit at the repo root rather than in `public/` because they
are output, not source: the collect workflow replaces them wholesale, and they
are meaningful on their own as a feed. The `collected-data` plugin in
[vite.config.ts](../vite.config.ts) serves them in dev and copies them into
`dist/` at build, so both halves ship as one site.

## Scripts

| Script              | Purpose                                                              |
| ------------------- | -------------------------------------------------------------------- |
| `npm run dev`       | Start the Vite dev server.                                           |
| `npm run collect`   | Fetch from every configured source; write `data/` and `images/`.     |
| `npm run build`     | Type-check and produce a production build.                           |
| `npm run preview`   | Preview the production build locally. **Audit this, not `dev`.**     |
| `npm run lint`      | Run ESLint.                                                          |
| `npm run typecheck` | Run `tsc -b --noEmit` across the app, the collector, and the config. |
| `npm run verify`    | Prettier-check → lint → typecheck → build. Must pass before merge.   |

## Workflows

| Workflow      | When                                  | What                                                 |
| ------------- | ------------------------------------- | ---------------------------------------------------- |
| `collect.yml` | Daily at 07:23 UTC, or on demand      | Collect → commit and tag if changed → build → deploy |
| `deploy.yml`  | Push to `main` (ignoring data/images) | Build → deploy                                       |
| `ci.yml`      | Push and PR                           | `npm run verify`                                     |

Both deploy jobs derive `BASE_PATH` from the repository name — `/repo/` for a
project page, `/` for a `<user>.github.io` user page — so neither needs editing.
The collector derives the matching absolute URL for image links the same way.
For a custom domain, set `SITE_BASE` and `BASE_PATH` explicitly.

Deep links survive a hard refresh via the
[rafgraph SPA redirect trick](https://github.com/rafgraph/spa-github-pages):
`dist/404.html` is generated at build time with the resolved base baked in, and
a small inline script in [index.html](../index.html) decodes the path before
React boots.

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

## Conventions

Front-end conventions are documented in
[.github/copilot-instructions.md](../.github/copilot-instructions.md) — semantic
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

Adding a new setting to `site.config.ts` has its own short checklist, in
[configuration.md](configuration.md#adding-an-option).
