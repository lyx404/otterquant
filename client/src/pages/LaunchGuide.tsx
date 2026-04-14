/*
 * LaunchGuide — Indigo/Sky + Slate Design System
 * Dual mode: Platform Agent (AI Chat) + User's Own Agent (API/Skill)
 * Cards: rounded-2xl | Buttons: rounded-full | Inputs: rounded-lg
 * Primary: Indigo | Secondary: Sky | Success: Emerald
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
  Rocket,
  FlaskConical,
  BarChart3,
  Trophy,
  Key,
  MessageSquare,
  Bot,
  Send,
  Sparkles,
  Code2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { GradeRevealSingle } from "@/components/GradeRevealModal";
import { type AlphaGrade } from "@/lib/mockData";

/* ── Agent Mode Type ── */
type AgentMode = "platform" | "own" | null;

/* ── Step definitions — dynamic based on mode ── */
const PLATFORM_STEPS = [
  { id: "welcome", label: "Welcome", icon: Zap },
  { id: "mode", label: "Mode", icon: Bot },
] as const;

const OWN_AGENT_STEPS = [
  { id: "welcome", label: "Welcome", icon: Zap },
  { id: "mode", label: "Mode", icon: Bot },
  { id: "agent-api", label: "Agent API & Skill", icon: Key },
  { id: "first-run", label: "First Run", icon: Rocket },
  { id: "verify", label: "Verify", icon: Cpu },
] as const;

type VerifyStatus = "idle" | "checking" | "success" | "partial" | "failed";

const MARKETS = [
  "BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT",
  "ARB/USDT", "OP/USDT", "AVAX/USDT", "MATIC/USDT",
  "DOGE/USDT", "XRP/USDT",
];

const EXPERIENCE_OPTIONS = [
  { value: "beginner", label: "Beginner — New to quantitative trading" },
  { value: "advanced", label: "Professional — Experienced quant / fund manager" },
];

/* ── AI Chat Message Type ── */
interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

/* ── Simulated AI Responses ── */
const AI_RESPONSES: Record<string, string> = {
  default: "I can help you create alpha factors. Try describing a trading strategy, like:\n\n- \"Create a BTC momentum factor using RSI\"\n- \"Build a volume divergence alpha for ETH\"\n- \"Design a funding rate mean reversion strategy\"",
  momentum: "Great choice! I've designed a **BTC Momentum RSI Cross** factor:\n\n```\nts_rank(close/delay(close,14), 252) * ts_std(volume, 20)\n```\n\n**Strategy Logic:**\n- Ranks 14-day price momentum over a 252-day window\n- Weights by 20-day volume volatility for signal strength\n- Targets trending markets with increasing participation\n\nShall I submit this for backtesting?",
  volume: "Here's an **ETH Volume Divergence** alpha:\n\n```\nrank(ts_corr(close, volume, 10)) - rank(ts_delta(close, 5))\n```\n\n**Strategy Logic:**\n- Detects divergence between price-volume correlation and price momentum\n- Short-term mean reversion signal when volume leads price\n\nWant me to run a backtest on this?",
  funding: "I've created a **Funding Rate Mean Reversion** factor:\n\n```\nts_zscore(funding_rate, 168) * -1 * rank(open_interest_change)\n```\n\n**Strategy Logic:**\n- Z-score normalizes funding rate over 7-day window\n- Inverts signal (high funding = short bias)\n- Weights by open interest changes for conviction\n\nReady to backtest?",
  backtest: "Backtesting initiated! Here's the preliminary result:\n\n| Metric | In-Sample | Out-of-Sample |\n|--------|-----------|---------------|\n| Sharpe | 1.42 | 1.15 |\n| Returns | 18.5% | 14.2% |\n| Drawdown | 6.8% | 8.2% |\n| Turnover | 38.2% | 41.5% |\n\nThe factor shows **strong IS performance** with reasonable OS decay. IS Sharpe of 1.42 exceeds the 1.25 cutoff.\n\nWould you like me to submit this to the Arena?",
};

function getAIResponse(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes("momentum") || lower.includes("rsi") || lower.includes("btc")) return AI_RESPONSES.momentum;
  if (lower.includes("volume") || lower.includes("divergence") || lower.includes("eth")) return AI_RESPONSES.volume;
  if (lower.includes("funding") || lower.includes("mean rev")) return AI_RESPONSES.funding;
  if (lower.includes("backtest") || lower.includes("submit") || lower.includes("test")) return AI_RESPONSES.backtest;
  return AI_RESPONSES.default;
}

/* ── Main Component ── */
export default function LaunchGuide() {
  const [, navigate] = useLocation();
  const { markOnboarded } = useOnboarding();
  const { theme } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [agentMode, setAgentMode] = useState<AgentMode>(null);

  // Step 1: Welcome
  const [experience, setExperience] = useState("");
  const [selectedMarkets, setSelectedMarkets] = useState<Set<string>>(new Set());

  // Own Agent: API
  const [apiName, setApiName] = useState("My Trading Bot");
  const [generatedApiKey, setGeneratedApiKey] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Platform Agent: AI Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Welcome to Otter AI Mining! I'm your personal quant assistant. Tell me what kind of alpha factor you'd like to create, and I'll help you design, backtest, and optimize it.\n\nHere are some ideas to get started:\n- Momentum-based strategies\n- Volume divergence signals\n- Funding rate arbitrage\n- Cross-exchange spread analysis",
      timestamp: new Date(),
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [gradeReveal, setGradeReveal] = useState<{ grade: AlphaGrade; name: string } | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const generateApiKey = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let key = "ot_sk_";
    for (let i = 0; i < 32; i++) key += chars.charAt(Math.floor(Math.random() * chars.length));
    return key;
  };

  useEffect(() => {
    if (agentMode === "own" && currentStep === 2 && !generatedApiKey) {
      setGeneratedApiKey(generateApiKey());
    }
  }, [currentStep, agentMode]);

  const buildGuidePrompt = (key: string) => `# Otter Trading Skill Configuration\n\n## API Key\n\`${key}\`\n\n## Skill Version\nv2.4.1\n\n## Setup Instructions\nPaste this entire prompt into your AI agent (ChatGPT / Claude / DeepSeek) to enable Otter Trading capabilities.\n\nYour agent will be able to:\n- Mine and backtest alpha factors automatically\n- Access real-time market data (CEX & DEX)\n- Submit strategies to the Otter Arena\n- Monitor portfolio performance\n\n## Connection Endpoint\nhttps://api.otter.trade/v1/agent\n\n## Authentication\nInclude the API key in your agent's system prompt or environment configuration.`;

  // Verify
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>("idle");
  const [verifyDetails, setVerifyDetails] = useState<{
    connection: boolean;
    version: string;
    skills: { name: string; status: "ok" | "warn" | "error" }[];
  } | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);

  const STEPS = agentMode === "platform" ? PLATFORM_STEPS : OWN_AGENT_STEPS;

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

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedCode(null), 2000);
  };

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

  const canProceed = () => {
    if (currentStep === 0) return experience !== "";
    if (currentStep === 1) return agentMode !== null;
    return true;
  };

  const toggleMarket = (m: string) => {
    setSelectedMarkets((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m); else next.add(m);
      return next;
    });
  };

  /* ── AI Chat ── */
  const sendMessage = () => {
    if (!chatInput.trim() || isAiTyping) return;
    const userMsg: ChatMessage = { role: "user", content: chatInput.trim(), timestamp: new Date() };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsAiTyping(true);

    setTimeout(() => {
      const response = getAIResponse(userMsg.content);
      setChatMessages((prev) => [...prev, { role: "assistant", content: response, timestamp: new Date() }]);
      setIsAiTyping(false);

      // Trigger grade reveal when backtest results are shown
      const lower = userMsg.content.toLowerCase();
      if (lower.includes("backtest") || lower.includes("submit") || lower.includes("test")) {
        setTimeout(() => {
          setGradeReveal({ grade: "A", name: "BTC Momentum RSI Cross" });
        }, 600);
      }
    }, 1200 + Math.random() * 800);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isAiTyping]);

  /* ═══ RENDER ═══ */
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ── Minimal header ── */}
      <header className="shrink-0 h-11 px-6 sm:px-10 border-b border-border bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663325188422/YmxnXmKxyGfXhEgxEBqPXF/otter-logo_ef58ab33.png" alt="Otter" className="w-7 h-7 rounded-full object-cover" />
          <span className="font-semibold text-base tracking-tight text-foreground">Otter</span>
        </div>
        <div className="flex items-center gap-2.5">
          <AnimatedThemeToggler
            className="relative w-8 h-8 rounded-full flex items-center justify-center border border-border bg-accent hover:bg-slate-200 dark:hover:bg-slate-800 transition-all duration-200 ease-in-out"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          />
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full border bg-accent border-border">
            <div className="w-5 h-5 rounded-full flex items-center justify-center bg-primary/15 text-primary text-[10px] font-semibold">O</div>
            <span className="text-xs font-medium text-foreground">Otter User</span>
          </div>
        </div>
      </header>

      {/* ── Content area ── */}
      <div className="flex-1 overflow-y-auto" ref={contentRef}>
        <div className="mx-auto max-w-[860px] px-6 sm:px-10 py-10">
          {/* Title + Stepper Row */}
          <div className="mb-10 flex items-center justify-between gap-6">
            <h1 className="whitespace-nowrap text-[16px] font-normal px-4 py-1 rounded-full border-[0.5px] border-primary bg-[#f2f1f8] dark:bg-primary/10 text-primary">Launch Guide</h1>

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
                        isCurrent ? "text-foreground" : isCompleted ? "text-primary" : "text-muted-foreground/60"
                      }`}>
                        {step.label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`w-4 sm:w-6 h-px ${i < currentStep ? "bg-primary" : "bg-border"}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Step Content ── */}
          <div className="min-h-[400px]">
            {/* ═══ STEP 0: Welcome + Mode Selection ═══ */}
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
                  <p className="text-xs text-muted-foreground">This helps us tailor the platform to your needs</p>
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
                          {experience === opt.value && <div className="w-2 h-2 rounded-full bg-primary" />}
                        </div>
                        <span className={`text-sm ${experience === opt.value ? "text-foreground" : "text-muted-foreground"}`}>
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

            {/* ═══ STEP 1: Agent Mode Selection ═══ */}
            {currentStep === 1 && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div>
                  <h2 className="mb-1 text-foreground">Choose Your Workflow</h2>
                  <p className="text-sm text-muted-foreground">
                    Select how you'd like to create alpha factors.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Platform Agent */}
                    <button
                      onClick={() => setAgentMode("platform")}
                      className={`relative p-5 rounded-2xl text-left transition-all duration-200 ease-in-out border ${
                        agentMode === "platform"
                          ? "bg-primary/10 border-primary/30 shadow-[0_0_0_1px_rgba(79,70,229,0.2)]"
                          : "bg-accent border-border hover:border-slate-300 dark:hover:border-slate-600"
                      }`}
                    >
                      {agentMode === "platform" && (
                        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      )}
                      <div className="flex items-center gap-2.5 mb-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          agentMode === "platform" ? "bg-primary/20" : "bg-slate-200 dark:bg-slate-800"
                        }`}>
                          <Bot className={`w-5 h-5 ${agentMode === "platform" ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground">Platform Agent</div>
                          <div className="text-[10px] uppercase tracking-wider text-primary font-medium">NEW</div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Use Otter's built-in AI to create and backtest alpha factors through natural language conversation. No coding required.
                      </p>
                    </button>

                    {/* Own Agent */}
                    <button
                      onClick={() => setAgentMode("own")}
                      className={`relative p-5 rounded-2xl text-left transition-all duration-200 ease-in-out border ${
                        agentMode === "own"
                          ? "bg-primary/10 border-primary/30 shadow-[0_0_0_1px_rgba(79,70,229,0.2)]"
                          : "bg-accent border-border hover:border-slate-300 dark:hover:border-slate-600"
                      }`}
                    >
                      {agentMode === "own" && (
                        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      )}
                      <div className="flex items-center gap-2.5 mb-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          agentMode === "own" ? "bg-primary/20" : "bg-slate-200 dark:bg-slate-800"
                        }`}>
                          <Code2 className={`w-5 h-5 ${agentMode === "own" ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                        <div className="text-sm font-semibold text-foreground">Your Own Agent</div>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Connect your existing AI agent (ChatGPT / Claude / DeepSeek) via API key and Otter Skill prompt.
                      </p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ PLATFORM MODE: AI Chat Step ═══ */}
            {agentMode === "platform" && currentStep === 2 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <h2 className="mb-1 text-foreground">AI Alpha Mining</h2>
                  <p className="text-sm text-muted-foreground">
                    Describe your trading idea and our AI will help you create, backtest, and optimize alpha factors.
                  </p>
                </div>

                {/* Chat Container */}
                <div className="rounded-2xl border border-border bg-accent overflow-hidden">
                  {/* Chat Messages */}
                  <div className="h-[420px] overflow-y-auto p-4 space-y-4">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] ${msg.role === "user" ? "order-2" : ""}`}>
                          {msg.role === "assistant" && (
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center">
                                <Sparkles className="w-3 h-3 text-primary" />
                              </div>
                              <span className="text-[10px] font-medium text-primary">Otter AI</span>
                            </div>
                          )}
                          <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-white dark:bg-slate-950 border border-border rounded-bl-md"
                          }`}>
                            {msg.role === "assistant" ? (
                              <div className="prose prose-sm dark:prose-invert max-w-none [&_pre]:bg-slate-100 [&_pre]:dark:bg-slate-900 [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:text-xs [&_pre]:font-mono [&_code]:text-primary [&_table]:text-xs [&_th]:px-3 [&_th]:py-1.5 [&_td]:px-3 [&_td]:py-1.5 [&_strong]:text-foreground">
                                <div dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }} />
                              </div>
                            ) : (
                              <span>{msg.content}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {isAiTyping && (
                      <div className="flex justify-start">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center">
                              <Sparkles className="w-3 h-3 text-primary" />
                            </div>
                            <span className="text-[10px] font-medium text-primary">Otter AI</span>
                          </div>
                          <div className="rounded-2xl rounded-bl-md px-4 py-3 bg-white dark:bg-slate-950 border border-border">
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:0ms]" />
                              <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:150ms]" />
                              <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:300ms]" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Quick Suggestions */}
                  {chatMessages.length <= 1 && (
                    <div className="px-4 pb-2 flex flex-wrap gap-2">
                      {[
                        "Create a BTC momentum factor",
                        "Build an ETH volume divergence alpha",
                        "Design a funding rate strategy",
                      ].map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => { setChatInput(suggestion); }}
                          className="px-3 py-1.5 rounded-full text-xs border border-primary/20 text-primary bg-primary/5 hover:bg-primary/10 transition-colors duration-200"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Chat Input */}
                  <div className="border-t border-border p-3 flex items-center gap-2">
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                      placeholder="Describe your alpha strategy..."
                      className="flex-1 rounded-xl bg-white dark:bg-slate-950 border-border h-10 text-sm"
                      disabled={isAiTyping}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!chatInput.trim() || isAiTyping}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                        chatInput.trim() && !isAiTyping
                          ? "bg-primary text-primary-foreground hover:brightness-110"
                          : "bg-accent text-muted-foreground cursor-not-allowed"
                      }`}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 rounded-2xl text-xs bg-primary/5 text-primary border border-primary/20">
                  <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    Tip: The AI can create factors, run backtests, analyze results, and optimize strategies — all through natural conversation.
                  </span>
                </div>
              </div>
            )}

            {/* ═══ OWN AGENT MODE: Step 2 — Configure Agent API ═══ */}
            {agentMode === "own" && currentStep === 2 && (
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

                {/* Prompt Preview */}
                {generatedApiKey && (
                  <div className="space-y-4 p-5 rounded-2xl border border-border bg-accent">
                    <p className="text-xs text-muted-foreground">Copy the prompt below and paste it into your AI agent (ChatGPT / Claude / DeepSeek).</p>
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

            {/* ═══ OWN AGENT MODE: Step 3 — First Run ═══ */}
            {agentMode === "own" && currentStep === 3 && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div>
                  <h2 className="mb-1 text-foreground">First Run</h2>
                  <p className="text-sm text-muted-foreground">
                    Try these example prompts in your AI coding agent to test the Otter skill.
                  </p>
                </div>

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
                    <div key={item.category} className="p-5 rounded-2xl border border-border bg-accent hover:border-primary/30 transition-all duration-200 ease-in-out">
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
                  <span>Tip: You can modify these prompts or create your own. The skill supports natural language instructions for all Otter platform operations.</span>
                </div>
              </div>
            )}

            {/* ═══ VERIFY (both modes, last step) ═══ */}
            {currentStep === STEPS.length - 1 && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div>
                  <h2 className="mb-1 text-foreground">Verify {agentMode === "platform" ? "Connection" : "Installation"}</h2>
                  <p className="text-sm text-muted-foreground">
                    {agentMode === "platform"
                      ? "Let's verify the AI mining engine is ready for your workspace."
                      : "Let's check if your skill is properly connected and all components are running."}
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
                            {agentMode === "platform" ? "AI Mining Engine" : "Skill"} version: {verifyDetails.version}
                          </p>
                        </div>
                      </div>
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
                          <p className="text-xs mt-0.5 text-muted-foreground">Please check your installation and try again.</p>
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
                onClick={() => {
                  if (currentStep === 1 && agentMode === "platform") {
                    // Platform Agent: skip to AI Mining page directly
                    markOnboarded();
                    navigate("/launch-guide");
                    // Navigate to a dedicated AI mining page or dashboard
                    navigate("/");
                    toast.success("Welcome! Start mining alphas with AI.");
                    return;
                  }
                  goNext();
                }}
                disabled={!canProceed()}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ease-in-out ${
                  canProceed()
                    ? "bg-primary text-primary-foreground hover:brightness-110 hover:-translate-y-0.5 cursor-pointer btn-bounce"
                    : "bg-accent text-muted-foreground border border-border cursor-not-allowed"
                }`}
              >
                {currentStep === 1 && agentMode === "platform" ? "进入" : "Next"}
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
      {/* Grade Reveal Modal */}
      {gradeReveal && (
        <GradeRevealSingle
          grade={gradeReveal.grade}
          factorName={gradeReveal.name}
          onClose={() => setGradeReveal(null)}
        />
      )}
    </div>
  );
}

/* ═══ Helpers ═══ */

function formatMarkdown(text: string): string {
  return text
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\|(.+)\|\n\|[-| ]+\|\n((?:\|.+\|\n?)+)/g, (_match, header, body) => {
      const headers = header.split('|').map((h: string) => h.trim()).filter(Boolean);
      const rows = body.trim().split('\n').map((row: string) =>
        row.split('|').map((c: string) => c.trim()).filter(Boolean)
      );
      return `<table class="w-full border-collapse my-2"><thead><tr>${headers.map((h: string) => `<th class="text-left border-b border-border">${h}</th>`).join('')}</tr></thead><tbody>${rows.map((row: string[]) => `<tr>${row.map((c: string) => `<td class="border-b border-border/50">${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    })
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*<\/li>)/g, '<ul class="list-disc pl-4 space-y-1">$1</ul>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}
