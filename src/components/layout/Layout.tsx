import type { PropsWithChildren } from "react";
import { Link, NavLink } from "react-router";
import {
  APP_VERSION,
  AUTHOR_NAME,
  AUTHOR_URL,
  BASE_PATH,
  SCAFFOLD,
  SITE_NAME,
} from "../../config/env";
import useLibrary from "../../hooks/useLibrary";
import { formatDateTime, formatRelative } from "../../utils/format";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `font-medium ${isActive ? "text-accent" : "text-foreground hover:text-accent"}`;

const Layout = ({ children }: PropsWithChildren) => {
  // Shares the one cached request every page already makes, so asking here
  // costs nothing. The banner belongs to the shell rather than to each page:
  // it is true of the whole site, not of one screen.
  const library = useLibrary();
  const showingSample = library.status === "ready" && library.isSample;
  const collectedAt = library.status === "ready" ? library.meta?.collectedAt : undefined;

  return (
    <div className="flex min-h-full flex-col bg-surface text-foreground">
      <header className="border-b border-divider bg-raised">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <NavLink
            to="/"
            className="inline-flex items-center gap-2.5 font-display text-lg tracking-wide text-accent hover:text-accent-hover"
          >
            {/*
              The favicon, reused as the wordmark. It lives in `public/` because
              index.html needs a stable path for the tab icon, so it is
              referenced through BASE_PATH rather than imported — Vite rewrites
              asset URLs it can see, and a bare "/icon.svg" would break on a
              project page served from /<repo>/.

              Decorative: the site name is right beside it in text.
            */}
            <img
              src={`${BASE_PATH}icon.svg`}
              alt=""
              width={28}
              height={28}
              className="rounded-md"
            />
            {SITE_NAME}
          </NavLink>
          <nav aria-label="Primary">
            <ul className="flex items-center gap-6 text-sm">
              <li>
                <NavLink to="/" end className={navLinkClass}>
                  Overview
                </NavLink>
              </li>
              <li>
                <NavLink to="/library" className={navLinkClass}>
                  Library
                </NavLink>
              </li>
              <li>
                <NavLink to="/data" className={navLinkClass}>
                  Data
                </NavLink>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      {showingSample && (
        <div className="border-b border-divider bg-accent/10">
          <p className="mx-auto max-w-6xl px-6 py-2.5 text-center text-sm text-muted">
            <span className="font-medium text-foreground">Sample data.</span> Nothing has been
            collected into this deployment yet — run <code>npm run collect</code>, or see{" "}
            <Link to="/data" className="font-medium text-accent hover:text-accent-hover">
              how to set it up
            </Link>
            .
          </p>
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">{children}</main>

      <footer className="border-t border-divider bg-raised">
        <div className="mx-auto max-w-6xl px-6 py-5 text-center text-sm text-muted">
          <p>
            Made with{" "}
            {/*
              `role="img"` rather than a bare `aria-label`: an aria-label on a
              plain span is ignored by several screen readers, so the character
              would be announced as "black heart suit" or skipped entirely.
            */}
            <span role="img" aria-label="love" className="text-accent">
              ♥
            </span>{" "}
            by{" "}
            <a href={AUTHOR_URL} className="font-medium text-accent hover:text-accent-hover">
              {AUTHOR_NAME}
            </a>
            . &copy; {new Date().getFullYear()}
          </p>

          <p className="mt-1.5 text-xs">
            Collected from Steam and RetroAchievements
            {collectedAt && (
              <>
                , current as of{" "}
                {/* The exact timestamp on hover; the relative one is what
                    anybody actually wants to know. */}
                <time dateTime={collectedAt} title={formatDateTime(collectedAt)}>
                  {formatRelative(collectedAt)}
                </time>
              </>
            )}
            . Art belongs to its publishers.
          </p>

          {/* A version string is readable content, not chrome — `text-muted`, not `text-faint`. */}
          <p className="mt-1 text-xs text-muted">
            {SCAFFOLD && (
              <>
                Scaffolded from{" "}
                <a href={SCAFFOLD.url} className="hover:text-accent">
                  {SCAFFOLD.name}
                </a>{" "}
                <span aria-hidden>·</span>{" "}
              </>
            )}
            v{APP_VERSION}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
