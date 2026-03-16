import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import MyAlphas from "./pages/MyAlphas";
import AlphaDetail from "./pages/AlphaDetail";
import StrategyMarket from "./pages/StrategyMarket";
import Leaderboard from "./pages/Leaderboard";
import AutoTrading from "./pages/AutoTrading";
import Subscription from "./pages/Subscription";
import Submissions from "./pages/Submissions";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/alphas" component={MyAlphas} />
      <Route path="/alphas/:id" component={AlphaDetail} />
      <Route path="/strategies" component={StrategyMarket} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/trading" component={AutoTrading} />
      <Route path="/subscription" component={Subscription} />
      <Route path="/submissions" component={Submissions} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <AppLayout>
            <Router />
          </AppLayout>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
