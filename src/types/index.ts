/**
 * All shared types live in this file.
 *
 * `PlayedGame` is the published contract: it is what `collector/` writes into
 * `data/games.json`, what the front end renders, and what another app gets
 * when it fetches the feed. The collector imports these same declarations, so
 * the two halves of the repo cannot drift apart.
 *
 * Copy this file verbatim into a consuming project — it has no imports.
 */

export type GameSource = "steam" | "retroachievements";

/** Steam's product classification, used to keep tools out of game lists. */
export type SteamAppType =
  | "game"
  | "software"
  | "dlc"
  | "demo"
  | "mod"
  | "video"
  | "series"
  | "episode"
  | "hardware"
  | "music"
  | "other";

/**
 * Whether a game offers achievements at all — a fact about the game, not about
 * how far anyone has got in it.
 *
 * `earnedCount: 0` alone cannot express this: a game with 50 achievements and
 * none earned looks identical to one that has no achievement system. The three
 * cases are genuinely different to a reader, so they are three values:
 *
 * - `available` — the game defines achievements, however many are earned.
 * - `none` — the game defines none. Nothing to show, and nothing missing.
 * - `unknown` — the lookup failed. Not the same as `none`, and never rendered
 *   as though it were.
 */
export type AchievementSupport = "available" | "none" | "unknown";

export interface EarnedAchievement {
  /** Unique within its game; used as a React key. */
  id: string;
  title: string;
  description: string;
  /** ISO-8601 timestamp of when the achievement was earned. */
  earnedAt: string;
  badgeUrl: string;
  /** RetroAchievements only — Steam has no points system. */
  points?: number;
  /** RetroAchievements only. */
  hardcore?: boolean;
}

export interface PlayedGame {
  /** Namespaced ("ra-3291", "steam-440") so ids stay unique when merged. */
  id: string;
  source: GameSource;
  title: string;
  /** Console name for RetroAchievements, "Steam" for Steam. */
  platform: string;
  /** Square icon. RA serves 96px, Steam 32px. */
  iconUrl: string;
  /**
   * Portrait cover art. Steam games prefer Steam's native 600x900 library
   * capsule and fall back to SteamGridDB; emulated games use SteamGridDB.
   * Absent when no usable art is available.
   */
  coverUrl?: string;
  /** ISO-8601 timestamp of when the game was last played. */
  lastPlayedAt: string;
  /** Steam playtime in minutes; absent for RetroAchievements records. */
  playtimeMinutes?: number;
  /** Steam product type; absent for RetroAchievements records. */
  steamType?: SteamAppType;
  /**
   * Whether the game has achievements at all. Optional for backwards
   * compatibility: a feed collected before this field existed omits it, and a
   * consumer should fall back to `totalCount > 0`.
   */
  achievementSupport?: AchievementSupport;
  /** Zero when the game has no earned achievements or no achievement system. */
  earnedCount: number;
  /**
   * How many achievements the game defines — from Steam's schema rather than
   * from player stats, so it is right even for a game never played for them.
   * Zero when there are none, or when the lookup failed.
   */
  totalCount: number;
  /** Completion as a 0–100 percentage, rounded. */
  completionPct: number;
  /** Newest earned achievements first; empty for games without achievements. */
  recentAchievements: EarnedAchievement[];
}

/**
 * `data/meta.json` — a companion to the games list, published alongside it.
 *
 * Separate from `PlayedGame[]` rather than wrapped around it, so the feed's
 * top level stays a plain array and existing consumers keep working.
 */
export interface FeedMeta {
  /**
   * ISO-8601 timestamp of the collection that last *changed* the data. A run
   * that finds nothing new leaves this alone, so it reads as "the data is
   * current as of" rather than "a script ran".
   */
  collectedAt: string;
  gameCount: number;
  /** Which sources contributed, so a consumer can tell a partial run. */
  sources: GameSource[];
}

/* ------------------------------------------------------------------------- *
 * Settings. Shaped here, filled in by `site.config.ts` at the repo root.
 * ------------------------------------------------------------------------- */

/**
 * Everything a fork is expected to change, in one file both halves import.
 *
 * The split matters: `collect` decides what ends up in the published feed, and
 * `display` decides what this site renders from it. Turning something off in
 * `display` hides it here while leaving it available to anything else reading
 * the feed; turning it off in `collect` means it was never gathered at all.
 * Reach for `collect` when the answer is "that is nobody's business", and
 * `display` when it is "not on my front page".
 */
export interface SiteConfig {
  site: {
    /** Page titles, the header, the footer. */
    name: string;
    author: { name: string; url: string };
    /**
     * Credit for the template this front end came from. Omit the key entirely
     * to drop the credit from the footer and the data page.
     */
    scaffold?: { name: string; url: string };
  };

  collect: {
    /** How many games to keep per source. Both APIs cap a page at 50. */
    gameLimit: number;
    /** How many recently played games to inspect before the final limit. */
    fetchCount: number;
    /** How many of each game's newest achievements to keep. */
    achievementsPerGame: number;
    /**
     * Publish Steam playtime. `false` omits `playtimeMinutes` from the feed
     * entirely — no consumer of it, this site included, can show what was
     * never collected.
     */
    playtime: boolean;
  };

  display: {
    /**
     * Show playtime: the figure on each card and detail page, the Time played
     * tile, the Most played chart, and the "Most played" sort order. Has no
     * effect on what the feed contains.
     */
    playtime: boolean;
  };
}

/* ------------------------------------------------------------------------- *
 * Front-end view models. Nothing below is part of the published feed.
 * ------------------------------------------------------------------------- */

/**
 * Async state for the one fetch the app makes. `empty` is distinct from
 * `error`: it means nothing has been collected yet and no sample was bundled,
 * which calls for setup instructions rather than a failure message.
 */
export type LibraryState =
  | { status: "loading" }
  | { status: "ready"; games: PlayedGame[]; isSample: boolean; meta?: FeedMeta }
  | { status: "empty" }
  | { status: "error"; message: string };

/** Library sort orders, keyed by the value stored in the URL query string. */
export type SortKey = "recent" | "playtime" | "completion" | "title";

/** A `source` filter, widened with the "everything" case the UI needs. */
export type SourceFilter = GameSource | "all";
