import { Switch, Route, useLocation } from "wouter";
import { queryClient, apiRequest } from "./lib/queryClient";
import { QueryClientProvider, useQuery, useMutation } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  SidebarProvider,
  SidebarTrigger,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Users, LayoutDashboard, Dumbbell, Activity, ClipboardList, Moon, Sun, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, Component, ReactNode } from "react";
import Dashboard from "@/pages/dashboard";
import ClientProfile from "@/pages/client-profile";
import ClientForm from "@/pages/client-form";
import WorkoutPlanView from "@/pages/workout-plan-view";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";

class PageErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error) { console.error("[FRANKIE] Page error caught:", error); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <p className="font-semibold text-destructive mb-2">Something went wrong on this page.</p>
          <button className="text-sm text-muted-foreground underline" onClick={() => { this.setState({ hasError: false }); window.history.back(); }}>
            Go back
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function NavButton({ href, icon: Icon, label, isActive }: {
  href: string; icon: React.ElementType; label: string; isActive?: boolean;
}) {
  const [, navigate] = useLocation();
  const { setOpenMobile, isMobile } = useSidebar();
  const handleClick = () => {
    navigate(href);
    if (isMobile) setOpenMobile(false);
  };
  return (
    <SidebarMenuItem>
      <SidebarMenuButton isActive={isActive} onClick={handleClick} data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}>
        <Icon className="w-4 h-4" />
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function AppSidebar() {
  const [location] = useLocation();
  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
            <Dumbbell className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <p className="font-bold text-sm text-sidebar-foreground tracking-widest">FRANKIE</p>
            <p className="text-xs text-muted-foreground">Your Intelligent Training Engine</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavButton href="/" icon={LayoutDashboard} label="Dashboard" isActive={location === "/"} />
              <NavButton href="/clients" icon={Users} label="Clients" isActive={location === "/clients" || location.startsWith("/clients/")} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavButton href="/clients" icon={Activity} label="Workout Plans" />
              <NavButton href="/clients" icon={ClipboardList} label="Progress Tracking" />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <p className="text-xs text-muted-foreground">FRANKIE v1.0</p>
      </SidebarFooter>
    </Sidebar>
  );
}

function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") { setIsDark(true); document.documentElement.classList.add("dark"); }
  }, []);
  const toggle = () => {
    setIsDark(d => {
      const next = !d;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("theme", next ? "dark" : "light");
      return next;
    });
  };
  return (
    <Button size="icon" variant="ghost" onClick={toggle} data-testid="button-theme-toggle">
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </Button>
  );
}

function LogoutButton({ onLogout }: { onLogout: () => void }) {
  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/logout"),
    onSuccess: () => {
      queryClient.clear();
      onLogout();
    },
  });
  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={() => logoutMutation.mutate()}
      disabled={logoutMutation.isPending}
      data-testid="button-logout"
      title="Sign out"
    >
      <LogOut className="w-4 h-4" />
    </Button>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/clients" component={Dashboard} />
      <Route path="/clients/new" component={ClientForm} />
      <Route path="/clients/:id/edit" component={ClientForm} />
      <Route path="/clients/:id" component={ClientProfile} />
      <Route path="/workout-plans/:id" component={WorkoutPlanView} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp({ onLogout }: { onLogout: () => void }) {
  const style = { "--sidebar-width": "16rem", "--sidebar-width-icon": "3.5rem" };
  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between px-4 py-2 border-b border-border h-12 bg-background sticky top-0 z-50">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <LogoutButton onLogout={onLogout} />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto">
            <PageErrorBoundary>
              <Router />
            </PageErrorBoundary>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppShell() {
  const [loggedOut, setLoggedOut] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const isAuthenticated = !loggedOut && (data as any)?.authenticated === true;

  const handleLogin = () => {
    setLoggedOut(false);
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  };

  const handleLogout = () => {
    setLoggedOut(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center animate-pulse">
          <Dumbbell className="w-4 h-4 text-primary-foreground" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return <AuthenticatedApp onLogout={handleLogout} />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppShell />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
