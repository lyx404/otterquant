import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, Redirect, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AppLanguageProvider } from "./contexts/AppLanguageContext";
import SidebarLayout from "./components/SidebarLayout";
import CustomCursor from "./components/CustomCursor";
import { Suspense, lazy, useState, useEffect, useCallback, createContext, useContext } from "react";

const NotFound = lazy(() => import("@/pages/NotFound"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const MyAlphas = lazy(() => import("@/pages/MyAlphas"));
const AlphaDetail = lazy(() => import("@/pages/AlphaDetail"));
const Leaderboard = lazy(() => import("@/pages/Leaderboard"));
const Account = lazy(() => import("@/pages/Account"));
const LaunchGuide = lazy(() => import("@/pages/LaunchGuide"));
const Landing = lazy(() => import("@/pages/Landing"));
const Auth = lazy(() => import("@/pages/Auth"));
const OfficialLibrary = lazy(() => import("@/pages/OfficialLibrary"));
const AlphaEdit = lazy(() => import("@/pages/AlphaEdit"));
const MyStrategies = lazy(() => import("@/pages/MyStrategies"));
const StrategyLibrary = lazy(() => import("@/pages/StrategyLibrary"));
const StrategyDetail = lazy(() => import("@/pages/StrategyDetail"));
const StrategyCreate = lazy(() => import("@/pages/StrategyCreate"));
const Trade = lazy(() => import("@/pages/Trade"));
const TradeDetail = lazy(() => import("@/pages/TradeDetail"));
const LazySubscription = lazy(() => import("@/pages/Subscription"));
const LinkCheckout = lazy(() => import("@/pages/LinkCheckout"));

/* ── Onboarding context for reactive state ── */
interface OnboardingCtx {
  onboarded: boolean;
  markOnboarded: () => void;
}
const OnboardingContext = createContext<OnboardingCtx>({
  onboarded: false,
  markOnboarded: () => {},
});

export function useOnboarding() {
  return useContext(OnboardingContext);
}

function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    const val = localStorage.getItem("alphaforge_onboarded");
    setOnboarded(val === "true");
    setChecked(true);
  }, []);

  const markOnboarded = useCallback(() => {
    localStorage.setItem("alphaforge_onboarded", "true");
    setOnboarded(true);
  }, []);

  if (!checked) return null;

  return (
    <OnboardingContext.Provider value={{ onboarded, markOnboarded }}>
      {children}
    </OnboardingContext.Provider>
  );
}

/* ── Protected Route — redirects to /auth if not authenticated ── */
function ProtectedRoute({
  component: Component,
}: {
  component: React.ComponentType;
}) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Redirect to="/auth" />;
  return <Component />;
}

/* ── Router ── */
function Router() {
  const { onboarded } = useOnboarding();
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) return null;

  // Public routes that don't need auth
  const publicPaths = ["/landing", "/auth", "/launch-guide"];
  const isPublicPath = publicPaths.some(
    (p) => location === p || location.startsWith(p)
  );

  // If not authenticated and trying to access protected route, redirect to auth
  // Exception: landing and auth pages are always accessible
  if (!isAuthenticated && !isPublicPath && location !== "/") {
    return <Redirect to="/auth" />;
  }

  // If not authenticated and at root, show landing
  if (!isAuthenticated && location === "/") {
    return <Redirect to="/landing" />;
  }

  // If authenticated and not onboarded, redirect to launch guide
  // (except for landing, auth, and launch-guide itself)
  if (
    isAuthenticated &&
    !onboarded &&
    location !== "/launch-guide" &&
    location !== "/landing" &&
    location !== "/auth"
  ) {
    return <Redirect to="/launch-guide" />;
  }

  return (
    <Suspense fallback={null}>
      <Switch>
        {/* Public routes */}
        <Route path="/landing" component={Landing} />
        <Route path="/auth" component={Auth} />
        <Route path="/launch-guide" component={LaunchGuide} />

        {/* Protected routes */}
        <Route path="/">
          <ProtectedRoute component={Dashboard} />
        </Route>
        <Route path="/alphas">
          <ProtectedRoute component={MyAlphas} />
        </Route>
        <Route path="/alphas/new">
          <ProtectedRoute component={AlphaEdit} />
        </Route>
        <Route path="/alphas/official">
          <ProtectedRoute component={OfficialLibrary} />
        </Route>
        <Route path="/alphas/:id">
          <ProtectedRoute component={AlphaDetail} />
        </Route>
        <Route path="/strategies/new">
          <ProtectedRoute component={StrategyCreate} />
        </Route>
        <Route path="/strategies/official">
          <ProtectedRoute component={StrategyLibrary} />
        </Route>
        <Route path="/strategies/:id">
          <ProtectedRoute component={StrategyDetail} />
        </Route>
        <Route path="/strategies">
          <ProtectedRoute component={MyStrategies} />
        </Route>
        <Route path="/trade/:id">
          <ProtectedRoute component={TradeDetail} />
        </Route>
        <Route path="/trade">
          <ProtectedRoute component={Trade} />
        </Route>
        <Route path="/leaderboard">
          <ProtectedRoute component={Leaderboard} />
        </Route>
        <Route path="/subscription/hosting">
          <ProtectedRoute component={LazySubscription} />
        </Route>
        <Route path="/subscription">
          <ProtectedRoute component={LazySubscription} />
        </Route>
        <Route path="/link-checkout">
          <ProtectedRoute component={LinkCheckout} />
        </Route>
        <Route path="/account">
          <ProtectedRoute component={Account} />
        </Route>

        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

/* ── Layout wrapper: Landing/Auth/LaunchGuide = no layout, Dashboard pages = SidebarLayout ── */
function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const noLayoutPaths = ["/launch-guide", "/landing", "/auth", "/link-checkout"];
  const hideLayout = noLayoutPaths.some(
    (p) => location === p || location.startsWith(p)
  );

  if (hideLayout) return <>{children}</>;
  return <SidebarLayout>{children}</SidebarLayout>;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <AppLanguageProvider>
          <TooltipProvider>
            <AuthProvider>
              <OnboardingProvider>
                <Toaster />
                <CustomCursor />
                <LayoutWrapper>
                  <Router />
                </LayoutWrapper>
              </OnboardingProvider>
            </AuthProvider>
          </TooltipProvider>
        </AppLanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
