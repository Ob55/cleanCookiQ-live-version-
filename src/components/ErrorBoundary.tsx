import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Last-line-of-defence error boundary. Catches any uncaught render error
 * in the tree below and shows a branded fallback instead of a blank page.
 * Sits at the top of <App /> so even routing/layout failures are caught.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("ErrorBoundary caught:", error, info.componentStack);
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleHome = () => {
    window.location.href = "/";
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(28_15%_13%)] text-[hsl(36_27%_95%)] px-6">
        <div className="max-w-md w-full text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(33_100%_50%)]/15 border border-[hsl(33_100%_50%)]/30 mb-6">
            <AlertTriangle className="h-6 w-6 text-[hsl(36_100%_64%)]" />
          </div>
          <h1 className="text-2xl font-semibold mb-2" style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}>
            Something went wrong
          </h1>
          <p className="text-sm text-white/65 leading-relaxed mb-8">
            The page hit an unexpected error and couldn't render. Try reloading — if it keeps happening, head back home and we'll look into it.
          </p>
          {import.meta.env.DEV && this.state.error?.message && (
            <pre className="text-left text-xs bg-black/40 border border-white/10 rounded-lg p-3 mb-6 overflow-x-auto text-white/70">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex gap-3 justify-center">
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-gradient-to-br from-[hsl(26_92%_42%)] via-[hsl(33_100%_50%)] to-[hsl(36_100%_64%)] text-white font-semibold text-sm hover:opacity-95 transition-opacity"
            >
              <RefreshCw className="h-4 w-4" /> Reload
            </button>
            <button
              onClick={this.handleHome}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-white/5 border border-white/15 text-white font-medium text-sm hover:bg-white/10 transition-colors"
            >
              <Home className="h-4 w-4" /> Home
            </button>
          </div>
        </div>
      </div>
    );
  }
}
