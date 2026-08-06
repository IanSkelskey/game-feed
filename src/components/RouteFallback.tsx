import "./RouteFallback.css";

/**
 * Rendered by <Suspense> while a lazy route chunk loads. Keeps the layout
 * stable (header/footer remain mounted) and announces loading to AT.
 */
const RouteFallback = () => {
  return (
    <div className="route-fallback" role="status" aria-live="polite" aria-label="Loading page">
      <div className="route-fallback-spinner" aria-hidden />
    </div>
  );
};

export default RouteFallback;
