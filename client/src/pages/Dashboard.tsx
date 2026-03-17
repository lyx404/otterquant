/*
 * Dashboard — Katana Deep Navy Design System
 * bg-0: #0d111c | bg-1: #101631
 * Primary: #0058ff | Success: #00ffc2 | Danger: #f12211
 * Text: rgba(236,238,243, 0.92/0.48/0.32)
 * Border: rgba(236,238,243, 0.08/0.12)
 * Frosted glass cards, GSAP staggered reveal
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { dashboardStats, recentActivity, currentEpoch } from "@/lib/mockData";

/* ── color tokens ── */
const C = {
  bg0: "#0d111c",
  bg1: "#101631",
  card: "rgba(236,238,243,0.04)",
  cardHover: "rgba(236,238,243,0.06)",
  borderWeak: "rgba(236,238,243,0.08)",
  border: "rgba(236,238,243,0.12)",
  text1: "rgba(236,238,243,0.92)",
  text2: "rgba(236,238,243,0.48)",
  text3: "rgba(236,238,243,0.32)",
  primary: "#0058ff",
  primaryDim: "rgba(0,88,255,0.12)",
  primaryBorder: "rgba(0,88,255,0.30)",
  success: "#00ffc2",
  successDim: "rgba(0,255,194,0.10)",
  successBorder: "rgba(0,255,194,0.20)",
  danger: "#f12211",
  accent: "#d7ff00",
};

const statCards = [
  { label: "TOTAL FACTORS", value: dashboardStats.totalFactors.toString(), sub: `${dashboardStats.activeFactors} active`, icon: FlaskConical, highlight: false },
  { label: "AVG SHARPE (OS)", value: dashboardStats.avgSharpe.toFixed(2), sub: "Out-of-Sample", icon: TrendingUp, highlight: true },
  { label: "PASS RATE", value: dashboardStats.passRate, sub: `${dashboardStats.activeFactors}/${dashboardStats.totalFactors}`, icon: CheckCircle, highlight: false },
  { label: "ACTIVE TRADES", value: dashboardStats.activeTrades.toString(), sub: "Running now", icon: Zap, highlight: false },
  { label: "SUBSCRIBERS", value: dashboardStats.subscriberCount.toLocaleString(), sub: "Platform total", icon: Users, highlight: false },
];

const iconMap: Record<string, React.ReactNode> = {
  plus: <Zap className="w-4 h-4" style={{ color: C.primary }} />,
  check: <CheckCircle className="w-4 h-4" style={{ color: C.success }} />,
  trophy: <Award className="w-4 h-4" style={{ color: "#db5e05" }} />,
  activity: <Activity className="w-4 h-4" style={{ color: C.primary }} />,
  x: <XCircle className="w-4 h-4" style={{ color: C.danger }} />,
  user: <Users className="w-4 h-4" style={{ color: "#a268ff" }} />,
};

const agentSkills = [
  { id: "codex", name: "OpenAI Codex", status: "connected" as const, lastSync: "2 min ago", factorsGenerated: 42, version: "v2.4.1" },
  { id: "claude", name: "Claude Code", status: "connected" as const, lastSync: "5 min ago", factorsGenerated: 38, version: "v1.8.0" },
  { id: "cursor", name: "Cursor Agent", status: "disconnected" as const, lastSync: "Never", factorsGenerated: 0, version: "—" },
];

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
  const [guideExpanded, setGuideExpanded] = useState(false);
  const [activeGuide, setActiveGuide] = useState("codex");
  const headerRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="space-y-6">
      {/* Page Header */}
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

      {/* Stats Grid */}
      <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="fade-item">
              <div
                className="katana-card p-4 group"
              >
                <div data-parallax-inner="">
                  <div className="flex items-center justify-between mb-3">
                    <span className="label-upper">{stat.label}</span>
                    <Icon className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" style={{ color: C.text3 }} />
                  </div>
                  <div
                    className="text-2xl stat-value font-bold"
                    style={{ color: stat.highlight ? C.success : C.text1 }}
                  >
                    {stat.value}
                  </div>
                  <div className="text-xs mt-1" style={{ color: C.text2 }}>
                    {stat.sub}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Agent Skill Connection Status — DE-EMPHASIZED */}
      <div className="katana-card" style={{ borderColor: C.borderWeak, opacity: 0.85 }}>
        <div className="p-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5" style={{ color: C.text3 }} />
              <span className="text-sm font-medium" style={{ color: C.text2 }}>Agent Skill Status</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono tracking-[0.15em] uppercase"
                style={{
                  backgroundColor: C.successDim,
                  color: C.success,
                  border: `1px solid ${C.successBorder}`,
                }}
              >
                {agentSkills.filter(s => s.status === "connected").length}/{agentSkills.length} CONNECTED
              </span>
              <Link href="/account?tab=api">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1 rounded-full"
                  style={{
                    borderColor: C.borderWeak,
                    color: C.text2,
                  }}
                >
                  <ExternalLink className="w-3 h-3" />
                  API Keys
                </Button>
              </Link>
            </div>
          </div>
        </div>
        <div className="px-4 pb-4 space-y-3">
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
                    <span className="font-mono" style={{ color: skill.factorsGenerated > 0 ? C.success : C.text3 }}>
                      {skill.factorsGenerated}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: C.text2 }}>Skill Version</span>
                    <span className="font-mono" style={{ color: C.text3 }}>{skill.version}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Installation Guide Toggle */}
          <button
            onClick={() => setGuideExpanded(!guideExpanded)}
            className="flex items-center gap-2 w-full py-2.5 px-3 rounded-xl transition-colors text-sm"
            style={{
              backgroundColor: C.card,
              border: `1px solid ${C.borderWeak}`,
            }}
          >
            <BookOpen className="w-4 h-4" style={{ color: C.primary }} />
            <span className="font-medium" style={{ color: C.text1 }}>Skill Installation Guide</span>
            <span className="text-xs ml-1" style={{ color: C.text2 }}>— Set up AI agents to mine factors</span>
            <div className="ml-auto">
              {guideExpanded ? <ChevronUp className="w-4 h-4" style={{ color: C.text3 }} /> : <ChevronDown className="w-4 h-4" style={{ color: C.text3 }} />}
            </div>
          </button>

          {guideExpanded && (
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
                      color: activeGuide === guide.id ? "#4d94ff" : C.text2,
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
                      <span className="font-mono" style={{ color: "#4d94ff", cursor: "pointer" }}>docs.alphaforge.io/skills/{guide.id}</span>
                    </div>
                  </div>
                ))}

              {/* Quick start summary */}
              <div className="rounded-xl p-3" style={{ backgroundColor: C.primaryDim, border: `1px solid ${C.primaryBorder}` }}>
                <div className="text-xs font-medium mb-1.5" style={{ color: "#4d94ff" }}>Quick Start</div>
                <ol className="text-xs space-y-1 list-decimal list-inside" style={{ color: C.text2 }}>
                  <li>Install the AlphaForge skill in your preferred AI coding agent</li>
                  <li>Configure your API key in the account settings page</li>
                  <li>Start a conversation: <code className="font-mono px-1 rounded" style={{ color: "#4d94ff", backgroundColor: C.card }}>"Mine alpha factors for BTC/USDT on Binance"</code></li>
                  <li>The agent will generate factors, backtest, and submit results automatically</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Two Column Layout — Epoch emphasized, Activity de-emphasized */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Current Epoch Card — EMPHASIZED */}
        <div
          className="katana-card lg:col-span-2"
          style={{
            borderColor: C.primaryBorder,
            background: `linear-gradient(135deg, ${C.primaryDim} 0%, ${C.card} 100%)`,
          }}
        >
          <div className="p-5 pb-4" style={{ borderBottom: `1px solid ${C.borderWeak}` }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: C.primaryDim }}>
                  <Trophy className="w-4.5 h-4.5" style={{ color: C.primary }} />
                </div>
                <div>
                  <span className="text-lg font-semibold" style={{ color: C.text1 }}>Current Epoch</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-mono" style={{ color: "#4d94ff" }}>{currentEpoch.id}</span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-mono tracking-[0.15em]" style={{ backgroundColor: C.primaryDim, color: "#4d94ff" }}>LIVE</span>
                  </div>
                </div>
              </div>
              <Link href="/leaderboard">
                <Button
                  className="gap-2 rounded-full"
                  style={{
                    backgroundColor: C.primary,
                    color: "#ffffff",
                  }}
                >
                  View Leaderboard
                  <ArrowUpRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <div className="label-upper mb-2">Prize Pool</div>
                <div className="stat-value text-2xl font-bold" style={{ color: C.success }}>{currentEpoch.totalPool}</div>
                <div className="text-xs mt-1" style={{ color: C.text3 }}>distributed proportionally</div>
              </div>
              <div>
                <div className="label-upper mb-2">Time Left</div>
                <div className="stat-value text-2xl font-bold" style={{ color: C.danger }}>{currentEpoch.timeRemaining}</div>
                <div className="text-xs mt-1" style={{ color: C.text3 }}>until epoch ends</div>
              </div>
              <div>
                <div className="label-upper mb-2">Qualified</div>
                <div className="stat-value text-2xl font-bold" style={{ color: C.text1 }}>{currentEpoch.qualifiedFactors} <span className="text-base font-normal" style={{ color: C.text3 }}>/ {currentEpoch.totalSubmissions}</span></div>
                <div className="text-xs mt-1" style={{ color: C.text3 }}>factors qualified</div>
              </div>
              <div>
                <div className="label-upper mb-2">Scoring</div>
                <div className="text-xs leading-relaxed" style={{ color: C.text2 }}>Ranking by OS (Out-of-Sample) performance. Rewards distributed proportionally to composite score.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity — DE-EMPHASIZED */}
        <div
          className="katana-card lg:col-span-1"
          style={{ borderColor: C.borderWeak }}
        >
          <div className="p-4 pb-3" style={{ borderBottom: `1px solid ${C.borderWeak}` }}>
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5" style={{ color: C.text3 }} />
              <span className="text-sm font-medium" style={{ color: C.text2 }}>Recent Activity</span>
            </div>
          </div>
          <div className="px-3 pb-3">
            <div className="space-y-0">
              {recentActivity.slice(0, 6).map((item) => (
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
                    <span style={{ fontSize: "10px" }}>{iconMap[item.icon]}</span>
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
