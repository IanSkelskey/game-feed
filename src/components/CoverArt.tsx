import { useState } from "react";
import type { PlayedGame } from "../types";
import { artUrl } from "../utils/art";

type CoverArtProps = {
  game: PlayedGame;
  /** Below the fold in a long grid, so lazy by default. */
  loading?: "lazy" | "eager";
};

/**
 * A game's portrait cover, or a lettered placeholder.
 *
 * Two things can go wrong and both are ordinary: the collector found no art for
 * a game (`coverUrl` absent), or the art exists but its host is unreachable —
 * a fork's feed points at absolute URLs on the site that published it. Either
 * way the card keeps its shape, because a 2:3 box that collapses would reflow
 * the whole grid.
 */
const CoverArt = ({ game, loading = "lazy" }: CoverArtProps) => {
  const [state, setState] = useState<"loading" | "loaded" | "failed">("loading");
  const showPlaceholder = !game.coverUrl || state === "failed";

  if (showPlaceholder) {
    return (
      <div
        className="flex aspect-[2/3] items-center justify-center rounded-md bg-gradient-to-br from-track to-raised"
        aria-hidden
      >
        <span className="font-display text-4xl text-faint">{game.title.slice(0, 1)}</span>
      </div>
    );
  }

  return (
    <img
      src={artUrl(game.coverUrl)}
      // The card's heading names the game; repeating it here would make screen
      // readers announce the title twice for one link.
      alt=""
      loading={loading}
      decoding="async"
      onLoad={() => setState("loaded")}
      onError={() => setState("failed")}
      className={`aspect-[2/3] w-full rounded-md object-cover ${
        state === "loaded" ? "bg-transparent" : "bg-track"
      }`}
    />
  );
};

export default CoverArt;
