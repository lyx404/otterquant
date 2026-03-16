/*
 * Dashboard — Acid Green Design System
 * #0B0B0B bg, #C5FF4A accent, white/10 borders, white/50 secondary
 * GSAP staggered reveal, card hover parallax
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

const statCards = [
  { label: "TOTAL FACTORS", value: dashboardStats.totalFactors.toString(), sub: `${dashboardStats.activeFactors} active`, icon: FlaskConical, accent: false },
  { label: "AVG SHARPE (OS)", value: dashboardStats.avgSharpe.toFixed(2), sub: "Out-of-Sample", icon: TrendingUp, accent: true },
  { label: "PASS RATE", value: dashboardStats.passRate, sub: `${dashboardStats.activeFactors}/${dashboardStats.totalFactors}`, icon: CheckCircle, accent: false },
  { label: "ACTIVE TRADES", value: dashboardStats.activeTrades.toString(), sub: "Running now", icon: Zap, accent: false },
  { label: "SUBSCRIBERS", value: dashboardStats.subscriberCount.toLocaleString(), sub: "Platform total", icon: Users, accent: false },
];

const iconMap: Record<string, React.ReactNode> = {
  plus: <Zap className="w-4 h-4" style={{ color: "#C5FF4A" }} />,
  check: <CheckCircle className="w-4 h-4 text-positive" />,
  trophy: <Award className="w-4 h-4 text-warning" />,
  activity: <Activity className="w-4 h-4 text-info" />,
  x: <XCircle className="w-4 h-4 text-negative" />,
  user: <Users className="w-4 h-4 text-info" />,
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
    <button onClick={handleCopy} className="p-1 rounded transition-colors" style={{ color: "rgba(255,255,255,0.3)" }}>
      {copied ? <Check className="w-3.5 h-3.5" style={{ color: "#C5FF4A" }} /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function Dashboard() {
  const [guideExpanded, setGuideExpanded] = useState(false);
  const [activeGuide, setActiveGuide] = useState("codex");
  const headerRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  // GSAP staggered reveal for header
  useEffect(() => {
    if (!headerRef.current) return;
    const lines = headerRef.current.querySelectorAll(".reveal-line");
    gsap.set(lines, { y: 100, skewY: 7, opacity: 0 });
    gsap.to(lines, {
      y: 0, skewY: 0, opacity: 1,
      duration: 1, stagger: 0.08, ease: "power4.out", delay: 0.1,
    });
  }, []);

  // GSAP fade-in for stat cards
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
      {/* Page Header — GSAP staggered reveal */}
      <div ref={headerRef} className="reveal-clip">
        <div className="reveal-line">
          <h1 className="text-5xl md:text-7xl font-medium tracking-tighter leading-none text-white">
            Dashboard
          </h1>
        </div>
        <div className="reveal-line mt-2">
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.50)" }}>
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
              <div className="katana-card p-4 group">
                <div data-parallax-inner="">
                  <div className="flex items-center justify-between mb-3">
                    <span className="label-upper">{stat.label}</span>
                    <Icon className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" style={{ color: "rgba(255,255,255,0.30)" }} />
                  </div>
                  <div
                    className="text-2xl stat-value font-bold"
                    style={{ color: stat.accent ? "#C5FF4A" : "#ffffff" }}
                  >
                    {stat.value}
                  </div>
                  <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.50)" }}>
                    {stat.sub}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Agent Skill Connection Status — DE-EMPHASIZED */}
      <div className="katana-card" style={{ borderColor: "rgba(255,255,255,0.06)", opacity: 0.85 }}>
        <div className="p-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.30)" }} />
              <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.60)" }}>Agent Skill Status</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono tracking-[0.15em] uppercase"
                style={{
                  backgroundColor: "rgba(197, 255, 74, 0.05)",
                  color: "rgba(197, 255, 74, 0.60)",
                  border: "1px solid rgba(197, 255, 74, 0.12)",
                }}
              >
                {agentSkills.filter(s => s.status === "connected").length}/{agentSkills.length} CONNECTED
              </span>
              <Link href="/account?tab=api">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  style={{
                    borderColor: "rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.40)",
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
          {/* Skill cards */}
          <div className="grid md:grid-cols-3 gap-3">
            {agentSkills.map((skill) => (
              <div
                key={skill.id}
                className="rounded-lg p-3.5 transition-all duration-300"
                style={{
                  border: `1px solid ${skill.status === "connected" ? "rgba(197, 255, 74, 0.15)" : "rgba(255,255,255,0.10)"}`,
                  backgroundColor: skill.status === "connected" ? "rgba(197, 255, 74, 0.03)" : "rgba(255,255,255,0.03)",
                }}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-sm font-medium text-white">{skill.name}</span>
                  {skill.status === "connected" ? (
                    <div className="flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: "#C5FF4A" }} />
                        <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: "#C5FF4A" }} />
                      </span>
                      <span className="text-[10px] font-mono tracking-[0.2em] uppercase" style={{ color: "#C5FF4A" }}>ONLINE</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <WifiOff className="w-3 h-3" style={{ color: "rgba(255,255,255,0.30)" }} />
                      <span className="text-[10px] font-mono tracking-[0.2em] uppercase" style={{ color: "rgba(255,255,255,0.30)" }}>OFFLINE</span>
                    </div>
                  )}
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span style={{ color: "rgba(255,255,255,0.50)" }}>Last Sync</span>
                    <span className="font-mono" style={{ color: "rgba(255,255,255,0.70)" }}>{skill.lastSync}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: "rgba(255,255,255,0.50)" }}>Factors Mined</span>
                    <span className="font-mono" style={{ color: skill.factorsGenerated > 0 ? "#C5FF4A" : "rgba(255,255,255,0.30)" }}>
                      {skill.factorsGenerated}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: "rgba(255,255,255,0.50)" }}>Skill Version</span>
                    <span className="font-mono" style={{ color: "rgba(255,255,255,0.30)" }}>{skill.version}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Installation Guide Toggle */}
          <button
            onClick={() => setGuideExpanded(!guideExpanded)}
            className="flex items-center gap-2 w-full py-2.5 px-3 rounded-md transition-colors text-sm"
            style={{
              backgroundColor: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <BookOpen className="w-4 h-4 text-info" />
            <span className="text-white font-medium">Skill Installation Guide</span>
            <span className="text-xs ml-1" style={{ color: "rgba(255,255,255,0.50)" }}>— Set up AI agents to mine factors</span>
            <div className="ml-auto">
              {guideExpanded ? <ChevronUp className="w-4 h-4" style={{ color: "rgba(255,255,255,0.30)" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "rgba(255,255,255,0.30)" }} />}
            </div>
          </button>

          {guideExpanded && (
            <div className="space-y-3">
              {/* Tab selector */}
              <div className="flex gap-1 p-1 rounded-md" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {installSteps.map((guide) => (
                  <button
                    key={guide.id}
                    onClick={() => setActiveGuide(guide.id)}
                    className="flex-1 py-1.5 px-3 rounded text-xs font-medium transition-all"
                    style={{
                      backgroundColor: activeGuide === guide.id ? "rgba(197, 255, 74, 0.10)" : "transparent",
                      color: activeGuide === guide.id ? "#C5FF4A" : "rgba(255,255,255,0.50)",
                      border: activeGuide === guide.id ? "1px solid rgba(197, 255, 74, 0.20)" : "1px solid transparent",
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
                    <div className="rounded-lg overflow-hidden" style={{ backgroundColor: "#080808", border: "1px solid rgba(255,255,255,0.10)" }}>
                      <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" }}>
                        <Terminal className="w-3.5 h-3.5" style={{ color: "#C5FF4A" }} />
                        <span className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.50)" }}>terminal</span>
                      </div>
                      <div className="p-3 space-y-1">
                        {guide.steps.map((step, idx) => (
                          <div key={idx} className="flex items-start gap-2 group">
                            <code className="text-xs font-mono flex-1">
                              {step.startsWith("#") ? (
                                <span style={{ color: "rgba(255,255,255,0.30)" }}>{step}</span>
                              ) : (
                                <>
                                  <span style={{ color: "#C5FF4A" }}>$ </span>
                                  <span className="text-info">{step}</span>
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
                    <div className="flex items-center gap-2 text-xs px-1" style={{ color: "rgba(255,255,255,0.50)" }}>
                      <ExternalLink className="w-3 h-3" />
                      <span>Full documentation at</span>
                      <span className="font-mono" style={{ color: "#C5FF4A", cursor: "pointer" }}>docs.alphaforge.io/skills/{guide.id}</span>
                    </div>
                  </div>
                ))}

              {/* Quick start summary */}
              <div className="rounded-md p-3" style={{ backgroundColor: "rgba(197, 255, 74, 0.04)", border: "1px solid rgba(197, 255, 74, 0.12)" }}>
                <div className="text-xs font-medium mb-1.5" style={{ color: "#C5FF4A" }}>Quick Start</div>
                <ol className="text-xs space-y-1 list-decimal list-inside" style={{ color: "rgba(255,255,255,0.50)" }}>
                  <li>Install the AlphaForge skill in your preferred AI coding agent</li>
                  <li>Configure your API key in the account settings page</li>
                  <li>Start a conversation: <code className="font-mono px-1 rounded" style={{ color: "#C5FF4A", backgroundColor: "rgba(255,255,255,0.05)" }}>"Mine alpha factors for BTC/USDT on Binance"</code></li>
                  <li>The agent will generate factors, backtest, and submit results automatically</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Two Column Layout — Epoch emphasized, Activity de-emphasized */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Current Epoch Card — EMPHASIZED: 2 columns, accent border, larger typography */}
        <div
          className="katana-card lg:col-span-2"
          style={{
            borderColor: "rgba(197, 255, 74, 0.15)",
            background: "linear-gradient(135deg, rgba(197,255,74,0.04) 0%, rgba(255,255,255,0.02) 100%)",
          }}
        >
          <div className="p-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ backgroundColor: "rgba(197,255,74,0.10)" }}>
                  <Trophy className="w-4.5 h-4.5" style={{ color: "#C5FF4A" }} />
                </div>
                <div>
                  <span className="text-lg font-semibold text-white">Current Epoch</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-mono" style={{ color: "#C5FF4A" }}>{currentEpoch.id}</span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono tracking-[0.15em]" style={{ backgroundColor: "rgba(197,255,74,0.12)", color: "#C5FF4A" }}>LIVE</span>
                  </div>
                </div>
              </div>
              <Link href="/leaderboard">
                <Button
                  variant="outline"
                  className="gap-2"
                  style={{
                    borderColor: "rgba(197, 255, 74, 0.25)",
                    color: "#C5FF4A",
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
                <div className="stat-value text-2xl font-bold" style={{ color: "#C5FF4A" }}>{currentEpoch.totalPool}</div>
                <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.40)" }}>distributed proportionally</div>
              </div>
              <div>
                <div className="label-upper mb-2">Time Left</div>
                <div className="stat-value text-2xl font-bold" style={{ color: "rgb(248,113,113)" }}>{currentEpoch.timeRemaining}</div>
                <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.40)" }}>until epoch ends</div>
              </div>
              <div>
                <div className="label-upper mb-2">Qualified</div>
                <div className="stat-value text-2xl font-bold text-white">{currentEpoch.qualifiedFactors} <span className="text-base font-normal" style={{ color: "rgba(255,255,255,0.40)" }}>/ {currentEpoch.totalSubmissions}</span></div>
                <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.40)" }}>factors qualified</div>
              </div>
              <div>
                <div className="label-upper mb-2">Scoring</div>
                <div className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.50)" }}>Ranking by OS (Out-of-Sample) performance. Rewards distributed proportionally to composite score.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity — DE-EMPHASIZED: 1 column, muted styling, compact list */}
        <div
          className="katana-card lg:col-span-1"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <div className="p-4 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.30)" }} />
              <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.60)" }}>Recent Activity</span>
            </div>
          </div>
          <div className="px-3 pb-3">
            <div className="space-y-0">
              {recentActivity.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-2.5 py-2 px-2 rounded-md transition-colors"
                  style={{ cursor: "default" }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
                  >
                    <span style={{ fontSize: "10px" }}>{iconMap[item.icon]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs leading-snug block truncate" style={{ color: "rgba(255,255,255,0.60)" }}>{item.message}</span>
                    <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>{item.time}</span>
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
