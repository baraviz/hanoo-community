/**
 * pages.config.jsx - Page routing configuration
 *
 * Uses React.lazy + Suspense for code-splitting on all routes.
 * THE ONLY EDITABLE VALUE: mainPage
 */
import { lazy, Suspense } from 'react';
import __Layout from './Layout.jsx';

// Lazy-loaded pages — each gets its own JS chunk
const Chat           = lazy(() => import('./pages/Chat'));
const FindParking    = lazy(() => import('./pages/FindParking'));
const Home           = lazy(() => import('./pages/Home'));
const Onboarding     = lazy(() => import('./pages/Onboarding'));
const Profile        = lazy(() => import('./pages/Profile'));
const PublishParking = lazy(() => import('./pages/PublishParking'));
const Splash         = lazy(() => import('./pages/Splash'));

// Lightweight fallback shown while a chunk loads
function PageLoader() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100dvh",
        background: "var(--surface-page)",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          border: "3px solid var(--surface-card-border)",
          borderTopColor: "var(--hanoo-blue)",
          animation: "spin 0.7s linear infinite",
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// Wrap every lazy page in Suspense so the router can render it
function withSuspense(Component) {
  return function SuspenseWrapper(props) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Component {...props} />
      </Suspense>
    );
  };
}

export const PAGES = {
  "Chat":           withSuspense(Chat),
  "FindParking":    withSuspense(FindParking),
  "Home":           withSuspense(Home),
  "Onboarding":     withSuspense(Onboarding),
  "Profile":        withSuspense(Profile),
  "PublishParking": withSuspense(PublishParking),
  "Splash":         withSuspense(Splash),
};

export const pagesConfig = {
  mainPage: "Splash",
  Pages: PAGES,
  Layout: __Layout,
};