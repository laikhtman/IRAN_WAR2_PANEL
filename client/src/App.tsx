import { lazy, Suspense, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";
import { isRTL } from "@/lib/i18n";
import { TITLES, DESCRIPTIONS, SUPPORTED_LANGS, type SupportedLang } from "@shared/seo-config";
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";

const TvDashboard = lazy(() => import("@/pages/tv-dashboard"));
const AdminPanel = lazy(() => import("@/pages/admin/index"));

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/tv">
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-background text-foreground">Loading TV Mode...</div>}>
          <TvDashboard />
        </Suspense>
      </Route>
      <Route path="/panel-272d672e974546a7/:rest*">
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[#0a0e14] text-slate-400">Loading Admin...</div>}>
          <AdminPanel />
        </Suspense>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const { i18n } = useTranslation();

  // Sync dir and lang attributes on <html>
  useEffect(() => {
    const dir = isRTL(i18n.language) ? "rtl" : "ltr";
    document.documentElement.dir = dir;
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  // Sync document title and meta description with current language
  useEffect(() => {
    const lang = (SUPPORTED_LANGS.includes(i18n.language as SupportedLang)
      ? i18n.language
      : "en") as SupportedLang;

    document.title = TITLES[lang] || TITLES.en;

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", DESCRIPTIONS[lang] || DESCRIPTIONS.en);
    }
  }, [i18n.language]);

  // Sync ?hl= URL parameter so shared URLs preserve language
  useEffect(() => {
    const url = new URL(window.location.href);
    if (i18n.language !== "en") {
      url.searchParams.set("hl", i18n.language);
    } else {
      url.searchParams.delete("hl");
    }
    window.history.replaceState({}, "", url.toString());
  }, [i18n.language]);

  // On mount: read ?hl= from URL and sync to i18n
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hl = params.get("hl");
    if (hl && SUPPORTED_LANGS.includes(hl as SupportedLang) && hl !== i18n.language) {
      i18n.changeLanguage(hl);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
