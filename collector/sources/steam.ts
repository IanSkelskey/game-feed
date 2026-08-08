/**
 * @file collector/sources/steam.ts
 * @description Fetches recently played Steam games and optional achievement progress.
 *
 * Credentials: STEAM_API_KEY and STEAM_ID. Get a key at
 * https://steamcommunity.com/dev/apikey; STEAM_ID accepts either the 64-bit id
 * or the vanity name from your profile URL.
 *
 * IMPORTANT: your Steam profile *and* its "Game details" must both be Public in
 * Privacy Settings. With a valid key but a private profile the API returns
 * success with zero games rather than an error.
 *
 * Steam needs three endpoints where RetroAchievements needs two:
 *   GetOwnedGames         → titles, icons, last-played timestamps
 *   GetPlayerAchievements → which achievements are unlocked (opaque apinames)
 *   GetSchemaForGame      → maps those apinames to titles and icons
 */

import { ACHIEVEMENTS_PER_GAME, COLLECT_PLAYTIME, FETCH_COUNT, GAME_LIMIT } from "../config";
import { ApiError, createJsonClient } from "../lib/http";
import type { ImageStore } from "../lib/images";
import type { GridClient } from "../lib/steamgriddb";
import type {
  AchievementSupport,
  EarnedAchievement,
  PlayedGame,
  SteamAppType,
} from "../../src/types";

const API_BASE = "https://api.steampowered.com";
const STORE_API_BASE = "https://store.steampowered.com/api";
const ICON_BASE = "https://media.steampowered.com/steamcommunity/public/images/apps";
const STORE_ITEM_ASSETS_BASE = "https://shared.cloudflare.steamstatic.com/store_item_assets";

/**
 * How many appids to request per GetItems call. The endpoint takes an array,
 * so the whole library costs a couple of requests rather than one per game.
 */
const CAPSULE_BATCH_SIZE = 25;

export const STEAM_ENV = ["STEAM_API_KEY", "STEAM_ID"];

interface RawOwnedGame {
  appid: number;
  name?: string;
  /** Hash forming the icon filename; absent for some titles. */
  img_icon_url?: string;
  playtime_forever?: number;
  /** Unix seconds. Absent on older API responses. */
  rtime_last_played?: number;
}

interface RawPlayerAchievement {
  apiname: string;
  achieved: 0 | 1;
  /** Unix seconds; 0 when locked. */
  unlocktime: number;
}

interface RawSchemaAchievement {
  name: string;
  displayName?: string;
  description?: string;
  icon?: string;
}

interface RawStoreDetails {
  success?: boolean;
  data?: { type?: string };
}

/**
 * One entry from IStoreBrowseService/GetItems. `assets.asset_url_format` is a
 * path template containing a literal `${FILENAME}`; each asset field supplies
 * the filename to drop into it, including its own hash directory.
 */
interface RawStoreItem {
  appid?: number;
  assets?: {
    asset_url_format?: string;
    /** e.g. `"0cc11eb5…/library_capsule.jpg"`. Absent when none is published. */
    library_capsule?: string;
  };
}

interface SteamProgress {
  earnedCount: number;
  totalCount: number;
  support: AchievementSupport;
  recent: EarnedAchievement[];
}

const toIso = (unixSeconds: number) => new Date(unixSeconds * 1000).toISOString();

/**
 * Portrait library-capsule URLs, keyed by appid.
 *
 * The capsule cannot be guessed from the appid. Its filename varies — most
 * apps publish `library_600x900.jpg`, but newer ones use `library_capsule.jpg`
 * — and it sits under a per-asset hash directory. Older apps happen to keep a
 * legacy copy at the unhashed path, which is why guessing appears to work
 * until it silently doesn't; GetItems is the only authoritative source.
 *
 * Requests are batched, so the whole library costs a couple of calls. A batch
 * that fails resolves to no entries for those appids, which just means those
 * games fall through to SteamGridDB.
 */
const libraryCapsules = async (
  call: ReturnType<typeof createJsonClient>,
  appids: number[],
): Promise<Map<number, string>> => {
  const found = new Map<number, string>();

  for (let index = 0; index < appids.length; index += CAPSULE_BATCH_SIZE) {
    const batch = appids.slice(index, index + CAPSULE_BATCH_SIZE);

    let items: RawStoreItem[];
    try {
      const raw = (await call("IStoreBrowseService/GetItems/v1/", {
        input_json: JSON.stringify({
          ids: batch.map((appid) => ({ appid })),
          context: { language: "english", country_code: "US" },
          data_request: { include_assets: true },
        }),
      })) as { response?: { store_items?: RawStoreItem[] } };
      items = raw.response?.store_items ?? [];
    } catch (error) {
      console.warn(`  ~ could not load store assets for a batch: ${error}`);
      continue;
    }

    for (const item of items) {
      const { asset_url_format: format, library_capsule: capsule } = item.assets ?? {};
      if (!item.appid || !format || !capsule) {
        continue;
      }
      // `capsule` may contain `$` sequences, so replace via a function to stop
      // them being read as replacement patterns.
      const path = format.replace("${FILENAME}", () => capsule);
      found.set(item.appid, `${STORE_ITEM_ASSETS_BASE}/${path}`);
    }
  }

  return found;
};

export const collectSteam = async (
  images: ImageStore,
  grids: GridClient | null,
): Promise<PlayedGame[]> => {
  const apiKey = process.env.STEAM_API_KEY!;
  const steamId = process.env.STEAM_ID!;

  // `steamid` is attached per-call rather than globally: GetSchemaForGame and
  // ResolveVanityURL don't accept it.
  const call = createJsonClient({
    baseUrl: API_BASE,
    defaultParams: { key: apiKey, format: "json" },
    delayMs: 250,
  });

  const storeCall = createJsonClient({
    baseUrl: STORE_API_BASE,
    defaultParams: { cc: "us", l: "english" },
    delayMs: 250,
  });

  // STEAM_ID may be a 64-bit id or a vanity name. The API only accepts the
  // former, so resolve the latter transparently.
  let resolvedId = steamId;
  if (!/^\d{17}$/.test(steamId)) {
    const raw = (await call("ISteamUser/ResolveVanityURL/v1/", {
      vanityurl: steamId,
    })) as { response?: { success?: number; steamid?: string } };

    if (raw.response?.success !== 1 || !raw.response.steamid) {
      throw new Error(`STEAM_ID "${steamId}" is not a valid SteamID or vanity name.`);
    }
    resolvedId = raw.response.steamid;
  }

  const raw = (await call("IPlayerService/GetOwnedGames/v1/", {
    steamid: resolvedId,
    include_appinfo: "1",
    include_played_free_games: "1",
  })) as { response?: { games?: RawOwnedGame[] } };
  const owned = raw.response?.games ?? [];

  if (owned.length === 0) {
    throw new Error(
      "Steam returned no games. Check that the profile and its game details are both Public.",
    );
  }

  /** Counts 403s, which mean the account is hiding achievement data. */
  let forbidden = 0;

  /**
   * Steam's owned-games response has playtime and identity data, but not the
   * product type. Store metadata lets us distinguish games from software such
   * as Aseprite before they enter the published feed.
   */
  const appTypeFor = async (appid: number): Promise<SteamAppType | undefined> => {
    try {
      const raw = (await storeCall("appdetails", {
        appids: String(appid),
      })) as Record<string, RawStoreDetails>;
      const type = raw[String(appid)]?.data?.type;

      switch (type) {
        case "game":
        case "software":
        case "dlc":
        case "demo":
        case "mod":
        case "video":
        case "series":
        case "episode":
        case "hardware":
        case "music":
          return type;
        case undefined:
          return undefined;
        default:
          return "other";
      }
    } catch {
      // Metadata is a curation aid, not a reason to lose an otherwise valid
      // played game when Steam's store endpoint is unavailable.
      return undefined;
    }
  };

  /**
   * What achievements the game *defines*, keyed by apiname. Null means the
   * lookup failed — which is "we don't know", not "there are none".
   *
   * This is the only authority on whether a game has an achievement system at
   * all. Player stats cannot answer it: Steam returns 400 both for a game with
   * no achievements and for a game whose stats this account has never
   * triggered, and it sometimes answers 200 with no `achievements` array for
   * either. Reading "none exist" off those responses mislabels every unplayed
   * achievement game as having no achievements.
   */
  const schemaFor = async (appid: number): Promise<Map<string, RawSchemaAchievement> | null> => {
    try {
      const detail = (await call("ISteamUserStats/GetSchemaForGame/v2/", {
        appid: String(appid),
        l: "english",
      })) as {
        game?: {
          availableGameStats?: { achievements?: RawSchemaAchievement[] };
        };
      };
      return new Map(
        (detail.game?.availableGameStats?.achievements ?? []).map((entry) => [entry.name, entry]),
      );
    } catch {
      return null;
    }
  };

  /**
   * The newest unlocks in a game, plus its totals. A null result means Steam
   * refused or failed the request; zero progress against a known total is
   * valid data for a game that has simply not been played for achievements.
   */
  const progressFor = async (appid: number): Promise<SteamProgress | null> => {
    // Ask the schema first, so the answer holds even when player stats do not
    // exist. This costs one extra call for games with nothing unlocked; the
    // schema was already being fetched for every game that had any.
    const schema = await schemaFor(appid);

    let all: RawPlayerAchievement[] = [];
    try {
      const stats = (await call("ISteamUserStats/GetPlayerAchievements/v1/", {
        appid: String(appid),
        steamid: resolvedId,
      })) as { playerstats?: { achievements?: RawPlayerAchievement[] } };
      all = stats.playerstats?.achievements ?? [];
    } catch (error) {
      // 400 means Steam has no player stats for this app — routine for a game
      // that has never been played for achievements, and for one that has none
      // to play for. The schema above already told us which; keep the game.
      if (!(error instanceof ApiError) || error.status !== 400) {
        if (error instanceof ApiError && error.status === 403) {
          forbidden += 1;
        }
        return null;
      }
    }

    const unlocked = all.filter((entry) => entry.achieved === 1);

    // The schema wins on totals: player stats only carry the achievements this
    // account has stats rows for, which can be fewer than the game defines.
    const totalCount = schema ? schema.size : all.length;
    const support: AchievementSupport = schema
      ? schema.size > 0
        ? "available"
        : "none"
      : all.length > 0
        ? "available"
        : "unknown";

    if (unlocked.length === 0) {
      return { earnedCount: 0, totalCount, support, recent: [] };
    }

    if (!schema) {
      console.warn(`  ~ no schema for app ${appid}; using raw achievement names`);
    }

    const newest = unlocked
      .sort((a, b) => b.unlocktime - a.unlocktime)
      .slice(0, ACHIEVEMENTS_PER_GAME);

    const recent: EarnedAchievement[] = [];
    for (const entry of newest) {
      const meta = schema?.get(entry.apiname);
      recent.push({
        id: `steam-${appid}-${entry.apiname}`,
        // Falls back to the apiname so a schema failure degrades to something
        // readable rather than a blank row.
        title: meta?.displayName || entry.apiname,
        description: meta?.description ?? "",
        earnedAt: toIso(entry.unlocktime),
        badgeUrl:
          (await images.store("badges", "steam", `${appid}/${entry.apiname}`, meta?.icon)) ?? "",
      });
    }

    return { earnedCount: unlocked.length, totalCount, support, recent };
  };

  const candidates = owned
    .filter((game) => game.name && (game.playtime_forever ?? 0) > 0)
    .sort((a, b) => (b.rtime_last_played ?? 0) - (a.rtime_last_played ?? 0))
    .slice(0, FETCH_COUNT);

  const capsules = await libraryCapsules(
    call,
    candidates.map((game) => game.appid),
  );

  const games: PlayedGame[] = [];
  for (const game of candidates) {
    if (games.length >= GAME_LIMIT) {
      break;
    }

    const steamType = await appTypeFor(game.appid);
    if (steamType && steamType !== "game") {
      continue;
    }

    const progress = await progressFor(game.appid);
    // A null result means achievement data was unavailable. Zero-progress
    // games are represented by an empty progress object and are retained.
    if (!progress) {
      continue;
    }

    const appid = String(game.appid);
    games.push({
      id: `steam-${appid}`,
      source: "steam",
      title: game.name!,
      platform: "Steam",
      iconUrl:
        (await images.store(
          "icons",
          "steam",
          appid,
          game.img_icon_url ? `${ICON_BASE}/${appid}/${game.img_icon_url}.jpg` : undefined,
        )) ?? "",
      // Prefer Steam's own portrait library capsule — the traditional vertical
      // poster treatment, and the same art the Steam client shows. SteamGridDB
      // remains the fallback for the few games that publish none. Native art
      // gets its own path so an older SteamGridDB file cannot prevent the
      // preference from taking effect on an existing game.
      coverUrl:
        (await images.store("covers", "steam", `native/${appid}`, capsules.get(game.appid), {
          quiet: true,
        })) ?? (await images.store("covers", "steam", appid, await grids?.bySteamAppId(appid))),
      // rtime_last_played is the real signal; fall back to the newest unlock
      // when Steam omitted it. Epoch is an explicit unknown fallback for a
      // game with neither a play timestamp nor achievements.
      lastPlayedAt: game.rtime_last_played
        ? toIso(game.rtime_last_played)
        : (progress.recent[0]?.earnedAt ?? "1970-01-01T00:00:00.000Z"),
      // Omitted rather than zeroed when playtime is off: `playtimeMinutes: 0`
      // is a claim that the game was never played, which is a different and
      // false statement. Absent is what the type already means by "unknown".
      ...(COLLECT_PLAYTIME ? { playtimeMinutes: game.playtime_forever ?? 0 } : {}),
      steamType,
      achievementSupport: progress.support,
      earnedCount: progress.earnedCount,
      totalCount: progress.totalCount,
      completionPct: progress.totalCount
        ? Math.round((progress.earnedCount / progress.totalCount) * 100)
        : 0,
      recentAchievements: progress.recent,
    });
  }

  if (games.length === 0 && forbidden > 0) {
    throw new Error(
      `Steam refused achievement data for ${forbidden} games (HTTP 403). ` +
        "Set Steam > Privacy Settings > Game details to Public.",
    );
  }

  return games;
};
