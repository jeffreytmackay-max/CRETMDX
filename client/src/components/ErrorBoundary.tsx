import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  label?: string;
}
interface State {
  error: Error | null;
}

// Catches render-time errors anywhere in the subtree so a single bad record or
// third-party (e.g. Leaflet) failure shows a recoverable message instead of a
// blank white screen. Without this, an uncaught error unmounts the whole route.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Surfaced in the browser console to aid debugging on the user's device.
    console.error('ErrorBoundary caught an error:', error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="text-lg font-semibold text-slate-900">
            {this.props.label || 'Something went wrong'}
          </div>
          <p className="max-w-md text-sm text-slate-500">
            This section hit an unexpected error and stopped instead of showing a blank screen.
            You can try again, or go back and continue using the rest of the app.
          </p>
          <pre className="max-w-md overflow-x-auto rounded-lg bg-slate-50 p-3 text-left text-xs text-rose-600">
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <button
            onClick={this.reset}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
