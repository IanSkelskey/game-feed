import type { AchievementSupport, PlayedGame } from "../types";

/** Display formatting. Module-scope formatters are built once, not per render. */

const NUMBER = new Intl.NumberFormat(undefined);
const DATE = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
});
const RELATIVE = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
const DATE_TIME = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export const formatNumber = (value: number) => NUMBER.format(value);

/** `2026-08-01T…` → `1 Aug 2026`. */
export const formatDate = (iso: string) => DATE.format(new Date(iso));

/** The same, to the minute — for a `title` where the exact moment matters. */
export const formatDateTime = (iso: string) => DATE_TIME.format(new Date(iso));

/**
 * Playtime, in the largest unit that stays honest: minutes below an hour,
 * whole hours below a day, otherwise hours to one decimal is still noise — so
 * hours all the way up, which is how storefronts report it.
 */
export const formatPlaytime = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`;
  return `${NUMBER.format(Math.round(minutes / 60))} hrs`;
};

const DIVISIONS: [seconds: number, unit: Intl.RelativeTimeFormatUnit][] = [
  [60, "second"],
  [3600, "minute"],
  [86_400, "hour"],
  [604_800, "day"],
  [2_629_800, "week"],
  [31_557_600, "month"],
  [Infinity, "year"],
];

/** `2026-07-30T…` → `6 days ago`. Always past tense in practice. */
export const formatRelative = (iso: string, now = Date.now()) => {
  const seconds = (Date.parse(iso) - now) / 1000;
  let previous = 1;
  for (const [limit, unit] of DIVISIONS) {
    if (Math.abs(seconds) < limit) {
      return RELATIVE.format(Math.round(seconds / previous), unit);
    }
    previous = limit;
  }
  return DATE.format(new Date(iso));
};

/** Human label for a `GameSource`. */
export const SOURCE_LABELS = {
  steam: "Steam",
  retroachievements: "RetroAchievements",
} as const;

/**
 * Whether a game has achievements, for a feed that may predate the field.
 *
 * The fallback treats a missing field the way the old data has to be read —
 * `totalCount > 0` — rather than reporting "unknown", which would regress an
 * older feed from a confident answer to a shrug.
 */
export const achievementSupportOf = (game: PlayedGame): AchievementSupport =>
  game.achievementSupport ?? (game.totalCount > 0 ? "available" : "none");
