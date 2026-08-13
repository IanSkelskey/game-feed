/**
 * Build-time configuration: `VITE_*` env vars, which Vite inlines, plus the
 * settings the app renders from.
 *
 * Preferences are not defined here — they come from `site.config.ts` at the
 * repo root, which the collector reads too. This file is the app's single
 * import path for both, so components never reach past it into either
 * `import.meta.env` or the config file.
 */
import { siteConfig } from "../../site.config";
import type { OverviewSection } from "../types";

export const APP_VERSION = "1.0.0";

/** What this deployment calls itself: page titles, the header, the footer. */
export const SITE_NAME = siteConfig.site.name;

/** Footer attribution. */
export const AUTHOR_NAME = siteConfig.site.author.name;
export const AUTHOR_URL = siteConfig.site.author.url;

/**
 * The template this front end was scaffolded from — the semantic colour
 * tokens, the accessibility baseline and the verify pipeline are its work, and
 * anyone reading the code deserves the pointer. Undefined when a fork has
 * removed the credit, in which case nothing renders in its place.
 */
export const SCAFFOLD = siteConfig.site.scaffold;

/**
 * Whether the app renders playtime at all. Separate from whether playtime was
 * collected: a feed can carry `playtimeMinutes` that this site chooses not to
 * show, and the components handle its absence either way.
 */
export const SHOW_PLAYTIME = siteConfig.display.playtime;

/**
 * Whether the /docs page exists in this deployment. Read by the router, which
 * simply does not register the route when it is false, and by the handful of
 * places that would otherwise link to a page that isn't there.
 *
 * Defaults to true: a template whose own documentation is off by default would
 * be a strange thing to hand someone.
 */
export const SHOW_DOCS_PAGE = siteConfig.display.docsPage ?? true;

/** Every Overview block, in the order the page shows them by default. */
const DEFAULT_SECTIONS: OverviewSection[] = ["stats", "charts", "completion", "recent"];

/**
 * The Overview page's running order. Deduplicated because a section listed
 * twice would render its headings — and therefore its ids — twice, which
 * breaks the `aria-labelledby` references pointing at them.
 */
export const OVERVIEW_SECTIONS: OverviewSection[] = [
  ...new Set(siteConfig.display.overview?.sections ?? DEFAULT_SECTIONS),
];

/** How many cards the "recently played" strip shows before deferring to the library. */
export const RECENT_COUNT = siteConfig.display.overview?.recentCount ?? 6;

const text = siteConfig.text ?? {};

/**
 * The Overview page's copy, with the built-in wording filled in behind
 * whatever a fork overrode.
 *
 * Resolved with `??` on each field rather than on a truthy check, so `""` is
 * honoured as "no sentence here" instead of quietly restoring the default.
 * `overview.description` is deliberately left possibly-undefined: its default
 * is markup rather than a string — it links the feed — so only the page itself
 * can build it.
 */
export const TEXT = {
  overview: {
    heading: text.overview?.heading ?? "Overview",
    description: text.overview?.description,
  },
  stats: {
    heading: text.stats?.heading ?? "At a glance",
    description: text.stats?.description ?? "",
  },
  playtimeChart: {
    heading: text.playtimeChart?.heading ?? "Most played",
    description:
      text.playtimeChart?.description ??
      "Hours recorded by Steam. Emulated games are absent by nature — no emulator reports playtime back.",
  },
  platformChart: {
    heading: text.platformChart?.heading ?? "Where you play",
    description:
      text.platformChart?.description ??
      "Games in the library per platform, counting each console separately.",
  },
  completion: {
    heading: text.completion?.heading ?? "Closest to complete",
    description: text.completion?.description ?? "",
  },
  recent: {
    heading: text.recent?.heading ?? "Recently played",
    description: text.recent?.description ?? "",
  },
};

/**
 * Vite's public base path — `/` locally, `/<repo>/` for a GitHub Pages project
 * page. Always ends with a slash, so it concatenates directly with an asset
 * path (`${BASE_PATH}data/games.json`).
 */
export const BASE_PATH = import.meta.env.BASE_URL;

/**
 * Where the library is read from.
 *
 * Defaults to this site's own copy: `npm run collect` writes `data/games.json`
 * at the repo root, and the `collected-data` plugin in `vite.config.ts` serves
 * it in dev and copies it into `dist/` at build.
 *
 * Point `VITE_DATA_URL` at another deployment's feed to render someone else's
 * library — the same thing any external consumer would do, so the app is its
 * own worked example.
 */
export const DATA_URL = import.meta.env.VITE_DATA_URL || `${BASE_PATH}data/games.json`;
