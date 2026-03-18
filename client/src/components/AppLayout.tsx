/*
 * AppLayout — Modern Developer Tool Aesthetic
 * Light: #FFFFFF / Dark: #000000
 * Primary: #3B82F6 | Zinc scale text/border
 * Pure Tailwind classes — zero inline styles
 */
import { Link, useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import { useTheme } from "@/contexts/ThemeContext";
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
} from "lucide-react";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/alphas", label: "My Alphas", icon: FlaskConical },
  { path: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { path: "/account", label: "Account", icon: UserCog },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
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
  }, []);

  const isActive = (path: string) => {
    if (path === "/") return location === "/";
    return location.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <header
        className={`sticky top-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-border transition-transform duration-350 will-change-transform ${
          headerVisible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            {/* Logo */}
            <Link href="/">
              <div className="flex items-center gap-2.5 shrink-0">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary/10">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <span className="font-semibold text-base tracking-tight text-foreground">
                  AlphaForge
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const active = isActive(item.path);
                const Icon = item.icon;
                return (
                  <Link key={item.path} href={item.path}>
                    <div
                      className={`relative flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-medium transition-all duration-200 ease-out ${
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50 dark:hover:bg-white/[0.05]"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                      {active && (
                        <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary rounded-full" />
                      )}
                    </div>
                  </Link>
                );
              })}
            </nav>

            {/* Right side — theme toggle + user indicator */}
            <div className="hidden md:flex items-center gap-2.5">
              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className="relative w-8 h-8 rounded-md flex items-center justify-center border border-border bg-muted/50 dark:bg-white/[0.05] hover:bg-muted dark:hover:bg-white/[0.08] transition-all duration-200 ease-out"
                title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === "dark" ? (
                  <Sun className="w-3.5 h-3.5 text-zinc-400" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-zinc-500" />
                )}
              </button>

              {/* User Pill */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 dark:bg-white/[0.05] border border-border">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-xs font-mono text-muted-foreground">
                  CryptoQuant_Pro
                </span>
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                {theme === "dark" ? (
                  <Sun className="w-4.5 h-4.5" />
                ) : (
                  <Moon className="w-4.5 h-4.5" />
                )}
              </button>
              <button
                className="p-2 text-muted-foreground hover:text-foreground transition-colors duration-200"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white/95 dark:bg-black/95 backdrop-blur-xl border-t border-border">
            <nav className="px-4 py-3 space-y-1">
              {navItems.map((item) => {
                const active = isActive(item.path);
                const Icon = item.icon;
                return (
                  <Link key={item.path} href={item.path}>
                    <div
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200 ${
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {children}
      </main>
    </div>
  );
}
