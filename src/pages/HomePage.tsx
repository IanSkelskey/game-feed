import { Link } from "react-router";
import useDocumentTitle from "../hooks/useDocumentTitle";

const HomePage = () => {
  useDocumentTitle();

  return (
    <section aria-labelledby="home-heading" className="flex flex-col gap-6">
      <div>
        <h1 id="home-heading" className="text-4xl font-bold text-foreground">
          Welcome
        </h1>
        <p className="mt-3 max-w-prose text-muted">
          A minimal React + TypeScript + Vite + Tailwind v4 template with a pre-wired accessibility
          baseline, error boundary, lazy routes, semantic color tokens, and a documented convention
          set.
        </p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2">
        <li className="rounded-lg border border-divider bg-raised p-4">
          <h2 className="font-semibold text-foreground">Semantic tokens</h2>
          <p className="mt-1 text-sm text-muted">
            Dark mode adapts automatically via <code>prefers-color-scheme</code>.
          </p>
        </li>
        <li className="rounded-lg border border-divider bg-raised p-4">
          <h2 className="font-semibold text-foreground">Deploy to GitHub Pages</h2>
          <p className="mt-1 text-sm text-muted">
            A workflow in <code>.github/workflows/deploy.yml</code> ships the
            <code>dist/</code> folder on every push to <code>main</code>.
          </p>
        </li>
      </ul>

      <p className="text-muted">
        The{" "}
        <Link to="/demo" className="font-medium text-accent hover:text-accent-hover">
          Demo page
        </Link>{" "}
        exercises every built-in — <code>fetchWithTimeout</code>, <code>config/env</code>,{" "}
        <code>ErrorBoundary</code>, <code>RouteFallback</code>, and the semantic tokens. Delete it
        along with <code>public/demo-data.json</code> when you fork the template.
      </p>
    </section>
  );
};

export default HomePage;
