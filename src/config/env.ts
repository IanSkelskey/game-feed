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
