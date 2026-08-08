import { useMemo } from "react";
import { Link } from "react-router";
import CoverArt from "../components/CoverArt";
import useDocumentTitle from "../hooks/useDocumentTitle";
import useLibrary from "../hooks/useLibrary";
import { formatRelative } from "../utils/format";
import "./NotFound.css";

const NotFound = () => {
  useDocumentTitle("Game Over");

  const library = useLibrary();
  const games = library.status === "ready" ? library.games : undefined;

  // One pick per mount. Navigating away and back deals a different game, which
  // is the whole joke — this is the consolation prize screen.
  const consolation = useMemo(
    () => (games?.length ? games[Math.floor(Math.random() * games.length)] : undefined),
    [games],
  );

  return (
    <div className="flex flex-col items-center gap-10 py-10 text-center">
      <section className="not-found-cabinet w-full max-w-lg rounded-lg border border-divider bg-raised px-6 py-10">
        {/* Decorative CRT wash. Hidden from AT and dropped in forced-colors. */}
        <div className="not-found-scanlines" aria-hidden />

        <p className="text-xs font-medium uppercase tracking-[0.35em] text-muted">
          Credit 00 &middot; Score <span className="not-found-score">000404</span>
        </p>

        <h1 className="not-found-title mt-4 font-display text-5xl leading-none text-foreground">
          Game Over
        </h1>

        <p className="mx-auto mt-4 max-w-sm text-muted">
          That page isn&apos;t in the library. It may have dropped out of the recently-played
          window, or never existed at all.
        </p>

        {/*
          Blinks four times over ~5s and stops. A perpetually blinking element
          fails WCAG 2.2.2, and the global reduced-motion rule stops it outright
          for anyone who asked for that.
        */}
        <p className="not-found-blink mt-8 font-display text-sm uppercase tracking-[0.3em] text-accent">
          Insert coin to continue
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-hover"
          >
            Continue
          </Link>
          <Link
            to="/library"
            className="rounded-md border border-divider px-4 py-2 text-sm font-medium text-foreground hover:border-border-accent hover:text-accent"
          >
            Browse the library
          </Link>
        </div>
      </section>

      {consolation && (
        // Deliberately small: a garnish under the cabinet, not a second hero.
        <section aria-labelledby="consolation-heading" className="w-full max-w-[190px]">
          <h2
            id="consolation-heading"
            className="text-xs font-medium uppercase tracking-[0.3em] text-muted"
          >
            Last checkpoint
          </h2>
          <Link
            to={`/game/${consolation.id}`}
            className="not-found-checkpoint mt-4 block rounded-lg border border-divider bg-raised p-3 text-left"
          >
            <CoverArt game={consolation} loading="eager" />
            <p className="mt-3 font-display text-sm text-foreground">{consolation.title}</p>
            <p className="mt-1 text-xs text-muted">
              {consolation.platform} &middot; {formatRelative(consolation.lastPlayedAt)}
            </p>
          </Link>
        </section>
      )}
    </div>
  );
};

export default NotFound;
