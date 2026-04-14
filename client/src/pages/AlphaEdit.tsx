/**
 * AlphaEdit — Create New Alpha
 * Design: Indigo/Sky + Slate | Cards: rounded-2xl | Buttons: rounded-full | Inputs: rounded-lg
 * Two modes: Platform Agent (form-based) / Your Own Agent (API guide)
 */
import { useState, useRef, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import {
  ArrowLeft,
  Bot,
  Code2,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Key,
  Rocket,
  FlaskConical,
  BarChart3,
  Trophy,
  Zap,
  Sparkles,
  Send,
  Info,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

/* ── Agent Mode ── */
type AgentMode = "platform" | "own" | null;

/* ── Markets ── */
const MARKETS = [
  "BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT",
  "ARB/USDT", "OP/USDT", "AVAX/USDT", "MATIC/USDT",
  "DOGE/USDT", "XRP/USDT",
];

/* ── Strategy Types ── */
const STRATEGY_TYPES = [
  { value: "momentum", label: "Momentum", desc: "Trend-following signals" },
  { value: "mean-reversion", label: "Mean Reversion", desc: "Counter-trend signals" },
  { value: "statistical-arb", label: "Statistical Arbitrage", desc: "Cross-asset spread" },
  { value: "volume-based", label: "Volume-based", desc: "Volume/flow analysis" },
  { value: "funding-rate", label: "Funding Rate", desc: "Perp funding signals" },
  { value: "custom", label: "Custom", desc: "Define your own logic" },
];

/* ── Timeframes ── */
const TIMEFRAMES = [
  { value: "1h", label: "1H" },
  { value: "4h", label: "4H" },
  { value: "1d", label: "1D" },
  { value: "1w", label: "1W" },
];

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
  const { theme } = useTheme();
  const isDark = theme === "dark";

  /* ── Mode ── */
  const [mode, setMode] = useState<AgentMode>(null);

  /* ── Platform Agent Form State ── */
  const [alphaName, setAlphaName] = useState("");
  const [selectedMarket, setSelectedMarket] = useState("BTC/USDT");
  const [strategyType, setStrategyType] = useState("momentum");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [timeframe, setTimeframe] = useState("1d");
  const [lookbackDays, setLookbackDays] = useState("30");
  const [maxDrawdown, setMaxDrawdown] = useState("15");
  const [targetSharpe, setTargetSharpe] = useState("1.25");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ── Own Agent State ── */
  const [apiName, setApiName] = useState("My Trading Bot");
  const [generatedApiKey, setGeneratedApiKey] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [ownStep, setOwnStep] = useState<"api" | "first-run">("api");

  /* ── Generate API key on Own Agent mode ── */
  useEffect(() => {
    if (mode === "own" && !generatedApiKey) {
      setGeneratedApiKey(generateApiKey());
    }
  }, [mode]);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  /* ── Platform Agent Submit ── */
  const handleSubmit = () => {
    if (!alphaName.trim()) {
      toast.error("Please enter an alpha name");
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success("Alpha created! AI is now mining your factor...");
      navigate("/alphas");
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
          <p className="text-xs text-muted-foreground mt-0.5">Choose how you want to create your alpha factor</p>
        </div>
      </div>

      {/* ═══ Mode Selection ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Platform Agent */}
        <button
          onClick={() => setMode("platform")}
          className={`relative p-5 rounded-2xl text-left transition-all duration-200 ease-in-out border ${
            mode === "platform"
              ? "bg-primary/10 border-primary/30 shadow-[0_0_0_1px_rgba(79,70,229,0.2)]"
              : "bg-card border-border hover:border-slate-300 dark:hover:border-slate-600"
          }`}
        >
          {mode === "platform" && (
            <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
              <Check className="w-3 h-3 text-primary-foreground" />
            </div>
          )}
          <div className="flex items-center gap-2.5 mb-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              mode === "platform" ? "bg-primary/20" : "bg-slate-200 dark:bg-slate-800"
            }`}>
              <Bot className={`w-5 h-5 ${mode === "platform" ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div className="text-sm font-semibold text-foreground">Platform Agent</div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Fill in key parameters and let Otter's AI create, backtest, and optimize your alpha factor automatically.
          </p>
        </button>

        {/* Your Own Agent */}
        <button
          onClick={() => setMode("own")}
          className={`relative p-5 rounded-2xl text-left transition-all duration-200 ease-in-out border ${
            mode === "own"
              ? "bg-primary/10 border-primary/30 shadow-[0_0_0_1px_rgba(79,70,229,0.2)]"
              : "bg-card border-border hover:border-slate-300 dark:hover:border-slate-600"
          }`}
        >
          {mode === "own" && (
            <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
              <Check className="w-3 h-3 text-primary-foreground" />
            </div>
          )}
          <div className="flex items-center gap-2.5 mb-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              mode === "own" ? "bg-primary/20" : "bg-slate-200 dark:bg-slate-800"
            }`}>
              <Code2 className={`w-5 h-5 ${mode === "own" ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div className="text-sm font-semibold text-foreground">Your Own Agent</div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Connect your AI agent (ChatGPT / Claude / DeepSeek) via API key and Otter Skill prompt.
          </p>
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
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Core Parameters</span>
            </div>

            {/* Alpha Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Alpha Name <span className="text-destructive">*</span></label>
              <Input
                placeholder="e.g., BTC Momentum RSI Cross"
                value={alphaName}
                onChange={(e) => setAlphaName(e.target.value)}
                className="rounded-lg bg-accent border-border h-10 text-sm"
              />
            </div>

            {/* Market */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Target Market <span className="text-destructive">*</span></label>
              <div className="flex flex-wrap gap-2">
                {MARKETS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setSelectedMarket(m)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
                      selectedMarket === m
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-accent text-muted-foreground border-border hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Strategy Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Strategy Type <span className="text-destructive">*</span></label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {STRATEGY_TYPES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setStrategyType(s.value)}
                    className={`p-3 rounded-xl text-left transition-all duration-200 border ${
                      strategyType === s.value
                        ? "bg-primary/10 border-primary/30 text-foreground"
                        : "bg-accent border-border hover:border-slate-300 dark:hover:border-slate-600 text-muted-foreground"
                    }`}
                  >
                    <div className="text-xs font-semibold">{s.label}</div>
                    <div className="text-[10px] mt-0.5 opacity-70">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Advanced Settings (collapsed by default) */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-accent/50 transition-colors duration-200"
            >
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Advanced Settings</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-muted-foreground border border-border">Optional</span>
              </div>
              {showAdvanced ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            {showAdvanced && (
              <div className="px-6 pb-6 space-y-5 border-t border-border pt-5 animate-in fade-in duration-200">
                {/* Timeframe */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Timeframe</label>
                  <div className="flex gap-2">
                    {TIMEFRAMES.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setTimeframe(t.value)}
                        className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 border ${
                          timeframe === t.value
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-accent text-muted-foreground border-border hover:border-slate-300 dark:hover:border-slate-600"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Numeric Params */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Lookback (days)</label>
                    <Input
                      type="number"
                      value={lookbackDays}
                      onChange={(e) => setLookbackDays(e.target.value)}
                      className="rounded-lg bg-accent border-border h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Max Drawdown (%)</label>
                    <Input
                      type="number"
                      value={maxDrawdown}
                      onChange={(e) => setMaxDrawdown(e.target.value)}
                      className="rounded-lg bg-accent border-border h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Target Sharpe</label>
                    <Input
                      type="number"
                      step="0.05"
                      value={targetSharpe}
                      onChange={(e) => setTargetSharpe(e.target.value)}
                      className="rounded-lg bg-accent border-border h-9 text-sm"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Strategy Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your trading idea in natural language (optional)..."
                    rows={3}
                    className="w-full rounded-lg bg-accent border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-200 resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-start gap-2 text-xs text-muted-foreground max-w-md">
              <Zap className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
              <span>The AI will generate a factor expression, run backtests, and optimize parameters automatically.</span>
            </div>
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
              <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
                <div>
                  <h2 className="text-base font-semibold text-foreground mb-1">Configure Agent API</h2>
                  <p className="text-xs text-muted-foreground">
                    Generate an API key and paste the prompt into your AI agent to connect with Otter.
                  </p>
                </div>

                {/* API Name */}
                <div className="space-y-3 p-4 rounded-xl border border-border bg-accent">
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
                  <div className="space-y-4 p-5 rounded-xl border border-border bg-accent">
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
                        className="h-9 px-6 rounded-full text-sm font-medium transition-all duration-200 bg-primary text-primary-foreground hover:brightness-110 flex items-center gap-2"
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
