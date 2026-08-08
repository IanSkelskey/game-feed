import { BASE_PATH } from "../config/env";

/**
 * Matches an art path inside one of our own image URLs.
 *
 * Deliberately narrow: only the three directories the collector writes, and
 * case-sensitive, so it cannot catch an upstream CDN path that happens to
 * contain the word "images" — `media.retroachievements.org/Images/…` is one,
 * and the bundled sample is full of them.
 */
const OWN_ART = /\/(images\/(?:covers|icons|badges)\/.+)$/;

/**
 * Points an image URL at this deployment's own copy.
 *
 * The feed stores absolute URLs on purpose — another app can render
 * `game.coverUrl` with no rewriting, which is the whole point of publishing a
 * feed. But those URLs name the site the data was collected *for*, so before
 * the first deploy (and on every `npm run dev` after it) they resolve to a
 * page that does not exist yet, and the entire library renders as
 * placeholders.
 *
 * Rewriting onto `BASE_PATH` fixes that without weakening the feed: locally
 * the files are served straight from `images/`, and once deployed the two
 * URLs address the same bytes anyway. Anything that isn't ours — sample data
 * pointing at Steam's or RetroAchievements' CDNs — passes through untouched.
 */
export const artUrl = (url: string | undefined): string | undefined => {
  if (!url) return undefined;
  const path = OWN_ART.exec(url)?.[1];
  return path ? `${BASE_PATH}${path}` : url;
};
