import { useId, useMemo } from "react";
import { useSearchParams } from "react-router";
import GameCard from "../components/GameCard";
import Icon from "../components/Icon";
import LibraryStatus from "../components/LibraryStatus";
import useDocumentTitle from "../hooks/useDocumentTitle";
import useLibrary from "../hooks/useLibrary";
import type { PlayedGame, SourceFilter } from "../types";
import { formatNumber, SOURCE_LABELS } from "../utils/format";
import {
  isSortKey,
  isSourceFilter,
  platformsOf,
  selectGames,
  SORT_KEYS,
  SORTS,
  type LibraryQuery,
} from "../utils/library";

const NO_GAMES: PlayedGame[] = [];

/** The first row is above the fold, so its art loads eagerly. */
const PRIORITY_CARDS = 6;

const SOURCE_TABS: { value: SourceFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "steam", label: SOURCE_LABELS.steam },
  { value: "retroachievements", label: SOURCE_LABELS.retroachievements },
];

/**
 * The library grid.
 *
 * Filter state lives in the URL rather than in component state: a filtered
 * view is worth linking to, and it survives a reload and the back button for
 * free.
 */
const LibraryPage = () => {
  useDocumentTitle("Library");

  const library = useLibrary();
  const [params, setParams] = useSearchParams();
  const searchId = useId();
  const platformId = useId();
  const sortId = useId();

  const games = library.status === "ready" ? library.games : NO_GAMES;

  // Memoized on the params object — which react-router replaces only when the
  // query string actually changes — so `shown` below doesn't recompute on
  // every unrelated render. An unknown or hand-edited value falls back to the
  // default rather than emptying the grid.
  const query = useMemo<LibraryQuery>(() => {
    const source = params.get("source");
    const sort = params.get("sort");
    return {
      search: params.get("q") ?? "",
      source: isSourceFilter(source) ? source : "all",
      platform: params.get("platform") ?? "all",
      sort: isSortKey(sort) ? sort : "recent",
    };
  }, [params]);

  const platforms = useMemo(() => platformsOf(games), [games]);
  const shown = useMemo(() => selectGames(games, query), [games, query]);

  /** Writes one control's value, dropping it from the URL at its default. */
  const update = (key: string, value: string, fallback: string) => {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (value === fallback) next.delete(key);
        else next.set(key, value);
        return next;
      },
      // Typing in the search box should not fill the back button with history.
      { replace: true },
    );
  };

  if (library.status !== "ready") {
    return <LibraryStatus state={library} />;
  }

  const filtered = shown.length !== games.length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl text-foreground">Library</h1>
        <p className="mt-2 max-w-prose text-muted">
          Every game the collector has seen, newest session first. Filters are kept in the address
          bar, so any view here is a link.
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-divider bg-raised p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label
              htmlFor={searchId}
              className="block text-xs font-medium uppercase tracking-widest text-muted"
            >
              Search
            </label>
            <div className="relative mt-1.5">
              <Icon
                name="search"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint"
              />
              <input
                id={searchId}
                type="search"
                value={query.search}
                onChange={(event) => update("q", event.target.value, "")}
                placeholder="Title or platform"
                className="w-full rounded-md border border-divider bg-surface py-2 pl-9 pr-3 text-sm text-foreground"
              />
            </div>
          </div>

          <div className="sm:w-52">
            <label
              htmlFor={platformId}
              className="block text-xs font-medium uppercase tracking-widest text-muted"
            >
              Platform
            </label>
            <select
              id={platformId}
              value={query.platform}
              onChange={(event) => update("platform", event.target.value, "all")}
              className="mt-1.5 w-full rounded-md border border-divider bg-surface px-3 py-2 text-sm text-foreground"
            >
              <option value="all">All platforms</option>
              {platforms.map((platform) => (
                <option key={platform} value={platform}>
                  {platform}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:w-48">
            <label
              htmlFor={sortId}
              className="block text-xs font-medium uppercase tracking-widest text-muted"
            >
              Sort
            </label>
            <select
              id={sortId}
              value={query.sort}
              onChange={(event) => update("sort", event.target.value, "recent")}
              className="mt-1.5 w-full rounded-md border border-divider bg-surface px-3 py-2 text-sm text-foreground"
            >
              {SORT_KEYS.map((key) => (
                <option key={key} value={key}>
                  {SORTS[key].label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-widest text-muted">Source</span>
          {SOURCE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              aria-pressed={query.source === tab.value}
              onClick={() => update("source", tab.value, "all")}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                query.source === tab.value
                  ? "border-transparent bg-accent text-on-accent"
                  : "border-divider text-muted hover:border-border-accent hover:text-accent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <p aria-live="polite" className="text-sm text-muted">
        {filtered
          ? `${formatNumber(shown.length)} of ${formatNumber(games.length)} games`
          : `${formatNumber(games.length)} games`}
      </p>

      {shown.length === 0 ? (
        <p className="rounded-lg border border-divider bg-raised p-6 text-center text-muted">
          Nothing matches those filters.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {shown.map((game, index) => (
            <li key={game.id}>
              <GameCard game={game} priority={index < PRIORITY_CARDS} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LibraryPage;
