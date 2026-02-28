import { lazy, Suspense, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";
import { isRTL } from "@/lib/i18n";
import Dashboard from "@/pages/dashboard";
import HealthPage from "@/pages/health";
import NotFound from "@/pages/not-found";

const TvDashboard = lazy(() => import("@/pages/tv-dashboard"));

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/health" component={HealthPage} />
      <Route path="/tv">
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-background text-foreground">Loading TV Mode...</div>}>
          <TvDashboard />
        </Suspense>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const dir = isRTL(i18n.language) ? "rtl" : "ltr";
    document.documentElement.dir = dir;
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
