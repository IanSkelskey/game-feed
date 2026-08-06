import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * Emits `404.html` for the GitHub Pages SPA deep-link trick, with the resolved
 * `base` baked in at build time.
 *
 * Generated rather than kept in `public/`, because Vite copies `public/`
 * verbatim — it never rewrites paths there. A hardcoded `/scripts/…` src or a
 * hand-tuned `pathSegmentsToKeep` constant silently breaks on project pages,
 * which are served from `/<repo>/` rather than `/`.
 *
 * https://github.com/rafgraph/spa-github-pages
 */
const spaGitHubPages404 = (): Plugin => {
  let base = "/";

  return {
    name: "spa-github-pages-404",
    apply: "build",
    configResolved(config) {
      base = config.base;
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "404.html",
        source: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Redirecting…</title>
    <script>
      /*
       * GitHub Pages serves this file (with a 404 status) for any path it has
       * no file for. Encode the requested path into a query string and bounce
       * to index.html, which IS served with a 200. The inline script in
       * index.html decodes it back before React Router boots.
       *
       * \`base\` is injected by vite.config.ts, so this works unchanged on a
       * project page (/<repo>/), a user page, or a custom domain.
       */
      (function (l) {
        var base = ${JSON.stringify(base)};
        l.replace(
          l.protocol +
            "//" +
            l.host +
            base +
            "?/" +
            l.pathname.slice(base.length).replace(/&/g, "~and~") +
            (l.search ? "&" + l.search.slice(1).replace(/&/g, "~and~") : "") +
            l.hash,
        );
      })(window.location);
    </script>
  </head>
  <body></body>
</html>
`,
      });
    },
  };
};

// https://vite.dev/config/
// `BASE_PATH` is set by the GitHub Pages deploy workflow to `/<repo>/`.
// Falls back to `/` for local dev and user-page / custom-domain deploys.
export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  plugins: [react(), tailwindcss(), spaGitHubPages404()],
  build: {
    rollupOptions: {
      output: {
        // Split the React runtime into its own chunk for better caching.
        manualChunks: (id) => {
          if (
            id.includes("node_modules/react-router") ||
            id.includes("node_modules/react-dom") ||
            id.match(/node_modules\/react\//)
          ) {
            return "react";
          }
          return undefined;
        },
      },
    },
  },
});
