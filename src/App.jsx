import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config.jsx'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { NavigationProvider } from '@/lib/NavigationContext';
import PageTransition from '@/components/PageTransition';
import ErrorBoundary from '@/components/ErrorBoundary';

// ── Lazy-load explicit page bundles (pages NOT in pagesConfig) ───────────────
const MyParking      = lazy(() => import('./pages/MyParking'));
const Bookings       = lazy(() => import('./pages/Bookings'));
const BookingDetails = lazy(() => import('./pages/BookingDetails'));
const PrivacyPolicy  = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const Accessibility  = lazy(() => import('./pages/Accessibility'));
const ReportBug      = lazy(() => import('./pages/ReportBug'));
const JoinViaLink    = lazy(() => import('./pages/JoinViaLink'));
const PublicBookingView = lazy(() => import('./pages/PublicBookingView'));

// ── Shared page-load fallback ─────────────────────────────────────────────────
const PageFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center" style={{ background: "var(--surface-page)" }}>
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
  </div>
);

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : null;

// ── Per-route wrapper: Layout → Suspense → ErrorBoundary → PageTransition ────
const LayoutWrapper = ({ children, currentPageName }) => {
  const inner = (
    <Suspense fallback={<PageFallback />}>
      <PageTransition>
        <ErrorBoundary>{children}</ErrorBoundary>
      </PageTransition>
    </Suspense>
  );
  return Layout
    ? <Layout currentPageName={currentPageName}>{inner}</Layout>
    : inner;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return <PageFallback />;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    if (authError.type === 'auth_required') { navigateToLogin(); return null; }
  }

  return (
    <Routes>
      {/* Main/splash route */}
      {MainPage && (
        <Route path="/" element={
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
          </LayoutWrapper>
        } />
      )}

      {/* pagesConfig pages (already lazy by the platform) */}
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}

      {/* Explicit routes — now lazy-loaded */}
      <Route path="/MyParking"      element={<LayoutWrapper currentPageName="MyParking"><MyParking /></LayoutWrapper>} />
      <Route path="/Bookings"       element={<LayoutWrapper currentPageName="Bookings"><Bookings /></LayoutWrapper>} />
      <Route path="/BookingDetails/:bookingId" element={<LayoutWrapper currentPageName="BookingDetails"><BookingDetails /></LayoutWrapper>} />
      <Route path="/PrivacyPolicy"  element={<LayoutWrapper currentPageName="PrivacyPolicy"><PrivacyPolicy /></LayoutWrapper>} />
      <Route path="/TermsOfService" element={<LayoutWrapper currentPageName="TermsOfService"><TermsOfService /></LayoutWrapper>} />
      <Route path="/Accessibility"  element={<LayoutWrapper currentPageName="Accessibility"><Accessibility /></LayoutWrapper>} />
      <Route path="/ReportBug"      element={<LayoutWrapper currentPageName="ReportBug"><ReportBug /></LayoutWrapper>} />
      <Route path="/JoinViaLink"    element={<LayoutWrapper currentPageName="JoinViaLink"><JoinViaLink /></LayoutWrapper>} />
      <Route path="*"               element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationProvider>
            <AuthenticatedApp />
          </NavigationProvider>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;