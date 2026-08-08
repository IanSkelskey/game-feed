import { useEffect } from "react";
import { SITE_NAME } from "../config/env";

/**
 * Sets `document.title` for the current route. Pass a section title to prepend,
 * or call with no arguments to restore the base title.
 *
 * Always prefer this hook over mutating `document.title` directly.
 */
const useDocumentTitle = (title?: string) => {
  useEffect(() => {
    document.title = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
    return () => {
      document.title = SITE_NAME;
    };
  }, [title]);
};

export default useDocumentTitle;
