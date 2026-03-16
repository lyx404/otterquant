/*
 * Dashboard — Katana Network Style
 * Stats bar + Agent Skill status + installation guide + recent activity + epoch info
 * Deep navy bg, lime green accent, minimalist borders, monospace data
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useState } from "react";
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
import { motion } from "framer-motion";

const statCards = [
  { label: "TOTAL FACTORS", value: dashboardStats.totalFactors.toString(), sub: `${dashboardStats.activeFactors} active`, icon: FlaskConical, accent: false },
  { label: "AVG SHARPE (OS)", value: dashboardStats.avgSharpe.toFixed(2), sub: "Out-of-Sample", icon: TrendingUp, accent: true },
  { label: "PASS RATE", value: dashboardStats.passRate, sub: `${dashboardStats.activeFactors}/${dashboardStats.totalFactors}`, icon: CheckCircle, accent: false },
  { label: "ACTIVE TRADES", value: dashboardStats.activeTrades.toString(), sub: "Running now", icon: Zap, accent: false },
  { label: "SUBSCRIBERS", value: dashboardStats.subscriberCount.toLocaleString(), sub: "Platform total", icon: Users, accent: false },
];

const iconMap: Record<string, React.ReactNode> = {
  plus: <Zap className="w-4 h-4 text-lime" />,
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
    <button onClick={handleCopy} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-surface-2">
      {copied ? <Check className="w-3.5 h-3.5 text-lime" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function Dashboard() {
  const [guideExpanded, setGuideExpanded] = useState(false);
  const [activeGuide, setActiveGuide] = useState("codex");

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">AI Factor Mining Platform Overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
            >
              <Card className="katana-card hover:border-lime/20 transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="label-upper">{stat.label}</span>
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className={`text-2xl stat-value font-bold ${stat.accent ? "text-lime" : "text-foreground"}`}>
                    {stat.value}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{stat.sub}</div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Agent Skill Connection Status */}
      <Card className="katana-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <Cpu className="w-4 h-4 text-info" />
              Agent Skill Status
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-lime/8 text-lime border-lime/20 text-[10px] font-mono">
                {agentSkills.filter(s => s.status === "connected").length}/{agentSkills.length} CONNECTED
              </Badge>
              <Link href="/account?tab=api">
                <Button variant="outline" size="sm" className="h-7 text-xs border-border text-muted-foreground hover:text-lime hover:border-lime/30 gap-1">
                  <ExternalLink className="w-3 h-3" />
                  API Keys
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Skill cards */}
          <div className="grid md:grid-cols-3 gap-3">
            {agentSkills.map((skill) => (
              <div
                key={skill.id}
                className={`rounded-lg border p-3.5 transition-all duration-200 ${
                  skill.status === "connected"
                    ? "border-lime/15 bg-lime/[0.03]"
                    : "border-border bg-secondary/30"
                }`}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-sm font-medium">{skill.name}</span>
                  {skill.status === "connected" ? (
                    <div className="flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-lime" />
                      </span>
                      <span className="text-[10px] font-mono text-lime">ONLINE</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <WifiOff className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] font-mono text-muted-foreground">OFFLINE</span>
                    </div>
                  )}
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Sync</span>
                    <span className="font-mono text-foreground/80">{skill.lastSync}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Factors Mined</span>
                    <span className={`font-mono ${skill.factorsGenerated > 0 ? "text-lime" : "text-muted-foreground"}`}>
                      {skill.factorsGenerated}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Skill Version</span>
                    <span className="font-mono text-muted-foreground">{skill.version}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Installation Guide Toggle */}
          <button
            onClick={() => setGuideExpanded(!guideExpanded)}
            className="flex items-center gap-2 w-full py-2.5 px-3 rounded-md bg-secondary/40 hover:bg-secondary/60 transition-colors text-sm border border-border/50"
          >
            <BookOpen className="w-4 h-4 text-info" />
            <span className="text-foreground font-medium">Skill Installation Guide</span>
            <span className="text-xs text-muted-foreground ml-1">— Set up AI agents to mine factors</span>
            <div className="ml-auto">
              {guideExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </div>
          </button>

          {guideExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              {/* Tab selector */}
              <div className="flex gap-1 bg-secondary/40 p-1 rounded-md border border-border/50">
                {installSteps.map((guide) => (
                  <button
                    key={guide.id}
                    onClick={() => setActiveGuide(guide.id)}
                    className={`flex-1 py-1.5 px-3 rounded text-xs font-medium transition-all ${
                      activeGuide === guide.id
                        ? "bg-lime/10 text-lime border border-lime/20"
                        : "text-muted-foreground hover:text-foreground border border-transparent"
                    }`}
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
                    <div className="bg-[#080c16] border border-border rounded-lg overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-secondary/30">
                        <Terminal className="w-3.5 h-3.5 text-lime" />
                        <span className="text-xs text-muted-foreground font-mono">terminal</span>
                      </div>
                      <div className="p-3 space-y-1">
                        {guide.steps.map((step, idx) => (
                          <div key={idx} className="flex items-start gap-2 group">
                            <code className="flex-1 font-mono text-xs leading-relaxed">
                              {step.startsWith("#") ? (
                                <span className="text-muted-foreground">{step}</span>
                              ) : (
                                <>
                                  <span className="text-lime select-none">$ </span>
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
                    <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                      <ExternalLink className="w-3 h-3" />
                      <span>Full documentation at</span>
                      <span className="text-lime font-mono cursor-pointer hover:underline">docs.alphaforge.io/skills/{guide.id}</span>
                    </div>
                  </div>
                ))}

              {/* Quick start summary */}
              <div className="bg-warning/5 border border-warning/15 rounded-md p-3">
                <div className="text-xs text-warning font-medium mb-1.5">Quick Start</div>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Install the AlphaForge skill in your preferred AI coding agent</li>
                  <li>Configure your API key in the account settings page</li>
                  <li>Start a conversation: <code className="text-lime font-mono bg-secondary/50 px-1 rounded">"Mine alpha factors for BTC/USDT on Binance"</code></li>
                  <li>The agent will generate factors, backtest, and submit results automatically</li>
                </ol>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="katana-card lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <Activity className="w-4 h-4 text-info" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-0.5">
              {recentActivity.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.2 }}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-md hover:bg-secondary/40 transition-colors group"
                >
                  <div className="w-7 h-7 rounded-full bg-secondary/60 flex items-center justify-center shrink-0">
                    {iconMap[item.icon]}
                  </div>
                  <span className="text-sm text-foreground/90 flex-1 truncate">{item.message}</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap font-mono">{item.time}</span>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Current Epoch Card */}
        <Card className="katana-card border-lime/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <Trophy className="w-4 h-4 text-warning" />
              Current Epoch
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="label-upper">Epoch</span>
              <span className="text-sm font-mono text-warning">{currentEpoch.id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="label-upper">Prize Pool</span>
              <span className="text-lg font-mono font-bold text-lime glow-lime">{currentEpoch.totalPool}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="label-upper">Time Left</span>
              <span className="text-sm font-mono text-negative">{currentEpoch.timeRemaining}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="label-upper">Qualified</span>
              <span className="text-sm font-mono">{currentEpoch.qualifiedFactors} / {currentEpoch.totalSubmissions}</span>
            </div>
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground mb-3">
                Ranking by OS (Out-of-Sample) performance. Rewards distributed proportionally to composite score.
              </p>
              <Link href="/leaderboard">
                <Button variant="outline" className="w-full gap-2 border-lime/20 text-lime hover:bg-lime/8">
                  View Leaderboard
                  <ArrowUpRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
