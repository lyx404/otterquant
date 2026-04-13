import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import SidebarLayout from "./components/SidebarLayout";
import CustomCursor from "./components/CustomCursor";
import Dashboard from "./pages/Dashboard";
import MyAlphas from "./pages/MyAlphas";
import AlphaDetail from "./pages/AlphaDetail";
import Leaderboard from "./pages/Leaderboard";
import Account from "./pages/Account";
import LaunchGuide from "./pages/LaunchGuide";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import OfficialLibrary from "./pages/OfficialLibrary";
import { useState, useEffect, useCallback, createContext, useContext } from "react";

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
      <Route path="/alphas/official">
        <ProtectedRoute component={OfficialLibrary} />
      </Route>
      <Route path="/alphas/:id">
        <ProtectedRoute component={AlphaDetail} />
      </Route>
      <Route path="/leaderboard">
        <ProtectedRoute component={Leaderboard} />
      </Route>
      <Route path="/account">
        <ProtectedRoute component={Account} />
      </Route>

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

/* ── Layout wrapper: Landing/Auth/LaunchGuide = no layout, Dashboard pages = SidebarLayout ── */
function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const noLayoutPaths = ["/launch-guide", "/landing", "/auth"];
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
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
