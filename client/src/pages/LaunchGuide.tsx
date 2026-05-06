/*
 * LaunchGuide — Indigo/Sky + Slate Design System
 * Dual mode: Platform Agent (AI Chat) + User's Own Agent (API/Skill)
 * Cards: rounded-2xl | Buttons: rounded-full | Inputs: rounded-lg
 * Primary: Indigo | Secondary: Sky | Success: Emerald
 */
import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useOnboarding } from "@/App";
import { useTheme } from "@/contexts/ThemeContext";
import { useAppLanguage } from "@/contexts/AppLanguageContext";
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

const AI_RESPONSES_ZH: Record<string, string> = {
  default: "我可以帮助你创建 Alpha 因子。试着描述一个交易策略，例如：\n\n- “创建一个使用 RSI 的 BTC 动量因子”\n- “构建一个 ETH 成交量背离 Alpha”\n- “设计一个资金费率均值回归策略”",
  momentum: "不错的方向。我已经设计了一个 **BTC Momentum RSI Cross** 因子：\n\n```\nts_rank(close/delay(close,14), 252) * ts_std(volume, 20)\n```\n\n**策略逻辑：**\n- 在 252 天窗口内对 14 日价格动量做时序排序\n- 使用 20 日成交量波动率作为信号强度权重\n- 适用于趋势延续且市场参与度提升的行情\n\n是否提交回测？",
  volume: "这是一个 **ETH Volume Divergence** Alpha：\n\n```\nrank(ts_corr(close, volume, 10)) - rank(ts_delta(close, 5))\n```\n\n**策略逻辑：**\n- 捕捉价格与成交量相关性、短期价格动量之间的背离\n- 当成交量领先价格变化时生成短周期均值回归信号\n\n要现在运行回测吗？",
  funding: "我创建了一个 **Funding Rate Mean Reversion** 因子：\n\n```\nts_zscore(funding_rate, 168) * -1 * rank(open_interest_change)\n```\n\n**策略逻辑：**\n- 使用 7 日窗口对资金费率做 Z-score 标准化\n- 反向处理信号，高资金费率对应偏空倾向\n- 结合未平仓量变化提高信号置信度\n\n准备回测吗？",
  backtest: "回测已启动。初步结果如下：\n\n| 指标 | 样本内 | 样本外 |\n|--------|-----------|---------------|\n| 夏普比率 | 1.42 | 1.15 |\n| 收益率 | 18.5% | 14.2% |\n| 回撤 | 6.8% | 8.2% |\n| 换手率 | 38.2% | 41.5% |\n\n该因子样本内表现较强，样本外衰减处于合理范围。样本内夏普 1.42，高于 1.25 阈值。\n\n是否提交到因子竞技场？",
};

function getInitialAssistantMessage(uiLang: "en" | "zh") {
  return uiLang === "zh"
    ? "欢迎来到 Quandora AI Mining！我是你的量化助手。告诉我你想创建什么样的 Alpha 因子，我会帮你完成设计、回测与优化。\n\n你可以从这些方向开始：\n- 动量策略\n- 成交量背离信号\n- 资金费率套利\n- 跨交易所价差分析"
    : "Welcome to Quandora AI Mining! I'm your personal quant assistant. Tell me what kind of alpha factor you'd like to create, and I'll help you design, backtest, and optimize it.\n\nHere are some ideas to get started:\n- Momentum-based strategies\n- Volume divergence signals\n- Funding rate arbitrage\n- Cross-exchange spread analysis";
}

function getAIResponse(input: string, uiLang: "en" | "zh"): string {
  const responses = uiLang === "zh" ? AI_RESPONSES_ZH : AI_RESPONSES;
  const lower = input.toLowerCase();
  if (lower.includes("momentum") || lower.includes("动量") || lower.includes("rsi") || lower.includes("btc")) return responses.momentum;
  if (lower.includes("volume") || lower.includes("成交量") || lower.includes("divergence") || lower.includes("背离") || lower.includes("eth")) return responses.volume;
  if (lower.includes("funding") || lower.includes("资金费率") || lower.includes("mean rev") || lower.includes("均值回归")) return responses.funding;
  if (lower.includes("backtest") || lower.includes("回测") || lower.includes("submit") || lower.includes("提交") || lower.includes("test") || lower.includes("测试")) return responses.backtest;
  return responses.default;
}

/* ── Main Component ── */
export default function LaunchGuide() {
  const [, navigate] = useLocation();
  const { markOnboarded } = useOnboarding();
  const { theme } = useTheme();
  const { uiLang, setUiLang } = useAppLanguage();
  const tr = (en: string, zh: string) => (uiLang === "zh" ? zh : en);
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
      content: getInitialAssistantMessage(uiLang),
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

  const buildGuidePrompt = (key: string) => uiLang === "zh"
    ? `# Quandora Trading Skill 配置

## API Key
\`${key}\`

## Skill 版本
v2.4.1

## 设置说明
将这段提示词完整粘贴到你的 AI Agent（ChatGPT / Claude / DeepSeek）中，以启用 Quandora Trading 能力。

你的 Agent 将能够：
- 自动挖掘并回测 Alpha 因子
- 访问实时市场数据（CEX 与 DEX）
- 将策略提交到 Quandora Arena
- 监控组合表现

## 连接端点
https://api.quandora.trade/v1/agent

## 认证方式
请在 Agent 的系统提示词或环境配置中包含该 API Key。`
    : `# Quandora Trading Skill Configuration\n\n## API Key\n\`${key}\`\n\n## Skill Version\nv2.4.1\n\n## Setup Instructions\nPaste this entire prompt into your AI agent (ChatGPT / Claude / DeepSeek) to enable Quandora Trading capabilities.\n\nYour agent will be able to:\n- Mine and backtest alpha factors automatically\n- Access real-time market data (CEX & DEX)\n- Submit strategies to the Quandora Arena\n- Monitor portfolio performance\n\n## Connection Endpoint\nhttps://api.quandora.trade/v1/agent\n\n## Authentication\nInclude the API key in your agent's system prompt or environment configuration.`;

  // Verify
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>("idle");
  const [verifyDetails, setVerifyDetails] = useState<{
    connection: boolean;
    version: string;
    skills: { name: string; status: "ok" | "warn" | "error" }[];
  } | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);

  const STEPS = agentMode === "platform" ? PLATFORM_STEPS : OWN_AGENT_STEPS;
  const getStepLabel = (label: string) => {
    if (label === "Welcome") return tr("Welcome", "欢迎");
    if (label === "Mode") return tr("Mode", "模式");
    if (label === "Agent API & Skill") return tr("Agent API & Skill", "Agent API 与 Skill");
    return tr("First Run", "首次运行");
  };

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
    toast.success(tr("Setup complete! Welcome to Quandora.", "设置完成，欢迎来到 Quandora。"));
    navigate("/");
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    toast.success(tr("Copied to clipboard", "已复制到剪贴板"));
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
      const response = getAIResponse(userMsg.content, uiLang);
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

  useEffect(() => {
    setChatMessages((prev) => {
      if (prev.length !== 1 || prev[0].role !== "assistant") return prev;
      return [{ ...prev[0], content: getInitialAssistantMessage(uiLang) }];
    });
  }, [uiLang]);

  /* ═══ RENDER ═══ */
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ── Minimal header ── */}
      <header className="shrink-0 h-11 px-6 sm:px-10 border-b border-border bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl flex items-center justify-between">
        <Link
          href="/landing"
          className="flex items-center gap-2.5 rounded-lg transition-opacity hover:opacity-80"
          aria-label={tr("Go to landing page", "前往 Landing 页")}
        >
          <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663325188422/YmxnXmKxyGfXhEgxEBqPXF/otter-logo_ef58ab33.png" alt="Quandora" className="w-7 h-7 rounded-full object-cover" />
          <span className="font-semibold text-base tracking-tight text-foreground">Quandora</span>
        </Link>
          <div className="flex items-center gap-2.5">
            <AnimatedThemeToggler
              className="relative w-8 h-8 rounded-full flex items-center justify-center border border-border bg-accent hover:bg-slate-200 dark:hover:bg-slate-800 transition-all duration-200 ease-in-out"
              title={theme === "dark" ? tr("Switch to light mode", "切换到浅色模式") : tr("Switch to dark mode", "切换到深色模式")}
            />
            <button
              type="button"
              onClick={() => setUiLang(uiLang === "zh" ? "en" : "zh")}
              className="flex h-8 items-center rounded-full border border-border bg-accent px-3 text-xs font-medium text-foreground transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
              title={tr("Switch language", "切换语言")}
            >
              <span>{uiLang === "zh" ? "中文" : "English"}</span>
            </button>
          </div>
      </header>

      {/* ── Content area ── */}
      <div className="flex-1 overflow-y-auto" ref={contentRef}>
        <div className="mx-auto max-w-[860px] px-6 sm:px-10 py-10">
          {/* Intro + Stepper Row */}
          <div className="mb-10 flex items-start justify-between gap-6">
            {currentStep === 0 ? (
              <div className="min-w-0">
                <h1 className="text-foreground">{tr("Welcome", "欢迎")}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {tr("Let's set up your Quandora workspace. This only takes a minute.", "让我们配置你的 Quandora 工作区，这只需要一分钟。")}
                </p>
              </div>
            ) : (
              <div />
            )}

            {/* ── Compact Horizontal Stepper ── */}
            <div className="mt-3 flex items-center gap-1 sm:gap-2">
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
                        {getStepLabel(step.label)}
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
              <div className="space-y-10 animate-in fade-in duration-300">
                {/* Experience Level */}
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">
                      {tr("What best describes your experience?", "哪项最符合你的经验水平？")}
                    </label>
                    <p className="text-xs text-muted-foreground">{tr("This helps us tailor the platform to your needs", "这有助于我们根据你的需求定制平台体验")}</p>
                  </div>
                  <div className="space-y-2.5">
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
                          {opt.value === "beginner"
                            ? tr("Beginner — New to quantitative trading", "初学者 — 刚接触量化交易")
                            : tr("Professional — Experienced quant / fund manager", "专业用户 — 有量化 / 基金管理经验")}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Preferred Markets */}
                <div className="space-y-4 pt-1">
                  <label className="text-sm font-medium text-foreground">
                    {tr("Preferred Markets", "偏好市场")}
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
                  <h2 className="mb-1 text-foreground">{tr("Choose Your Workflow", "选择你的工作流")}</h2>
                  <p className="text-sm text-muted-foreground">
                    {tr("Select how you'd like to create alpha factors.", "选择你希望如何创建 Alpha 因子。")}
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
                          <div className="text-sm font-semibold text-foreground">{tr("Platform Agent", "平台 Agent")}</div>

                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {tr("Use Quandora's built-in AI to create and backtest alpha factors through natural language conversation. No coding required.", "通过自然语言对话使用 Quandora 内置 AI 创建并回测 Alpha 因子，无需编写代码。")}
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
                        <div className="text-sm font-semibold text-foreground">{tr("Your Own Agent", "自有 Agent")}</div>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {tr("Connect your existing AI agent (ChatGPT / Claude / DeepSeek) via API key and Quandora Skill prompt.", "通过 API 密钥与 Quandora Skill 提示词连接你现有的 AI Agent（ChatGPT / Claude / DeepSeek）。")}
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
                  <h2 className="mb-1 text-foreground">{tr("AI Alpha Mining", "AI 因子挖掘")}</h2>
                  <p className="text-sm text-muted-foreground">
                    {tr("Describe your trading idea and our AI will help you create, backtest, and optimize alpha factors.", "描述你的交易思路，我们的 AI 会帮助你创建、回测并优化 Alpha 因子。")}
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
                              <span className="text-[10px] font-medium text-primary">Quandora AI</span>
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
                            <span className="text-[10px] font-medium text-primary">Quandora AI</span>
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
                        tr("Create a BTC momentum factor", "创建一个 BTC 动量因子"),
                        tr("Build an ETH volume divergence alpha", "构建一个 ETH 成交量背离因子"),
                        tr("Design a funding rate strategy", "设计一个资金费率策略"),
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
                      placeholder={tr("Describe your alpha strategy...", "描述你的 Alpha 策略...")}
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
                    {tr("Tip: The AI can create factors, run backtests, analyze results, and optimize strategies — all through natural conversation.", "提示：AI 可以通过自然对话完成因子创建、回测、结果分析和策略优化。")}
                  </span>
                </div>
              </div>
            )}

            {/* ═══ OWN AGENT MODE: Step 2 — Configure Agent API ═══ */}
            {agentMode === "own" && currentStep === 2 && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div>
                  <h2 className="mb-1 text-foreground">{tr("Configure Agent API", "配置 Agent API")}</h2>
                  <p className="text-sm text-muted-foreground">
                    {tr("Generate an API key and paste the prompt into your AI agent to connect with Quandora.", "生成一个 API 密钥，并将提示词粘贴到你的 AI Agent 中以连接 Quandora。")}
                  </p>
                </div>

                {/* API Name */}
                <div className="space-y-3 p-4 rounded-2xl border border-border bg-accent">
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-normal text-muted-foreground whitespace-nowrap">{tr("API Name", "API 名称")}</label>
                    <Input
                      placeholder={tr("e.g., My Trading Bot, Research Agent...", "例如：我的交易机器人、研究 Agent...")}
                      value={apiName}
                      onChange={(e) => setApiName(e.target.value)}
                      className="rounded-lg bg-white dark:bg-slate-950 border-border h-8 text-sm"
                    />
                  </div>
                </div>

                {/* Prompt Preview */}
                {generatedApiKey && (
                  <div className="space-y-4 p-5 rounded-2xl border border-border bg-accent">
                    <p className="text-xs text-muted-foreground">{tr("Copy the prompt below and paste it into your AI agent (ChatGPT / Claude / DeepSeek).", "复制下方提示词并粘贴到你的 AI Agent（ChatGPT / Claude / DeepSeek）中。")}</p>
                    <div className="p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/50 max-h-64 overflow-y-auto">
                      <pre className="text-xs text-foreground/80 whitespace-pre-wrap font-mono leading-relaxed">
                        {buildGuidePrompt(generatedApiKey)}
                      </pre>
                    </div>
                    <div className="flex items-center justify-end">
                      <button
                        className="h-9 px-6 rounded-full text-sm font-medium transition-all duration-200 bg-primary text-primary-foreground hover:brightness-110 btn-bounce flex items-center gap-2"
                        onClick={() => {
                          navigator.clipboard.writeText(buildGuidePrompt(generatedApiKey));
                          toast.success(tr("Prompt copied to clipboard", "提示词已复制到剪贴板"));
                        }}
                      >
                        <Copy className="w-3.5 h-3.5" />
                        {tr("Copy Prompt", "复制提示词")}
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
                  <h2 className="mb-1 text-foreground">{tr("First Run", "首次运行")}</h2>
                  <p className="text-sm text-muted-foreground">
                    {tr("Try these example prompts in your AI coding agent to test the Quandora skill.", "在你的 AI 编码 Agent 中试用以下示例提示词，测试 Quandora 技能。")}
                  </p>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      category: tr("Alpha Creation", "因子创建"),
                      icon: FlaskConical,
                      prompt: tr(
                        "Create a BTC momentum alpha using RSI(14) and MACD crossover signals. Target market: BTC/USDT, lookback period: 30 days. Submit it to Quandora for backtesting.",
                        "创建一个 BTC 动量 Alpha 因子，使用 RSI(14) 与 MACD 金叉/死叉信号。目标市场：BTC/USDT，回看周期：30 天。提交到 Quandora 进行回测。"
                      ),
                      desc: tr("Tests the alpha creation and submission pipeline", "测试因子创建与提交流程"),
                    },
                    {
                      category: tr("Backtest Analysis", "回测分析"),
                      icon: BarChart3,
                      prompt: tr(
                        "Analyze my latest backtest results for alpha AF-001. Show me the Sharpe ratio, max drawdown, and return distribution. Suggest improvements if Sharpe < 1.5.",
                        "分析我最新的 Alpha 因子 AF-001 回测结果。展示夏普比率、最大回撤和收益分布。如果夏普比率低于 1.5，请给出改进建议。"
                      ),
                      desc: tr("Tests the backtest retrieval and analysis capabilities", "测试回测结果获取与分析能力"),
                    },
                    {
                      category: tr("Portfolio Optimization", "组合优化"),
                      icon: Trophy,
                      prompt: tr(
                        "Review my current alpha portfolio and suggest optimal weight allocation across my top 5 alphas to maximize risk-adjusted returns while keeping correlation below 0.3.",
                        "审查我当前的 Alpha 因子组合，并为排名前 5 的 Alpha 因子建议最优权重配置，在相关性低于 0.3 的前提下最大化风险调整后收益。"
                      ),
                      desc: tr("Tests multi-alpha portfolio optimization", "测试多因子组合优化能力"),
                    },
                  ].map((item) => (
                    <div key={item.category} className="p-5 rounded-2xl border border-border bg-accent hover:border-primary/30 transition-all duration-200 ease-in-out">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                        <div className="flex items-center gap-2">
                          <item.icon className="w-4 h-4 text-primary" />
                          <span className="text-xs font-semibold uppercase tracking-wider text-primary">{item.category}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      <div className="relative rounded-xl overflow-hidden bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/50">
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
                    </div>
                  ))}
                </div>

                <div className="flex items-start gap-2 p-3 rounded-2xl text-xs bg-primary/5 text-primary border border-primary/20">
                  <Zap className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{tr("Tip: You can modify these prompts or create your own. The skill supports natural language instructions for all Quandora platform operations.", "提示：你可以修改这些提示词，或自行编写新的提示词。该技能支持针对 Quandora 平台全部操作的自然语言指令。")}</span>
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
                {tr("Back", "返回")}
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
                    toast.success(tr("Welcome! Start mining alphas with AI.", "欢迎使用！现在就开始用 AI 挖掘因子。"));
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
                {currentStep === 1 && agentMode === "platform" ? tr("Enter", "进入") : tr("Next", "下一步")}
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={finishGuide}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:brightness-110 hover:-translate-y-0.5 transition-all duration-200 ease-in-out btn-bounce"
              >
                <Rocket className="w-4 h-4" />
                {tr("Launch Quandora", "启动 Quandora")}
              </button>
            )}
          </div>

          {/* Skip link */}
          <div className="text-center mt-6 pb-8">
            <button
              onClick={finishGuide}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-200 ease-in-out"
            >
              {tr("Skip setup and go to dashboard", "跳过设置并前往仪表盘")} →
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
