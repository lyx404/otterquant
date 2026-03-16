/*
 * AppLayout — Acid Green Design System
 * #0B0B0B bg, #C5FF4A accent, white/10 borders, white/50 secondary text
 * Horizontal top nav with scroll-direction hide/show behavior
 */
import { Link, useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  FlaskConical,
  Trophy,
  UserCog,
  Zap,
  Menu,
  X,
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

  useEffect(() => {
    const THRESHOLD = 8; // minimum scroll delta to trigger hide/show

    const handleScroll = () => {
      if (ticking.current) return;
      ticking.current = true;

      requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const delta = currentY - lastScrollY.current;

        // Always show header when near top of page
        if (currentY < 60) {
          setHeaderVisible(true);
        } else if (delta > THRESHOLD) {
          // Scrolling down → hide
          setHeaderVisible(false);
          setMobileMenuOpen(false);
        } else if (delta < -THRESHOLD) {
          // Scrolling up → show
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
    <div className="min-h-screen" style={{ backgroundColor: "#0B0B0B" }}>
      {/* Top Navigation Bar — hides on scroll down, shows on scroll up */}
      <header
        className="sticky top-0 z-50 backdrop-blur-xl"
        style={{
          backgroundColor: "rgba(11, 11, 11, 0.85)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.10)",
          transform: headerVisible ? "translateY(0)" : "translateY(-100%)",
          transition: "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
          willChange: "transform",
        }}
      >
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            {/* Logo */}
            <Link href="/">
              <div className="flex items-center gap-2.5 shrink-0">
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center"
                  style={{ backgroundColor: "rgba(197, 255, 74, 0.12)" }}
                >
                  <Zap className="w-4 h-4" style={{ color: "#C5FF4A" }} />
                </div>
                <span
                  className="font-semibold text-base tracking-tight"
                  style={{ color: "#C5FF4A" }}
                >
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
                      className="flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-medium transition-all duration-300"
                      style={{
                        backgroundColor: active ? "rgba(197, 255, 74, 0.10)" : "transparent",
                        color: active ? "#C5FF4A" : "rgba(255, 255, 255, 0.50)",
                      }}
                      onMouseEnter={(e) => {
                        if (!active) {
                          e.currentTarget.style.color = "#ffffff";
                          e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!active) {
                          e.currentTarget.style.color = "rgba(255, 255, 255, 0.50)";
                          e.currentTarget.style.backgroundColor = "transparent";
                        }
                      }}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>

            {/* Right side — user indicator */}
            <div className="hidden md:flex items-center gap-3">
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-md"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.10)",
                }}
              >
                <div
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: "#C5FF4A" }}
                />
                <span
                  className="text-xs font-mono"
                  style={{ color: "rgba(255, 255, 255, 0.50)" }}
                >
                  CryptoQuant_Pro
                </span>
              </div>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 transition-colors"
              style={{ color: "rgba(255, 255, 255, 0.50)" }}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div
            className="md:hidden backdrop-blur-xl"
            style={{
              backgroundColor: "rgba(11, 11, 11, 0.95)",
              borderTop: "1px solid rgba(255, 255, 255, 0.10)",
            }}
          >
            <nav className="px-4 py-3 space-y-1">
              {navItems.map((item) => {
                const active = isActive(item.path);
                const Icon = item.icon;
                return (
                  <Link key={item.path} href={item.path}>
                    <div
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors"
                      style={{
                        backgroundColor: active ? "rgba(197, 255, 74, 0.10)" : "transparent",
                        color: active ? "#C5FF4A" : "rgba(255, 255, 255, 0.50)",
                      }}
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
      <main className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {children}
      </main>
    </div>
  );
}
