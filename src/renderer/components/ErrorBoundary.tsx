import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    if (window.ipc) {
      window.ipc.send("log-to-main", {
        level: "error",
        args: ["[ErrorBoundary]", error.message, errorInfo.componentStack],
      });
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center bg-black text-white p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-500 mb-4">
              Une erreur est survenue
            </h1>
            <pre className="bg-gray-900 p-4 rounded text-left overflow-auto max-w-2xl text-xs font-mono text-gray-300">
              {this.state.error?.message}
              {this.state.error?.stack}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-4 py-2 bg-blue-600 rounded hover:bg-blue-500"
            >
              Recharger l'application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
