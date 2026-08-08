import { Link, useParams } from "react-router";
import CoverArt from "../components/CoverArt";
import Icon from "../components/Icon";
import LibraryStatus from "../components/LibraryStatus";
import Meter from "../components/Meter";
import SourceTag from "../components/SourceTag";
import { SHOW_PLAYTIME } from "../config/env";
import useDocumentTitle from "../hooks/useDocumentTitle";
import useLibrary from "../hooks/useLibrary";
import { artUrl } from "../utils/art";
import {
  achievementSupportOf,
  formatDate,
  formatNumber,
  formatPlaytime,
  formatRelative,
} from "../utils/format";

const GamePage = () => {
  const { id } = useParams();
  const library = useLibrary();

  const game =
    library.status === "ready" ? library.games.find((entry) => entry.id === id) : undefined;

  // Falls back to the section name while loading, so the tab never shows
  // "undefined" between mount and fetch.
  useDocumentTitle(game?.title ?? "Game");

  if (library.status !== "ready") {
    return <LibraryStatus state={library} />;
  }

  if (!game) {
    return (
      <section className="py-16 text-center">
        <h1 className="font-display text-2xl text-foreground">No such game</h1>
        <p className="mt-3 text-muted">
          Nothing in the library has the id <code>{id}</code>. It may have dropped out of the
          recently-played window since that link was made.
        </p>
        <Link
          to="/library"
          className="mt-6 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-hover"
        >
          Back to the library
        </Link>
      </section>
    );
  }

  const support = achievementSupportOf(game);

  return (
    <div className="flex flex-col gap-10">
      <Link
        to="/library"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-accent"
      >
        <Icon name="back" />
        Library
      </Link>

      <section className="flex flex-col gap-6 sm:flex-row sm:gap-8">
        <div className="w-40 shrink-0 sm:w-56">
          <CoverArt game={game} loading="eager" />
        </div>

        <div className="flex-1">
          <h1 className="font-display text-3xl leading-tight text-foreground">{game.title}</h1>
          <p className="mt-3">
            <SourceTag source={game.source} platform={game.platform} />
          </p>

          <dl className="mt-6 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-medium uppercase tracking-widest text-muted">
                Last played
              </dt>
              <dd className="mt-1 font-display text-lg text-foreground">
                {formatRelative(game.lastPlayedAt)}
              </dd>
              <dd className="text-sm text-muted">{formatDate(game.lastPlayedAt)}</dd>
            </div>

            {SHOW_PLAYTIME && game.playtimeMinutes !== undefined && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-widest text-muted">
                  Playtime
                </dt>
                <dd className="mt-1 font-display text-lg text-foreground">
                  {formatPlaytime(game.playtimeMinutes)}
                </dd>
                <dd className="text-sm text-muted">{formatNumber(game.playtimeMinutes)} minutes</dd>
              </div>
            )}

            <div>
              <dt className="text-xs font-medium uppercase tracking-widest text-muted">
                Achievements
              </dt>
              <dd className="mt-1 font-display text-lg text-foreground">
                {support === "available" ? `${game.earnedCount}/${game.totalCount}` : "—"}
              </dd>
              <dd className="text-sm text-muted">
                {support === "available" && `${game.completionPct}% complete`}
                {support === "none" && "This game has no achievements to earn"}
                {/*
                  Said plainly rather than dressed up as zero: Steam answered,
                  but not with an achievement list, and guessing either way
                  would put a wrong fact on the page.
                */}
                {support === "unknown" && "Steam did not report whether this game has any"}
              </dd>
            </div>
          </dl>

          {support === "available" && (
            <div className="mt-6">
              <Meter
                value={game.completionPct}
                label={`${game.completionPct}% of achievements earned`}
              />
            </div>
          )}
        </div>
      </section>

      {/*
        Dropped entirely when there is nothing to unlock. An empty "Latest
        unlocks" panel saying "nothing yet" implies a task left undone, when in
        fact the game never offered one.
      */}
      {support !== "none" && (
        <section aria-labelledby="achievements-heading">
          <h2 id="achievements-heading" className="font-display text-lg text-foreground">
            Latest unlocks
          </h2>
          <p className="mt-1 text-sm text-muted">
            The collector keeps the four newest per game — enough to show what you were doing,
            without mirroring an entire achievement list.
          </p>

          {game.recentAchievements.length === 0 ? (
            <p className="mt-4 rounded-lg border border-divider bg-raised p-6 text-center text-muted">
              Nothing unlocked here yet.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {game.recentAchievements.map((achievement) => (
                <li
                  key={achievement.id}
                  className="flex items-start gap-4 rounded-lg border border-divider bg-raised p-4"
                >
                  {achievement.badgeUrl && (
                    <img
                      src={artUrl(achievement.badgeUrl)}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-14 w-14 shrink-0 rounded-md bg-track object-cover"
                    />
                  )}
                  <div className="min-w-0">
                    <h3 className="font-medium text-foreground">{achievement.title}</h3>
                    {achievement.description && (
                      <p className="mt-0.5 text-sm text-muted">{achievement.description}</p>
                    )}
                    <p className="mt-1.5 text-xs text-muted">
                      {formatRelative(achievement.earnedAt)}
                      {achievement.points !== undefined && ` · ${achievement.points} points`}
                      {achievement.hardcore && " · hardcore"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
};

export default GamePage;
