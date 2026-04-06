/*
 * LaunchGuide — Indigo/Sky + Slate Design System
 * Cards: rounded-2xl | Buttons: rounded-full | Inputs: rounded-lg
 * Primary: Indigo | Secondary: Sky | Success: Emerald
 * Stepper: horizontal, Indigo progress line
 * Pure Tailwind classes — zero inline styles (except progress width)
 */
import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useOnboarding } from "@/App";
import { useTheme } from "@/contexts/ThemeContext";
import {
  ChevronRight,
  ChevronDown,
  Check,
  Copy,
  Cpu,
  Zap,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Rocket,
  FlaskConical,
  BarChart3,
  Trophy,
  ExternalLink,
  Sun,
  Moon,
  Key,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

/* ── Step definitions ── */
const STEPS = [
  { id: "welcome", label: "Welcome", icon: Zap },
  { id: "agent-api", label: "Agent API & Skill", icon: Key },
  { id: "first-run", label: "First Run", icon: Rocket },
  { id: "verify", label: "Verify", icon: Cpu },
] as const;

type StepId = (typeof STEPS)[number]["id"];
type VerifyStatus = "idle" | "checking" | "success" | "partial" | "failed";

const MARKETS = [
  "BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT",
  "ARB/USDT", "OP/USDT", "AVAX/USDT", "MATIC/USDT",
  "DOGE/USDT", "XRP/USDT",
];

const EXPERIENCE_OPTIONS = [
  { value: "beginner", label: "Beginner — New to quantitative trading" },
  { value: "intermediate", label: "Intermediate — Some algo trading experience" },
  { value: "advanced", label: "Advanced — Professional quant / fund manager" },
];

/* ── Main Component ── */
export default function LaunchGuide() {
  const [, navigate] = useLocation();
  const { markOnboarded } = useOnboarding();
  const { theme, toggleTheme } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Step 1: Welcome
  const [teamName, setTeamName] = useState("");
  const [experience, setExperience] = useState("");
  const [selectedMarkets, setSelectedMarkets] = useState<Set<string>>(new Set());

  // Step 2: Agent API
  const [apiName, setApiName] = useState("My Trading Bot");
  const [generatedApiKey, setGeneratedApiKey] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const generateApiKey = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let key = "ot_sk_";
    for (let i = 0; i < 32; i++) key += chars.charAt(Math.floor(Math.random() * chars.length));
    return key;
  };

  // Auto-generate API key when entering step 1
  useEffect(() => {
    if (currentStep === 1 && !generatedApiKey) {
      setGeneratedApiKey(generateApiKey());
    }
  }, [currentStep]);

  const buildGuidePrompt = (key: string) => `# Otter Trading Skill Configuration\n\n## API Key\n\`${key}\`\n\n## Skill Version\nv2.4.1\n\n## Setup Instructions\nPaste this entire prompt into your AI agent (ChatGPT / Claude / DeepSeek) to enable Otter Trading capabilities.\n\nYour agent will be able to:\n- Mine and backtest alpha factors automatically\n- Access real-time market data (CEX & DEX)\n- Submit strategies to the Otter Arena\n- Monitor portfolio performance\n\n## Connection Endpoint\nhttps://api.otter.trade/v1/agent\n\n## Authentication\nInclude the API key in your agent's system prompt or environment configuration. The agent will automatically authenticate when making requests.`;

  // Step 3: Verify
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>("idle");
  const [verifyDetails, setVerifyDetails] = useState<{
    connection: boolean;
    version: string;
    skills: { name: string; status: "ok" | "warn" | "error" }[];
  } | null>(null);

  // Step 4: First Run
  const [factorName, setFactorName] = useState("");
  const [factorMarket, setFactorMarket] = useState("");
  const [factorDescription, setFactorDescription] = useState("");

  const contentRef = useRef<HTMLDivElement>(null);

  /* ── Step navigation ── */
  const goNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCompletedSteps((prev) => { const next = new Set(prev); next.add(currentStep); return next; });
      setCurrentStep(currentStep + 1);
      contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const finishGuide = () => {
    markOnboarded();
    toast.success("Setup complete! Welcome to Otter.");
    navigate("/");
  };

  /* ── Copy helper ── */
  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  /* ── Simulated verify ── */
  const runVerification = () => {
    setVerifyStatus("checking");
    setVerifyDetails(null);
    setTimeout(() => {
      setVerifyDetails({
        connection: true,
        version: "v2.4.1",
        skills: [
          { name: "Alpha Mining Engine", status: "ok" },
          { name: "Backtest Runtime", status: "ok" },
          { name: "Live Trading Bridge", status: "warn" },
        ],
      });
      setVerifyStatus("partial");
    }, 2500);
  };

  /* ── Can proceed check ── */
  const canProceed = () => {
    switch (currentStep) {
      case 0: return experience !== "";
      case 1: return true;
      case 2: return true;
      case 3: return verifyStatus === "success" || verifyStatus === "partial";
      default: return false;
    }
  };

  const toggleMarket = (m: string) => {
    setSelectedMarkets((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m); else next.add(m);
      return next;
    });
  };



  /* ═══ RENDER ═══ */
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ── Minimal header ── */}
      <header className="shrink-0 h-11 px-6 sm:px-10 border-b border-border bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663325188422/YmxnXmKxyGfXhEgxEBqPXF/otter-logo_ef58ab33.png" alt="Otter" className="w-7 h-7 rounded-full object-cover" />
          <span className="font-semibold text-base tracking-tight text-foreground">
            Otter
          </span>
          <span className="text-xs font-mono ml-2 px-2 py-0.5 rounded-full text-primary bg-primary/10 border border-primary/20">
            SETUP
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <AnimatedThemeToggler
            className="relative w-8 h-8 rounded-full flex items-center justify-center border border-border bg-accent hover:bg-slate-200 dark:hover:bg-slate-800 transition-all duration-200 ease-in-out"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          />
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full border bg-accent border-border">
            <div className="w-5 h-5 rounded-full flex items-center justify-center bg-primary/15 text-primary text-[10px] font-semibold">
              O
            </div>
            <span className="text-xs font-medium text-foreground">
              Otter User
            </span>
          </div>
        </div>
      </header>

      {/* ── Content area ── */}
      <div className="flex-1 overflow-y-auto" ref={contentRef}>
        <div className="mx-auto max-w-[860px] px-6 sm:px-10 py-10">
          {/* Title + Stepper Row */}
          <div className="mb-10 flex items-center justify-between gap-6">
            <h1 className="text-foreground whitespace-nowrap">Launch Guide</h1>

            {/* ── Compact Horizontal Stepper ── */}
            <div className="flex items-center gap-1 sm:gap-2">
              {STEPS.map((step, i) => {
                const isCompleted = completedSteps.has(i);
                const isCurrent = i === currentStep;
                return (
                  <div key={step.id} className="flex items-center gap-1 sm:gap-2">
                    <div
                      className={`flex items-center gap-1.5 ${isCompleted ? "cursor-pointer" : "cursor-default"}`}
                      onClick={() => { if (isCompleted || i < currentStep) setCurrentStep(i); }}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isCompleted
                          ? "bg-primary"
                          : isCurrent
                          ? "bg-primary shadow-[0_0_0_3px_rgba(79,70,229,0.15)] dark:shadow-[0_0_0_3px_rgba(129,140,248,0.15)]"
                          : "bg-background border border-slate-300 dark:border-slate-600"
                      }`}>
                        {isCompleted ? (
                          <Check className="w-2.5 h-2.5 text-primary-foreground" />
                        ) : (
                          <span className={`text-[9px] font-bold ${isCurrent ? "text-primary-foreground" : "text-muted-foreground"}`}>
                            {i + 1}
                          </span>
                        )}
                      </div>
                      <span className={`text-[10px] font-medium hidden sm:inline ${
                        isCurrent
                          ? "text-foreground"
                          : isCompleted
                          ? "text-primary"
                          : "text-muted-foreground/60"
                      }`}>
                        {step.label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`w-4 sm:w-6 h-px ${
                        i < currentStep ? "bg-primary" : "bg-border"
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Step Content ── */}
          <div className="min-h-[400px]">
            {/* ═══ STEP 0: Welcome ═══ */}
            {currentStep === 0 && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div>
                  <h2 className="mb-1 text-foreground">Welcome</h2>
                  <p className="text-sm text-muted-foreground">
                    Let's set up your Otter workspace. This only takes a minute.
                  </p>
                </div>


                {/* Experience Level */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">
                    What best describes your experience?
                  </label>
                  <p className="text-xs text-muted-foreground">
                    This helps us tailor the platform to your needs
                  </p>
                  <div className="space-y-2">
                    {EXPERIENCE_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        onClick={() => setExperience(opt.value)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition-all duration-200 ease-in-out border ${
                          experience === opt.value
                            ? "bg-primary/10 border-primary/30"
                            : "bg-accent border-border hover:bg-slate-200 dark:hover:bg-slate-800"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          experience === opt.value ? "border-primary" : "border-slate-400 dark:border-slate-500"
                        }`}>
                          {experience === opt.value && (
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <span className={`text-sm ${
                          experience === opt.value
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }`}>
                          {opt.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Preferred Markets */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">
                    Preferred Markets
                    <span className="font-normal ml-1 text-muted-foreground">(optional)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {MARKETS.map((m) => {
                      const selected = selectedMarkets.has(m);
                      return (
                        <button
                          key={m}
                          onClick={() => toggleMarket(m)}
                          className={`px-3 py-1.5 rounded-full text-xs font-mono transition-all duration-200 ease-in-out border ${
                            selected
                              ? "bg-primary/10 border-primary/30 text-primary"
                              : "bg-accent border-border text-muted-foreground hover:border-slate-300 dark:hover:border-slate-600"
                          }`}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ═══ STEP 1: Configure Agent API ═══ */}
            {currentStep === 1 && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div>
                  <h2 className="mb-1 text-foreground">Configure Agent API</h2>
                  <p className="text-sm text-muted-foreground">
                    Generate an API key and paste the prompt into your AI agent to connect with Otter.
                  </p>
                </div>

                {/* API Name */}
                <div className="space-y-3 p-4 rounded-2xl border border-border bg-accent">
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-normal text-muted-foreground whitespace-nowrap">API Name</label>
                    <Input
                      placeholder="e.g., My Trading Bot, Research Agent..."
                      value={apiName}
                      onChange={(e) => setApiName(e.target.value)}
                      className="rounded-lg bg-white dark:bg-slate-950 border-border h-8 text-sm"
                    />
                  </div>
                </div>

                {/* Prompt Preview — always visible */}
                {generatedApiKey && (
                  <div className="space-y-4 p-5 rounded-2xl border border-border bg-accent">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">Copy the prompt below and paste it into your AI agent (ChatGPT / Claude / DeepSeek).</p>
                    </div>

                    <div className="p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/50 max-h-64 overflow-y-auto">
                      <pre className="text-xs text-foreground/80 whitespace-pre-wrap font-mono leading-relaxed">
{`# Otter Trading Skill Configuration

## API Key
\`${generatedApiKey}\`

## Skill Version
v2.4.1

## Setup Instructions
Paste this entire prompt into your AI agent (ChatGPT / Claude / DeepSeek) to enable Otter Trading capabilities.

Your agent will be able to:
- Mine and backtest alpha factors automatically
- Access real-time market data (CEX & DEX)
- Submit strategies to the Otter Arena
- Monitor portfolio performance

## Connection Endpoint
https://api.otter.trade/v1/agent

## Authentication
Include the API key in your agent's system prompt or environment configuration.`}
                      </pre>
                    </div>

                    <div className="flex items-center justify-end">
                      <button
                        className="h-9 px-6 rounded-full text-sm font-medium transition-all duration-200 bg-primary text-primary-foreground hover:brightness-110 btn-bounce flex items-center gap-2"
                        onClick={() => {
                          navigator.clipboard.writeText(buildGuidePrompt(generatedApiKey));
                          toast.success("Prompt copied to clipboard");
                        }}
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copy Prompt
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══ STEP 2: First Run — Prompt Use Cases ═══ */}
            {currentStep === 2 && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div>
                  <h2 className="mb-1 text-foreground">First Run</h2>
                  <p className="text-sm text-muted-foreground">
                    Try these example prompts in your AI coding agent to test the Otter skill. Copy any prompt and paste it into your agent.
                  </p>
                </div>

                {/* Prompt use case cards */}
                <div className="space-y-4">
                  {[
                    {
                      category: "Alpha Creation",
                      icon: FlaskConical,
                      prompt: "Create a BTC momentum alpha using RSI(14) and MACD crossover signals. Target market: BTC/USDT, lookback period: 30 days. Submit it to Otter for backtesting.",
                      desc: "Tests the alpha creation and submission pipeline",
                    },
                    {
                      category: "Backtest Analysis",
                      icon: BarChart3,
                      prompt: "Analyze my latest backtest results for alpha AF-001. Show me the Sharpe ratio, max drawdown, and return distribution. Suggest improvements if Sharpe < 1.5.",
                      desc: "Tests the backtest retrieval and analysis capabilities",
                    },
                    {
                      category: "Portfolio Optimization",
                      icon: Trophy,
                      prompt: "Review my current alpha portfolio and suggest optimal weight allocation across my top 5 alphas to maximize risk-adjusted returns while keeping correlation below 0.3.",
                      desc: "Tests multi-alpha portfolio optimization",
                    },
                  ].map((item) => (
                    <div
                      key={item.category}
                      className="p-5 rounded-2xl border border-border bg-accent hover:border-primary/30 transition-all duration-200 ease-in-out"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <item.icon className="w-4 h-4 text-primary" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-primary">{item.category}</span>
                      </div>
                      <div className="relative rounded-xl overflow-hidden bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/50 mb-3">
                        <pre className="p-4 pr-12 text-xs font-mono leading-relaxed overflow-x-auto text-slate-800 dark:text-slate-100 whitespace-pre-wrap">
                          {item.prompt}
                        </pre>
                        <button
                          onClick={() => copyCode(item.prompt, item.category)}
                          className={`absolute top-2.5 right-2.5 p-1.5 rounded-lg border transition-all duration-200 ease-in-out ${
                            copiedCode === item.category
                              ? "border-success/30 text-success bg-slate-200 dark:bg-slate-800"
                              : "border-slate-300 dark:border-slate-700 text-slate-500 bg-slate-200 dark:bg-slate-800 hover:border-primary hover:text-primary"
                          }`}
                        >
                          {copiedCode === item.category ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-start gap-2 p-3 rounded-2xl text-xs bg-primary/5 text-primary border border-primary/20">
                  <Zap className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    Tip: You can modify these prompts or create your own. The skill supports natural language instructions for all Otter platform operations.
                  </span>
                </div>
              </div>
            )}

            {/* ═══ STEP 3: Verify ═══ */}
            {currentStep === 3 && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div>
                  <h2 className="mb-1 text-foreground">Verify Installation</h2>
                  <p className="text-sm text-muted-foreground">
                    Let's check if your skill is properly connected and all components are running.
                  </p>
                </div>

                <div className="flex flex-col items-center gap-6 py-6">
                  {verifyStatus === "idle" && (
                    <button
                      onClick={runVerification}
                      className="flex items-center gap-2.5 px-8 py-3.5 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:brightness-110 hover:-translate-y-0.5 transition-all duration-200 ease-in-out btn-bounce"
                    >
                      <Cpu className="w-4 h-4" />
                      Run Connection Check
                    </button>
                  )}

                  {verifyStatus === "checking" && (
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="w-10 h-10 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Checking connection and skill status...</p>
                    </div>
                  )}

                  {(verifyStatus === "success" || verifyStatus === "partial") && verifyDetails && (
                    <div className="w-full space-y-4">
                      <div className="flex items-center gap-3 p-4 rounded-2xl bg-success/10 border border-success/20">
                        <CheckCircle2 className="w-5 h-5 shrink-0 text-success" />
                        <div>
                          <p className="text-sm font-medium text-foreground">Connection Established</p>
                          <p className="text-xs font-mono mt-0.5 text-muted-foreground">
                            Skill version: {verifyDetails.version}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-2xl overflow-hidden border border-border">
                        <div className="px-4 py-3 bg-accent border-b border-border">
                          <span className="label-upper">
                            Skill Components
                          </span>
                        </div>
                        {verifyDetails.skills.map((skill, i) => (
                          <div
                            key={skill.name}
                            className={`flex items-center justify-between px-4 py-3 ${
                              i < verifyDetails.skills.length - 1 ? "border-b border-border" : ""
                            }`}
                          >
                            <span className="text-sm text-foreground">{skill.name}</span>
                            <div className="flex items-center gap-1.5">
                              {skill.status === "ok" && (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                                  <span className="text-xs font-mono text-success">OK</span>
                                </>
                              )}
                              {skill.status === "warn" && (
                                <>
                                  <AlertCircle className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                                  <span className="text-xs font-mono text-amber-500 dark:text-amber-400">OPTIONAL</span>
                                </>
                              )}
                              {skill.status === "error" && (
                                <>
                                  <XCircle className="w-3.5 h-3.5 text-destructive" />
                                  <span className="text-xs font-mono text-destructive">FAILED</span>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {verifyStatus === "partial" && (
                        <div className="flex items-start gap-2 p-3 rounded-2xl text-xs bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>
                            Live Trading Bridge is optional for getting started. You can configure it later in Account → Exchanges.
                          </span>
                        </div>
                      )}

                      <button
                        onClick={runVerification}
                        className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all duration-200 ease-in-out"
                      >
                        <Loader2 className="w-3 h-3" />
                        Re-check
                      </button>
                    </div>
                  )}

                  {verifyStatus === "failed" && (
                    <div className="w-full space-y-4">
                      <div className="flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/20">
                        <XCircle className="w-5 h-5 shrink-0 text-destructive" />
                        <div>
                          <p className="text-sm font-medium text-foreground">Connection Failed</p>
                          <p className="text-xs mt-0.5 text-muted-foreground">
                            Please check your installation and try again.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={runVerification}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium bg-primary text-primary-foreground hover:brightness-110 transition-all duration-200 ease-in-out btn-bounce"
                      >
                        <Loader2 className="w-3.5 h-3.5" />
                        Retry
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Bottom Navigation ── */}
          <div className="flex items-center justify-between mt-12 pt-6 border-t border-border">
            {currentStep > 0 ? (
              <button
                onClick={goBack}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 ease-in-out"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            ) : (
              <div />
            )}

            {currentStep < STEPS.length - 1 ? (
              <button
                onClick={goNext}
                disabled={!canProceed()}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ease-in-out ${
                  canProceed()
                    ? "bg-primary text-primary-foreground hover:brightness-110 hover:-translate-y-0.5 cursor-pointer btn-bounce"
                    : "bg-accent text-muted-foreground border border-border cursor-not-allowed"
                }`}
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={finishGuide}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:brightness-110 hover:-translate-y-0.5 transition-all duration-200 ease-in-out btn-bounce"
              >
                <Rocket className="w-4 h-4" />
                Launch Otter
              </button>
            )}
          </div>

          {/* Skip link */}
          <div className="text-center mt-6 pb-8">
            <button
              onClick={finishGuide}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-200 ease-in-out"
            >
              Skip setup and go to dashboard →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ Sub-components ═══ */

function AccordionSection({
  id, title, subtitle, expanded, onToggle, children,
}: {
  id: string; title: string; subtitle: string; expanded: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl overflow-hidden transition-all duration-200 ease-in-out border ${
      expanded
        ? "border-primary/30 bg-accent"
        : "border-border bg-accent/50"
    }`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors duration-200 ease-in-out"
      >
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-xs mt-0.5 text-muted-foreground">{subtitle}</p>
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
        )}
      </button>
      {expanded && (
        <div className="px-5 pb-5 border-t border-border">
          <div className="pt-4">{children}</div>
        </div>
      )}
    </div>
  );
}

function CodeBlock({
  code, id, copiedCode, onCopy,
}: {
  code: string; id: string; copiedCode: string | null; onCopy: (code: string, id: string) => void;
}) {
  return (
    <div className="relative rounded-2xl overflow-hidden bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/50">
      <pre className="p-4 pr-12 text-xs font-mono leading-relaxed overflow-x-auto text-slate-800 dark:text-slate-100">
        {code}
      </pre>
      <button
        onClick={() => onCopy(code, id)}
        className={`absolute top-2.5 right-2.5 p-1.5 rounded-lg border transition-all duration-200 ease-in-out ${
          copiedCode === id
            ? "border-success/30 text-success bg-slate-200 dark:bg-slate-800"
            : "border-slate-300 dark:border-slate-700 text-slate-500 bg-slate-200 dark:bg-slate-800 hover:border-primary hover:text-primary"
        }`}
      >
        {copiedCode === id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      </button>
    </div>
  );
}
