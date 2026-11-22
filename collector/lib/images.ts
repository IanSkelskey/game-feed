/**
 * @file collector/lib/images.ts
 * @description The append-only art library.
 *
 * Two rules:
 *
 *  1. **Never re-download.** A file already on disk is never fetched again, so
 *     a daily run costs one request per genuinely new image.
 *  2. **Never overwrite.** Art collected once stays forever, even after the
 *     game drops out of the recently-played window. Preserving it is the point.
 *
 * Paths are predictable — `images/<kind>/<source>/<id>.<ext>` — so nothing has
 * to consult the manifest to build a URL. The manifest just records what is
 * already held, and what it came from.
 */

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SITE_BASE } from "../config";
import { download } from "./http";
import type { GameSource } from "../../src/types";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const MANIFEST = "images/manifest.json";

/** Covers use source-native art where available, with SteamGridDB as fallback. */
export type ImageKind = "covers" | "icons" | "badges";

interface Entry {
  sourceUrl: string;
  /** ISO-8601 of the run that first fetched it. Never updated afterwards. */
  fetchedAt: string;
  bytes: number;
}

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const KNOWN = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

/**
 * Makes an id safe as a filename without collapsing distinct ids together.
 * Steam achievement apinames are the messy case — free-form developer strings
 * containing spaces, slashes, and punctuation.
 */
const slug = (id: string) =>
  id
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
    .toLowerCase() || "unnamed";

/**
 * The URL's extension wins; it survives CDNs answering octet-stream. A source
 * that is a repo-relative path rather than a URL is used as it is.
 */
const extensionFor = (source: string, contentType: string | null) => {
  const pathname = /^[a-z][a-z0-9+.-]*:\/\//i.test(source) ? new URL(source).pathname : source;
  const fromUrl = extname(basename(pathname)).toLowerCase();
  if (KNOWN.has(fromUrl)) {
    return fromUrl === ".jpeg" ? ".jpg" : fromUrl;
  }
  return EXTENSION_BY_TYPE[contentType?.split(";")[0]?.trim() ?? ""] ?? ".jpg";
};

export const createImageStore = async () => {
  const manifestPath = resolve(ROOT, MANIFEST);
  let manifest: Record<string, Entry> = {};
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch {
    // First run, or an unreadable manifest. Either way, start empty.
  }

  // Stem (path minus extension) → stored path. The extension is unknown until
  // the bytes arrive, so lookups happen by stem.
  const byStem = new Map<string, string>();
  for (const path of Object.keys(manifest)) {
    byStem.set(path.slice(0, path.length - extname(path).length), path);
  }

  const now = new Date().toISOString();
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  /**
   * The shared half of `store` and `storeFile`: skip what is held, otherwise
   * fetch the bytes and record them. `origin` is what the manifest credits.
   */
  const put = async (
    kind: ImageKind,
    source: GameSource,
    id: string,
    origin: string,
    fetchBytes: () => Promise<{ body: Buffer; contentType: string | null } | null>,
    options: { quiet?: boolean },
  ): Promise<string | undefined> => {
    const stem = `images/${kind}/${source}/${id.split("/").map(slug).join("/")}`;
    const held = byStem.get(stem);

    // The whole point of the library: already have it, spend nothing.
    if (held && existsSync(resolve(ROOT, held))) {
      skipped += 1;
      return `${SITE_BASE}/${held}`;
    }

    const result = await fetchBytes();
    if (!result) {
      if (!options.quiet) {
        failed += 1;
        console.warn(`  ~ could not get ${origin}`);
      }
      return undefined;
    }

    const path = `${stem}${extensionFor(origin, result.contentType)}`;
    const absolute = resolve(ROOT, path);
    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, result.body);

    manifest[path] = {
      sourceUrl: origin,
      fetchedAt: manifest[path]?.fetchedAt ?? now,
      bytes: result.body.byteLength,
    };
    byStem.set(stem, path);
    downloaded += 1;

    return `${SITE_BASE}/${path}`;
  };

  /** Downloads if absent. Returns the published URL, or undefined on failure. */
  const store = async (
    kind: ImageKind,
    source: GameSource,
    id: string,
    url: string | undefined,
    options: { quiet?: boolean } = {},
  ): Promise<string | undefined> =>
    url ? put(kind, source, id, url, () => download(url), options) : undefined;

  /**
   * Copies a file committed to the repository into the library, for art that
   * has no URL — badges the local scan pulled out of a game's own files.
   * `relativePath` is from the repo root, and is what the manifest records.
   */
  const storeFile = async (
    kind: ImageKind,
    source: GameSource,
    id: string,
    relativePath: string,
  ): Promise<string | undefined> =>
    put(
      kind,
      source,
      id,
      relativePath,
      async () => {
        const body = await readFile(resolve(ROOT, relativePath)).catch(() => null);
        return body && body.byteLength > 0 ? { body, contentType: null } : null;
      },
      {},
    );

  const save = async () => {
    const sorted = Object.fromEntries(
      Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)),
    );
    await mkdir(dirname(manifestPath), { recursive: true });
    await writeFile(manifestPath, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
  };

  return {
    store,
    storeFile,
    save,
    stats: () => ({
      held: Object.keys(manifest).length,
      downloaded,
      skipped,
      failed,
    }),
  };
};

export type ImageStore = Awaited<ReturnType<typeof createImageStore>>;
