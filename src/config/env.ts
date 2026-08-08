/**
 * Build-time configuration. All `VITE_*` env vars are inlined by Vite.
 * Add new entries here rather than reading `import.meta.env` across the app.
 */
export const APP_VERSION = "1.0.0";

/**
 * What this deployment calls itself: page titles, the header, the footer.
 * Renaming a fork is this one line.
 */
export const SITE_NAME = "My Game Stats";

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
