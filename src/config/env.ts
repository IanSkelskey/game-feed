/**
 * Build-time configuration. All `VITE_*` env vars are inlined by Vite.
 * Add new entries here rather than reading `import.meta.env` across the app.
 */
export const APP_VERSION = "1.0.0";

export const API_URL = import.meta.env.VITE_API_URL ?? "";

/**
 * Vite's public base path — `/` locally, `/<repo>/` for a GitHub Pages project
 * page. Always ends with a slash, so it concatenates directly with an asset
 * path (`${BASE_PATH}demo-data.json`).
 */
export const BASE_PATH = import.meta.env.BASE_URL;
