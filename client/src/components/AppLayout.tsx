/*
 * AppLayout — Katana Deep Navy Design System
 * bg-0: #0d111c | bg-1: #101631
 * Primary: #0058ff | Border: rgba(236,238,243,0.12)
 * Horizontal top nav with scroll-direction hide/show + theme toggle
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

/* ── Theme-aware color tokens ── */
function useColors() {
  const { theme } = useTheme();
  const dark = theme === "dark";
  return {
    bg0: dark ? "#0d111c" : "#f4f5f7",
    headerBg: dark ? "rgba(13, 17, 28, 0.88)" : "rgba(244, 245, 247, 0.88)",
    headerBorder: dark ? "rgba(236, 238, 243, 0.08)" : "rgba(0, 0, 0, 0.08)",
    text1: dark ? "rgba(236, 238, 243, 0.92)" : "rgba(13, 17, 28, 0.92)",
    text2: dark ? "rgba(236, 238, 243, 0.48)" : "rgba(13, 17, 28, 0.48)",
    activeColor: "#4d94ff",
    activeBg: dark ? "rgba(0, 88, 255, 0.12)" : "rgba(0, 88, 255, 0.08)",
    hoverBg: dark ? "rgba(236, 238, 243, 0.06)" : "rgba(0, 0, 0, 0.04)",
    hoverText: dark ? "rgba(236, 238, 243, 0.92)" : "rgba(13, 17, 28, 0.92)",
    userPillBg: dark ? "rgba(236, 238, 243, 0.04)" : "rgba(0, 0, 0, 0.04)",
    userPillBorder: dark ? "rgba(236, 238, 243, 0.08)" : "rgba(0, 0, 0, 0.08)",
    mobileBg: dark ? "rgba(13, 17, 28, 0.96)" : "rgba(244, 245, 247, 0.96)",
    logoBg: dark ? "rgba(0, 88, 255, 0.15)" : "rgba(0, 88, 255, 0.10)",
    toggleBg: dark ? "rgba(236, 238, 243, 0.06)" : "rgba(0, 0, 0, 0.06)",
    toggleBorder: dark ? "rgba(236, 238, 243, 0.12)" : "rgba(0, 0, 0, 0.12)",
    toggleIcon: dark ? "rgba(236, 238, 243, 0.60)" : "rgba(13, 17, 28, 0.60)",
    toggleHoverBg: dark ? "rgba(236, 238, 243, 0.10)" : "rgba(0, 0, 0, 0.10)",
  };
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  const { theme, toggleTheme } = useTheme();
  const C = useColors();

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
    <div className="min-h-screen" style={{ backgroundColor: C.bg0 }}>
      {/* Top Navigation Bar */}
      <header
        className="sticky top-0 z-50"
        style={{
          backgroundColor: C.headerBg,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: `1px solid ${C.headerBorder}`,
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
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: C.logoBg }}
                >
                  <Zap className="w-4 h-4" style={{ color: "#0058ff" }} />
                </div>
                <span
                  className="font-semibold text-base tracking-tight"
                  style={{ color: C.text1 }}
                >
                  AlphaForge
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-0.5">
              {navItems.map((item) => {
                const active = isActive(item.path);
                const Icon = item.icon;
                return (
                  <Link key={item.path} href={item.path}>
                    <div
                      className="relative flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-medium transition-all duration-250"
                      style={{
                        backgroundColor: active ? C.activeBg : "transparent",
                        color: active ? C.activeColor : C.text2,
                      }}
                      onMouseEnter={(e) => {
                        if (!active) {
                          e.currentTarget.style.color = C.hoverText;
                          e.currentTarget.style.backgroundColor = C.hoverBg;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!active) {
                          e.currentTarget.style.color = C.text2;
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

            {/* Right side — theme toggle + user indicator */}
            <div className="hidden md:flex items-center gap-2.5">
              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className="relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-250"
                style={{
                  backgroundColor: C.toggleBg,
                  border: `1px solid ${C.toggleBorder}`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = C.toggleHoverBg;
                  e.currentTarget.style.borderColor = theme === "dark" ? "rgba(236,238,243,0.20)" : "rgba(0,0,0,0.20)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = C.toggleBg;
                  e.currentTarget.style.borderColor = C.toggleBorder;
                }}
                title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === "dark" ? (
                  <Sun className="w-3.5 h-3.5" style={{ color: C.toggleIcon }} />
                ) : (
                  <Moon className="w-3.5 h-3.5" style={{ color: C.toggleIcon }} />
                )}
              </button>

              {/* User Pill */}
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                style={{
                  backgroundColor: C.userPillBg,
                  border: `1px solid ${C.userPillBorder}`,
                }}
              >
                <div
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: "#00ffc2" }}
                />
                <span
                  className="text-xs font-mono"
                  style={{ color: C.text2 }}
                >
                  CryptoQuant_Pro
                </span>
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center gap-2">
              {/* Mobile theme toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 transition-colors"
                style={{ color: C.text2 }}
              >
                {theme === "dark" ? (
                  <Sun className="w-4.5 h-4.5" />
                ) : (
                  <Moon className="w-4.5 h-4.5" />
                )}
              </button>
              <button
                className="p-2 transition-colors"
                style={{ color: C.text2 }}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div
            className="md:hidden"
            style={{
              backgroundColor: C.mobileBg,
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              borderTop: `1px solid ${C.headerBorder}`,
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
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
                      style={{
                        backgroundColor: active ? C.activeBg : "transparent",
                        color: active ? C.activeColor : C.text2,
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
