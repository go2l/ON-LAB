import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
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
                <div className="min-h-screen flex items-center justify-center bg-red-50 p-6 font-sans">
                    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-2xl w-full border border-red-100">
                        <h1 className="text-2xl font-black text-red-600 mb-4">משהו השתבש...</h1>
                        <p className="text-slate-600 mb-6 font-medium">האפליקציה נתקלה בשגיאה לא צפויה.</p>

                        <div className="bg-slate-900 rounded-xl p-6 overflow-auto max-h-96 text-left" dir="ltr">
                            <p className="text-red-400 font-mono font-bold text-sm mb-2">
                                {this.state.error?.toString()}
                            </p>
                            <pre className="text-slate-500 font-mono text-xs whitespace-pre-wrap">
                                {this.state.errorInfo?.componentStack || this.state.error?.stack}
                            </pre>
                        </div>

                        <button
                            onClick={() => window.location.reload()}
                            className="mt-8 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition-all"
                        >
                            טעינה מחדש של הדף
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
