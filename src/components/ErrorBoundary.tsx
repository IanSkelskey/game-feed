import { Component, type ErrorInfo, type ReactNode } from "react";
import "./ErrorBoundary.css";

type ErrorBoundaryProps = {
  children: ReactNode;
  /**
   * Optional key that, when changed, resets the boundary.
   * Typically passed as the current route pathname so that errors do not
   * persist across navigation.
   */
  resetKey?: string;
  /** Optional custom fallback. Defaults to the built-in error card. */
  fallback?: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Hook in your logging/telemetry here.
    console.error("ErrorBoundary caught an error:", error, info);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="error-boundary" role="alert" aria-live="assertive">
        <div className="error-boundary-card">
          <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
          <p className="mt-2 text-muted">
            An unexpected error occurred. Try reloading the page or returning to the previous view.
          </p>
          {this.state.error?.message && (
            <pre className="error-boundary-message" aria-label="Error details">
              {this.state.error.message}
            </pre>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={this.handleReload}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-hover"
            >
              Reload page
            </button>
            <button
              type="button"
              onClick={this.handleReset}
              className="rounded-md border border-divider px-4 py-2 text-sm font-medium text-foreground hover:border-border-accent"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
