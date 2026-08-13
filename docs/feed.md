[← README](../README.md) · [Configuration](configuration.md) · **The feed** · [Development](development.md)

# The feed

The site is a front end over a file it also publishes, so anything on screen is
available to another app.

> The running site documents this too, at `https://<user>.github.io/<repo>/docs`
> — with the URLs already filled in for wherever it is deployed and a live
> record from the actual feed. Prefer it when you have a deployment to point at;
> this page is the version you can read on GitHub before there is one.

## Consuming it

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

[`src/types/index.ts`](../src/types/index.ts) is the contract. It has no
imports, so it can be copied into a consuming project verbatim — and the
collector imports the same file, so the published shape cannot drift from the
declared one. Image fields (`iconUrl`, `coverUrl`, `badgeUrl`) are absolute URLs
onto your own site, so `<img src={game.coverUrl}>` works with no rewriting.

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
