// src/components/ErrorBoundary.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

class ErrorBoundaryClass extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state;
      const isDevelopment = import.meta.env.DEV;

      return (
        <ErrorFallback
          error={error}
          errorInfo={errorInfo}
          isDevelopment={isDevelopment}
          onReset={this.handleReset}
          navigate={this.props.navigate}
        />
      );
    }

    return this.props.children;
  }
}

// Functional wrapper to use hooks
function ErrorFallback({ error, errorInfo, isDevelopment, onReset, navigate }) {
  const handleGoToDashboard = () => {
    navigate("/dashboard");
    onReset();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-white dark:bg-gray-900 border border-red-200 dark:border-red-800 rounded-lg shadow-lg p-6">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Something went wrong
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            An unexpected error occurred. Please try again or return to the dashboard.
          </p>
        </div>

        {isDevelopment && error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
            <h2 className="font-semibold text-red-900 dark:text-red-200 mb-2">
              Error Details (Development Mode):
            </h2>
            <pre className="text-xs text-red-800 dark:text-red-300 overflow-auto max-h-48">
              {error.toString()}
              {errorInfo && errorInfo.componentStack && (
                <>
                  {"\n\nComponent Stack:"}
                  {errorInfo.componentStack}
                </>
              )}
            </pre>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={onReset}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={handleGoToDashboard}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

// Wrapper component to use hooks
export default function ErrorBoundary({ children }) {
  const navigate = useNavigate();
  return <ErrorBoundaryClass navigate={navigate}>{children}</ErrorBoundaryClass>;
}

