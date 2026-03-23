/**
 * ErrorBoundary — catches rendering or API errors in any wrapped subtree
 * and shows a friendly fallback instead of a blank screen.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <MyPage />
 *   </ErrorBoundary>
 */
import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-8 text-center"
        style={{ background: "var(--surface-page)" }}
        role="alert"
        aria-live="assertive"
      >
        <img
          src="https://media.base44.com/images/public/69b1df337f72186a6fd4c0c7/47e72826a_ChatGPTImageMar23202603_38_05PM1.png"
          alt="שגיאה"
          className="w-40 h-40 object-contain mb-2"
        />
        <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
          משהו השתבש
        </h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
          אירעה שגיאה בלתי צפויה. אנא נסה לרענן את הדף.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 rounded-2xl font-bold text-white"
          style={{ background: "var(--hanoo-blue)", minHeight: 44 }}
        >
          רענן דף
        </button>
      </div>
    );
  }
}