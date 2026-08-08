/**
 * @file collector/config.ts
 * @description Every knob worth turning, in one place.
 */

import { execFileSync } from "node:child_process";

/**
 * How many games to keep per source. The front end paginates, so this is the
 * size of the library rather than the size of any one screen. Both APIs cap a
 * single page at 50.
 */
export const GAME_LIMIT = 50;

/**
 * How many recently played games to inspect per source before the final limit.
 * Steam games without achievements are retained.
 */
export const FETCH_COUNT = 50;

/** How many of each game's newest achievements to keep. */
export const ACHIEVEMENTS_PER_GAME = 4;

/**
 * Turns `owner/repo` into the GitHub Pages URL it publishes to. A repository
 * named `<owner>.github.io` is a user page served from the domain root; every
 * other repository is a project page served from `/<repo>/`.
 */
const pagesUrlFor = (slug: string): string | undefined => {
  const [owner, repo] = slug.split("/");
  if (!owner || !repo) {
    return undefined;
  }
  return repo.toLowerCase() === `${owner.toLowerCase()}.github.io`
    ? `https://${repo.toLowerCase()}`
    : `https://${owner.toLowerCase()}.github.io/${repo}`;
};

/** `git@github.com:owner/repo.git` and the https form both reduce to `owner/repo`. */
const originSlug = (): string | undefined => {
  try {
    const url = execFileSync("git", ["remote", "get-url", "origin"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return /github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/.exec(url)?.[1];
  } catch {
    // Not a git checkout, or no origin. Neither is worth failing a run over.
    return undefined;
  }
};

/**
 * Where the published files are served from. Image URLs in `data/games.json`
 * are absolute so that another app can render them with no rewriting, which
 * means collection has to know the site's own address.
 *
 * Nothing here is meant to be edited after forking — the value is derived from
 * whichever repository is being collected into:
 *
 *   1. `SITE_BASE`, for a custom domain or any other override.
 *   2. `GITHUB_REPOSITORY`, set by Actions on every run.
 *   3. The `origin` remote, for local runs.
 *
 * With none of the three (a checkout with no remote), URLs fall back to being
 * root-relative. Those render correctly against a site served from the domain
 * root and in `npm run dev`, but not from a project page — hence the warning.
 */
const resolveSiteBase = (): string => {
  const explicit = process.env.SITE_BASE?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  const slug = process.env.GITHUB_REPOSITORY?.trim() || originSlug();
  const derived = slug && pagesUrlFor(slug);
  if (derived) {
    return derived;
  }

  console.warn(
    "  ~ Could not work out this site's URL from SITE_BASE, GITHUB_REPOSITORY, " +
      "or the git origin. Image URLs will be root-relative.",
  );
  return "";
};

export const SITE_BASE = resolveSiteBase();
