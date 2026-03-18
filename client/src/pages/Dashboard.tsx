/*
 * Dashboard — Indigo/Sky + Slate Design System
 * Light: Slate-50 #F8FAFC / Dark: Slate-950 #020617
 * Primary: Indigo | Secondary: Sky | Success: Emerald | Danger: Red
 * Cards: rounded-2xl, p-6 | Buttons: rounded-full
 * Animation: 200ms ease-in-out, bouncy 300ms cubic-bezier(0.34,1.56,0.64,1)
 * Pure Tailwind classes — zero inline styles
 * GSAP staggered reveal preserved
 */
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useState, useEffect, useRef } from "react";
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
  Terminal,
  Copy,
  Check,
  WifiOff,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Cpu,
  Flame,
  Star,
  Sparkles,
} from "lucide-react";
import { dashboardStats, recentActivity, currentEpoch } from "@/lib/mockData";

const statCards = [
  { label: "TOTAL FACTORS", value: dashboardStats.totalFactors.toString(), sub: `${dashboardStats.activeFactors} active`, icon: FlaskConical, highlight: false },
  { label: "AVG SHARPE (OS)", value: dashboardStats.avgSharpe.toFixed(2), sub: "Out-of-Sample", icon: TrendingUp, highlight: true },
  { label: "PASS RATE", value: dashboardStats.passRate, sub: `${dashboardStats.activeFactors}/${dashboardStats.totalFactors}`, icon: CheckCircle, highlight: false },
  { label: "ACTIVE TRADES", value: dashboardStats.activeTrades.toString(), sub: "Running now", icon: Zap, highlight: false },
  { label: "SUBSCRIBERS", value: dashboardStats.subscriberCount.toLocaleString(), sub: "Platform total", icon: Users, highlight: false },
];

const iconMap: Record<string, React.ReactNode> = {
  plus: <Zap className="w-3.5 h-3.5 text-primary" />,
  check: <CheckCircle className="w-3.5 h-3.5 text-success" />,
  trophy: <Award className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />,
  activity: <Activity className="w-3.5 h-3.5 text-secondary" />,
  x: <XCircle className="w-3.5 h-3.5 text-destructive" />,
  user: <Users className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />,
};

const agentSkills = [
  { id: "codex", name: "OpenAI Codex", status: "connected" as const, lastSync: "2 min ago", factorsGenerated: 42, version: "v2.4.1" },
  { id: "claude", name: "Claude Code", status: "connected" as const, lastSync: "5 min ago", factorsGenerated: 38, version: "v1.8.0" },
  { id: "cursor", name: "Cursor Agent", status: "disconnected" as const, lastSync: "Never", factorsGenerated: 0, version: "—" },
];

const connectedCount = agentSkills.filter(s => s.status === "connected").length;
const isAnyConnected = connectedCount > 0;

const installSteps = [
  {
    id: "codex",
    title: "OpenAI Codex / ChatGPT",
    steps: [
      'npx alphaforge-skill install --target codex',
      '# Or manually: copy skill files to ~/.codex/skills/alphaforge/',
      'codex skill enable alphaforge',
    ],
  },
  {
    id: "claude",
    title: "Claude Code (Anthropic)",
    steps: [
      'npx alphaforge-skill install --target claude-code',
      '# Or manually: copy skill files to ~/.claude/skills/alphaforge/',
      'claude skill activate alphaforge',
    ],
  },
  {
    id: "cursor",
    title: "Cursor Agent",
    steps: [
      'npx alphaforge-skill install --target cursor',
      '# Or: add to .cursor/skills/ directory',
      'cursor settings → Skills → Enable Otter',
    ],
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="p-1 rounded-lg transition-colors text-slate-400 dark:text-slate-600 hover:text-foreground">
      {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function Dashboard() {
  const [guideExpanded, setGuideExpanded] = useState(!isAnyConnected);
  const [activeGuide, setActiveGuide] = useState("codex");
  const headerRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);

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
      { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" }
    );
  }, []);

  return (
    <div className="space-y-8">
      {/* ═══════════════════════════════════════════
          1. CURRENT EPOCH BANNER
          ═══════════════════════════════════════════ */}
      <div
        ref={bannerRef}
        className="rounded-2xl overflow-hidden bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/30"
      >
        <div className="flex items-center justify-between px-6 py-5 gap-4 flex-wrap">
          {/* Left: Epoch info */}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 bg-primary/10 border border-primary/20">
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-foreground">Current Epoch</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-mono tracking-[0.15em] uppercase bg-primary/10 text-primary border border-primary/20">
                  LIVE
                </span>
              </div>
              <span className="text-xs font-mono text-primary">{currentEpoch.id}</span>
            </div>
          </div>

          {/* Center: Key metrics inline */}
          <div className="flex items-center gap-6 flex-wrap">
            <div className="text-center">
              <div className="label-upper mb-0.5">Prize Pool</div>
              <div className="stat-value text-base font-bold text-success">{currentEpoch.totalPool}</div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <div className="label-upper mb-0.5">Time Left</div>
              <div className="stat-value text-base font-bold text-destructive">{currentEpoch.timeRemaining}</div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <div className="label-upper mb-0.5">Qualified</div>
              <div className="stat-value text-base font-bold text-foreground">
                {currentEpoch.qualifiedFactors}<span className="text-xs font-normal text-muted-foreground"> / {currentEpoch.totalSubmissions}</span>
              </div>
            </div>
          </div>

          {/* Right: Campaign stickers + CTA */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium tracking-wide bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20">
                <Flame className="w-3 h-3" /> 2x REWARDS
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium tracking-wide bg-purple-500/10 text-purple-500 dark:text-purple-400 border border-purple-500/20">
                <Star className="w-3 h-3" /> SEASON 3
              </span>
            </div>
            <Link href="/leaderboard">
              <Button className="gap-1.5 rounded-full text-sm bg-primary text-primary-foreground hover:brightness-110 btn-bounce">
                Leaderboard
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          2. PAGE HEADER
          ═══════════════════════════════════════════ */}
      <div ref={headerRef} className="reveal-clip">
        <div className="reveal-line">
          <h1 className="text-foreground">
            Dashboard
          </h1>
        </div>
        <div className="reveal-line mt-2">
          <p className="text-base text-muted-foreground">
            AI-powered factor mining platform — monitor your agents, track performance, compete for rewards.
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          3. STATS GRID
          ═══════════════════════════════════════════ */}
      <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="fade-item">
              <div className="surface-card p-6 group transition-all duration-200 ease-in-out">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="label-upper">{stat.label}</span>
                    <Icon className="w-4 h-4 text-muted-foreground transition-transform duration-300 ease-in-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                  <div className={`text-2xl stat-value font-bold ${stat.highlight ? "text-success" : "text-foreground"}`}>
                    {stat.value}
                  </div>
                  <div className="text-sm mt-1 text-muted-foreground">{stat.sub}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════
          4. SKILL HUB
          ═══════════════════════════════════════════ */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className={`lg:col-span-2 surface-card ${!isAnyConnected ? "border-primary/20 dark:border-primary/30" : ""}`}>
          {/* Header */}
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className={`w-4 h-4 ${isAnyConnected ? "text-success" : "text-primary"}`} />
                <h3 className="text-foreground">Skill Hub</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono tracking-[0.15em] uppercase border ${
                  isAnyConnected
                    ? "bg-success/10 text-success border-success/20"
                    : "bg-destructive/10 text-destructive border-destructive/20"
                }`}>
                  {connectedCount}/{agentSkills.length} CONNECTED
                </span>
                <Link href="/account?tab=api">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1 rounded-full border-border text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="w-3 h-3" />
                    API Keys
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Connected state: Agent cards */}
            {isAnyConnected && (
              <div className="grid md:grid-cols-3 gap-4">
                {agentSkills.map((skill) => (
                  <div
                    key={skill.id}
                    className={`rounded-2xl p-4 transition-all duration-200 ease-in-out border ${
                      skill.status === "connected"
                        ? "bg-success/5 dark:bg-success/10 border-success/20"
                        : "bg-card border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-foreground">{skill.name}</span>
                      {skill.status === "connected" ? (
                        <div className="flex items-center gap-1.5">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-success" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                          </span>
                          <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-success">ONLINE</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <WifiOff className="w-3 h-3 text-muted-foreground" />
                          <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground">OFFLINE</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Sync</span>
                        <span className="font-mono text-foreground">{skill.lastSync}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Factors Mined</span>
                        <span className={`font-mono ${skill.factorsGenerated > 0 ? "text-success" : "text-muted-foreground"}`}>{skill.factorsGenerated}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Skill Version</span>
                        <span className="font-mono text-muted-foreground">{skill.version}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Installation Guide */}
            {isAnyConnected ? (
              <button
                onClick={() => setGuideExpanded(!guideExpanded)}
                className="flex items-center gap-2 w-full py-2.5 px-4 rounded-2xl transition-colors duration-200 ease-in-out text-sm bg-accent border border-border hover:bg-slate-200 dark:hover:bg-slate-800"
              >
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium text-muted-foreground">Skill Installation Guide</span>
                <span className="text-xs ml-1 text-muted-foreground/60">— Set up more AI agents</span>
                <div className="ml-auto">
                  {guideExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>
            ) : (
              <div className="rounded-2xl p-6 bg-primary/5 dark:bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-primary">
                    <Sparkles className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">Get Started — Connect Your First AI Agent</div>
                    <div className="text-xs text-muted-foreground">Install the Otter skill to start mining factors automatically</div>
                  </div>
                </div>
              </div>
            )}

            {/* Guide content */}
            {(guideExpanded || !isAnyConnected) && (
              <div className="space-y-4">
                <div className="flex gap-1 p-1 rounded-2xl bg-accent border border-border">
                  {installSteps.map((guide) => (
                    <button
                      key={guide.id}
                      onClick={() => setActiveGuide(guide.id)}
                      className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-medium transition-all duration-200 ease-in-out border ${
                        activeGuide === guide.id
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "text-muted-foreground border-transparent hover:text-foreground"
                      }`}
                    >
                      {guide.title}
                    </button>
                  ))}
                </div>

                {installSteps
                  .filter((g) => g.id === activeGuide)
                  .map((guide) => (
                    <div key={guide.id} className="space-y-2">
                      <div className="rounded-2xl overflow-hidden bg-background border border-border">
                        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-accent">
                          <Terminal className="w-3.5 h-3.5 text-primary" />
                          <span className="text-xs font-mono text-muted-foreground">terminal</span>
                        </div>
                        <div className="p-4 space-y-1">
                          {guide.steps.map((step, idx) => (
                            <div key={idx} className="flex items-start gap-2 group">
                              <code className="text-xs font-mono flex-1">
                                {step.startsWith("#") ? (
                                  <span className="text-muted-foreground">{step}</span>
                                ) : (
                                  <>
                                    <span className="text-primary">$ </span>
                                    <span className="text-foreground">{step}</span>
                                  </>
                                )}
                              </code>
                              {!step.startsWith("#") && (
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                  <CopyButton text={step} />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs px-1 text-muted-foreground">
                        <ExternalLink className="w-3 h-3" />
                        <span>Full documentation at</span>
                        <span className="font-mono text-primary cursor-pointer hover:underline">docs.alphaforge.io/skills/{guide.id}</span>
                      </div>
                    </div>
                  ))}

                <div className="rounded-2xl p-4 bg-primary/5 dark:bg-primary/10 border border-primary/20">
                  <div className="text-xs font-medium mb-1.5 text-primary">Quick Start</div>
                  <ol className="text-xs space-y-1 list-decimal list-inside text-muted-foreground">
                    <li>Install the Otter skill in your preferred AI coding agent</li>
                    <li>Configure your API key in the account settings page</li>
                    <li>Start a conversation: <code className="font-mono px-1 rounded-lg text-primary bg-accent">"Mine alpha factors for BTC/USDT on Binance"</code></li>
                    <li>The agent will generate factors, backtest, and submit results automatically</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════
            5. RECENT ACTIVITY
            ═══════════════════════════════════════════ */}
        <div className="lg:col-span-1 surface-card">
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Recent Activity</span>
            </div>
          </div>
          <div className="px-4 pb-4">
            <div className="space-y-0">
              {recentActivity.slice(0, 8).map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-2.5 py-2 px-2 rounded-xl transition-all duration-200 ease-in-out hover:bg-accent"
                >
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-accent">
                    {iconMap[item.icon]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs leading-snug block truncate text-muted-foreground">{item.message}</span>
                    <span className="text-[10px] font-mono text-muted-foreground/60">{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
