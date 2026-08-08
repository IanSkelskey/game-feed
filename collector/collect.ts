/**
 * @file collector/collect.ts
 * @description Entry point. Runs each configured source and writes
 * `data/games.json` — one merged, newest-first `PlayedGame[]`, which is both
 * what the front end reads and what the published feed serves.
 *
 * Failure policy: a source that throws is reported and skipped so the other
 * still publishes. A run where every source fails, or where no credentials are
 * set, exits non-zero without writing — a transient outage should never blank
 * the consuming site.
 */

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { hydrateFromWindowsEnvironment } from "./lib/env";
import { createImageStore } from "./lib/images";
import { createGridClient } from "./lib/steamgriddb";
import { RETRO_ENV, collectRetro } from "./sources/retroachievements";
import { STEAM_ENV, collectSteam } from "./sources/steam";
import type { FeedMeta, PlayedGame } from "../src/types";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

const META_PATH = "data/meta.json";

const SOURCES = [
  { label: "Steam", requiredEnv: STEAM_ENV, collect: collectSteam },
  { label: "RetroAchievements", requiredEnv: RETRO_ENV, collect: collectRetro },
];

const write = async (relativePath: string, value: unknown) => {
  const absolute = resolve(ROOT, relativePath);
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const main = async () => {
  // A terminal opened before the variables were set will not have inherited
  // them; read the persisted values rather than making the user restart.
  const recovered = hydrateFromWindowsEnvironment([
    ...STEAM_ENV,
    ...RETRO_ENV,
    "STEAM_GRID_DB_API_KEY",
  ]);
  if (recovered.length > 0) {
    console.log(`Read from the Windows environment: ${recovered.join(", ")}`);
  }

  const configured = SOURCES.filter((source) =>
    source.requiredEnv.every((name) => process.env[name]),
  );

  if (configured.length === 0) {
    const wanted = SOURCES.map(
      (source) => `  ${source.label}: ${source.requiredEnv.join(", ")}`,
    ).join("\n");
    throw new Error(`No credentials found. Set at least one source's variables:\n${wanted}`);
  }

  const images = await createImageStore();
  const grids = createGridClient();

  const games: PlayedGame[] = [];
  let failures = 0;

  for (const source of configured) {
    try {
      const collected = await source.collect(images, grids);
      games.push(...collected);
      console.log(`${source.label}: ${collected.length} games`);
    } catch (error) {
      failures += 1;
      console.warn(`! ${source.label} failed: ${String(error)}`);
    }
  }

  if (games.length === 0) {
    throw new Error("No games collected. Leaving the published data untouched.");
  }

  // Newest first. Consumers can curate the deeper published list as they like.
  games.sort((a, b) => b.lastPlayedAt.localeCompare(a.lastPlayedAt));

  // Compare against the published file *before* overwriting it. A dated
  // snapshot is written only when something actually changed: an identical
  // snapshot under a new date is still a new file, which would defeat the
  // workflow's commit-only-on-change check and tag hundreds of identical days.
  const snapshot = `${JSON.stringify(games, null, 2)}\n`;
  const previous = await readFile(resolve(ROOT, "data/games.json"), "utf8").catch(() => "");
  const changed = previous !== snapshot;

  await images.save();
  await write("data/games.json", games);

  if (changed) {
    await write(`data/history/${new Date().toISOString().slice(0, 10)}.json`, games);
  }

  // When the published data last *changed* — not when the collector last ran.
  // A timestamp that moved on every run would make every run a diff, which
  // would commit and tag an identical library daily and defeat the whole
  // commit-only-on-change design. Written on first run too, so the site has
  // something to show before the data ever changes.
  if (changed || !existsSync(resolve(ROOT, META_PATH))) {
    await write(META_PATH, {
      collectedAt: new Date().toISOString(),
      gameCount: games.length,
      sources: [...new Set(games.map((game) => game.source))].sort(),
    } satisfies FeedMeta);
  }

  const art = images.stats();
  console.log(
    `\n${games.length} games. Images: ${art.downloaded} new, ${art.skipped} already held, ` +
      `${art.failed} failed (${art.held} in the library).`,
  );

  if (failures > 0) {
    console.warn(`! Partial run — ${failures} source(s) failed.`);
  }
};

await main();
