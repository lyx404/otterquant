import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AppLayout from "./components/AppLayout";
import CustomCursor from "./components/CustomCursor";
import Dashboard from "./pages/Dashboard";
import MyAlphas from "./pages/MyAlphas";
import AlphaDetail from "./pages/AlphaDetail";
import Leaderboard from "./pages/Leaderboard";
import Account from "./pages/Account";
import LaunchGuide from "./pages/LaunchGuide";
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

/* ── Router ── */
function Router() {
  const { onboarded } = useOnboarding();
  const [location] = useLocation();

  // If not onboarded and not on launch-guide, redirect
  if (!onboarded && location !== "/launch-guide") {
    return <Redirect to="/launch-guide" />;
  }

  return (
    <Switch>
      <Route path="/launch-guide" component={LaunchGuide} />
      <Route path="/" component={Dashboard} />
      <Route path="/alphas" component={MyAlphas} />
      <Route path="/alphas/:id" component={AlphaDetail} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/account" component={Account} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

/* ── Layout wrapper that hides nav during onboarding ── */
function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const isGuide = location === "/launch-guide";

  if (isGuide) return <>{children}</>;
  return <AppLayout>{children}</AppLayout>;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <OnboardingProvider>
            <Toaster />
            <CustomCursor />
            <LayoutWrapper>
              <Router />
            </LayoutWrapper>
          </OnboardingProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
