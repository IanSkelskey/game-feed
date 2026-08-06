import { lazy, Suspense } from "react";
import { Route, Routes, useLocation } from "react-router";
import ErrorBoundary from "./components/ErrorBoundary";
import Layout from "./components/layout/Layout";
import RouteFallback from "./components/RouteFallback";
import HomePage from "./pages/HomePage";

// Lazy-load non-critical routes. Keep the home/landing route eager.
const DemoPage = lazy(() => import("./pages/DemoPage"));
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
            <Route path="/demo" element={<DemoPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </Layout>
  );
};

export default App;
