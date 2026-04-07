/*
 * Dashboard — Indigo/Sky + Slate Design System
 * Epoch Banner: single banner entry with inline metrics
 * Customizable sections: show/hide + drag reorder
 * Pure Tailwind classes — zero inline styles
 */
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useState, useEffect, useRef, useCallback } from "react";
import gsap from "gsap";
import {
  FlaskConical,
  TrendingUp,
  Trophy,
  Activity,
  CheckCircle,
  XCircle,
  Award,
  Users,
  ArrowUpRight,
  Zap,
  Check,
  ExternalLink,
  Clock,
  Key,
  FileText,
  Settings2,
  Eye,
  EyeOff,
  GripVertical,
  X,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { dashboardStats, recentActivity, currentEpoch, submissionStats } from "@/lib/mockData";

const statCards = [
  { label: "TOTAL ALPHAS", value: submissionStats.total.toString(), highlight: false },
  { label: "STARRED", value: submissionStats.starred.toString(), highlight: false, color: "text-amber-500 dark:text-amber-400" },
  { label: "PASSED", value: submissionStats.passed.toString(), highlight: true },
  { label: "FAILED", value: (submissionStats.failed + submissionStats.rejected).toString(), highlight: false, color: "text-destructive" },
];

const iconMap: Record<string, React.ReactNode> = {
  plus: <Zap className="w-3.5 h-3.5 text-primary" />,
  check: <CheckCircle className="w-3.5 h-3.5 text-success" />,
  trophy: <Award className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />,
  activity: <Activity className="w-3.5 h-3.5 text-secondary" />,
  x: <XCircle className="w-3.5 h-3.5 text-destructive" />,
  user: <Users className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />,
};

const SKILL_LATEST = "v2.4.1";

interface DashboardApiKey {
  id: string;
  name: string;
  apiKey: string;
  skillVersion: string;
  updatedAt: string;
}

const DASHBOARD_API_KEYS: DashboardApiKey[] = [
  { id: "1", name: "My Trading Bot", apiKey: "ot_sk_7x9kM2nP4qR8sT6uW3yA1bC5dE0fG2h", skillVersion: "v2.4.1", updatedAt: "2026-03-28" },
  { id: "2", name: "Research Agent", apiKey: "ot_sk_hJ2kL4mN6pQ8rS0tU2vW4xY6zA8bC0dE", skillVersion: "v2.3.0", updatedAt: "2026-03-15" },
];

function buildPrompt(apiKey: string, skillVersion: string): string {
  return `# Otter Trading Skill Configuration\n\n## API Key\n\`${apiKey}\`\n\n## Skill Version\n${skillVersion}\n\n## Setup Instructions\nPaste this entire prompt into your AI agent (ChatGPT / Claude / DeepSeek) to enable Otter Trading capabilities.`;
}

/* ── Dashboard Copy Prompt button ── */
function DashCopyPromptBtn({ apiKey, skillVersion, itemSkillVersion }: { apiKey: string; skillVersion: string; itemSkillVersion: string }) {
  const [copied, setCopied] = useState(false);
  const needsUpdate = itemSkillVersion !== skillVersion;
  const handleCopy = () => {
    navigator.clipboard.writeText(buildPrompt(apiKey, skillVersion));
    setCopied(true);
    toast.success(needsUpdate ? "Updated to latest skill & prompt copied" : "Prompt copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className={`h-6 text-[10px] px-2 rounded-full flex items-center gap-1 transition-all duration-200 ease-in-out border ${
        needsUpdate ? "border-amber-500/30 text-amber-500 hover:bg-amber-500/10" : "border-primary/20 text-primary hover:bg-primary/10"
      }`}
    >
      {copied ? <Check className="w-2.5 h-2.5" /> : <FileText className="w-2.5 h-2.5" />}
      {copied ? "Copied" : needsUpdate ? "Copy Latest Prompt" : "Copy Prompt"}
    </button>
  );
}

/* ── Countdown Timer Hook ── */
function useCountdown(timeStr: string) {
  const parseTime = useCallback((s: string) => {
    let total = 0;
    const dMatch = s.match(/(\d+)d/);
    const hMatch = s.match(/(\d+)h/);
    const mMatch = s.match(/(\d+)m/);
    if (dMatch) total += parseInt(dMatch[1]) * 86400;
    if (hMatch) total += parseInt(hMatch[1]) * 3600;
    if (mMatch) total += parseInt(mMatch[1]) * 60;
    return total;
  }, []);

  const [remaining, setRemaining] = useState(() => parseTime(timeStr));

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [remaining]);

  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  const pad = (n: number) => String(n).padStart(2, "0");

  return {
    display: `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
    remaining,
  };
}

/* ── Strip USDT from pool string ── */
function stripUSDT(s: string) {
  return s.replace(/\s*USDT$/i, "");
}

/* ── Parse relative time string to hours ── */
function parseTimeToHours(timeStr: string): number {
  const minMatch = timeStr.match(/(\d+)\s*min/);
  const hourMatch = timeStr.match(/(\d+)\s*hour/);
  const dayMatch = timeStr.match(/(\d+)\s*day/);
  if (minMatch) return parseInt(minMatch[1]) / 60;
  if (hourMatch) return parseInt(hourMatch[1]);
  if (dayMatch) return parseInt(dayMatch[1]) * 24;
  return 0;
}

/* ── Section definitions ── */
interface SectionDef {
  id: string;
  label: string;
  icon: React.ElementType;
}

const ALL_SECTIONS: SectionDef[] = [
  { id: "epoch", label: "Alpha Arena", icon: Trophy },
  { id: "myAlphas", label: "My Alphas", icon: FlaskConical },
  { id: "agentApi", label: "Agent API", icon: Key },
  { id: "recentActivity", label: "Recent Activity", icon: Activity },
];

const DEFAULT_ORDER = ALL_SECTIONS.map((s) => s.id);
const DEFAULT_VISIBLE = new Set(DEFAULT_ORDER);

function loadSectionConfig(): { order: string[]; visible: Set<string> } {
  try {
    const raw = localStorage.getItem("dashboard-sections");
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        order: parsed.order || DEFAULT_ORDER,
        visible: new Set(parsed.visible || DEFAULT_ORDER),
      };
    }
  } catch {}
  return { order: [...DEFAULT_ORDER], visible: new Set(DEFAULT_VISIBLE) };
}

function saveSectionConfig(order: string[], visible: Set<string>) {
  localStorage.setItem(
    "dashboard-sections",
    JSON.stringify({ order, visible: Array.from(visible) })
  );
}

export default function Dashboard() {
  const headerRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const countdown = useCountdown(currentEpoch.timeRemaining);

  /* ── Section customization state ── */
  const [sectionOrder, setSectionOrder] = useState<string[]>(() => loadSectionConfig().order);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(() => loadSectionConfig().visible);
  const [showCustomize, setShowCustomize] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const customizeRef = useRef<HTMLDivElement>(null);

  /* ── Agent API refresh state ── */
  const [apiKeys, setApiKeys] = useState(DASHBOARD_API_KEYS);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  /* ── Recent Activity expand/collapse ── */
  const [activityExpanded, setActivityExpanded] = useState(false);
  const ACTIVITY_DEFAULT_COUNT = 3;

  /* Filter activities within 48 hours */
  const recentActivities48h = recentActivity.filter((item) => parseTimeToHours(item.time) <= 48);

  /* Close customize panel on outside click */
  useEffect(() => {
    if (!showCustomize) return;
    const handler = (e: MouseEvent) => {
      if (customizeRef.current && !customizeRef.current.contains(e.target as Node)) {
        setShowCustomize(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showCustomize]);

  const toggleVisibility = (id: string) => {
    setVisibleSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveSectionConfig(sectionOrder, next);
      return next;
    });
  };

  const moveSection = (fromIdx: number, toIdx: number) => {
    setSectionOrder((prev) => {
      const next = [...prev];
      const [item] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, item);
      saveSectionConfig(next, visibleSections);
      return next;
    });
  };

  const handleRefreshSkill = (itemId: string) => {
    setRefreshingId(itemId);
    setTimeout(() => {
      setApiKeys((prev) =>
        prev.map((k) =>
          k.id === itemId
            ? { ...k, skillVersion: SKILL_LATEST, updatedAt: new Date().toISOString().split("T")[0] }
            : k
        )
      );
      const item = apiKeys.find((k) => k.id === itemId);
      if (item && item.skillVersion !== SKILL_LATEST) {
        toast.success(`"${item.name}" updated to ${SKILL_LATEST}`);
      } else {
        toast.info("Already on the latest version");
      }
      setRefreshingId(null);
    }, 800);
  };

  useEffect(() => {
    if (!headerRef.current) return;
    const lines = headerRef.current.querySelectorAll(".reveal-line");
    gsap.set(lines, { y: 100, skewY: 7, opacity: 0 });
    gsap.to(lines, {
      y: 0, skewY: 0, opacity: 1,
      duration: 1, stagger: 0.08, ease: "power4.out", delay: 0.1,
    });
  }, []);

  useEffect(() => {
    if (!statsRef.current) return;
    const items = statsRef.current.querySelectorAll(".fade-item");
    gsap.set(items, { y: 30, opacity: 0 });
    gsap.to(items, {
      y: 0, opacity: 1,
      duration: 0.6, stagger: 0.06, ease: "power3.out", delay: 0.3,
    });
  }, []);

  useEffect(() => {
    if (!bannerRef.current) return;
    gsap.fromTo(bannerRef.current,
      { y: -20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.4, ease: "power3.out" }
    );
  }, []);

  const goldGradient = "text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 dark:from-amber-400 dark:via-yellow-300 dark:to-amber-500";

  /* ── Section renderers ── */
  const renderEpoch = () => (
    <div
      ref={bannerRef}
      className="surface-card overflow-hidden border-primary/20 dark:border-primary/30"
    >
      <div className="flex items-center justify-between px-6 py-5 gap-6 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 bg-primary/10 border border-primary/20">
            <Trophy className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-foreground">{currentEpoch.id}</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono tracking-[0.15em] uppercase bg-primary/10 text-primary border border-primary/20">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
                </span>
                LIVE
              </span>
            </div>
            <span className="text-xs text-muted-foreground">{currentEpoch.startDate} — {currentEpoch.endDate}</span>
          </div>
        </div>
        <div className="flex items-center gap-6 flex-wrap">
          <div className="text-center">
            <div className="label-upper mb-0.5">Prize Pool</div>
            <div className={`stat-value text-base font-bold ${goldGradient}`}>
              {stripUSDT(currentEpoch.totalPool)} <span className="text-xs font-medium">USDT</span>
            </div>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <div className="label-upper mb-0.5 flex items-center justify-center gap-1">
              <Clock className="w-3 h-3" />
              Time Remaining
            </div>
            <div className="stat-value text-base font-bold font-mono tabular-nums text-foreground">
              {countdown.display}
            </div>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <div className="label-upper mb-0.5">Qualified</div>
            <div className="stat-value text-base font-bold text-foreground">
              {currentEpoch.qualifiedFactors}<span className="text-xs font-normal text-muted-foreground"> / {currentEpoch.totalSubmissions}</span>
            </div>
          </div>
        </div>
        <Link href="/leaderboard">
          <Button className="gap-1.5 rounded-full text-sm bg-primary text-primary-foreground hover:brightness-110 btn-bounce">
            Alpha Arena
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );

  const renderMyAlphas = () => (
    <div
      ref={statsRef}
      className="surface-card group transition-all duration-200 ease-in-out hover:border-primary/30 dark:hover:border-primary/40"
    >
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">My Alphas</span>
          </div>
          <Link href="/my-alphas">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1 rounded-full border-border text-muted-foreground hover:text-foreground"
            >
              More
              <ArrowUpRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      </div>
      <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div key={stat.label} className="fade-item min-w-0">
            <span className="label-upper truncate block mb-2">{stat.label}</span>
            <div className={`text-2xl stat-value font-bold truncate ${stat.color ? stat.color : stat.highlight ? "text-success" : "text-foreground"}`}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAgentApi = () => (
    <div className="surface-card group transition-all duration-200 ease-in-out hover:border-primary/30 dark:hover:border-primary/40">
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Agent API</span>
            <span className="text-[10px] text-muted-foreground/50">({apiKeys.length})</span>
          </div>
          <Link href="/account?tab=api">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1 rounded-full border-border text-muted-foreground hover:text-foreground"
            >
              Manage
              <ArrowUpRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      </div>
      <div className="px-4 pt-4 pb-4">
        {apiKeys.length === 0 ? (
          <div className="text-center py-6">
            <Key className="w-6 h-6 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">No API keys yet</p>
            <Link href="/account?tab=api">
              <Button variant="outline" size="sm" className="mt-3 h-7 text-xs rounded-full">
                Create API Key
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-0">
            {apiKeys.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2.5 py-2 px-2 rounded-xl transition-all duration-200 ease-in-out hover:bg-accent"
              >
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-accent">
                  <Key className="w-3 h-3 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs leading-snug text-muted-foreground truncate block">{item.name}</span>
                  <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground/60 mt-0.5">
                    <span>Skill {item.skillVersion}</span>
                    {item.skillVersion !== SKILL_LATEST && (
                      <span className="text-amber-500">(update)</span>
                    )}
                    <span className="flex items-center gap-1">
                      Updated {item.updatedAt}
                      <button
                        onClick={() => handleRefreshSkill(item.id)}
                        className="p-0.5 rounded-md text-muted-foreground/60 hover:text-primary transition-colors"
                        title="Check for updates"
                      >
                        <RefreshCw className={`w-3 h-3 ${refreshingId === item.id ? "animate-spin" : ""}`} />
                      </button>
                    </span>
                  </div>
                </div>
                <DashCopyPromptBtn apiKey={item.apiKey} skillVersion={SKILL_LATEST} itemSkillVersion={item.skillVersion} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderRecentActivity = () => {
    const displayItems = activityExpanded
      ? recentActivities48h
      : recentActivities48h.slice(0, ACTIVITY_DEFAULT_COUNT);
    const hasMore = recentActivities48h.length > ACTIVITY_DEFAULT_COUNT;

    return (
      <div className="surface-card group transition-all duration-200 ease-in-out hover:border-primary/30 dark:hover:border-primary/40">
        <div className="px-6 py-5 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Recent Activity</span>
              <span className="text-[10px] text-muted-foreground/50">48h</span>
            </div>
          </div>
        </div>
        <div className="px-4 pt-4 pb-4">
          {recentActivities48h.length === 0 ? (
            <div className="text-center py-6">
              <Activity className="w-6 h-6 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">No activity in the last 48 hours</p>
            </div>
          ) : (
            <>
              <div className="space-y-0">
                {displayItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2.5 py-2 px-2 rounded-xl transition-all duration-200 ease-in-out hover:bg-accent"
                  >
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-accent">
                      {iconMap[item.icon]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs leading-snug block truncate text-muted-foreground">{item.message}</span>
                      <span className="text-[10px] font-mono text-muted-foreground/60">{item.time}</span>
                    </div>
                  </div>
                ))}
              </div>
              {hasMore && (
                <button
                  onClick={() => setActivityExpanded(!activityExpanded)}
                  className="w-full mt-2 py-1.5 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-xl hover:bg-accent"
                >
                  {activityExpanded ? (
                    <>
                      <ChevronUp className="w-3 h-3" />
                      Collapse
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3" />
                      Show all ({recentActivities48h.length})
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  const sectionRenderers: Record<string, () => React.ReactNode> = {
    epoch: renderEpoch,
    myAlphas: renderMyAlphas,
    agentApi: renderAgentApi,
    recentActivity: renderRecentActivity,
  };

  /* Check if agentApi and recentActivity are adjacent and both visible */
  const visibleOrder = sectionOrder.filter((id) => visibleSections.has(id));
  const agentApiIdx = visibleOrder.indexOf("agentApi");
  const activityIdx = visibleOrder.indexOf("recentActivity");
  const shouldPairApiActivity = agentApiIdx !== -1 && activityIdx !== -1 && Math.abs(agentApiIdx - activityIdx) === 1;

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════
          PAGE HEADER + Customize button
          ═══════════════════════════════════════════ */}
      <div className="flex items-start justify-between">
        <div ref={headerRef} className="reveal-clip">
          <div className="reveal-line">
            <h1 className="text-foreground">Dashboard</h1>
          </div>
          <div className="reveal-line mt-2">
            <p className="text-base text-muted-foreground">
              AI-powered alpha mining platform — monitor your agents, track performance, compete for rewards.
            </p>
          </div>
        </div>

        {/* Customize button */}
        <div className="relative" ref={customizeRef}>
          <button
            onClick={() => setShowCustomize(!showCustomize)}
            className={`p-2 rounded-xl border transition-all duration-200 ease-in-out ${
              showCustomize
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-accent border-border text-muted-foreground hover:text-foreground hover:border-primary/20"
            }`}
            title="Customize Dashboard"
          >
            <Settings2 className="w-4 h-4" />
          </button>

          {/* Customize dropdown panel */}
          {showCustomize && (
            <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-border bg-card shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Customize Dashboard</span>
                <button
                  onClick={() => setShowCustomize(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-2">
                {sectionOrder.map((sectionId, idx) => {
                  const def = ALL_SECTIONS.find((s) => s.id === sectionId);
                  if (!def) return null;
                  const Icon = def.icon;
                  const isVisible = visibleSections.has(sectionId);
                  return (
                    <div
                      key={sectionId}
                      draggable
                      onDragStart={() => setDragIdx(idx)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.add("bg-primary/5");
                      }}
                      onDragLeave={(e) => {
                        e.currentTarget.classList.remove("bg-primary/5");
                      }}
                      onDrop={(e) => {
                        e.currentTarget.classList.remove("bg-primary/5");
                        if (dragIdx !== null && dragIdx !== idx) {
                          moveSection(dragIdx, idx);
                        }
                        setDragIdx(null);
                      }}
                      onDragEnd={() => setDragIdx(null)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all duration-150 cursor-grab active:cursor-grabbing ${
                        dragIdx === idx ? "opacity-50" : ""
                      } hover:bg-accent`}
                    >
                      <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className={`text-sm flex-1 ${isVisible ? "text-foreground" : "text-muted-foreground/40"}`}>
                        {def.label}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleVisibility(sectionId);
                        }}
                        className={`p-1 rounded-lg transition-colors ${
                          isVisible
                            ? "text-primary hover:bg-primary/10"
                            : "text-muted-foreground/40 hover:bg-accent"
                        }`}
                        title={isVisible ? "Hide section" : "Show section"}
                      >
                        {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="px-4 py-2.5 border-t border-border">
                <button
                  onClick={() => {
                    setSectionOrder([...DEFAULT_ORDER]);
                    setVisibleSections(new Set(DEFAULT_VISIBLE));
                    saveSectionConfig([...DEFAULT_ORDER], new Set(DEFAULT_VISIBLE));
                    toast.success("Dashboard layout reset to default");
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Reset to default
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          DYNAMIC SECTIONS
          ═══════════════════════════════════════════ */}
      {(() => {
        const rendered: React.ReactNode[] = [];
        let i = 0;
        while (i < visibleOrder.length) {
          const id = visibleOrder[i];

          /* Pair agentApi + recentActivity in a grid if adjacent */
          if (shouldPairApiActivity) {
            const nextId = visibleOrder[i + 1];
            if (
              (id === "agentApi" && nextId === "recentActivity") ||
              (id === "recentActivity" && nextId === "agentApi")
            ) {
              const firstId = id;
              const secondId = nextId;
              rendered.push(
                <div key={`pair-${firstId}-${secondId}`} className="grid lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    {sectionRenderers[firstId === "agentApi" ? "agentApi" : "recentActivity"]()}
                  </div>
                  <div className="lg:col-span-1">
                    {sectionRenderers[secondId === "recentActivity" ? "recentActivity" : "agentApi"]()}
                  </div>
                </div>
              );
              i += 2;
              continue;
            }
          }

          rendered.push(
            <div key={id}>{sectionRenderers[id]()}</div>
          );
          i++;
        }
        return rendered;
      })()}
    </div>
  );
}
