import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config.jsx'
import MyParking from './pages/MyParking'
import Bookings from './pages/Bookings'
import AdminDashboard from './pages/AdminDashboard'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfService from './pages/TermsOfService'
import Accessibility from './pages/Accessibility'
import ReportBug from './pages/ReportBug'
import JoinViaLink from './pages/JoinViaLink'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { NavigationProvider } from '@/lib/NavigationContext';
import PageTransition from '@/components/PageTransition';
import ErrorBoundary from '@/components/ErrorBoundary';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

// Wraps every route with the shared Layout + PageTransition animation
const LayoutWrapper = ({ children, currentPageName }) => {
  const inner = <PageTransition>{children}</PageTransition>;
  return Layout
    ? <Layout currentPageName={currentPageName}>{inner}</Layout>
    : inner;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    if (authError.type === 'auth_required') { navigateToLogin(); return null; }
  }

  return (
    <Routes>
      {/* Main/splash route */}
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />

      {/* pagesConfig lazy-loaded pages */}
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

      {/* Explicit routes for pages not in pagesConfig */}
      <Route path="/MyParking"      element={<LayoutWrapper currentPageName="MyParking"><MyParking /></LayoutWrapper>} />
      <Route path="/Bookings"       element={<LayoutWrapper currentPageName="Bookings"><Bookings /></LayoutWrapper>} />
      <Route path="/AdminDashboard" element={<LayoutWrapper currentPageName="AdminDashboard"><AdminDashboard /></LayoutWrapper>} />
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
  )
}

export default App