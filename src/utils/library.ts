import { SHOW_PLAYTIME } from "../config/env";
import type { PlayedGame, SortKey, SourceFilter } from "../types";

/**
 * The library's sort orders. Declared once, in the order they appear in the
 * control, and keyed by the value that goes in the URL.
 */
export const SORTS: Record<
  SortKey,
  { label: string; compare: (a: PlayedGame, b: PlayedGame) => number }
> = {
  recent: {
    label: "Recently played",
    compare: (a, b) => b.lastPlayedAt.localeCompare(a.lastPlayedAt),
  },
  playtime: {
    label: "Most played",
    compare: (a, b) => (b.playtimeMinutes ?? 0) - (a.playtimeMinutes ?? 0),
  },
  completion: {
    label: "Most complete",
    compare: (a, b) => b.completionPct - a.completionPct || b.earnedCount - a.earnedCount,
  },
  title: {
    label: "Title (A–Z)",
    compare: (a, b) => a.title.localeCompare(b.title),
  },
};

/**
 * The orders actually offered. "Most played" disappears with the playtime
 * setting — a sort whose column is hidden everywhere else would reorder the
 * grid by an invisible value.
 */
export const SORT_KEYS = (Object.keys(SORTS) as SortKey[]).filter(
  (key) => key !== "playtime" || SHOW_PLAYTIME,
);

/**
 * Checked against the offered list rather than the full one, so a link to
 * `?sort=playtime` saved before playtime was hidden falls back to the default
 * instead of silently applying a sort with no visible basis.
 */
export const isSortKey = (value: string | null): value is SortKey =>
  value !== null && SORT_KEYS.includes(value as SortKey);

export const isSourceFilter = (value: string | null): value is SourceFilter =>
  value === "all" || value === "steam" || value === "retroachievements";

export interface LibraryQuery {
  search: string;
  source: SourceFilter;
  platform: string;
  sort: SortKey;
}

/** Every platform present, alphabetically, for the platform control. */
export const platformsOf = (games: PlayedGame[]) =>
  [...new Set(games.map((game) => game.platform))].sort((a, b) => a.localeCompare(b));

/**
 * Filters then sorts. Kept out of the component so the page body is layout
 * only, and so the ordering rules are testable on their own.
 */
export const selectGames = (games: PlayedGame[], query: LibraryQuery): PlayedGame[] => {
  const needle = query.search.trim().toLowerCase();

  const matched = games.filter((game) => {
    if (query.source !== "all" && game.source !== query.source) return false;
    if (query.platform !== "all" && game.platform !== query.platform) return false;
    if (!needle) return true;
    return (
      game.title.toLowerCase().includes(needle) || game.platform.toLowerCase().includes(needle)
    );
  });

  // `filter` already copied the array, so this sorts nothing the caller owns.
  return matched.sort(SORTS[query.sort].compare);
};
