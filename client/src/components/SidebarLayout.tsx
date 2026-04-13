/*
 * SidebarLayout — Left sidebar navigation for authenticated dashboard pages
 * Design System: Indigo/Sky + Slate
 * Sidebar: 240px fixed width, collapsible to 64px icon-only mode
 * Logo links to /landing, nav items with icons + labels
 * Bottom: theme toggle + user dropdown
 * Mobile: overlay sidebar with backdrop
 */
import { Link, useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  FlaskConical,
  Trophy,
  UserCog,
  Zap,
  Menu,
  X,
  LogIn,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Rocket,
} from "lucide-react";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import NotificationPanel from "@/components/NotificationPanel";

const SIDEBAR_W = 220;
const SIDEBAR_COLLAPSED_W = 64;

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/alphas", label: "Alphas", icon: FlaskConical },
  { path: "/leaderboard", label: "Alpha Arena", icon: Trophy },
  { path: "/account", label: "Account", icon: UserCog },
];

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const { theme } = useTheme();
  const { isAuthenticated, user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  const isActive = (path: string) => {
    if (path === "/") return location === "/";
    return location.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    navigate("/landing");
  };

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_W;

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Logo + Collapse Toggle */}
      <div className={`flex items-center h-14 border-b border-sidebar-border shrink-0 ${collapsed && !isMobile ? "justify-center px-2" : "justify-between px-4"}`}>
        <Link href="/landing">
          <div className="flex items-center gap-2.5 shrink-0">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663325188422/YmxnXmKxyGfXhEgxEBqPXF/otter-logo_ef58ab33.png"
              alt="Otter"
              className="w-7 h-7 rounded-full object-cover shrink-0"
            />
            {(!collapsed || isMobile) && (
              <span className="font-semibold text-base tracking-tight text-foreground">
                Otter
              </span>
            )}
          </div>
        </Link>
        {!isMobile && (
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200"
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        )}
        {isMobile && (
          <button
            onClick={() => setMobileOpen(false)}
            className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>



      {/* Navigation */}
      <nav className={`flex-1 py-2 space-y-0.5 overflow-y-auto ${collapsed && !isMobile ? "px-2" : "px-3"}`}>
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 ease-in-out ${
                collapsed && !isMobile
                  ? "justify-center px-0 py-2.5"
                  : "px-3 py-2"
              } ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
              title={collapsed && !isMobile ? item.label : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {(!collapsed || isMobile) && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Bottom Section: Theme + User */}
      <div className={`border-t border-sidebar-border py-3 space-y-2 ${collapsed && !isMobile ? "px-2" : "px-3"}`}>
        {/* Notification + Theme */}
        <div className={`flex items-center ${collapsed && !isMobile ? "justify-center" : "gap-1.5"}`}>
          {isAuthenticated && !collapsed && <NotificationPanel />}
          <AnimatedThemeToggler
            className={`flex items-center justify-center border border-border rounded-lg hover:bg-accent transition-all duration-200 ${
              collapsed && !isMobile ? "w-10 h-10" : "w-8 h-8"
            }`}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          />
        </div>

        {/* User */}
        {isAuthenticated && (
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className={`w-full flex items-center gap-2.5 rounded-lg transition-all duration-200 ease-in-out ${
                collapsed && !isMobile
                  ? "justify-center px-0 py-2"
                  : "px-2.5 py-2"
              } ${
                userMenuOpen
                  ? "bg-primary/10"
                  : "hover:bg-accent"
              }`}
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center bg-primary/15 text-primary text-[11px] font-semibold overflow-hidden shrink-0">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  user?.displayName?.charAt(0)?.toUpperCase() || "U"
                )}
              </div>
              {(!collapsed || isMobile) && (
                <div className="flex-1 text-left min-w-0">
                  <div className="text-xs font-medium text-foreground truncate">
                    {user?.displayName || "User"}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {user?.email || "user@otter.com"}
                  </div>
                </div>
              )}
            </button>

            {/* User dropdown menu */}
            {userMenuOpen && (
              <div className={`absolute z-50 w-48 rounded-xl border border-border bg-card shadow-lg py-1 animate-in fade-in slide-in-from-bottom-1 duration-150 ${
                collapsed && !isMobile
                  ? "left-full ml-2 bottom-0"
                  : "bottom-full mb-1.5 left-0"
              }`}>
                <button
                  onClick={() => { setUserMenuOpen(false); navigate("/account"); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-foreground hover:bg-accent transition-colors duration-150"
                >
                  <UserCog className="w-3.5 h-3.5 text-muted-foreground" />
                  Account Settings
                </button>
                <div className="my-1 border-t border-border" />
                <button
                  onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors duration-150"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Log Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex flex-col shrink-0 bg-card border-r border-border h-screen sticky top-0 transition-all duration-300 ease-in-out overflow-hidden"
        style={{ width: sidebarWidth }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`md:hidden fixed top-0 left-0 z-50 h-full bg-card border-r border-border transition-transform duration-300 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ width: SIDEBAR_W }}
      >
        <SidebarContent isMobile />
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile Top Bar */}
        <header className="md:hidden sticky top-0 z-30 h-12 bg-card/80 backdrop-blur-xl border-b border-border flex items-center px-4 gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link href="/landing">
            <div className="flex items-center gap-2">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663325188422/YmxnXmKxyGfXhEgxEBqPXF/otter-logo_ef58ab33.png"
                alt="Otter"
                className="w-6 h-6 rounded-full object-cover"
              />
              <span className="font-semibold text-sm text-foreground">Otter</span>
            </div>
          </Link>
        </header>

        {/* Page Content */}
        <main className="flex-1 mx-auto w-full max-w-[1100px] px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
