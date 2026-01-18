import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="p-4 m-4 bg-red-50 border border-red-200 rounded-lg text-red-900 overflow-auto max-h-screen">
                    <h1 className="text-xl font-bold mb-2">Algo salió mal (Mobile Debug)</h1>
                    <p className="mb-4">Por favor toma una captura de esta pantalla y envíala al desarrollador.</p>
                    <div className="bg-white p-4 rounded border font-mono text-xs whitespace-pre-wrap">
                        <p className="font-bold text-red-600 mb-2">{this.state.error?.toString()}</p>
                        <hr className="my-2" />
                        {this.state.errorInfo?.componentStack}
                    </div>
                    <button
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                        onClick={() => window.location.reload()}
                    >
                        Recargar aplicación
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
