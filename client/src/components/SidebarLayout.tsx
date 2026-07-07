/*
 * SidebarLayout — Left sidebar navigation for authenticated dashboard pages
 * Design System: Indigo/Sky + Slate
 * Sidebar: Figma-aligned 186px expanded width, collapsible to 64px icon-only mode
 * Logo links to /, nav items with icons + labels
 * Bottom: account controls + user dropdown
 * Mobile: overlay sidebar with backdrop
 */
import { Link, useLocation } from "wouter";
import { useState, useEffect, useRef, useCallback, type CSSProperties } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppLanguage } from "@/contexts/AppLanguageContext";
import {
  AlphaViewModeProvider,
  useAlphaViewMode,
  type AlphaViewMode,
  replaceAlphaTerms,
} from "@/contexts/AlphaViewModeContext";
import {
  LayoutDashboard,
  FlaskConical,
  Settings2,
  Menu,
  X,
  ChevronDown,
  Rocket,
  CandlestickChart,
  CreditCard,
} from "lucide-react";
import NotificationPanel from "@/components/NotificationPanel";

const SIDEBAR_W = 186;
const SIDEBAR_COLLAPSED_W = 64;
const FIGMA_HEADER_H = 60;

type NavItem = {
  path: string;
  labelEn: string;
  labelZh: string;
  icon: any;
  children?: { path: string; labelEn: string; labelZh: string; icon: any }[];
};

const navItems: NavItem[] = [
  { path: "/", labelEn: "Dashboard", labelZh: "仪表盘", icon: LayoutDashboard },
  { path: "/alphas", labelEn: "My Factors", labelZh: "我的因子", icon: FlaskConical },
  { path: "/strategies", labelEn: "Strategy", labelZh: "策略", icon: Rocket },
  { path: "/trade", labelEn: "Trade", labelZh: "交易", icon: CandlestickChart },
  { path: "/subscription", labelEn: "Subscription", labelZh: "订阅", icon: CreditCard },
  { path: "/account", labelEn: "Settings", labelZh: "设置", icon: Settings2 },
];

const pageHeaders = [
  {
    match: (path: string) => path === "/",
    titleEn: "Dashboard",
    titleZh: "仪表盘",
    subtitleEn: "Overview of factors, strategies, and account status",
    subtitleZh: "查看因子、策略与账户状态概览",
  },
  {
    match: (path: string) => path.startsWith("/alphas"),
    titleEn: "My Factors",
    titleZh: "我的因子",
    subtitleEn: "Create, review, and manage factor signals",
    subtitleZh: "创建、查看与管理因子信号",
  },
  {
    match: (path: string) => path.startsWith("/strategies"),
    titleEn: "Strategy",
    titleZh: "策略",
    subtitleEn: "Build and monitor strategy workflows",
    subtitleZh: "构建与监控策略工作流",
  },
  {
    match: (path: string) => path.startsWith("/trade"),
    titleEn: "Trade",
    titleZh: "交易",
    subtitleEn: "Monitor executions and trading status",
    subtitleZh: "监控执行与交易状态",
  },
  {
    match: (path: string) => path.startsWith("/subscription"),
    titleEn: "Subscription",
    titleZh: "订阅",
    subtitleEn: "Plan, wallet, credit usage, and account activity",
    subtitleZh: "查看套餐、钱包、额度使用与账户活动",
  },
  {
    match: (path: string) => path.startsWith("/account"),
    titleEn: "Settings",
    titleZh: "设置",
    subtitleEn: "Profile, billing, security & API access",
    subtitleZh: "资料、账单、安全与 API 访问",
  },
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
  const { user } = useAuth();
  const { uiLang } = useAppLanguage();
  const { alphaViewMode } = useAlphaViewMode();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    "/alphas": false,
    "/strategies": false,
  });
  const currentPathname = location.split("?")[0];
  const currentSearch = location.includes("?")
    ? location.slice(location.indexOf("?"))
    : typeof window !== "undefined"
      ? window.location.search
      : "";
  const isOfficialAlphaDetail =
    currentPathname.startsWith("/alphas/") &&
    currentPathname !== "/alphas/official" &&
    new URLSearchParams(currentSearch).get("source") === "official";
  const isOfficialStrategyDetail =
    currentPathname.startsWith("/strategies/") &&
    currentPathname !== "/strategies/official" &&
    new URLSearchParams(currentSearch).get("source") === "official";

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  const isActive = (path: string) => {
    if (path === "/") return currentPathname === "/";
    if (path === "/alphas/official") return currentPathname === "/alphas/official" || isOfficialAlphaDetail;
    if (path === "/strategies/official") return currentPathname === "/strategies/official" || isOfficialStrategyDetail;

    if (path === "/alphas") {
      return currentPathname === "/alphas" || (currentPathname.startsWith("/alphas/") && !currentPathname.startsWith("/alphas/official") && !isOfficialAlphaDetail);
    }

    if (path === "/strategies") {
      return currentPathname === "/strategies" || (currentPathname.startsWith("/strategies/") && !currentPathname.startsWith("/strategies/official") && !isOfficialStrategyDetail);
    }

    return currentPathname.startsWith(path);
  };

  const isSectionActive = (sectionPath: string) => {
    if (currentPathname === sectionPath || currentPathname.startsWith(`${sectionPath}/`)) return true;

    const section = navItems.find((item) => item.path === sectionPath);
    return Boolean(section?.children?.some((child) => isActive(child.path)));
  };
  const originalTextCacheRef = useRef<WeakMap<Text, string>>(new WeakMap());
  const syncingCopyRef = useRef(false);
  const tr = (en: string, zh: string) => (uiLang === "zh" ? zh : en);
  const displayName = user?.displayName || "Nicole Ong";
  const userHandle = user?.email ? `@${user.email.split("@")[0]}` : "@nicoleo";
  const avatarInitial = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "NO";
  const pageHeader = pageHeaders.find((item) => item.match(currentPathname)) ?? pageHeaders[0];

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
  const shellStyle = { "--sidebar-width": `${sidebarWidth}px` } as CSSProperties;

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className={`flex flex-col bg-white text-black ${isMobile ? "h-full" : "h-[100dvh]"}`}>
      {/* Logo + Collapse Toggle */}
      <div
        className={`flex shrink-0 items-center ${
          collapsed && !isMobile ? "h-[49px] justify-center px-2" : "h-[31px] items-start justify-between px-3 pt-[18px]"
        }`}
      >
        {collapsed && !isMobile ? (
          <Link href="/">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fef6ef] text-[11px] font-semibold text-[#dc4900]">
              Q
            </div>
          </Link>
        ) : (
          <>
            <Link href="/">
              <div className="flex h-[13px] shrink-0 items-center">
                <img
                  src="/quandora-wordmark.png"
                  alt="Quandora"
                  className="h-[13px] w-24 shrink-0 object-contain object-left"
                />
              </div>
            </Link>
          </>
        )}
        {isMobile && (
          <button
            onClick={() => setMobileOpen(false)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-black/50 hover:text-black"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>



      {/* Navigation */}
      <nav className={`min-h-0 flex-1 space-y-3 overflow-y-auto ${collapsed && !isMobile ? "px-2 pt-[27px]" : "px-3 pt-[27px]"}`}>
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
                    navigate(item.path);
                    if (!collapsed || isMobile) {
                      setExpandedSections((prev) => ({ ...prev, [item.path]: true }));
                    }
                  }}
                  className={`flex w-full items-center rounded-[6px] text-[12px] font-normal transition-all duration-200 ease-in-out ${
                    collapsed && !isMobile
                      ? "justify-center p-1.5"
                      : "gap-1.5 p-1.5"
                  } ${parentHighlighted
                    ? "border border-[rgba(220,73,0,0.10)] bg-[#fef6ef] text-[#dc4900]"
                    : "border border-transparent text-black hover:border-[rgba(220,73,0,0.10)] hover:bg-[#fef6ef] hover:text-[#dc4900]"
                  }`}
                  title={collapsed && !isMobile ? tr(item.labelEn, item.labelZh) : undefined}
                >
                  <Icon className="h-[15px] w-[15px] shrink-0" strokeWidth={1.5} />
                  {(!collapsed || isMobile) && (
                    <>
                      <span className="flex-1 text-left">{tr(item.labelEn, item.labelZh)}</span>
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
                          className={`flex w-full items-center gap-1.5 rounded-[6px] px-2 py-1.5 text-[12px] font-normal transition-all duration-200 ease-in-out ${
                            childActive
                              ? "border border-[rgba(220,73,0,0.10)] bg-[#fef6ef] text-[#dc4900]"
                              : "border border-transparent text-black hover:border-[rgba(220,73,0,0.10)] hover:bg-[#fef6ef] hover:text-[#dc4900]"
                          }`}
                        >
                          <ChildIcon className="h-[13px] w-[13px] shrink-0" strokeWidth={1.5} />
                          <span>{tr(child.labelEn, child.labelZh)}</span>
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
              className={`flex w-full items-center rounded-[6px] text-[12px] font-normal transition-all duration-200 ease-in-out ${
                collapsed && !isMobile
                  ? "justify-center p-1.5"
                  : "gap-1.5 p-1.5"
              } ${
                active
                  ? "border border-[rgba(220,73,0,0.10)] bg-[#fef6ef] text-[#dc4900]"
                  : "border border-transparent text-black hover:border-[rgba(220,73,0,0.10)] hover:bg-[#fef6ef] hover:text-[#dc4900]"
              }`}
              title={collapsed && !isMobile ? tr(item.labelEn, item.labelZh) : undefined}
            >
              <Icon className="h-[15px] w-[15px] shrink-0" strokeWidth={1.5} />
              {(!collapsed || isMobile) && <span>{tr(item.labelEn, item.labelZh)}</span>}
            </button>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className={`shrink-0 border-t border-[#d9d9d9] ${collapsed && !isMobile ? "px-2 py-3" : "mx-3 pb-[18px] pt-[18px]"}`}>
        {collapsed && !isMobile ? (
          /* === Collapsed: vertical stack === */
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => navigate("/account")}
              className="flex items-center justify-center rounded-full transition-all duration-200 ease-in-out"
              title={tr("Settings", "设置")}
            >
              <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-b from-[#d99100] to-[#dc4900] text-[9px] font-semibold text-white">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  avatarInitial
                )}
              </div>
            </button>
          </div>
        ) : (
          /* === Expanded: Figma-aligned user block + plan entry === */
          <div className="space-y-[9px]">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => navigate("/account")}
                className="flex min-w-0 flex-1 items-center gap-1.5 rounded-[6px] transition-all duration-200 ease-in-out hover:bg-[#fef6ef]"
              >
                <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-b from-[#d99100] to-[#dc4900] text-[9px] font-semibold text-white">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    avatarInitial
                  )}
                </div>
                <span className="flex w-[72px] min-w-0 flex-col items-start gap-[3px] text-left leading-none">
                  <span className="w-full truncate text-[12px] font-medium text-black">{displayName}</span>
                  <span className="w-full truncate text-[10px] font-normal text-black/60">{userHandle}</span>
                </span>
              </button>
              <div className="shrink-0">
                <NotificationPanel />
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate("/subscription")}
              className="flex w-full items-center gap-[7.5px] rounded-[3px] bg-[#fef6ef] px-[7.5px] py-1.5 text-left text-[12px] font-medium text-[#dc4900] transition-colors hover:bg-[#fde9dc]"
            >
              <img src="/sidebar-pro-icon.svg" alt="" className="h-[15px] w-[15px] shrink-0" />
              <span>{tr("Pro plan", "Pro plan")}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div
      className="flex min-h-screen bg-[#faf8f6] md:min-h-[1024px] md:min-w-[1440px] md:pl-[var(--sidebar-width)]"
      style={shellStyle}
    >
      {/* Desktop Sidebar */}
      <aside
        className="fixed bottom-0 left-0 top-0 z-20 hidden h-[100dvh] shrink-0 flex-col overflow-hidden border-r border-[#eef0f4] bg-white transition-all duration-300 ease-in-out md:flex"
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
        className={`fixed left-0 top-0 z-50 h-full border-r border-[#eef0f4] bg-white transition-transform duration-300 ease-in-out md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ width: SIDEBAR_W }}
      >
        <SidebarContent isMobile />
      </aside>

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col bg-[#faf8f6]">
        <header
          className="fixed left-[var(--sidebar-width)] right-0 top-0 z-10 hidden shrink-0 items-center justify-between border-b border-[#ece6df] bg-[#faf8f6]/85 backdrop-blur-[4.5px] md:flex"
          style={{ height: FIGMA_HEADER_H }}
        >
          <div className="ml-[21px] flex h-[35px] flex-col justify-start">
            <h1 className="text-[16.5px] font-bold leading-[18.15px] tracking-[-0.33px] text-[#0d0d0d]">
              {tr(pageHeader.titleEn, pageHeader.titleZh)}
            </h1>
            <p className="mt-[2.6px] text-[9.375px] font-normal leading-[15.188px] text-[#8c8378]">
              {tr(pageHeader.subtitleEn, pageHeader.subtitleZh)}
            </p>
          </div>
          <div className="mr-[21px] flex h-[30px] items-center gap-[9px]">
            <label className="flex h-[27.75px] w-[180px] items-center rounded-full border border-[#e2dad0] bg-white px-[10.5px] shadow-[0_0.75px_0.75px_rgba(60,40,20,0.06)]">
              <img src="/header-search.svg" alt="" className="h-[11.25px] w-[10.078px] shrink-0" />
              <input
                aria-label={tr("Search", "搜索")}
                className="ml-[6px] h-[14.25px] min-w-0 flex-1 bg-transparent text-[9.75px] leading-[1.2] text-[#0d0d0d] outline-none placeholder:text-[#b5aba0]"
                placeholder={tr("Search factors, traders...", "搜索因子、交易员...")}
              />
            </label>
            <NotificationPanel
              triggerClassName="relative flex h-[30px] w-[30px] items-center justify-center rounded-full border border-[#e2dad0] bg-white shadow-[0_0.75px_0.75px_rgba(60,40,20,0.06)]"
              iconSrc="/header-bell.svg"
              iconClassName="h-[12.75px] w-[12.75px]"
              panelStyle={{ position: "fixed", top: "52px", right: "21px", width: "380px" }}
              showBadge={false}
            />
          </div>
        </header>

        {/* Mobile Top Bar */}
        <header className="md:hidden sticky top-0 z-30 h-12 bg-card/80 backdrop-blur-xl border-b border-border flex items-center px-4 gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link href="/">
            <div className="flex items-center gap-2">
              <img
                src="/quandora-wordmark.png"
                alt="Quandora"
                className="h-[13px] w-24 object-contain object-left"
              />
            </div>
          </Link>
        </header>

        {/* Page Content */}
        <main className="mx-auto w-full max-w-[1100px] flex-1 px-0 py-6 md:pt-[calc(60px+1.5rem)] lg:pb-8 lg:pt-[calc(60px+2rem)]">
          {children}
        </main>
      </div>
    </div>
  );
}
