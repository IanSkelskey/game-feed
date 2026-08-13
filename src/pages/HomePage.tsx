import { Fragment, useMemo, type ReactNode } from "react";
import { Link } from "react-router";
import BarList from "../components/BarList";
import GameCard from "../components/GameCard";
import LibraryStatus from "../components/LibraryStatus";
import Meter from "../components/Meter";
import StatTile from "../components/StatTile";
import {
  OVERVIEW_SECTIONS,
  RECENT_COUNT,
  SHOW_DOCS_PAGE,
  SHOW_PLAYTIME,
  TEXT,
} from "../config/env";
import useDocumentTitle from "../hooks/useDocumentTitle";
import type { OverviewSection, PlayedGame } from "../types";
import { formatNumber, formatPlaytime, formatRelative } from "../utils/format";
import { SORTS } from "../utils/library";
import { summarize } from "../utils/stats";
import useLibrary from "../hooks/useLibrary";

/** Stable identity, so the memos below don't recompute while the feed loads. */
const NO_GAMES: PlayedGame[] = [];

/** A section's optional sentence, rendered only when there is one to render. */
const Description = ({ text, id }: { text: string; id?: string }) =>
  text ? (
    <p id={id} className="mb-4 mt-1 text-sm text-muted">
      {text}
    </p>
  ) : null;

const HomePage = () => {
  useDocumentTitle();

  const library = useLibrary();
  const games = library.status === "ready" ? library.games : NO_GAMES;

  const summary = useMemo(() => summarize(games), [games]);
  const recent = useMemo(
    () => [...games].sort(SORTS.recent.compare).slice(0, RECENT_COUNT),
    [games],
  );

  // Hooks first: the early return has to come after every one of them.
  if (library.status !== "ready") {
    return <LibraryStatus state={library} />;
  }

  const steamCount = games.filter((game) => game.source === "steam").length;

  /**
   * The default intro, which the config can replace with a plain sentence.
   *
   * Two defaults rather than one: the paragraph's whole point is the link to
   * the feed's documentation, so with that page hidden it makes the same claim
   * without pointing at a 404.
   */
  const intro =
    TEXT.overview.description ??
    (SHOW_DOCS_PAGE ? (
      <>
        Everything below is derived from one static file this site publishes —{" "}
        <Link to="/docs" className="font-medium text-accent hover:text-accent-hover">
          the same feed
        </Link>{" "}
        any other app can read.
      </>
    ) : (
      <>Everything below is derived from one static file this site publishes.</>
    ));

  /**
   * Every block the page can render, keyed by its name in the config.
   *
   * Built as a record and then indexed by `OVERVIEW_SECTIONS`, so one setting
   * decides both order and presence; a section that has nothing to say still
   * decides that for itself by resolving to `null`.
   */
  const sections: Record<OverviewSection, ReactNode> = {
    stats: (
      /*
        The tiles carry no visible heading, and they can be configured to sit
        anywhere on the page — so the landmark is named rather than left to be
        identified by whatever happens to precede it.
      */
      <section aria-label={TEXT.stats.heading}>
        <Description text={TEXT.stats.description} />
        {/*
          The column count follows the tile count: dropping the playtime tile
          from a four-column grid would leave a hole at the end of the row
          rather than three evenly spread tiles.
        */}
        <dl
          className={`grid gap-4 sm:grid-cols-2 ${
            SHOW_PLAYTIME ? "lg:grid-cols-4" : "lg:grid-cols-3"
          }`}
        >
          <StatTile
            icon="grid"
            label="Games"
            value={formatNumber(summary.gameCount)}
            detail={`${steamCount} on Steam · ${summary.gameCount - steamCount} emulated`}
          />
          {SHOW_PLAYTIME && (
            <StatTile
              icon="clock"
              label="Time played"
              value={formatPlaytime(summary.totalMinutes)}
              detail="Steam reports playtime; RetroAchievements does not"
            />
          )}
          <StatTile
            icon="trophy"
            label="Achievements"
            value={formatNumber(summary.earned)}
            detail={`of ${formatNumber(summary.possible)} available`}
          />
          <StatTile
            icon="joystick"
            label="Platforms"
            value={formatNumber(summary.platformCount)}
            detail="Steam plus every emulated console"
          />
        </dl>
      </section>
    ),

    // One chart left over shouldn't sit in a half-width column.
    charts: (
      <div className={`grid gap-6 ${SHOW_PLAYTIME ? "lg:grid-cols-2" : ""}`}>
        {SHOW_PLAYTIME && (
          <section
            aria-labelledby="playtime-heading"
            className="rounded-lg border border-divider bg-raised p-5"
          >
            <h2 id="playtime-heading" className="font-display text-lg text-foreground">
              {TEXT.playtimeChart.heading}
            </h2>
            <Description text={TEXT.playtimeChart.description} />
            <BarList
              rows={summary.playtimeLeaders}
              format={formatPlaytime}
              series={1}
              labelledBy="playtime-heading"
            />
          </section>
        )}

        <section
          aria-labelledby="platform-heading"
          className="rounded-lg border border-divider bg-raised p-5"
        >
          <h2 id="platform-heading" className="font-display text-lg text-foreground">
            {TEXT.platformChart.heading}
          </h2>
          <Description text={TEXT.platformChart.description} />
          <BarList
            rows={summary.platformCounts}
            format={(value) => `${value} ${value === 1 ? "game" : "games"}`}
            // The second hue exists to separate two magnitude charts sharing a
            // screen. Alone, this one takes the first slot — a lone chart in
            // the "other" colour reads as though something is missing.
            series={SHOW_PLAYTIME ? 2 : 1}
            labelledBy="platform-heading"
          />
        </section>
      </div>
    ),

    completion:
      summary.completionLeaders.length > 0 ? (
        <section aria-labelledby="completion-heading">
          <h2 id="completion-heading" className="font-display text-lg text-foreground">
            {TEXT.completion.heading}
          </h2>
          <Description text={TEXT.completion.description} />
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {summary.completionLeaders.map((game) => (
              <li key={game.id} className="rounded-lg border border-divider bg-raised p-4">
                <div className="flex items-baseline justify-between gap-4">
                  <Link
                    to={`/game/${game.id}`}
                    className="truncate font-medium text-foreground hover:text-accent"
                  >
                    {game.title}
                  </Link>
                  <span className="shrink-0 text-sm text-muted">
                    {game.earnedCount}/{game.totalCount} · {game.completionPct}%
                  </span>
                </div>
                <div className="mt-3">
                  <Meter
                    value={game.completionPct}
                    label={`${game.title}: ${game.completionPct}% of achievements earned`}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null,

    recent: (
      <section aria-labelledby="recent-heading">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="recent-heading" className="font-display text-lg text-foreground">
            {TEXT.recent.heading}
          </h2>
          <Link to="/library" className="text-sm font-medium text-accent hover:text-accent-hover">
            All {formatNumber(summary.gameCount)} games
          </Link>
        </div>
        <Description text={TEXT.recent.description} />
        <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {recent.map((game) => (
            <li key={game.id}>
              <GameCard game={game} priority />
            </li>
          ))}
        </ul>
      </section>
    ),
  };

  return (
    <div className="flex flex-col gap-10">
      {/*
        The page's own heading, not one of the arrangeable sections: whatever
        order the blocks below are in, an `h1` still has to come first.
      */}
      <header>
        <h1 className="font-display text-3xl text-foreground">{TEXT.overview.heading}</h1>
        {intro && (
          <p className="mt-2 max-w-prose text-muted">
            {intro}
            {summary.lastPlayedAt && ` Last session ${formatRelative(summary.lastPlayedAt)}.`}
          </p>
        )}
      </header>

      {OVERVIEW_SECTIONS.map((name) => (
        <Fragment key={name}>{sections[name]}</Fragment>
      ))}
    </div>
  );
};

export default HomePage;
