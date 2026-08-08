import { Link } from "react-router";
import type { PlayedGame } from "../types";
import { achievementSupportOf, formatPlaytime, formatRelative } from "../utils/format";
import CoverArt from "./CoverArt";
import Meter from "./Meter";
import SourceTag from "./SourceTag";
import "./GameCard.css";

type GameCardProps = {
  game: PlayedGame;
  /** The first row of a grid is above the fold and should not lazy-load. */
  priority?: boolean;
};

const GameCard = ({ game, priority = false }: GameCardProps) => {
  const support = achievementSupportOf(game);

  return (
    // `h-full` + a column layout so that cards in a grid row share a height
    // however their titles wrap, and the achievement block sits on the floor of
    // every card rather than wherever the text above it happens to end.
    <article className="game-card flex h-full flex-col rounded-lg border border-divider bg-raised p-3">
      {/*
        The art duplicates the heading link, so it is hidden from assistive
        technology and taken out of the tab order — one card, one stop.
      */}
      <Link to={`/game/${game.id}`} tabIndex={-1} aria-hidden className="block">
        <CoverArt game={game} loading={priority ? "eager" : "lazy"} />
      </Link>

      <h3 className="mt-3 font-display text-sm leading-snug">
        <Link to={`/game/${game.id}`} className="game-card-link text-foreground">
          {game.title}
        </Link>
      </h3>

      <p className="mt-2">
        <SourceTag source={game.source} platform={game.platform} />
      </p>

      <p className="mt-2 text-xs text-muted">
        {game.playtimeMinutes ? `${formatPlaytime(game.playtimeMinutes)} · ` : ""}
        {formatRelative(game.lastPlayedAt)}
      </p>

      {/*
        Three outcomes, not two. A game with no achievement system gets a plain
        note rather than an empty meter: a 0% bar reads as "you have earned
        nothing here", which is a different and unfair statement about a game
        that has nothing to earn.
      */}
      <div className="mt-auto pt-3">
        {support === "available" ? (
          <>
            <Meter
              value={game.completionPct}
              variant="compact"
              label={`${game.title}: ${game.completionPct}% of achievements earned`}
            />
            <p className="mt-1.5 text-xs text-muted">
              {game.earnedCount}/{game.totalCount} achievements
            </p>
          </>
        ) : (
          <p className="text-xs text-muted">
            {support === "none" ? "No achievements" : "Achievements unknown"}
          </p>
        )}
      </div>
    </article>
  );
};

export default GameCard;
