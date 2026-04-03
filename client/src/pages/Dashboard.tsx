/*
 * Dashboard — ChainGPT Staking DNA Design System
 * Background: #09090e (Cinder) | Card: #14141c | Elevated: #1c1c26
 * Primary: #6c5ae6 (Royal Blue) | Accent: #f8cf3e (Bright Sun)
 * Glassmorphic cards with subtle inner glow
 * Font: Inter + Space Mono (financial data)
 * Pure Tailwind classes — zero inline styles except scoped CSS vars
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
  Terminal,
  Copy,
  Check,
  WifiOff,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Cpu,
  Sparkles,
  Clock,
} from "lucide-react";
import { dashboardStats, recentActivity, currentEpoch } from "@/lib/mockData";

const statCards = [
  { label: "TOTAL ALPHAS", value: dashboardStats.totalFactors.toString(), sub: `${dashboardStats.activeFactors} active`, icon: FlaskConical, highlight: false },
  { label: "AVG SHARPE (OS)", value: dashboardStats.avgSharpe.toFixed(2), sub: "Out-of-Sample", icon: TrendingUp, highlight: true },
  { label: "PASS RATE", value: dashboardStats.passRate, sub: `${dashboardStats.activeFactors}/${dashboardStats.totalFactors} alphas`, icon: CheckCircle, highlight: false },
  { label: "ACTIVE TRADES", value: dashboardStats.activeTrades.toString(), sub: "Running now", icon: Zap, highlight: false },
  { label: "SUBSCRIBERS", value: dashboardStats.subscriberCount.toLocaleString(), sub: "Platform total", icon: Users, highlight: false },
];

const iconMap: Record<string, React.ReactNode> = {
  plus: <Zap className="w-3.5 h-3.5 text-[#6c5ae6]" />,
  check: <CheckCircle className="w-3.5 h-3.5 text-[#00ffa3]" />,
  trophy: <Award className="w-3.5 h-3.5 text-[#f8cf3e]" />,
  activity: <Activity className="w-3.5 h-3.5 text-[#6c5ae6]" />,
  x: <XCircle className="w-3.5 h-3.5 text-[#ff4d4d]" />,
  user: <Users className="w-3.5 h-3.5 text-[#6c5ae6]" />,
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
    title: "OpenAI Codex",
    steps: [
      'npx alphaforge-skill install --target codex',
      '# Or manually: copy skill files to ~/.codex/skills/alphaforge/',
      'codex skill enable alphaforge',
    ],
  },
  {
    id: "claude",
    title: "Claude Code",
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

/* ── Copy button for terminal title bar ── */
function TerminalCopyButton({ steps }: { steps: string[] }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    const text = steps.filter(s => !s.startsWith("#")).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="p-1 rounded-[4px] transition-colors text-white/40 hover:text-white/80" title="Copy all commands">
      {copied ? <Check className="w-3.5 h-3.5 text-[#00ffa3]" /> : <Copy className="w-3.5 h-3.5" />}
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

/* ── Dashboard-scoped CSS variables ── */
const dashboardScopedStyle: React.CSSProperties = {
  /* @ts-ignore */ 
  '--db-bg': '#09090e',
  '--db-card': '#14141c',
  '--db-elevated': '#1c1c26',
  '--db-primary': '#6c5ae6',
  '--db-accent': '#f8cf3e',
  '--db-success': '#00ffa3',
  '--db-warning': '#ff9900',
  '--db-error': '#ff4d4d',
  '--db-border': '#2a2a35',
  '--db-text': '#f0f0f5',
  '--db-text-muted': '#8a8a9a',
} as React.CSSProperties;

export default function Dashboard() {
  const [guideExpanded, setGuideExpanded] = useState(!isAnyConnected);
  const [activeGuide, setActiveGuide] = useState("codex");
  const headerRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const countdown = useCountdown(currentEpoch.timeRemaining);

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

  const goldGradient = "text-transparent bg-clip-text bg-gradient-to-r from-[#f8cf3e] via-[#ffe066] to-[#f8cf3e]";

  return (
    <div className="space-y-6" style={dashboardScopedStyle}>
      {/* ═══════════════════════════════════════════
          2. PAGE HEADER (moved above banner)
          ═══════════════════════════════════════════ */}
      <div ref={headerRef} className="reveal-clip">
        <div className="reveal-line">
          <h1 className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white/90 to-[#6c5ae6]">
            Dashboard
          </h1>
        </div>
        <div className="reveal-line mt-2">
          <p className="text-base text-white/50">
            AI-powered alpha mining platform — monitor your agents, track performance, compete for rewards.
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          1. CURRENT EPOCH — Single Banner Entry
          ═══════════════════════════════════════════ */}
      <div
        ref={bannerRef}
        className="overflow-hidden rounded-[12px] border border-[#6c5ae6]/30 bg-[#14141c]/80 backdrop-blur-[16px]"
        style={{ boxShadow: '0 0 40px rgba(108, 90, 230, 0.08), inset 0 1px 0 rgba(255,255,255,0.05)' }}
      >
        <div className="flex items-center justify-between px-6 py-5 gap-6 flex-wrap">
          {/* Left: Epoch identity */}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 bg-[#6c5ae6]/15 border border-[#6c5ae6]/25">
              <Trophy className="w-5 h-5 text-[#6c5ae6]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-white">{currentEpoch.id}</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] tracking-[0.15em] uppercase bg-[#00ffa3]/10 text-[#00ffa3] border border-[#00ffa3]/20" style={{ fontFamily: "'Space Mono', monospace" }}>
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ffa3] opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00ffa3]" />
                  </span>
                  LIVE
                </span>
              </div>
              <span className="text-xs text-white/40">{currentEpoch.startDate} — {currentEpoch.endDate}</span>
            </div>
          </div>

          {/* Center: Key metrics inline */}
          <div className="flex items-center gap-6 flex-wrap">
            <div className="text-center">
              <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/40 mb-0.5" style={{ fontFamily: "'Space Mono', monospace" }}>Prize Pool</div>
              <div className={`text-base font-bold ${goldGradient}`} style={{ fontFamily: "'Space Mono', monospace", fontVariantNumeric: 'tabular-nums' }}>
                {stripUSDT(currentEpoch.totalPool)} <span className="text-xs font-medium">USDT</span>
              </div>
            </div>
            <div className="w-px h-8 bg-[#2a2a35]" />
            <div className="text-center">
              <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/40 mb-0.5 flex items-center justify-center gap-1" style={{ fontFamily: "'Space Mono', monospace" }}>
                <Clock className="w-3 h-3" />
                Time Remaining
              </div>
              <div className="text-base font-bold text-white" style={{ fontFamily: "'Space Mono', monospace", fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                {countdown.display}
              </div>
            </div>
            <div className="w-px h-8 bg-[#2a2a35]" />
            <div className="text-center">
              <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/40 mb-0.5" style={{ fontFamily: "'Space Mono', monospace" }}>Qualified</div>
              <div className="text-base font-bold text-white" style={{ fontFamily: "'Space Mono', monospace", fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                {currentEpoch.qualifiedFactors}<span className="text-xs font-normal text-white/40"> / {currentEpoch.totalSubmissions}</span>
              </div>
            </div>
          </div>

          {/* Right: CTA */}
          <Link href="/leaderboard">
            <Button className="gap-1.5 rounded-full text-sm bg-[#6c5ae6] text-white hover:brightness-110 hover:scale-105 transition-all duration-300" style={{ boxShadow: '0 0 20px rgba(108, 90, 230, 0.3)' }}>
              Alpha Arena
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          3. STATS — Single fused module → My Alphas
          ═══════════════════════════════════════════ */}
      <Link href="/my-alphas">
        <div
          ref={statsRef}
          className="rounded-[12px] border border-[#2a2a35] bg-[#14141c]/80 backdrop-blur-[16px] p-6 mb-6 cursor-pointer group transition-all duration-300 hover:border-[#6c5ae6]/40"
          style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}
        >
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="fade-item min-w-0">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Icon className="w-3.5 h-3.5 text-white/30 shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/40 truncate" style={{ fontFamily: "'Space Mono', monospace" }}>{stat.label}</span>
                  </div>
                  <div className={`text-2xl font-bold truncate ${stat.highlight ? "text-[#00ffa3]" : "text-white"}`} style={{ fontFamily: "'Space Mono', monospace", fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                    {stat.value}
                  </div>
                  <div className="text-sm mt-1 text-white/40 truncate">{stat.sub}</div>
                </div>
              );
            })}
          </div>
        </div>
      </Link>

      {/* ═══════════════════════════════════════════
          4. AGENT HUB — Agent + Terminal fused
          ═══════════════════════════════════════════ */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-2 rounded-[12px] border bg-[#14141c]/80 backdrop-blur-[16px] cursor-pointer group transition-all duration-300 hover:border-[#6c5ae6]/40 ${!isAnyConnected ? "border-[#6c5ae6]/30" : "border-[#2a2a35]"}`} style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
          {/* Header */}
          <div className="px-6 py-4 border-b border-[#2a2a35]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className={`w-4 h-4 ${isAnyConnected ? "text-[#00ffa3]" : "text-[#6c5ae6]"}`} />
                <h3 className="text-white">Agent Hub</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] tracking-[0.15em] uppercase border ${
                  isAnyConnected
                    ? "bg-[#00ffa3]/10 text-[#00ffa3] border-[#00ffa3]/20"
                    : "bg-[#ff4d4d]/10 text-[#ff4d4d] border-[#ff4d4d]/20"
                }`} style={{ fontFamily: "'Space Mono', monospace" }}>
                  {connectedCount}/{agentSkills.length} CONNECTED
                </span>
                <Link href="/account?tab=api">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1 rounded-full border-[#2a2a35] text-white/40 hover:text-white hover:border-[#6c5ae6]/40 bg-transparent"
                  >
                    <ExternalLink className="w-3 h-3" />
                    API Keys
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Connected state: Agent cards */}
            {isAnyConnected && (
              <div className="grid md:grid-cols-3 gap-4">
                {agentSkills.map((skill) => (
                  <div
                    key={skill.id}
                    className={`rounded-[12px] p-4 transition-all duration-300 border ${
                      skill.status === "connected"
                        ? "bg-[#00ffa3]/5 border-[#00ffa3]/15 hover:border-[#00ffa3]/30"
                        : "bg-[#1c1c26] border-[#2a2a35] hover:border-white/15"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-white">{skill.name}</span>
                      {skill.status === "connected" ? (
                        <div className="flex items-center gap-1.5">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-[#00ffa3]" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00ffa3]" />
                          </span>
                          <span className="text-[10px] tracking-[0.2em] uppercase text-[#00ffa3]" style={{ fontFamily: "'Space Mono', monospace" }}>ONLINE</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <WifiOff className="w-3 h-3 text-white/30" />
                          <span className="text-[10px] tracking-[0.2em] uppercase text-white/30" style={{ fontFamily: "'Space Mono', monospace" }}>OFFLINE</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-white/40">Last Sync</span>
                        <span className="text-white" style={{ fontFamily: "'Space Mono', monospace" }}>{skill.lastSync}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/40">Alphas Mined</span>
                        <span className={`${skill.factorsGenerated > 0 ? "text-[#00ffa3]" : "text-white/30"}`} style={{ fontFamily: "'Space Mono', monospace" }}>{skill.factorsGenerated}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/40">Skill Version</span>
                        <span className="text-white/30" style={{ fontFamily: "'Space Mono', monospace" }}>{skill.version}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Skill Installation Guide — fused agent + terminal */}
            <div className="space-y-3">
              {/* Section header / toggle */}
              {isAnyConnected ? (
                <button
                  onClick={() => setGuideExpanded(!guideExpanded)}
                  className="flex items-center gap-2 w-full py-2.5 px-4 rounded-[12px] transition-all duration-300 text-sm bg-[#1c1c26] border border-[#2a2a35] hover:border-[#6c5ae6]/30"
                >
                  <BookOpen className="w-4 h-4 text-white/40" />
                  <span className="font-medium text-white/60">Skill Installation Guide</span>
                  <span className="text-xs ml-1 text-white/30">— Set up more AI agents</span>
                  <div className="ml-auto">
                    {guideExpanded ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
                  </div>
                </button>
              ) : (
                <div className="rounded-[12px] p-5 bg-[#6c5ae6]/10 border border-[#6c5ae6]/25">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-[8px] flex items-center justify-center bg-[#6c5ae6]">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">Skill Installation Guide</div>
                      <div className="text-xs text-white/40">Install the Otter skill to start mining alphas automatically</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Fused block: Agent tabs as terminal header → code body → quickstart footer */}
              {(guideExpanded || !isAnyConnected) && (
                <div className="rounded-[12px] overflow-hidden bg-[#09090e] border border-[#2a2a35]">
                  {/* Agent tabs + copy button in terminal header bar */}
                  <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#2a2a35] bg-[#1c1c26]">
                    <div className="flex items-center gap-1">
                      <Terminal className="w-3.5 h-3.5 text-[#6c5ae6] mr-1" />
                      {installSteps.map((guide) => (
                        <button
                          key={guide.id}
                          onClick={() => setActiveGuide(guide.id)}
                          className={`py-1 px-2.5 rounded-[4px] text-[11px] font-medium transition-all duration-300 ${
                            activeGuide === guide.id
                              ? "bg-[#6c5ae6]/15 text-[#6c5ae6]"
                              : "text-white/40 hover:text-white/70"
                          }`}
                        >
                          {guide.title}
                        </button>
                      ))}
                    </div>
                    <TerminalCopyButton steps={installSteps.find(g => g.id === activeGuide)?.steps ?? []} />
                  </div>

                  {/* Terminal code body */}
                  {installSteps
                    .filter((g) => g.id === activeGuide)
                    .map((guide) => (
                      <div key={guide.id} className="p-4 space-y-1">
                        {guide.steps.map((step, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <code className="text-xs flex-1" style={{ fontFamily: "'Space Mono', monospace" }}>
                              {step.startsWith("#") ? (
                                <span className="text-white/30">{step}</span>
                              ) : (
                                <>
                                  <span className="text-[#6c5ae6]">$ </span>
                                  <span className="text-white/80">{step}</span>
                                </>
                              )}
                            </code>
                          </div>
                        ))}
                      </div>
                    ))}

                  {/* Quickstart as footer — lowest priority */}
                  <div className="px-4 py-3 border-t border-[#2a2a35]/50 bg-[#1c1c26]/50">
                    <ol className="text-[11px] space-y-0.5 list-decimal list-inside text-white/30">
                      <li>Install the Otter skill in your preferred AI coding agent</li>
                      <li>Configure your API key in <span className="text-[#6c5ae6]/80 font-medium">Account → API Keys</span></li>
                      <li>Start a conversation: <code className="px-1 rounded-[4px] text-[#6c5ae6]/80 bg-[#1c1c26] text-[10px]" style={{ fontFamily: "'Space Mono', monospace" }}>"Mine alpha factors for BTC/USDT"</code></li>
                    </ol>
                  </div>
                </div>
              )}

              {(guideExpanded || !isAnyConnected) && (
                <div className="flex items-center gap-2 text-[11px] px-1 text-white/30">
                  <ExternalLink className="w-3 h-3" />
                  <span>Full documentation at</span>
                  <span className="text-[#6c5ae6]/60 cursor-pointer hover:underline hover:text-[#6c5ae6]" style={{ fontFamily: "'Space Mono', monospace" }}>docs.otter.io/skills/{activeGuide}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════
            5. RECENT ACTIVITY
            ═══════════════════════════════════════════ */}
        <div className="lg:col-span-1 rounded-[12px] border border-[#2a2a35] bg-[#14141c]/80 backdrop-blur-[16px] group transition-all duration-300 hover:border-[#6c5ae6]/40" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
          <div className="px-6 py-4 border-b border-[#2a2a35]">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-white/30" />
              <span className="text-sm font-medium text-white/50">Recent Activity</span>
            </div>
          </div>
          <div className="px-4 pb-4">
            <div className="space-y-0">
              {recentActivity.slice(0, 8).map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-2.5 py-2 px-2 rounded-[8px] transition-all duration-300 hover:bg-white/[0.03]"
                >
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-white/[0.05]">
                    {iconMap[item.icon]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs leading-snug block truncate text-white/50">{item.message}</span>
                    <span className="text-[10px] text-white/25" style={{ fontFamily: "'Space Mono', monospace" }}>{item.time}</span>
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
