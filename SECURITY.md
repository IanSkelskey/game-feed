# Security

This is a template for a personal, static site. It has no server, no database
and no user accounts — but it does handle API keys, and it publishes a file
about you on purpose. Both are worth being deliberate about.

## Credentials

Collector credentials are **never** committed and never reach the browser.

- **Locally** they come from your shell environment. There is no `.env` file for
  them, and adding one would be a mistake: Vite inlines `VITE_*` variables into
  the client bundle at build time, so anything named that way is published.
  [`.env.example`](.env.example) carries only `VITE_DATA_URL`, which is a public
  URL by nature.
- **In Actions** they come from repository secrets of the same names, read by
  the collect workflow and never echoed. `.gitignore` covers `.env*` files.

If a key does end up committed, treat it as burned: revoke and reissue it at the
source rather than only rewriting history. Steam keys are revoked at
[steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey),
RetroAchievements keys under
[account settings](https://retroachievements.org/settings), SteamGridDB keys in
[profile preferences](https://www.steamgriddb.com/profile/preferences/api).

Workflows run with least privilege: `ci.yml` gets `contents: read`, `deploy.yml`
adds only what Pages needs, and `collect.yml` is the sole workflow with
`contents: write`, because it commits the collection.

## What is public

Everything under `data/` and `images/` is committed to the repository and served
by GitHub Pages. That is the point of the project, but be clear-eyed about what
it means: the feed records what you played and when, at daily resolution, going
back as far as `data/history/` does — for anyone who reads it, not only for
people who visit the site.

Two levers, and they are not equivalent:

- [`collect`](docs/configuration.md) decides what is gathered at all.
  `collect.playtime: false` keeps `playtimeMinutes` out of the published file
  entirely, so nothing downstream can show what was never collected.
- `display` decides only what this site renders. Hiding something there —
  including [the whole docs page](docs/configuration.md#hiding-the-docs-page) —
  leaves it in the feed and still fetchable by URL.

If the data itself should not be public, that is a repository-visibility
decision or a `collect` one. It is not a `display` one.

Collection also requires your Steam profile **and** its "Game details" to be
public. That is a visibility choice on Steam's side, made before this project
sees anything.

## Reporting a problem

Found something wrong in the template itself — a leaked value in a workflow, a
dependency advisory, a way the collector could write somewhere it shouldn't?
Open a
[security advisory](https://github.com/IanSkelskey/game-feed/security/advisories/new)
rather than a public issue.

Forks: this file names the upstream repository. Point it at your own, or at
yourself, so the report reaches whoever can actually fix it.
