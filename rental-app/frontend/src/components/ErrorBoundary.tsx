import React, { ReactNode } from 'react';
import { AnimatedButton } from './AnimatedButton';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh bg-background text-foreground flex flex-col items-center justify-center px-6 text-center space-y-6">
          <p className="text-sm uppercase tracking-[0.4em] text-muted">Rental Suite</p>
          <h1 className="text-4xl font-display tracking-tight">Something went wrong</h1>
          <p className="max-w-md text-sm text-muted">
            An unexpected error occurred. Please refresh the page or contact support if the problem persists.
          </p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="max-w-lg text-left">
              <summary className="cursor-pointer text-xs text-muted underline">Error details</summary>
              <pre className="mt-2 bg-surface-1 p-3 rounded text-xs overflow-auto max-h-40">
                {this.state.error.message}
                {'\n\n'}
                {this.state.error.stack}
              </pre>
            </details>
          )}
          <div className="flex gap-3">
            <AnimatedButton onClick={this.resetError}>Try again</AnimatedButton>
            <button
              onClick={() => window.location.href = '/'}
              className="px-6 py-2 rounded-full border border-outline text-muted hover:text-foreground"
            >
              Go home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
