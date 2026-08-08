/**
 * @file collector/sources/retroachievements.ts
 * @description Fetches recently played games and their progress from
 * RetroAchievements.
 *
 * Credentials: RETRO_ACHIEVEMENTS_USERNAME and RETRO_ACHIEVEMENTS_API_KEY
 * (Settings → Web API Key on retroachievements.org).
 */

import { ACHIEVEMENTS_PER_GAME, FETCH_COUNT, GAME_LIMIT } from "../config";
import { createJsonClient } from "../lib/http";
import type { ImageStore } from "../lib/images";
import type { GridClient } from "../lib/steamgriddb";
import type { EarnedAchievement, PlayedGame } from "../../src/types";

const API_BASE = "https://retroachievements.org/API";
const MEDIA_BASE = "https://media.retroachievements.org";

export const RETRO_ENV = ["RETRO_ACHIEVEMENTS_USERNAME", "RETRO_ACHIEVEMENTS_API_KEY"];

/** Shape returned by API_GetUserRecentlyPlayedGames.php (PascalCase). */
interface RawGame {
  GameID: number;
  Title: string;
  ConsoleName: string;
  ImageIcon: string;
  LastPlayed: string;
  NumPossibleAchievements: number;
  NumAchieved: number;
}

/** An entry in the `Achievements` map of API_GetGameInfoAndUserProgress.php. */
interface RawAchievement {
  ID: number;
  Title: string;
  Description: string;
  Points: number;
  BadgeName: string;
  /** Both are absent until the achievement is earned. */
  DateEarned?: string;
  DateEarnedHardcore?: string;
}

/** RA returns naive UTC timestamps ("2023-05-23 22:32:24"). */
const toIso = (raDate: string) => new Date(`${raDate.replace(" ", "T")}Z`).toISOString();

export const collectRetro = async (
  images: ImageStore,
  grids: GridClient | null,
): Promise<PlayedGame[]> => {
  const username = process.env.RETRO_ACHIEVEMENTS_USERNAME!;
  const apiKey = process.env.RETRO_ACHIEVEMENTS_API_KEY!;

  // `z` and `y` authenticate the caller; `u` is the user being queried.
  const call = createJsonClient({
    baseUrl: API_BASE,
    defaultParams: { z: username, y: apiKey, u: username },
    delayMs: 350,
  });

  /**
   * The newest achievements earned in a game. Returns an empty list rather than
   * throwing, so one bad game cannot sink the whole run.
   */
  const recentFor = async (gameId: number): Promise<EarnedAchievement[]> => {
    let detail: { Achievements?: Record<string, RawAchievement> };
    try {
      detail = (await call("API_GetGameInfoAndUserProgress.php", {
        g: String(gameId),
      })) as typeof detail;
    } catch (error) {
      console.warn(`  ~ could not load achievements for game ${gameId}: ${error}`);
      return [];
    }

    const earned = Object.values(detail.Achievements ?? {})
      .filter((entry) => entry.DateEarned ?? entry.DateEarnedHardcore)
      .map((entry) => ({
        entry,
        // Hardcore earns are recorded separately and are the stricter of the two.
        earnedAt: toIso((entry.DateEarnedHardcore ?? entry.DateEarned)!),
      }))
      .sort((a, b) => b.earnedAt.localeCompare(a.earnedAt))
      .slice(0, ACHIEVEMENTS_PER_GAME);

    const recent: EarnedAchievement[] = [];
    for (const { entry, earnedAt } of earned) {
      recent.push({
        id: `ra-${entry.ID}`,
        title: entry.Title,
        description: entry.Description,
        earnedAt,
        points: entry.Points,
        hardcore: Boolean(entry.DateEarnedHardcore),
        badgeUrl:
          (await images.store(
            "badges",
            "retroachievements",
            `${gameId}/${entry.ID}`,
            `${MEDIA_BASE}/Badge/${entry.BadgeName}.png`,
          )) ?? "",
      });
    }
    return recent;
  };

  const rawGames = await call("API_GetUserRecentlyPlayedGames.php", {
    c: String(FETCH_COUNT),
  });

  if (!Array.isArray(rawGames)) {
    throw new Error("Unexpected response from the RetroAchievements API.");
  }

  // A game with nothing earned says little and renders as an empty card. Drop
  // those before spending a request on their achievements.
  const played = (rawGames as RawGame[]).filter((raw) => raw.NumAchieved > 0).slice(0, GAME_LIMIT);

  const games: PlayedGame[] = [];
  for (const raw of played) {
    const id = String(raw.GameID);
    games.push({
      id: `ra-${id}`,
      source: "retroachievements",
      title: raw.Title,
      platform: raw.ConsoleName,
      iconUrl:
        (await images.store("icons", "retroachievements", id, `${MEDIA_BASE}${raw.ImageIcon}`)) ??
        "",
      // Retro games share no id with SteamGridDB, so this is a fuzzy name match
      // — see TITLE_OVERRIDES if one resolves to the wrong game.
      coverUrl: await images.store(
        "covers",
        "retroachievements",
        id,
        await grids?.byTitle(raw.Title),
      ),
      lastPlayedAt: toIso(raw.LastPlayed),
      // RetroAchievements exists to publish achievement sets, so a game in the
      // recently-played feed almost always has one — but a title whose set is
      // still unpublished reports zero, and that is a real "none".
      achievementSupport: raw.NumPossibleAchievements > 0 ? "available" : "none",
      earnedCount: raw.NumAchieved,
      totalCount: raw.NumPossibleAchievements,
      completionPct: raw.NumPossibleAchievements
        ? Math.round((raw.NumAchieved / raw.NumPossibleAchievements) * 100)
        : 0,
      recentAchievements: await recentFor(raw.GameID),
    });
  }

  return games;
};
