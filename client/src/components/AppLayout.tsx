/*
 * AppLayout — Indigo/Sky + Slate Design System
 * Light: Slate-50 #F8FAFC / Dark: Slate-950 #020617
 * Primary: Indigo-600 #4F46E5 / Indigo-400 #818CF8
 * Surface: White / Slate-900
 * Buttons: rounded-full | Cards: rounded-2xl | Inputs: rounded-lg
 * Animation: 200ms ease-in-out | Bouncy: 300ms cubic-bezier(0.34,1.56,0.64,1)
 *
 * Auth-aware: shows Login button when not authenticated, user pill when authenticated
 * Logo "Quandora" links to /landing
 */
import { Link, useLocation } from "wouter";
import { useState, useEffect, useRef, useCallback } from "react";
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
  Sun,
  Moon,
  LogIn,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import NotificationPanel from "@/components/NotificationPanel";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/alphas", label: "Alphas", icon: FlaskConical },
  { path: "/leaderboard", label: "Alpha Arena", icon: Trophy },
  { path: "/account", label: "Account", icon: UserCog },
];

/* ── User Dropdown ── */
function UserDropdown({
  user,
  isActive,
  onNavigate,
  onLogout,
}: {
  user: { displayName?: string; avatar?: string } | null;
  isActive: boolean;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 px-2.5 py-1 rounded-full border cursor-pointer transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-sm ${
          isActive || open
            ? "bg-primary/10 border-primary/20"
            : "bg-accent border-border hover:bg-slate-200 dark:hover:bg-slate-800 hover:border-primary/20"
        }`}
      >
        <div className="w-5 h-5 rounded-full flex items-center justify-center bg-primary/15 text-primary text-[10px] font-semibold overflow-hidden">
          {user?.avatar ? (
            <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            user?.displayName?.charAt(0)?.toUpperCase() || "U"
          )}
        </div>
        <span className="text-xs font-medium text-foreground">
          {user?.displayName || "User"}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl border border-border bg-white dark:bg-slate-900 shadow-lg py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          <button
            onClick={() => { setOpen(false); onNavigate("/account"); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-foreground hover:bg-accent transition-colors duration-150"
          >
            <UserCog className="w-3.5 h-3.5 text-muted-foreground" />
            Account Settings
          </button>
          <div className="my-1 border-t border-border" />
          <button
            onClick={() => { setOpen(false); onLogout(); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors duration-150"
          >
            <LogOut className="w-3.5 h-3.5" />
            Log Out
          </button>
        </div>
      )}
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, user, logout } = useAuth();
  const isAuthPage = location === "/auth" || location.startsWith("/auth");

  useEffect(() => {
    // On auth pages, navbar is always fixed/visible — no scroll hide
    if (isAuthPage) {
      setHeaderVisible(true);
      return;
    }
    const THRESHOLD = 8;
    const handleScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const delta = currentY - lastScrollY.current;
        if (currentY < 60) {
          setHeaderVisible(true);
        } else if (delta > THRESHOLD) {
          setHeaderVisible(false);
          setMobileMenuOpen(false);
        } else if (delta < -THRESHOLD) {
          setHeaderVisible(true);
        }
        lastScrollY.current = currentY;
        ticking.current = false;
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isAuthPage]);

  const isActive = (path: string) => {
    if (path === "/") return location === "/";
    return location.startsWith(path);
  };

  // Nav click handler — if not authenticated, redirect to auth for protected pages
  const handleNavClick = (path: string) => {
    if (!isAuthenticated && path !== "/landing") {
      navigate("/auth");
    } else {
      navigate(path);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/landing");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <header
        className={`sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-border transition-transform duration-300 ease-in-out will-change-transform ${
          headerVisible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="flex h-11 items-center justify-between">
            {/* Logo — links to landing page */}
            <Link href="/landing">
              <div className="flex items-center gap-2.5 shrink-0">
                <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663325188422/YmxnXmKxyGfXhEgxEBqPXF/otter-logo_ef58ab33.png" alt="Quandora" className="w-6 h-6 rounded-full object-cover" />
                <span className="font-semibold text-base tracking-tight text-foreground">
                  Quandora
                </span>
              </div>
            </Link>

            {/* Desktop Navigation — hidden on auth page */}
            {!isAuthPage && (
              <nav className="hidden md:flex items-center gap-0.5">
                {navItems
                  .filter((item) => item.path !== "/account")
                  .map((item) => {
                    const active = isActive(item.path);
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.path}
                        onClick={() => handleNavClick(item.path)}
                        className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ease-in-out ${
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
              </nav>
            )}

            {/* Right side — theme toggle + user indicator / login button */}
            <div className="hidden md:flex items-center gap-2.5">
              {/* Theme Toggle Button */}
              <AnimatedThemeToggler
                className="relative w-8 h-8 rounded-full flex items-center justify-center border border-border bg-accent hover:bg-slate-200 dark:hover:bg-slate-800 transition-all duration-200 ease-in-out"
                title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              />

              {!isAuthPage && (
                <>
                  {isAuthenticated && <NotificationPanel />}
                  {isAuthenticated ? (
                    /* User Info — clickable dropdown with Account + Log Out */
                    <UserDropdown
                      user={user}
                      isActive={isActive("/account")}
                      onNavigate={(path: string) => navigate(path)}
                      onLogout={handleLogout}
                    />
                  ) : (
                    /* Login / Register button */
                    <Link href="/auth">
                      <Button
                        size="sm"
                        variant="default"
                        className="h-8 text-xs font-medium px-4 gap-1.5"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        Log In / Sign Up
                      </Button>
                    </Link>
                  )}
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center gap-2">
              <AnimatedThemeToggler
                className="p-2 text-muted-foreground hover:text-foreground transition-colors duration-200"
              />
              {!isAuthPage && (
                <button
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors duration-200"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  {mobileMenuOpen ? (
                    <X className="w-5 h-5" />
                  ) : (
                    <Menu className="w-5 h-5" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation — hidden on auth page */}
        {mobileMenuOpen && !isAuthPage && (
          <div className="md:hidden bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-t border-border">
            <nav className="px-4 py-3 space-y-1">
              {navItems
                .filter((item) => item.path !== "/account")
                .map((item) => {
                  const active = isActive(item.path);
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.path}
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleNavClick(item.path);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-colors duration-200 ${
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}

              {isAuthenticated ? (
                <>
                  {/* Account entry in mobile */}
                  <Link href="/account">
                    <div
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-colors duration-200 ${
                        isActive("/account")
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      }`}
                    >
                      <div className="w-5 h-5 rounded-full flex items-center justify-center bg-primary/15 text-primary text-[10px] font-semibold">
                        {user?.displayName?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                      <span>{user?.displayName || "User"}</span>
                    </div>
                  </Link>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors duration-200"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out</span>
                  </button>
                </>
              ) : (
                <Link href="/auth">
                  <div
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium text-primary hover:bg-primary/10 transition-colors duration-200"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Log In / Sign Up</span>
                  </div>
                </Link>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {children}
      </main>
    </div>
  );
}
