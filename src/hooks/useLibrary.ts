import { useEffect, useState } from "react";
import type { LibraryState } from "../types";
import { loadGames } from "../utils/loadGames";

/**
 * The one data dependency in the app. Every page calls this; the underlying
 * request is shared and made once per session.
 *
 * `empty` is distinguished from `error` on purpose — a freshly forked template
 * has no collected data yet, and that deserves setup instructions rather than
 * a failure message.
 */
const useLibrary = (): LibraryState => {
  const [state, setState] = useState<LibraryState>({ status: "loading" });

  useEffect(() => {
    let active = true;

    loadGames().then(
      ({ games, isSample, meta }) => {
        if (!active) return;
        setState(
          games.length > 0 ? { status: "ready", games, isSample, meta } : { status: "empty" },
        );
      },
      (error: unknown) => {
        if (!active) return;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Could not load the library.",
        });
      },
    );

    return () => {
      active = false;
    };
  }, []);

  return state;
};

export default useLibrary;
