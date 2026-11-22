/**
 * @file collector/sources/local.ts
 * @description Games with no web API — an emulator, a standalone launcher, a
 * console you log by hand — read from two committed files rather than from a
 * service. docs/local-games.md is the guide; this file is the contract.
 *
 *   local/scanned.json  Written by a scanner script you run on the PC that
 *                       has the games. The template ships none: what to read
 *                       is different for every emulator and launcher. Never
 *                       edit it by hand; the next scan replaces it.
 *   local/manual.json   Hand-written. Each entry is matched to a scanned one
 *                       by `id` and overrides whatever fields it sets, so it
 *                       can rename a game, fix its cover, or hide it. An
 *                       entry with no scanned match adds a game outright.
 *
 * Both are optional, and both live outside `data/` so neither is published to
 * the site: the feed is `data/games.json`, and these are only inputs to it.
 *
 * The CI runner cannot see your PC, so this source has no credentials and does
 * no scanning — it only turns the committed files into `PlayedGame` records and
 * fetches their cover art.
 */

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ACHIEVEMENTS_PER_GAME, COLLECT_PLAYTIME, GAME_LIMIT } from "../config";
import type { ImageStore } from "../lib/images";
import type { GridClient } from "../lib/steamgriddb";
import type { EarnedAchievement, PlayedGame } from "../../src/types";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));

export const SCANNED_PATH = "local/scanned.json";
export const MANUAL_PATH = "local/manual.json";

/** Nothing to authenticate: the inputs are files in the repository. */
export const LOCAL_ENV: string[] = [];

export interface LocalAchievement {
  /** Unique within its game. */
  id: string;
  title: string;
  description: string;
  /** ISO-8601. */
  earnedAt: string;
  /**
   * The badge image, as a path from the repo root to an image committed to
   * the repository — `local/badges/…` by convention. A file rather than a URL
   * because it usually comes out of the game's own files, which the CI runner
   * cannot read.
   */
  badge?: string;
}

/** One game, as both input files describe it. */
export interface LocalGame {
  /**
   * Stable key, unique across both files. Published as `local-<id>`, so it
   * must not change once a game is in the feed.
   */
  id: string;
  title: string;
  /** What the site shows in place of a service name — "Nintendo Switch 2", "PC". */
  platform: string;
  /** ISO-8601. */
  lastPlayedAt: string;
  playtimeMinutes?: number;
  /**
   * What to search SteamGridDB for, when the title itself matches badly — an
   * edition suffix, say. Defaults to the title.
   */
  coverSearch?: string;
  /**
   * Pins the cover to one SteamGridDB game, for when no search term can tell
   * it apart — a remake that shares the original's exact name. The id is the
   * number in the game's steamgriddb.com/game/<id> URL. Wins over
   * `coverSearch`.
   */
  steamGridDbId?: number;
  /**
   * A direct link to the poster to use — on steamgriddb.com, the download link
   * of one particular grid. Wins over both `steamGridDbId` and `coverSearch`.
   * Should be 600x900 to match the rest of the library.
   */
  coverImage?: string;
  /** Omitted for a game with no achievement system. */
  achievements?: {
    earned: number;
    /** How many the game defines. Zero when that is not known. */
    total: number;
    /** Newest first. */
    recent: LocalAchievement[];
  };
}

/**
 * `local/scanned.json`. Any other top-level key is ignored here, so a scanner
 * can keep state of its own in the same file — names it has learned, say —
 * and read it back with `readScanned<{ itsKey: … }>()`.
 */
export interface ScannedFile {
  games: LocalGame[];
}

/** A manual entry: any subset of a game's fields, plus a way to drop it. */
export type ManualEntry = Partial<LocalGame> & { id: string; hidden?: boolean };

export interface ManualFile {
  games: ManualEntry[];
}

/** A missing file is an empty one; a malformed one is an error worth seeing. */
const readJson = async <T>(relativePath: string, empty: T): Promise<T> => {
  let text: string;
  try {
    text = await readFile(resolve(ROOT, relativePath), "utf8");
  } catch {
    return empty;
  }
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new Error(`${relativePath} is not valid JSON: ${String(error)}`, { cause: error });
  }
};

/** For a scanner to read back its previous output, including its own state. */
export const readScanned = <State extends object = object>() =>
  readJson<ScannedFile & Partial<State>>(SCANNED_PATH, { games: [] } as ScannedFile as ScannedFile &
    Partial<State>);

const readManual = () => readJson<ManualFile>(MANUAL_PATH, { games: [] });

/** Why an entry cannot be published, or undefined when it can. */
const problemWith = (game: Partial<LocalGame>): string | undefined => {
  if (!game.title) return "no title";
  if (!game.platform) return "no platform";
  if (!game.lastPlayedAt || Number.isNaN(Date.parse(game.lastPlayedAt))) {
    return "no valid lastPlayedAt";
  }
  return undefined;
};

/** Scanned games with the manual file applied over them. */
export const mergeLocal = (scanned: LocalGame[], manual: ManualEntry[]): LocalGame[] => {
  const byId = new Map<string, Partial<LocalGame>>(scanned.map((game) => [game.id, game]));
  const hidden = new Set<string>();

  for (const { hidden: hide, ...entry } of manual) {
    if (!entry.id) {
      console.warn(`  ~ ${MANUAL_PATH}: skipped an entry with no id`);
      continue;
    }
    if (hide) {
      hidden.add(entry.id);
      continue;
    }
    byId.set(entry.id, { ...byId.get(entry.id), ...entry });
  }

  const games: LocalGame[] = [];
  for (const [id, game] of byId) {
    if (hidden.has(id)) continue;
    const problem = problemWith(game);
    if (problem) {
      console.warn(`  ~ local game "${id}" skipped: ${problem}`);
      continue;
    }
    games.push(game as LocalGame);
  }
  return games;
};

/**
 * A chosen cover is stored under a name of its own. The art library never
 * replaces a file it holds, so choosing a poster after the search had already
 * found one would otherwise go on serving the search's pick.
 */
const storeCover = async (images: ImageStore, grids: GridClient | null, game: LocalGame) => {
  if (game.coverImage) {
    const hash = createHash("sha1").update(game.coverImage).digest("hex").slice(0, 8);
    return images.store("covers", "local", `${game.id}-${hash}`, game.coverImage);
  }
  if (game.steamGridDbId) {
    return images.store(
      "covers",
      "local",
      `${game.id}-sgdb-${game.steamGridDbId}`,
      await grids?.byGameId(game.steamGridDbId),
    );
  }
  return images.store(
    "covers",
    "local",
    game.id,
    await grids?.byTitle(game.coverSearch ?? game.title),
  );
};

/** A game's newest achievements, with any committed badge copied into the library. */
const recentFor = async (images: ImageStore, game: LocalGame): Promise<EarnedAchievement[]> => {
  const recent: EarnedAchievement[] = [];
  for (const achievement of (game.achievements?.recent ?? []).slice(0, ACHIEVEMENTS_PER_GAME)) {
    recent.push({
      id: `local-${game.id}-${achievement.id}`,
      title: achievement.title,
      description: achievement.description,
      earnedAt: new Date(achievement.earnedAt).toISOString(),
      badgeUrl: achievement.badge
        ? ((await images.storeFile(
            "badges",
            "local",
            `${game.id}/${achievement.id}`,
            achievement.badge,
          )) ?? "")
        : "",
    });
  }
  return recent;
};

export const collectLocal = async (
  images: ImageStore,
  grids: GridClient | null,
): Promise<PlayedGame[]> => {
  const [scanned, manual] = await Promise.all([readScanned(), readManual()]);
  // Either file may be hand-written or another tool's output; a missing list
  // is an empty one rather than a crash.
  const games = mergeLocal(scanned.games ?? [], manual.games ?? [])
    .sort((a, b) => b.lastPlayedAt.localeCompare(a.lastPlayedAt))
    .slice(0, GAME_LIMIT);

  const played: PlayedGame[] = [];
  for (const game of games) {
    const achievements = game.achievements;
    const earned = achievements?.earned ?? 0;
    const total = achievements?.total ?? 0;

    played.push({
      id: `local-${game.id}`,
      source: "local",
      title: game.title,
      platform: game.platform,
      // Nothing local supplies a square icon, and the site does not render one.
      iconUrl: "",
      coverUrl: await storeCover(images, grids, game),
      lastPlayedAt: new Date(game.lastPlayedAt).toISOString(),
      ...(COLLECT_PLAYTIME && game.playtimeMinutes !== undefined
        ? { playtimeMinutes: game.playtimeMinutes }
        : {}),
      achievementSupport: achievements ? "available" : "none",
      earnedCount: earned,
      totalCount: total,
      completionPct: total ? Math.min(100, Math.round((earned / total) * 100)) : 0,
      recentAchievements: await recentFor(images, game),
    });
  }

  return played;
};
