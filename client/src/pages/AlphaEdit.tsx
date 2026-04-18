/**
 * AlphaEdit — Create New Alpha
 * Design: Indigo/Sky + Slate | Cards: rounded-2xl | Buttons: rounded-full | Inputs: rounded-lg
 * Two modes: Platform Agent (form-based) / Your Own Agent (API guide)
 */
import { useState } from "react";
import { useLocation, Link } from "wouter";
import {
  ArrowLeft,
  Bot,
  Code2,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  Info,
  Key,
  Rocket,
  FlaskConical,
  BarChart3,
  Trophy,
  Zap,
  Sparkles,
  ClipboardCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useAlphaViewMode } from "@/contexts/AlphaViewModeContext";
import { toast } from "sonner";

/* ── Agent Mode ── */
type AgentMode = "platform" | "own" | null;

/* ── Strategy Types ── */
const STRATEGY_TYPES_BY_MODE = {
  beginner: [
    { value: "time-series", label: "Time series" },
    { value: "cross-sectional", label: "Cross Section" },
  ],
  pro: [
    { value: "time-series", label: "Time series" },
    { value: "cross-sectional", label: "Cross Section" },
  ],
} as const;

const ITERATION_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1);

/* ── Generate API Key ── */
function generateApiKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = "ot_sk_";
  for (let i = 0; i < 32; i++) key += chars.charAt(Math.floor(Math.random() * chars.length));
  return key;
}

/* ── Build Guide Prompt ── */
function buildGuidePrompt(key: string) {
  return `# Otter Trading Skill Configuration\n\n## API Key\n\`${key}\`\n\n## Skill Version\nv2.4.1\n\n## Setup Instructions\nPaste this entire prompt into your AI agent (ChatGPT / Claude / DeepSeek) to enable Otter Trading capabilities.\n\nYour agent will be able to:\n- Mine and backtest alpha factors automatically\n- Access real-time market data (CEX & DEX)\n- Submit strategies to the Otter Arena\n- Monitor portfolio performance\n\n## Connection Endpoint\nhttps://api.otter.trade/v1/agent\n\n## Authentication\nInclude the API key in your agent's system prompt or environment configuration.`;
}

/* ── First Run Prompts ── */
const FIRST_RUN_PROMPTS = [
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
];

/* ══════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════ */
export default function AlphaEdit() {
  const [, navigate] = useLocation();
  const { alphaViewMode } = useAlphaViewMode();

  /* ── Mode ── */
  const [mode, setMode] = useState<AgentMode>(null);

  /* ── Platform Agent Form State ── */
  const [alphaName, setAlphaName] = useState("BTC Momentum RSI Cross");
  const [strategyType, setStrategyType] = useState("time-series");
  const [iterationCount, setIterationCount] = useState(3);
  const [description, setDescription] = useState("");
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ── Own Agent State ── */
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [ownStep, setOwnStep] = useState<"api" | "first-run">("api");
  const [apiKeys, setApiKeys] = useState<{ id: string; name: string; apiKey: string; skillVersion: string; updatedAt: string }[]>([
    { id: "1", name: "My Trading Bot", apiKey: "ot_sk_7x9kM2nP4qR8sT6uW3yA1bC5dE0fG2h", skillVersion: "v2.4.1", updatedAt: "2026-03-28" },
    { id: "2", name: "Research Agent", apiKey: "ot_sk_hJ2kL4mN6pQ8rS0tU2vW4xY6zA8bC0dE", skillVersion: "v2.3.0", updatedAt: "2026-03-15" },
  ]);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);
  const SKILL_LATEST = "v2.4.1";

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const copyApiKey = (key: string, id: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(id);
    toast.success("API key copied");
    setTimeout(() => setCopiedKey(null), 2000);
  };
  const copyPrompt = (apiKey: string, id: string) => {
    navigator.clipboard.writeText(buildGuidePrompt(apiKey));
    setCopiedPrompt(id);
    toast.success("Prompt copied to clipboard");
    setTimeout(() => setCopiedPrompt(null), 2000);
  };
  const handleCreateApiKey = () => {
    const newKey = {
      id: String(Date.now()),
      name: `Agent ${apiKeys.length + 1}`,
      apiKey: generateApiKey(),
      skillVersion: SKILL_LATEST,
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    setApiKeys(prev => [...prev, newKey]);
    toast.success("New API key created");
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const strategyTypeOptions = STRATEGY_TYPES_BY_MODE[alphaViewMode];
  const activeStrategyTypeLabel =
    strategyTypeOptions.find((item) => item.value === strategyType)?.label ?? "";
  const showBeginnerHints = alphaViewMode === "beginner";

  const buildOptimizedPrompt = () => {
    const factorName = alphaName.trim() || "Untitled Factor";
    const strategyLabel = activeStrategyTypeLabel || "strategy";
    const viewModeHint =
      alphaViewMode === "beginner"
        ? "Keep the wording simple, focus on timing quality or symbol selection, and avoid unnecessary jargon."
        : "Keep the wording concise but specific, and emphasize robustness, signal clarity, and execution constraints.";

    setDescription(
      `Please refine the ${strategyLabel} factor named "${factorName}". Please iterate ${iterationCount} times and produce a clearer, more actionable description for alpha creation. ${viewModeHint}`
    );
    toast.success("Prompt optimized");
  };

  const helpCopy = {
    strategy: {
      items: [
        {
          title: "Time series -> Find good Timing",
          body: "This means looking for patterns within one asset over time.",
        },
        {
          title: "Cross Section -> Find good Symbols",
          body: "This means comparing many assets at the same time and choosing the stronger ones.",
        },
      ],
    },
    iterations: {
      title: "Iterations",
      body:
        "Iterations means how many rounds the system will try to improve your idea. More rounds usually means more refinement, but it may also take longer.",
    },
  } as const;

  /* ── Platform Agent Submit ── */
  const handleSubmit = () => {
    if (!alphaName.trim()) {
      toast.error("Please enter an alpha name");
      return;
    }
    setIsSubmitting(true);
    // Generate a temporary new alpha ID and navigate to detail page with generating state
    const newAlphaId = `AF-${String(Math.floor(Math.random() * 900) + 100)}`;
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success("Alpha created! AI is now mining your factor...");
      navigate(`/alphas/${newAlphaId}?generating=true&name=${encodeURIComponent(alphaName.trim())}`);
    }, 1500);
  };

  return (
    <div className="space-y-6 min-w-0 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/alphas">
          <button className="w-9 h-9 rounded-xl flex items-center justify-center border border-border bg-card hover:bg-accent text-muted-foreground hover:text-foreground transition-all duration-200">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-foreground text-xl font-bold">Create New Alpha</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Choose how you want to create your alpha</p>
        </div>
      </div>

      {/* ═══ Mode Selection ═══ */}
      <div className="grid grid-cols-2 gap-3">
        {/* Platform Agent */}
        <button
          onClick={() => setMode("platform")}
          className={`relative px-3.5 py-2.5 rounded-xl text-left transition-all duration-200 ease-in-out border flex items-center gap-2.5 ${
            mode === "platform"
              ? "bg-primary/10 border-primary/30 shadow-[0_0_0_1px_rgba(79,70,229,0.2)]"
              : "bg-card border-border hover:border-slate-300 dark:hover:border-slate-600"
          }`}
        >
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
            mode === "platform" ? "bg-primary/20" : "bg-slate-200 dark:bg-slate-800"
          }`}>
            <Bot className={`w-3.5 h-3.5 ${mode === "platform" ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          <span className="text-xs font-semibold text-foreground">Platform Agent</span>
          {mode === "platform" && <Check className="w-3.5 h-3.5 text-primary ml-auto shrink-0" />}
        </button>

        {/* Your Own Agent */}
        <button
          onClick={() => setMode("own")}
          className={`relative px-3.5 py-2.5 rounded-xl text-left transition-all duration-200 ease-in-out border flex items-center gap-2.5 ${
            mode === "own"
              ? "bg-primary/10 border-primary/30 shadow-[0_0_0_1px_rgba(79,70,229,0.2)]"
              : "bg-card border-border hover:border-slate-300 dark:hover:border-slate-600"
          }`}
        >
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
            mode === "own" ? "bg-primary/20" : "bg-slate-200 dark:bg-slate-800"
          }`}>
            <Code2 className={`w-3.5 h-3.5 ${mode === "own" ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          <span className="text-xs font-semibold text-foreground">Your Own Agent</span>
          {mode === "own" && <Check className="w-3.5 h-3.5 text-primary ml-auto shrink-0" />}
        </button>
      </div>

      {/* ═══════════════════════════════════════════
          Platform Agent Mode — Form
          ═══════════════════════════════════════════ */}
      {mode === "platform" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Required Fields */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <ClipboardCheck className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Core Parameters</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">Required</span>
            </div>

            {/* Type */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-muted-foreground">Strategy Type <span className="text-destructive">*</span></label>
                {showBeginnerHints && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition-colors hover:text-foreground hover:border-border"
                        aria-label="Explain strategy type"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" side="top" className="w-[340px] border-border bg-card p-3">
                      <div className="space-y-3 text-[11px] leading-5">
                        <p className="text-xs font-semibold text-foreground">Strategy Type Notes</p>
                        {helpCopy.strategy.items.map((item) => (
                          <div key={item.title} className="space-y-1.5">
                            <p className="text-[11px] font-medium text-foreground/90">{item.title}</p>
                            <p className="text-[11px] text-muted-foreground">{item.body}</p>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {strategyTypeOptions.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setStrategyType(t.value)}
                    className={`px-4 py-3 rounded-xl text-left transition-all duration-200 border ${
                      strategyType === t.value
                        ? "bg-primary/10 border-primary/30 text-primary shadow-[0_0_0_1px_rgba(79,70,229,0.15)]"
                        : "bg-accent text-muted-foreground border-border hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <div className={`text-sm font-semibold ${strategyType === t.value ? "text-primary" : "text-foreground"}`}>{t.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Iterations */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-muted-foreground">Iterations <span className="text-destructive">*</span></label>
                {showBeginnerHints && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition-colors hover:text-foreground hover:border-border"
                        aria-label="Explain iterations"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" side="top" className="w-[340px] border-border bg-card p-3">
                      <div className="space-y-2.5 text-[11px] leading-5">
                        <p className="text-xs font-semibold text-foreground">{helpCopy.iterations.title}</p>
                        <p className="text-muted-foreground">{helpCopy.iterations.body}</p>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                {ITERATION_OPTIONS.map((count) => (
                  <button
                    key={count}
                    onClick={() => setIterationCount(count)}
                    className={`h-9 rounded-lg text-xs font-semibold transition-all duration-200 border ${
                      iterationCount === count
                        ? "bg-primary/10 border-primary/30 text-primary shadow-[0_0_0_1px_rgba(79,70,229,0.15)]"
                        : "bg-accent text-muted-foreground border-border hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Optional Fields */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <button
              type="button"
              onClick={() => setShowOptionalFields((prev) => !prev)}
              className="w-full flex items-center justify-between gap-3 px-6 py-4 text-left transition-colors duration-200 hover:bg-accent/60"
            >
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Optional</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-muted-foreground border border-border">Optional</span>
              </div>
              {showOptionalFields ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            {showOptionalFields && (
              <div className="px-6 pb-6 space-y-5">
                {/* Factor Name */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Factor Name</label>
                  <Input
                    placeholder="System default will be filled"
                    value={alphaName}
                    onChange={(e) => setAlphaName(e.target.value)}
                    className="rounded-lg bg-accent border-border h-10 text-sm"
                  />
                </div>

                {/* Supplementary Description */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-xs font-medium text-muted-foreground">Supplementary Description</label>
                    <button
                      type="button"
                      onClick={buildOptimizedPrompt}
                      className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary transition-all duration-200 hover:bg-primary/15 hover:border-primary/30"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Optimize Prompt
                    </button>
                  </div>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add extra constraints, interpretation notes, or any follow-up details here..."
                    rows={5}
                    className="rounded-xl bg-accent border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-200 resize-none"
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground/60">This note will be attached to the alpha creation context.</p>
                    <span className="text-[10px] text-muted-foreground/50">{description.length}/500</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex items-center justify-between pt-2">
            <div />
            <button
              onClick={handleSubmit}
              disabled={!alphaName.trim() || isSubmitting}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ease-in-out ${
                alphaName.trim() && !isSubmitting
                  ? "bg-primary text-primary-foreground hover:brightness-110 hover:-translate-y-0.5 cursor-pointer"
                  : "bg-accent text-muted-foreground border border-border cursor-not-allowed"
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4" />
                  Create Alpha
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          Your Own Agent Mode — API Guide + First Run
          ═══════════════════════════════════════════ */}
      {mode === "own" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Tab Switcher */}
          <div className="flex items-center gap-1 p-1 rounded-2xl w-fit bg-accent border border-border">
            <button
              onClick={() => setOwnStep("api")}
              className={`h-8 text-xs px-4 rounded-xl font-medium transition-all duration-200 ease-in-out border ${
                ownStep === "api"
                  ? "bg-card text-foreground border-border shadow-sm"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5" />
                Agent API & Skill
              </div>
            </button>
            <button
              onClick={() => setOwnStep("first-run")}
              className={`h-8 text-xs px-4 rounded-xl font-medium transition-all duration-200 ease-in-out border ${
                ownStep === "first-run"
                  ? "bg-card text-foreground border-border shadow-sm"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Rocket className="w-3.5 h-3.5" />
                First Run
              </div>
            </button>
          </div>

          {/* ── Agent API & Skill Tab ── */}
          {ownStep === "api" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 pb-3 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-primary" />
                      <span className="text-base font-semibold text-foreground">Agent API</span>
                      <span className="text-xs text-muted-foreground ml-1">({apiKeys.length})</span>
                    </div>
                    <button
                      className="h-8 text-xs px-4 rounded-full flex items-center gap-1.5 transition-all duration-200 ease-in-out bg-primary text-primary-foreground hover:brightness-110 font-medium"
                      onClick={handleCreateApiKey}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      New API Key
                    </button>
                  </div>
                </div>

                {/* API Keys List */}
                <div className="p-6">
                  {apiKeys.length === 0 ? (
                    <div className="text-center py-12">
                      <Key className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">No API keys yet</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Create your first API key to connect your AI agent</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {apiKeys.map((item) => (
                        <div
                          key={item.id}
                          className="p-4 rounded-2xl border border-border bg-accent/50 hover:border-primary/20 transition-colors duration-200"
                        >
                          {/* Row 1: Name + Copy Prompt */}
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-semibold text-foreground truncate">{item.name}</span>
                            <button
                              onClick={() => copyPrompt(item.apiKey, item.id)}
                              className={`h-7 text-xs px-2.5 rounded-full flex items-center gap-1 transition-all duration-200 ease-in-out border ${
                                item.skillVersion !== SKILL_LATEST
                                  ? "border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
                                  : "border-primary/20 text-primary hover:bg-primary/10"
                              }`}
                            >
                              {copiedPrompt === item.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              {copiedPrompt === item.id ? "Copied" : item.skillVersion !== SKILL_LATEST ? "Copy Latest Prompt" : "Copy Prompt"}
                            </button>
                          </div>

                          {/* Row 2: API Key */}
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium w-14 shrink-0">API Key</span>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background/60 border border-border/60 flex-1 min-w-0">
                              <code className="font-mono text-xs text-primary truncate flex-1">
                                {visibleKeys.has(item.id) ? item.apiKey : item.apiKey.slice(0, 6) + "\u2022".repeat(16) + "..."}
                              </code>
                              <button onClick={() => toggleKeyVisibility(item.id)} className="p-0.5 text-muted-foreground hover:text-foreground transition-colors shrink-0">
                                {visibleKeys.has(item.id) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                              <button onClick={() => copyApiKey(item.apiKey, item.id)} className="p-0.5 text-muted-foreground hover:text-foreground transition-colors shrink-0">
                                {copiedKey === item.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>

                          {/* Row 3: Meta info */}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <span className="uppercase tracking-wider font-medium">Skill</span>
                              <span className="text-primary font-semibold">{item.skillVersion}</span>
                              {item.skillVersion !== SKILL_LATEST && (
                                <span className="text-amber-500 ml-0.5">(update available: {SKILL_LATEST})</span>
                              )}
                            </span>
                            <span className="border-l border-border pl-4">Updated {item.updatedAt}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── First Run Tab ── */}
          {ownStep === "first-run" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
                <div>
                  <h2 className="text-base font-semibold text-foreground mb-1">First Run</h2>
                  <p className="text-xs text-muted-foreground">
                    Try these example prompts in your AI coding agent to test the Otter skill.
                  </p>
                </div>

                <div className="space-y-4">
                  {FIRST_RUN_PROMPTS.map((item) => (
                    <div key={item.category} className="p-5 rounded-xl border border-border bg-accent hover:border-primary/30 transition-all duration-200 ease-in-out">
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
                              ? "border-emerald-500/30 text-emerald-500 bg-slate-200 dark:bg-slate-800"
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

                <div className="flex items-start gap-2 p-3 rounded-xl text-xs bg-primary/5 text-primary border border-primary/20">
                  <Zap className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>Tip: You can modify these prompts or create your own. The skill supports natural language instructions for all Otter platform operations.</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state when no mode selected */}
      {mode === null && (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center animate-in fade-in duration-300">
          <div className="w-12 h-12 rounded-2xl bg-accent border border-border flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Select a mode above to get started</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Platform Agent for guided creation, or Your Own Agent for API integration</p>
        </div>
      )}
    </div>
  );
}
