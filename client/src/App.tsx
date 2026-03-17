import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AppLayout from "./components/AppLayout";
import CustomCursor from "./components/CustomCursor";
import Dashboard from "./pages/Dashboard";
import MyAlphas from "./pages/MyAlphas";
import AlphaDetail from "./pages/AlphaDetail";
import Leaderboard from "./pages/Leaderboard";
import Account from "./pages/Account";

function Router() {
  return (
    <Switch>
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

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster />
          <CustomCursor />
          <AppLayout>
            <Router />
          </AppLayout>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
