/*
 * SidebarLayout — Left sidebar navigation for authenticated dashboard pages
 * Design System: Indigo/Sky + Slate
 * Sidebar: 240px fixed width, collapsible to 64px icon-only mode
 * Logo links to /landing, nav items with icons + labels
 * Bottom: account controls + user dropdown
 * Mobile: overlay sidebar with backdrop
 */
import { Link, useLocation } from "wouter";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlphaViewModeProvider,
  useAlphaViewMode,
  type AlphaViewMode,
  replaceAlphaTerms,
} from "@/contexts/AlphaViewModeContext";
import {
  LayoutDashboard,
  FlaskConical,
  Trophy,
  Settings2,
  Eye,
  Sparkles,
  Zap,
  Menu,
  X,
  LogIn,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Rocket,
  Library,
  FileText,
  CandlestickChart,
  CreditCard,
} from "lucide-react";
import NotificationPanel from "@/components/NotificationPanel";

const SIDEBAR_W = 220;
const SIDEBAR_COLLAPSED_W = 64;

type NavItem = {
  path: string;
  label: string;
  icon: any;
  children?: { path: string; label: string; icon: any }[];
};

const navItems: NavItem[] = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  {
    path: "/alphas",
    label: "Alphas",
    icon: FlaskConical,
    children: [
      { path: "/alphas", label: "My Alphas", icon: FileText },
      { path: "/alphas/official", label: "Official Library", icon: Library },
    ],
  },
  {
    path: "/strategies",
    label: "Strategy",
    icon: Rocket,
    children: [
      { path: "/strategies", label: "My Strategy", icon: FileText },
      { path: "/strategies/official", label: "Official Library", icon: Library },
    ],
  },
  { path: "/trade", label: "Trade", icon: CandlestickChart },
  { path: "/leaderboard", label: "Alpha Arena", icon: Trophy },
  { path: "/subscription", label: "Subscription", icon: CreditCard },
  { path: "/account", label: "Setting", icon: Settings2 },
];

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <AlphaViewModeProvider>
      <SidebarLayoutInner>{children}</SidebarLayoutInner>
    </AlphaViewModeProvider>
  );
}

function SidebarLayoutInner({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { alphaViewMode, setAlphaViewMode } = useAlphaViewMode();
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarHeaderHovered, setSidebarHeaderHovered] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    "/alphas": false,
    "/strategies": false,
  });

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  const isActive = (path: string) => {
    if (path === "/") return location === "/";
    if (path === "/alphas/official") return location === "/alphas/official";
    if (path === "/strategies/official") return location === "/strategies/official";

    if (path === "/alphas") {
      return location === "/alphas" || (location.startsWith("/alphas/") && !location.startsWith("/alphas/official"));
    }

    if (path === "/strategies") {
      return location === "/strategies" || (location.startsWith("/strategies/") && !location.startsWith("/strategies/official"));
    }

    return location.startsWith(path);
  };

  const isSectionActive = (sectionPath: string) => location === sectionPath || location.startsWith(`${sectionPath}/`);
  const originalTextCacheRef = useRef<WeakMap<Text, string>>(new WeakMap());
  const syncingCopyRef = useRef(false);

  const handleAlphaViewModeChange = (mode: AlphaViewMode) => {
    setAlphaViewMode(mode);
  };

  const syncAlphaCopy = useCallback((root: ParentNode, mode: AlphaViewMode) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let current = walker.nextNode();
    while (current) {
      textNodes.push(current as Text);
      current = walker.nextNode();
    }

    textNodes.forEach((textNode) => {
      const parent = textNode.parentElement;
      if (!parent) return;
      if (["SCRIPT", "STYLE", "INPUT", "TEXTAREA", "NOSCRIPT"].includes(parent.tagName)) return;

      const cachedOriginal = originalTextCacheRef.current.get(textNode);
      const originalText = cachedOriginal ?? (textNode.nodeValue ?? "");
      if (!cachedOriginal) {
        originalTextCacheRef.current.set(textNode, originalText);
      }

      if (!/\bAlphas?\b/i.test(originalText)) return;

      const nextText = replaceAlphaTerms(originalText, mode);
      if (textNode.nodeValue !== nextText) {
        textNode.nodeValue = nextText;
      }
    });
  }, []);

  useEffect(() => {
    const root = document.body;
    if (!root) return;

    const scheduleSync = () => {
      if (syncingCopyRef.current) return;
      syncingCopyRef.current = true;
      syncAlphaCopy(root, alphaViewMode);
      requestAnimationFrame(() => {
        syncingCopyRef.current = false;
      });
    };

    scheduleSync();

    const observer = new MutationObserver(() => {
      if (syncingCopyRef.current) return;
      scheduleSync();
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [alphaViewMode, syncAlphaCopy]);

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_W;

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Logo + Collapse Toggle */}
      <div
        className={`flex items-center h-14 border-b border-sidebar-border shrink-0 ${collapsed && !isMobile ? "justify-center px-2" : "justify-between px-4"}`}
        onMouseEnter={() => !isMobile && setSidebarHeaderHovered(true)}
        onMouseLeave={() => !isMobile && setSidebarHeaderHovered(false)}
      >
        {collapsed && !isMobile ? (
          sidebarHeaderHovered ? (
            <button
              onClick={() => setCollapsed(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200"
              title="Expand sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <Link href="/landing">
              <div className="flex items-center justify-center shrink-0">
                <img
                  src="https://d2xsxph8kpxj0f.cloudfront.net/310519663325188422/YmxnXmKxyGfXhEgxEBqPXF/otter-logo_ef58ab33.png"
                  alt="Otter"
                  className="w-7 h-7 rounded-full object-cover shrink-0"
                />
              </div>
            </Link>
          )
        ) : (
          <>
            <Link href="/landing">
              <div className="flex items-center gap-2.5 shrink-0">
                <img
                  src="https://d2xsxph8kpxj0f.cloudfront.net/310519663325188422/YmxnXmKxyGfXhEgxEBqPXF/otter-logo_ef58ab33.png"
                  alt="Otter"
                  className="w-7 h-7 rounded-full object-cover shrink-0"
                />
                <span className="font-semibold text-base tracking-tight text-foreground">
                  Otter
                </span>
              </div>
            </Link>
            {!isMobile && (
              <button
                onClick={() => setCollapsed(true)}
                className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200"
                title="Collapse sidebar"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            )}
          </>
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
          const Icon = item.icon;
          const hasChildren = item.children && item.children.length > 0;
          const sectionActive = hasChildren ? isSectionActive(item.path) : isActive(item.path);
          const parentHighlighted = sectionActive && collapsed && !isMobile;
          const showExpanded = collapsed && !isMobile ? false : (hasChildren && ((expandedSections[item.path] ?? false) || sectionActive));

          if (hasChildren) {
            return (
              <div key={item.path}>
                {/* Parent item */}
                <button
                  onClick={() => {
                    if (collapsed && !isMobile) {
                      navigate(item.path);
                    } else {
                      setExpandedSections((prev) => ({ ...prev, [item.path]: !prev[item.path] }));
                    }
                  }}
                  className={`w-full flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 ease-in-out ${
                    collapsed && !isMobile
                      ? "justify-center px-0 py-2.5"
                      : "px-3 py-2"
                  } ${parentHighlighted
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                  title={collapsed && !isMobile ? item.label : undefined}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {(!collapsed || isMobile) && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronDown className={`w-3 h-3 shrink-0 transition-transform duration-200 ${
                        showExpanded ? "rotate-0" : "-rotate-90"
                      }`} />
                    </>
                  )}
                </button>
                {/* Children */}
                {showExpanded && (
                  <div className="mt-0.5 space-y-0.5 ml-3 pl-3 border-l border-border">
                    {item.children!.map((child) => {
                      const childActive = isActive(child.path);
                      const ChildIcon = child.icon;
                      return (
                        <button
                          key={child.path}
                          onClick={() => navigate(child.path)}
                          className={`w-full flex items-center gap-2 rounded-lg text-[12px] font-medium transition-all duration-200 ease-in-out px-2.5 py-1.5 ${
                            childActive
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:text-foreground hover:bg-accent"
                          }`}
                        >
                          <ChildIcon className="w-3.5 h-3.5 shrink-0" />
                          <span>{child.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const active = isActive(item.path);
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

      {/* Bottom Section */}
      <div className={`border-t border-sidebar-border py-2.5 ${collapsed && !isMobile ? "px-2" : "px-3"}`}>
        {collapsed && !isMobile ? (
          /* === Collapsed: vertical stack === */
          <div className="flex flex-col items-center gap-1.5 mb-2">
            <button
              onClick={() => handleAlphaViewModeChange("beginner")}
              className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all duration-200 ${
                alphaViewMode === "beginner"
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
              title="Beginner"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleAlphaViewModeChange("pro")}
              className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all duration-200 ${
                alphaViewMode === "pro"
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
              title="Pro"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
            {isAuthenticated && <NotificationPanel />}
            {isAuthenticated && (
              <button
                onClick={() => navigate("/account")}
                className={`flex items-center justify-center rounded-lg transition-all duration-200 ease-in-out p-1.5 ${
                  isActive("/account") ? "bg-primary/10" : "hover:bg-accent"
                }`}
                title="Setting"
              >
                <div className="w-7 h-7 rounded-full flex items-center justify-center bg-primary/15 text-primary text-[11px] font-semibold overflow-hidden shrink-0">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    user?.displayName?.charAt(0)?.toUpperCase() || "U"
                  )}
                </div>
              </button>
            )}
          </div>
        ) : (
          /* === Expanded: single row — user avatar, notification, theme (left to right) === */
          <div>
            <div className="mb-2 rounded-lg border border-sidebar-border/70 bg-background/60 p-1.5">
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => handleAlphaViewModeChange("beginner")}
                  className={`min-w-0 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-medium whitespace-nowrap border transition-all duration-200 ${
                    alphaViewMode === "beginner"
                      ? "bg-primary/10 text-primary border-primary/20"
                      : "text-muted-foreground border-transparent hover:text-foreground hover:bg-accent hover:border-sidebar-border/60"
                  }`}
                >
                  <Eye className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Beginner</span>
                </button>
                <button
                  onClick={() => handleAlphaViewModeChange("pro")}
                  className={`min-w-0 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-medium whitespace-nowrap border transition-all duration-200 ${
                    alphaViewMode === "pro"
                      ? "bg-primary/10 text-primary border-primary/20"
                      : "text-muted-foreground border-transparent hover:text-foreground hover:bg-accent hover:border-sidebar-border/60"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Pro</span>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {isAuthenticated && (
                <button
                  onClick={() => navigate("/account")}
                  className={`flex items-center gap-2 rounded-lg transition-all duration-200 ease-in-out px-2 py-1.5 ${
                    isActive("/account") ? "bg-primary/10" : "hover:bg-accent"
                  }`}
                >
                  <div className="w-7 h-7 rounded-full flex items-center justify-center bg-primary/15 text-primary text-[11px] font-semibold overflow-hidden shrink-0">
                    {user?.avatar ? (
                      <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      user?.displayName?.charAt(0)?.toUpperCase() || "U"
                    )}
                  </div>
                  <span className="text-xs font-medium text-foreground truncate max-w-[100px]">
                    {user?.displayName || "User"}
                  </span>
                </button>
              )}
              <div className="flex-1" />
              {isAuthenticated && <NotificationPanel />}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex flex-col shrink-0 bg-card border-r border-border h-screen sticky top-0 z-10 transition-all duration-300 ease-in-out overflow-hidden"
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
