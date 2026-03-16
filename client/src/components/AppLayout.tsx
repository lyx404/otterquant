/*
 * AppLayout - Terminal Noir sidebar navigation
 * Design: Fixed left sidebar with icon+label nav, dark terminal aesthetic
 * Neon green active indicator, subtle hover glow effects
 */
import { Link, useLocation } from "wouter";
import { useState } from "react";
import {
  LayoutDashboard,
  FlaskConical,
  Trophy,
  ChevronLeft,
  ChevronRight,
  Zap,
  UserCog,
} from "lucide-react";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/alphas", label: "My Alphas", icon: FlaskConical },
  { path: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { path: "/account", label: "Account", icon: UserCog },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (path: string) => {
    if (path === "/") return location === "/";
    return location.startsWith(path);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r border-border bg-sidebar transition-all duration-300 ease-in-out ${
          collapsed ? "w-[68px]" : "w-[220px]"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 h-16 border-b border-border shrink-0">
          <div className="w-8 h-8 rounded-md bg-primary/20 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          {!collapsed && (
            <span className="font-heading font-bold text-lg text-primary glow-green whitespace-nowrap">
              AlphaForge
            </span>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            return (
              <Link key={item.path} href={item.path}>
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 group relative ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {active && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
                  )}
                  <Icon
                    className={`w-5 h-5 shrink-0 ${
                      active ? "text-primary" : "group-hover:text-foreground"
                    }`}
                  />
                  {!collapsed && (
                    <span className={`text-sm font-medium whitespace-nowrap ${active ? "glow-green" : ""}`}>
                      {item.label}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center h-12 border-t border-border text-muted-foreground hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
