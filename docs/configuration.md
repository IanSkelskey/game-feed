[← README](../README.md) · **Configuration** · [The feed](feed.md) · [Development](development.md)

# Configuration

[`site.config.ts`](../site.config.ts) at the repo root is the one file you are
expected to edit. Both halves import it, so there is no second place for the
collector and the front end to disagree.

```ts
export const siteConfig: SiteConfig = {
  site: { name: "My Game Stats", author: { … }, scaffold: { … } },
  collect: { gameLimit: 50, fetchCount: 50, achievementsPerGame: 4, playtime: true },
  display: {
    playtime: true,
    docsPage: true,
    overview: { sections: ["stats", "charts", "completion", "recent"], recentCount: 6 },
  },
  text: {},
};
```

The sections answer different questions:

| Section   | Question                                  | Effect                                                   |
| --------- | ----------------------------------------- | -------------------------------------------------------- |
| `collect` | What should end up in the published feed? | Changes `data/games.json` on the next run — for everyone |
| `display` | What should this site show from it?       | Changes this site only; the feed still carries the field |
| `text`    | What should this site call it?            | Wording only; every field optional                       |

`collect.playtime: false` omits `playtimeMinutes` from the feed entirely, so
nothing reading it can show what was never gathered. `display.playtime: false`
keeps collecting but hides it here: the figure on each card and detail page, the
Time played tile, the Most played chart, and the "Most played" sort — which is
also dropped from the sort control, so a saved `?sort=playtime` link falls back
to the default instead of reordering the grid by an invisible value.

Reach for `collect` when the answer is "that is nobody's business", and
`display` when it is "not on my front page".

Everything in `display` and `text` other than `playtime` is optional, so a fork
that merges a newer version of this template keeps working without touching its
own `site.config.ts`.

## Hiding the docs page

`display.docsPage: false` removes `/docs` — the page documenting the feed, its
shape, the upstream APIs and how to run your own. The route is not registered
rather than redirected, so the URL answers with the 404 page; the nav item goes;
and the three places that linked to it (the Overview intro, the sample-data
banner, the "no games collected yet" screen) reword themselves rather than
pointing at a page that isn't there.

It is worth being precise about what this does and doesn't do. It hides the
**documentation**, not the data. `data/games.json` is still published and still
fetchable by anyone with the URL — it has to be, because this site fetches it
from there itself. Hiding the page is about not advertising the feed as a
product other people should build on; if the data itself is the concern, that is
a repository-visibility question, or a `collect` one.

## Arranging the overview

`display.overview.sections` is both the running order and the guest list:

| Name         | What it is                                                      |
| ------------ | --------------------------------------------------------------- |
| `stats`      | The summary tiles — games, time played, achievements, platforms |
| `charts`     | Most played and Where you play, side by side                    |
| `completion` | Progress meters for the games nearest 100%                      |
| `recent`     | The strip of recently played cards                              |

List them in any order; leave one out and it doesn't render. The `<h1>` and its
intro paragraph are not in the list — a page needs a heading first whatever
follows it. `display.overview.recentCount` sets how many cards the strip shows
(6 fills one row at the widest breakpoint).

```ts
// Cards first, then the charts. No completion meters, no tiles.
overview: { sections: ["recent", "charts"], recentCount: 12 },
```

## Changing the wording

`text` overrides the Overview page's copy, one field at a time — each falls back
to the built-in wording on its own, so renaming a heading doesn't oblige you to
restate its description:

```ts
text: {
  overview: { heading: "What I've been playing" },
  platformChart: { heading: "Consoles", description: "" },
},
```

`description: ""` removes the sentence under a heading; omitting the key keeps
the default. Headings are what the page renders _and_ what its landmarks are
labelled by, so a renamed section stays correctly announced — including `stats`,
whose heading is never drawn but names the block for screen readers, since those
tiles can be configured to sit anywhere on the page.

The Overview intro is the one field with two defaults: it normally links the
feed on the docs page, and drops that link by itself when `docsPage` is off.
Setting `text.overview.description` replaces the whole sentence, link included.

## Adding an option

1. Add the field to `SiteConfig` in
   [src/types/index.ts](../src/types/index.ts), with a comment saying what it
   affects.
2. Give it a value in `site.config.ts`.
3. Surface it — `src/config/env.ts` for anything the app renders,
   `collector/config.ts` for anything the collector does. Components read
   `src/config/env.ts` and never the config file directly, so there is one
   import path to grep.

The type is what makes this safe: an unknown key or a wrong value type fails
`npm run typecheck` rather than being silently ignored.
