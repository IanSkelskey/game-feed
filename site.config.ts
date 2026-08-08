/**
 * @file site.config.ts
 * @description Everything you are expected to change. Start here.
 *
 * One file, imported by both halves of the repository: `collector/` reads the
 * `collect` section when it fetches, and the front end reads `site` and
 * `display` when it renders. Because both import the same object there is no
 * second place for the two to disagree.
 *
 * The type is declared in `src/types/index.ts`, so an unknown key or a wrong
 * value type fails `npm run typecheck` rather than silently doing nothing.
 *
 * ── Adding an option ────────────────────────────────────────────────────────
 * 1. Add the field to `SiteConfig` in `src/types/index.ts`, with a comment
 *    saying what it affects.
 * 2. Give it a value here.
 * 3. Surface it: `src/config/env.ts` for anything the app renders, or
 *    `collector/config.ts` for anything the collector does. Components read
 *    `src/config/env.ts`, never this file directly — one import path to grep.
 */

import type { SiteConfig } from "./src/types";

export const siteConfig: SiteConfig = {
  site: {
    name: "My Game Stats",
    author: {
      name: "Ian Skelskey",
      url: "https://github.com/IanSkelskey",
    },
    // Delete this key to drop the scaffold credit from the footer and /data.
    scaffold: {
      name: "react-ts-starter",
      url: "https://github.com/IanSkelskey/react-ts-starter",
    },
  },

  collect: {
    gameLimit: 50,
    fetchCount: 50,
    achievementsPerGame: 4,
    playtime: true,
  },

  display: {
    playtime: true,
  },
};

export default siteConfig;
