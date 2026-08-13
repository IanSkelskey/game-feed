import { lazy, Suspense } from "react";
import { Route, Routes, useLocation } from "react-router";
import ErrorBoundary from "./components/ErrorBoundary";
import Layout from "./components/layout/Layout";
import RouteFallback from "./components/RouteFallback";
import { SHOW_DOCS_PAGE } from "./config/env";
import HomePage from "./pages/HomePage";

// Lazy-load non-critical routes. Keep the home/landing route eager.
const LibraryPage = lazy(() => import("./pages/LibraryPage"));
const GamePage = lazy(() => import("./pages/GamePage"));
const DocsPage = lazy(() => import("./pages/DocsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const App = () => {
  const location = useLocation();

  return (
    <Layout>
      {/*
        Route-level boundary: a throwing page is replaced in-place while the
        header and footer stay mounted, and `resetKey` clears the error on
        navigation. The boundary in main.tsx sits outside the router and only
        catches failures during boot.
      */}
      <ErrorBoundary resetKey={location.pathname}>
        <Suspense fallback={<RouteFallback />} key={location.pathname}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/game/:id" element={<GamePage />} />
            {/*
              Unregistered rather than redirected when the page is off: /docs
              then falls through to the catch-all and answers 404, which is the
              truth. The lazy chunk is never requested either — nothing imports
              it at runtime, so the code goes unfetched rather than unreachable.
            */}
            {SHOW_DOCS_PAGE && <Route path="/docs" element={<DocsPage />} />}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </Layout>
  );
};

export default App;
