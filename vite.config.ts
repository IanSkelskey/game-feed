import { createReadStream, existsSync, statSync } from "node:fs";
import { cp, mkdir } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const ROOT = fileURLToPath(new URL(".", import.meta.url));

/** Written by `npm run collect`, served by the site, read by the front end. */
const COLLECTED_DIRS = ["data", "images"];

const CONTENT_TYPES: Record<string, string> = {
  ".json": "application/json",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

/**
 * Publishes `data/` and `images/` as part of the site.
 *
 * They live at the repo root rather than in `public/` because they are the
 * collector's output — committed by the collect workflow, replaced wholesale on
 * every run, and meaningful on their own as a data feed. Keeping them out of
 * `public/` means a fork can delete them without touching the app, and `git
 * diff` on a collection run stays readable.
 *
 * Serving them under the site's own origin is what makes the feed usable from
 * another app: GitHub Pages sends `Access-Control-Allow-Origin: *`, which
 * raw.githubusercontent.com does not.
 */
const collectedData = (): Plugin => {
  let base = "/";

  return {
    name: "collected-data",

    configResolved(config) {
      base = config.base;
    },

    // Dev only: Vite serves `public/` and nothing else from disk, so the same
    // paths the built site exposes have to be wired up by hand.
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split("?")[0] ?? "";
        const path = decodeURIComponent(
          url.startsWith(base) ? url.slice(base.length) : url.replace(/^\//, ""),
        );

        const top = path.split("/")[0] ?? "";
        if (!COLLECTED_DIRS.includes(top)) return next();

        // Only paths naming a servable file are ours. `/data` is also an app
        // route, and claiming the whole prefix would answer the docs page with
        // a 404 instead of letting the SPA render it.
        if (!CONTENT_TYPES[extname(path).toLowerCase()]) return next();

        // `normalize` collapses any `..` segments; the prefix check then
        // guarantees the result is still inside the repo.
        const file = normalize(join(ROOT, path));
        if (!file.startsWith(normalize(ROOT))) return next();

        // A miss under our own prefixes is a miss, not an unmatched SPA route.
        // Falling through to `next()` hands it to Vite's history fallback,
        // which answers 200 with index.html — so a fork with no collected data
        // would see the feed "succeed" and then fail to parse, instead of
        // taking the 404 path that GitHub Pages actually serves.
        if (!existsSync(file) || !statSync(file).isFile()) {
          res.statusCode = 404;
          res.setHeader("Content-Type", "application/json");
          res.end(`{"error":"${path} has not been collected yet"}`);
          return;
        }

        res.setHeader(
          "Content-Type",
          CONTENT_TYPES[extname(file).toLowerCase()] ?? "application/octet-stream",
        );
        res.setHeader("Access-Control-Allow-Origin", "*");
        createReadStream(file).pipe(res);
      });
    },

    // Build: copy verbatim into the deployed output. `writeBundle` runs after
    // Vite has emptied `dist/`, so nothing copied here gets cleared afterwards.
    async writeBundle(options) {
      const outDir = options.dir ?? resolve(ROOT, "dist");
      for (const dir of COLLECTED_DIRS) {
        const from = resolve(ROOT, dir);
        if (!existsSync(from)) continue;
        await mkdir(join(outDir, dir), { recursive: true });
        await cp(from, join(outDir, dir), { recursive: true });
      }
    },
  };
};

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
  plugins: [react(), tailwindcss(), collectedData(), spaGitHubPages404()],
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
