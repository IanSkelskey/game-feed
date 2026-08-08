import { BASE_PATH, DATA_URL } from "../config/env";
import type { FeedMeta, PlayedGame } from "../types";
import { fetchWithTimeout } from "./fetchWithTimeout";

/** Sits beside the games list wherever that is served from. */
const META_URL = DATA_URL.replace(/[^/]+$/, "meta.json");

/**
 * Bundled with the template so a fork renders a real library before it has
 * collected anything. `npm run collect` never touches this file — it writes
 * `data/games.json` — so the sample cannot be silently overwritten, and the
 * fallback survives for the next person who forks.
 */
const SAMPLE_URL = `${BASE_PATH}sample-games.json`;

export interface LoadedGames {
  games: PlayedGame[];
  /** True when the collected feed was absent and the bundled sample was used. */
  isSample: boolean;
  /** Absent on the sample, and on a feed collected before meta.json existed. */
  meta?: FeedMeta;
}

/**
 * The feed is one small static file that never changes within a session, so it
 * is fetched once and shared. Routes are lazy, and without this every
 * navigation would re-request it.
 *
 * A rejected request is not kept — clearing the cache lets a later mount retry
 * rather than replaying the failure forever.
 */
let inFlight: Promise<LoadedGames> | undefined;

const fetchList = async (url: string): Promise<PlayedGame[] | undefined> => {
  const response = await fetchWithTimeout(url, { timeoutMs: 8_000 });

  // Not an error: a fork that has not collected yet has no feed to serve.
  if (response.status === 404) return undefined;
  if (!response.ok) {
    throw new Error(`The library feed responded with ${response.status}.`);
  }

  // Soft 404: plenty of static hosts answer a missing path with 200 and an
  // HTML error page rather than a 404 status. Parsing that as JSON would throw
  // and be reported as a broken feed, when the honest reading is "absent".
  if (!response.headers.get("content-type")?.includes("json")) {
    return undefined;
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data)) {
    throw new Error("The library feed is not a list of games.");
  }
  return data as PlayedGame[];
};

/** Never fails the load: the site is perfectly usable without a timestamp. */
const fetchMeta = async (): Promise<FeedMeta | undefined> => {
  try {
    const response = await fetchWithTimeout(META_URL, { timeoutMs: 8_000 });
    if (!response.ok) return undefined;
    const data: unknown = await response.json();
    return data && typeof data === "object" && "collectedAt" in data
      ? (data as FeedMeta)
      : undefined;
  } catch {
    return undefined;
  }
};

const request = async (): Promise<LoadedGames> => {
  // In parallel: the metadata is a sibling file, and serializing the two would
  // put a second round trip in front of first paint for one line of footer.
  const [collected, meta] = await Promise.all([fetchList(DATA_URL), fetchMeta()]);
  if (collected && collected.length > 0) {
    return { games: collected, isSample: false, meta };
  }

  // Only reached before a first collection. A missing sample is fine too —
  // `useLibrary` turns an empty result into setup instructions.
  const sample = await fetchList(SAMPLE_URL).catch(() => undefined);
  return { games: sample ?? [], isSample: (sample?.length ?? 0) > 0 };
};

export const loadGames = (): Promise<LoadedGames> => {
  inFlight ??= request().catch((error: unknown) => {
    inFlight = undefined;
    throw error;
  });
  return inFlight;
};
