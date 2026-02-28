import { lazy, Suspense } from "react";
import { useLocation, Link, Route, Switch } from "wouter";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import AdminLogin from "./login";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load tabs for code splitting
const HealthTab = lazy(() => import("./health-tab"));
const SettingsTab = lazy(() => import("./settings-tab"));
const NewsTab = lazy(() => import("./news-tab"));
const EventsTab = lazy(() => import("./events-tab"));
const DataSourcesTab = lazy(() => import("./data-sources-tab"));
const AgentsTab = lazy(() => import("./agents-tab"));
const AgentDetailPage = lazy(() => import("./agent-detail"));

const ADMIN_PATH = "/panel-272d672e974546a7";

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Health", path: "", icon: "💚" },
  { label: "Settings", path: "/settings", icon: "⚙️" },
  { label: "News DB", path: "/news", icon: "📰" },
  { label: "Events DB", path: "/events", icon: "🎯" },
  { label: "Data Sources", path: "/data-sources", icon: "📡" },
  { label: "Agents", path: "/agents", icon: "🤖" },
];

function TabSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-48 bg-slate-800" />
      <Skeleton className="h-64 w-full bg-slate-800" />
    </div>
  );
}

export default function AdminPanel() {
  const { isChecking, isAuthenticated, logout } = useAdminAuth();
  const [location] = useLocation();

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0e14]">
        <div className="text-slate-400 text-lg">Checking session...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  // Get the sub-path within admin panel
  const subPath = location.replace(ADMIN_PATH, "") || "";

  return (
    <div className="min-h-screen bg-[#0a0e14] flex">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-4">
          <Link href={ADMIN_PATH}>
            <span className="text-xl font-bold text-red-500 cursor-pointer">⚔ War Panel</span>
          </Link>
          <Badge variant="outline" className="ml-2 text-xs text-slate-400 border-slate-700">Admin</Badge>
        </div>
        <Separator className="bg-slate-800" />
        <ScrollArea className="flex-1 py-2">
          <nav className="space-y-1 px-2">
            {NAV_ITEMS.map((item) => {
              const fullPath = `${ADMIN_PATH}${item.path}`;
              const isActive = item.path === ""
                ? subPath === "" || subPath === "/"
                : subPath.startsWith(item.path);
              return (
                <Link key={item.path} href={fullPath}>
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-pointer transition-colors ${
                    isActive
                      ? "bg-slate-800 text-white"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}>
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </ScrollArea>
        <Separator className="bg-slate-800" />
        <div className="p-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-slate-400 hover:text-red-400 hover:bg-slate-800"
            onClick={logout}
          >
            🚪 Logout
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Suspense fallback={<TabSkeleton />}>
          <Switch>
            <Route path={`${ADMIN_PATH}`} component={HealthTab} />
            <Route path={`${ADMIN_PATH}/settings`} component={SettingsTab} />
            <Route path={`${ADMIN_PATH}/news`} component={NewsTab} />
            <Route path={`${ADMIN_PATH}/events`} component={EventsTab} />
            <Route path={`${ADMIN_PATH}/data-sources`} component={DataSourcesTab} />
            <Route path={`${ADMIN_PATH}/agents/:id`} component={AgentDetailPage} />
            <Route path={`${ADMIN_PATH}/agents`} component={AgentsTab} />
            <Route>
              <div className="p-6 text-slate-400">Page not found in admin panel</div>
            </Route>
          </Switch>
        </Suspense>
      </main>
    </div>
  );
}
