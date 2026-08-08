import type { PlayedGame } from "../types";

/** One row of a magnitude chart: a label, its value, and a fuller detail line. */
export interface Magnitude {
  key: string;
  label: string;
  value: number;
  /** Shown on hover/focus — the precision the bar itself rounds away. */
  detail: string;
}

export interface LibrarySummary {
  gameCount: number;
  totalMinutes: number;
  /** Achievements earned across the library, and how many exist to earn. */
  earned: number;
  possible: number;
  platformCount: number;
  lastPlayedAt?: string;
  playtimeLeaders: Magnitude[];
  platformCounts: Magnitude[];
  /** Games nearest to 100%, for the completion meters. */
  completionLeaders: PlayedGame[];
}

/** Bars past this point stop being readable; the tail folds into "Other". */
const MAX_BARS = 8;

const byValueDesc = (a: Magnitude, b: Magnitude) => b.value - a.value;

const platformRows = (games: PlayedGame[]): Magnitude[] => {
  const counts = new Map<string, number>();
  for (const game of games) {
    counts.set(game.platform, (counts.get(game.platform) ?? 0) + 1);
  }

  const rows: Magnitude[] = [...counts].map(([platform, count]) => ({
    key: platform,
    label: platform,
    value: count,
    detail: `${count} ${count === 1 ? "game" : "games"} on ${platform}`,
  }));
  rows.sort(byValueDesc);

  if (rows.length <= MAX_BARS) return rows;

  // Never invent a colour or a row per long-tail platform — fold the tail.
  const tail = rows.slice(MAX_BARS - 1);
  const folded = tail.reduce((total, row) => total + row.value, 0);
  return [
    ...rows.slice(0, MAX_BARS - 1),
    {
      key: "other",
      label: "Other",
      value: folded,
      detail: `${folded} games across ${tail.length} more platforms`,
    },
  ];
};

/**
 * Everything the overview renders, derived in one pass so the page itself
 * stays declarative. Cheap enough for any library the collector produces
 * (50 games per source), but memoize the call — it runs on every render
 * otherwise.
 */
export const summarize = (games: PlayedGame[]): LibrarySummary => {
  const playtimeLeaders = games
    .filter((game) => (game.playtimeMinutes ?? 0) > 0)
    .sort((a, b) => (b.playtimeMinutes ?? 0) - (a.playtimeMinutes ?? 0))
    .slice(0, MAX_BARS)
    .map((game) => ({
      key: game.id,
      label: game.title,
      value: game.playtimeMinutes ?? 0,
      detail: `${(game.playtimeMinutes ?? 0).toLocaleString()} minutes recorded`,
    }));

  const completionLeaders = games
    .filter((game) => game.totalCount > 0 && game.earnedCount > 0)
    .sort((a, b) => b.completionPct - a.completionPct || b.earnedCount - a.earnedCount)
    .slice(0, 5);

  return {
    gameCount: games.length,
    totalMinutes: games.reduce((total, game) => total + (game.playtimeMinutes ?? 0), 0),
    earned: games.reduce((total, game) => total + game.earnedCount, 0),
    possible: games.reduce((total, game) => total + game.totalCount, 0),
    platformCount: new Set(games.map((game) => game.platform)).size,
    // The feed is newest-first, but sorting is the collector's promise rather
    // than the renderer's assumption.
    lastPlayedAt: games.reduce<string | undefined>(
      (newest, game) => (!newest || game.lastPlayedAt > newest ? game.lastPlayedAt : newest),
      undefined,
    ),
    playtimeLeaders,
    platformCounts: platformRows(games),
    completionLeaders,
  };
};
