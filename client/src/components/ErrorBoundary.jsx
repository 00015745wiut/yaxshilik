import { Component } from 'react';
import { Link } from 'react-router-dom';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="text-7xl select-none">⚠️</div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Something went wrong</h1>
            <p className="text-gray-500 mt-2 text-sm leading-relaxed">
              An unexpected error occurred. You can try refreshing the page or going back home.
            </p>
          </div>
          {this.state.error && (
            <details className="text-left bg-red-50 border border-red-200 rounded-xl p-4">
              <summary className="text-sm font-medium text-red-700 cursor-pointer">
                Error details
              </summary>
              <pre className="mt-2 text-xs text-red-600 overflow-auto whitespace-pre-wrap">
                {this.state.error.message}
              </pre>
            </details>
          )}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700
                hover:bg-gray-100 font-medium text-sm transition-colors"
            >
              Reload page
            </button>
            <Link
              to="/"
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700
                text-white font-semibold text-sm transition-colors"
            >
              Go Home
            </Link>
          </div>
        </div>
      </div>
    );
  }
}
