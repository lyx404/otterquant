/*
 * Dashboard — Katana Deep Navy Design System
 * bg-0: #0d111c | bg-1: #101631
 * Primary: #0058ff | Success: #00ffc2 | Danger: #f12211
 * Text: rgba(236,238,243, 0.92/0.48/0.32)
 * Border: rgba(236,238,243, 0.08/0.12)
 * Frosted glass cards, GSAP staggered reveal
 *
 * Layout order:
 *   1. Current Epoch Banner (full-width, compact, with campaign stickers)
 *   2. Stats Grid
 *   3. Skill Hub (merged Agent Status + Installation Guide, state-aware)
 *   4. Recent Activity (compact, attached to Skill Hub when connected)
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
import { useKatanaColors } from "@/hooks/useKatanaColors";

/* ── color tokens (derived from theme) ── */
function useC() {
  const k = useKatanaColors();
  return {
    ...k,
    primaryBorder: k.isDark ? "rgba(0,88,255,0.30)" : "rgba(0,88,255,0.20)",
    successDim: k.isDark ? "rgba(0,255,194,0.10)" : "rgba(0,200,150,0.08)",
    successBorder: k.isDark ? "rgba(0,255,194,0.20)" : "rgba(0,200,150,0.15)",
    dangerDim: k.isDark ? "rgba(241,34,17,0.10)" : "rgba(241,34,17,0.06)",
    accentDim: k.isDark ? "rgba(215,255,0,0.10)" : "rgba(215,255,0,0.06)",
  };
}

const statCards = [
  { label: "TOTAL FACTORS", value: dashboardStats.totalFactors.toString(), sub: `${dashboardStats.activeFactors} active`, icon: FlaskConical, highlight: false },
  { label: "AVG SHARPE (OS)", value: dashboardStats.avgSharpe.toFixed(2), sub: "Out-of-Sample", icon: TrendingUp, highlight: true },
  { label: "PASS RATE", value: dashboardStats.passRate, sub: `${dashboardStats.activeFactors}/${dashboardStats.totalFactors}`, icon: CheckCircle, highlight: false },
  { label: "ACTIVE TRADES", value: dashboardStats.activeTrades.toString(), sub: "Running now", icon: Zap, highlight: false },
  { label: "SUBSCRIBERS", value: dashboardStats.subscriberCount.toLocaleString(), sub: "Platform total", icon: Users, highlight: false },
];

const iconMap: Record<string, React.ReactNode> = {
  plus: <Zap className="w-3.5 h-3.5" style={{ color: "#0058ff" }} />,
  check: <CheckCircle className="w-3.5 h-3.5" style={{ color: "#00ffc2" }} />,
  trophy: <Award className="w-3.5 h-3.5" style={{ color: "#db5e05" }} />,
  activity: <Activity className="w-3.5 h-3.5" style={{ color: "#0058ff" }} />,
  x: <XCircle className="w-3.5 h-3.5" style={{ color: "#f12211" }} />,
  user: <Users className="w-3.5 h-3.5" style={{ color: "#a268ff" }} />,
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
      'cursor settings → Skills → Enable AlphaForge',
    ],
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const C = useC();
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="p-1 rounded transition-colors" style={{ color: C.text3 }}>
      {copied ? <Check className="w-3.5 h-3.5" style={{ color: C.success }} /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function Dashboard() {
  const C = useC();
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
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════
          1. CURRENT EPOCH BANNER — Full-width, compact, top position
          ═══════════════════════════════════════════ */}
      <div
        ref={bannerRef}
        className="rounded-2xl overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${C.primaryDim} 0%, rgba(0,88,255,0.06) 40%, ${C.card} 100%)`,
          border: `1px solid ${C.primaryBorder}`,
        }}
      >
        <div className="flex items-center justify-between px-5 py-4 gap-4 flex-wrap">
          {/* Left: Epoch info */}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: C.primaryDim, border: `1px solid ${C.primaryBorder}` }}>
              <Trophy className="w-5 h-5" style={{ color: C.primary }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold" style={{ color: C.text1 }}>Current Epoch</span>
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-mono tracking-[0.15em] uppercase"
                  style={{ backgroundColor: C.primaryDim, color: C.primaryLight, border: `1px solid ${C.primaryBorder}` }}
                >
                  LIVE
                </span>
              </div>
              <span className="text-xs font-mono" style={{ color: C.primaryLight }}>{currentEpoch.id}</span>
            </div>
          </div>

          {/* Center: Key metrics inline */}
          <div className="flex items-center gap-6 flex-wrap">
            <div className="text-center">
              <div className="label-upper mb-0.5">Prize Pool</div>
              <div className="stat-value text-base font-bold" style={{ color: C.success }}>{currentEpoch.totalPool}</div>
            </div>
            <div className="w-px h-8" style={{ backgroundColor: C.borderWeak }} />
            <div className="text-center">
              <div className="label-upper mb-0.5">Time Left</div>
              <div className="stat-value text-base font-bold" style={{ color: C.danger }}>{currentEpoch.timeRemaining}</div>
            </div>
            <div className="w-px h-8" style={{ backgroundColor: C.borderWeak }} />
            <div className="text-center">
              <div className="label-upper mb-0.5">Qualified</div>
              <div className="stat-value text-base font-bold" style={{ color: C.text1 }}>
                {currentEpoch.qualifiedFactors}<span className="text-xs font-normal" style={{ color: C.text3 }}> / {currentEpoch.totalSubmissions}</span>
              </div>
            </div>
          </div>

          {/* Right: Campaign stickers + CTA */}
          <div className="flex items-center gap-3">
            {/* Campaign stickers */}
            <div className="hidden md:flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium tracking-wide"
                style={{ backgroundColor: C.accentDim, color: C.accent, border: `1px solid rgba(215,255,0,0.20)` }}
              >
                <Flame className="w-3 h-3" /> 2x REWARDS
              </span>
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium tracking-wide"
                style={{ backgroundColor: "rgba(162,104,255,0.10)", color: C.purple, border: `1px solid rgba(162,104,255,0.20)` }}
              >
                <Star className="w-3 h-3" /> SEASON 3
              </span>
            </div>
            <Link href="/leaderboard">
              <Button
                className="gap-1.5 rounded-full text-sm"
                style={{ backgroundColor: C.primary, color: "#fff" }}
              >
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
          <h1 className="text-5xl md:text-7xl font-medium tracking-tighter leading-none" style={{ color: C.text1 }}>
            Dashboard
          </h1>
        </div>
        <div className="reveal-line mt-2">
          <p className="text-sm" style={{ color: C.text2 }}>
            AI Factor Mining Platform Overview
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          3. STATS GRID
          ═══════════════════════════════════════════ */}
      <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="fade-item">
              <div className="katana-card p-4 group">
                <div data-parallax-inner="">
                  <div className="flex items-center justify-between mb-3">
                    <span className="label-upper">{stat.label}</span>
                    <Icon className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" style={{ color: C.text3 }} />
                  </div>
                  <div className="text-2xl stat-value font-bold" style={{ color: stat.highlight ? C.success : C.text1 }}>
                    {stat.value}
                  </div>
                  <div className="text-xs mt-1" style={{ color: C.text2 }}>{stat.sub}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════
          4. SKILL HUB — Merged Agent Status + Installation Guide
             State-aware: shows different emphasis based on connection
          ═══════════════════════════════════════════ */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Main Skill Module — 2 cols */}
        <div className="lg:col-span-2 katana-card" style={{ borderColor: isAnyConnected ? C.border : C.primaryBorder }}>
          {/* Header */}
          <div className="p-4 pb-3" style={{ borderBottom: `1px solid ${C.borderWeak}` }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4" style={{ color: isAnyConnected ? C.success : C.primary }} />
                <span className="text-sm font-semibold" style={{ color: C.text1 }}>Skill Hub</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono tracking-[0.15em] uppercase"
                  style={{
                    backgroundColor: isAnyConnected ? C.successDim : C.dangerDim,
                    color: isAnyConnected ? C.success : C.danger,
                    border: `1px solid ${isAnyConnected ? C.successBorder : "rgba(241,34,17,0.20)"}`,
                  }}
                >
                  {connectedCount}/{agentSkills.length} CONNECTED
                </span>
                <Link href="/account?tab=api">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1 rounded-full"
                    style={{ borderColor: C.borderWeak, color: C.text2 }}
                  >
                    <ExternalLink className="w-3 h-3" />
                    API Keys
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-3">
            {/* ── Connected state: Agent cards prominent ── */}
            {isAnyConnected && (
              <div className="grid md:grid-cols-3 gap-3">
                {agentSkills.map((skill) => (
                  <div
                    key={skill.id}
                    className="rounded-2xl p-3.5 transition-all duration-250"
                    style={{
                      border: `1px solid ${skill.status === "connected" ? C.successBorder : C.borderWeak}`,
                      backgroundColor: skill.status === "connected" ? C.successDim : C.card,
                    }}
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-sm font-medium" style={{ color: C.text1 }}>{skill.name}</span>
                      {skill.status === "connected" ? (
                        <div className="flex items-center gap-1.5">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: C.success }} />
                            <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: C.success }} />
                          </span>
                          <span className="text-[10px] font-mono tracking-[0.2em] uppercase" style={{ color: C.success }}>ONLINE</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <WifiOff className="w-3 h-3" style={{ color: C.text3 }} />
                          <span className="text-[10px] font-mono tracking-[0.2em] uppercase" style={{ color: C.text3 }}>OFFLINE</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span style={{ color: C.text2 }}>Last Sync</span>
                        <span className="font-mono" style={{ color: C.text1 }}>{skill.lastSync}</span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: C.text2 }}>Factors Mined</span>
                        <span className="font-mono" style={{ color: skill.factorsGenerated > 0 ? C.success : C.text3 }}>{skill.factorsGenerated}</span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: C.text2 }}>Skill Version</span>
                        <span className="font-mono" style={{ color: C.text3 }}>{skill.version}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Installation Guide ── */}
            {/* When not connected: expanded by default, prominent */}
            {/* When connected: collapsed toggle, de-emphasized */}
            {isAnyConnected ? (
              /* Collapsed toggle when connected */
              <button
                onClick={() => setGuideExpanded(!guideExpanded)}
                className="flex items-center gap-2 w-full py-2.5 px-3 rounded-xl transition-colors text-sm"
                style={{ backgroundColor: C.card, border: `1px solid ${C.borderWeak}` }}
              >
                <BookOpen className="w-4 h-4" style={{ color: C.text3 }} />
                <span className="font-medium" style={{ color: C.text2 }}>Skill Installation Guide</span>
                <span className="text-xs ml-1" style={{ color: C.text3 }}>— Set up more AI agents</span>
                <div className="ml-auto">
                  {guideExpanded ? <ChevronUp className="w-4 h-4" style={{ color: C.text3 }} /> : <ChevronDown className="w-4 h-4" style={{ color: C.text3 }} />}
                </div>
              </button>
            ) : (
              /* Prominent header when not connected */
              <div className="rounded-xl p-4" style={{ backgroundColor: C.primaryDim, border: `1px solid ${C.primaryBorder}` }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: C.primary }}>
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: C.text1 }}>Get Started — Connect Your First AI Agent</div>
                    <div className="text-xs" style={{ color: C.text2 }}>Install the AlphaForge skill to start mining factors automatically</div>
                  </div>
                </div>
              </div>
            )}

            {/* Guide content (shown when expanded or not connected) */}
            {(guideExpanded || !isAnyConnected) && (
              <div className="space-y-3">
                {/* Tab selector */}
                <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: C.card, border: `1px solid ${C.borderWeak}` }}>
                  {installSteps.map((guide) => (
                    <button
                      key={guide.id}
                      onClick={() => setActiveGuide(guide.id)}
                      className="flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all duration-250"
                      style={{
                        backgroundColor: activeGuide === guide.id ? C.primaryDim : "transparent",
                        color: activeGuide === guide.id ? C.primaryLight : C.text2,
                        border: activeGuide === guide.id ? `1px solid ${C.primaryBorder}` : "1px solid transparent",
                      }}
                    >
                      {guide.title}
                    </button>
                  ))}
                </div>

                {/* Install steps */}
                {installSteps
                  .filter((g) => g.id === activeGuide)
                  .map((guide) => (
                    <div key={guide.id} className="space-y-2">
                      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: C.bg0, border: `1px solid ${C.border}` }}>
                        <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: `1px solid ${C.borderWeak}`, backgroundColor: C.card }}>
                          <Terminal className="w-3.5 h-3.5" style={{ color: C.primary }} />
                          <span className="text-xs font-mono" style={{ color: C.text2 }}>terminal</span>
                        </div>
                        <div className="p-3 space-y-1">
                          {guide.steps.map((step, idx) => (
                            <div key={idx} className="flex items-start gap-2 group">
                              <code className="text-xs font-mono flex-1">
                                {step.startsWith("#") ? (
                                  <span style={{ color: C.text3 }}>{step}</span>
                                ) : (
                                  <>
                                    <span style={{ color: C.primary }}>$ </span>
                                    <span style={{ color: C.text1 }}>{step}</span>
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
                      <div className="flex items-center gap-2 text-xs px-1" style={{ color: C.text2 }}>
                        <ExternalLink className="w-3 h-3" />
                        <span>Full documentation at</span>
                        <span className="font-mono" style={{ color: C.primaryLight, cursor: "pointer" }}>docs.alphaforge.io/skills/{guide.id}</span>
                      </div>
                    </div>
                  ))}

                {/* Quick start summary */}
                <div className="rounded-xl p-3" style={{ backgroundColor: C.primaryDim, border: `1px solid ${C.primaryBorder}` }}>
                  <div className="text-xs font-medium mb-1.5" style={{ color: C.primaryLight }}>Quick Start</div>
                  <ol className="text-xs space-y-1 list-decimal list-inside" style={{ color: C.text2 }}>
                    <li>Install the AlphaForge skill in your preferred AI coding agent</li>
                    <li>Configure your API key in the account settings page</li>
                    <li>Start a conversation: <code className="font-mono px-1 rounded" style={{ color: C.primaryLight, backgroundColor: C.card }}>"Mine alpha factors for BTC/USDT on Binance"</code></li>
                    <li>The agent will generate factors, backtest, and submit results automatically</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════
            5. RECENT ACTIVITY — Sidebar, attached info
            ═══════════════════════════════════════════ */}
        <div className="lg:col-span-1 katana-card" style={{ borderColor: C.borderWeak }}>
          <div className="p-4 pb-3" style={{ borderBottom: `1px solid ${C.borderWeak}` }}>
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5" style={{ color: C.text3 }} />
              <span className="text-sm font-medium" style={{ color: C.text2 }}>Recent Activity</span>
            </div>
          </div>
          <div className="px-3 pb-3">
            <div className="space-y-0">
              {recentActivity.slice(0, 8).map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-2.5 py-2 px-2 rounded-xl transition-all duration-200"
                  style={{ cursor: "default" }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = C.card; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={{ backgroundColor: C.card }}
                  >
                    {iconMap[item.icon]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs leading-snug block truncate" style={{ color: C.text2 }}>{item.message}</span>
                    <span className="text-[10px] font-mono" style={{ color: C.text3 }}>{item.time}</span>
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
