/**
 * @file collector/lib/steamgriddb.ts
 * @description Looks up 600x900 poster art — the one source that covers both
 * Steam and emulated console games, so both halves of the library get art in an
 * identical format.
 *
 * Needs STEAM_GRID_DB_API_KEY (free, from account preferences). Auth is a
 * Bearer header.
 *
 * Note on picking a poster: SteamGridDB's vote fields read zero across the
 * board — voting appears retired — so "top rated" is not available. The API's
 * own ordering is used instead, preferring `alternate`, the standard
 * poster-with-title.
 */

import { createJsonClient } from "./http";

const BASE = "https://www.steamgriddb.com/api/v2";

/** Every grid returned at this size is exactly 2:3. */
const DIMENSIONS = "600x900";

/**
 * Preferred styles, best first. `alternate` carries the game's title, so it
 * stays identifiable at card size; `no_logo` sorts last for that reason.
 */
const STYLE_RANK = ["alternate", "material", "white_logo", "blurred", "no_logo"];

/**
 * Titles whose name search resolves to the wrong entry. Name search is
 * inherently fuzzy, and franchises with reboots ("God of War") are the likely
 * first failures — map a title to a SteamGridDB game id to pin it.
 */
const TITLE_OVERRIDES: Record<string, number> = {};

interface Grid {
  url: string;
  style?: string;
  nsfw?: boolean;
  humor?: boolean;
}

/** Returns null when no API key is configured, so callers can skip art. */
export const createGridClient = () => {
  const key = process.env.STEAM_GRID_DB_API_KEY;
  if (!key) {
    console.warn("  ~ STEAM_GRID_DB_API_KEY not set; games will have no cover art.");
    return null;
  }

  const call = createJsonClient({
    baseUrl: BASE,
    defaultParams: { dimensions: DIMENSIONS, nsfw: "false", humor: "false" },
    headers: { Authorization: `Bearer ${key}` },
  });

  const pickBest = (grids: Grid[]) => {
    const usable = grids.filter((g) => g.url && !g.nsfw && !g.humor);
    if (usable.length === 0) {
      return undefined;
    }
    const rank = (g: Grid) => {
      const i = STYLE_RANK.indexOf(g.style ?? "");
      return i === -1 ? STYLE_RANK.length : i;
    };
    // Stable sort by style preference; within a style the API's order wins.
    return [...usable].sort((a, b) => rank(a) - rank(b))[0]?.url;
  };

  const gridsFor = async (path: string) => {
    try {
      const raw = (await call(path)) as { data?: Grid[] };
      return pickBest(raw.data ?? []);
    } catch {
      return undefined;
    }
  };

  return {
    /** Poster for a Steam app, matched exactly by appid. */
    bySteamAppId: (appid: string) => gridsFor(`grids/steam/${appid}`),

    /** Poster for a non-Steam game, matched by fuzzy name search. */
    byTitle: async (title: string) => {
      const override = TITLE_OVERRIDES[title];
      if (override) {
        return gridsFor(`grids/game/${override}`);
      }
      try {
        const search = (await call(`search/autocomplete/${encodeURIComponent(title)}`)) as {
          data?: { id: number }[];
        };
        const hit = search.data?.[0];
        return hit ? gridsFor(`grids/game/${hit.id}`) : undefined;
      } catch {
        return undefined;
      }
    },
  };
};

export type GridClient = NonNullable<ReturnType<typeof createGridClient>>;
