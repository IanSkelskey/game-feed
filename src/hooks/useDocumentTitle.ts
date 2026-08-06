import { useEffect } from "react";

const BASE_TITLE = "React TS Template";

/**
 * Sets `document.title` for the current route. Pass a section title to prepend,
 * or call with no arguments to restore the base title.
 *
 * Always prefer this hook over mutating `document.title` directly.
 */
const useDocumentTitle = (title?: string) => {
  useEffect(() => {
    document.title = title ? `${title} | ${BASE_TITLE}` : BASE_TITLE;
    return () => {
      document.title = BASE_TITLE;
    };
  }, [title]);
};

export default useDocumentTitle;
