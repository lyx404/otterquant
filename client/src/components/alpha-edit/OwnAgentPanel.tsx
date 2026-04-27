import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Copy, Key, Rocket, Zap } from "lucide-react";
import { useAppLanguage } from "@/contexts/AppLanguageContext";
import { toast } from "sonner";

type OwnStep = "api" | "first-run";

const SKILL_LATEST = "v2.4.1";

const FIRST_RUN_PROMPTS = [
  {
    category: "Time Series Factor",
    prompt:
      "Create a time-series factor on BTCUSDT using funding-rate mean reversion and a volatility filter. Return signal logic, normalization method, failure cases, and expected execution profile.",
    desc: "Test single-symbol factor drafting flow.",
  },
  {
    category: "Cross Section Factor",
    prompt:
      "Create a cross-sectional factor for the top 50 liquid perpetuals. Combine momentum, funding pressure, and liquidity quality into a ranked signal with weighting logic and risk-aware constraints.",
    desc: "Test ranked multi-symbol factor drafting flow.",
  },
];

function generateApiKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = "ot_sk_";
  for (let i = 0; i < 32; i += 1) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

function buildGuidePrompt(key: string) {
  return `# Otter Factor Skill Configuration

## API Key
\`${key}\`

## Skill Version
${SKILL_LATEST}

## Setup Instructions
Paste this prompt into your AI agent (ChatGPT / Claude / DeepSeek) to connect factor generation with Otter.

The agent can:
- Draft and refine factor definitions
- Structure factor logic and normalization methods
- Prepare backtest-ready factor specifications
- Submit factors to My Factors / Official Library workflows`;
}

export default function OwnAgentPanel() {
  const { uiLang } = useAppLanguage();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState([
    { id: "1", name: "My Factor Bot", apiKey: "ot_sk_7x9kM2nP4qR8sT6uW3yA1bC5dE0fG2h", skillVersion: "v2.4.1", updatedAt: "2026-03-28" },
    { id: "2", name: "Factor Research Agent", apiKey: "ot_sk_hJ2kL4mN6pQ8rS0tU2vW4xY6zA8bC0dE", skillVersion: "v2.3.0", updatedAt: "2026-03-15" },
  ]);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);
  const [ownStep, setOwnStep] = useState<OwnStep>("api");
  const tr = (en: string, zh: string) => (uiLang === "zh" ? zh : en);

  const handleCreateApiKey = () => {
    const newKey = {
      id: String(Date.now()),
      name: `Factor Agent ${apiKeys.length + 1}`,
      apiKey: generateApiKey(),
      skillVersion: SKILL_LATEST,
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    setApiKeys((prev) => [...prev, newKey]);
    toast.success(tr("New API key created", "已创建新的 API key"));
  };

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyApiKey = (key: string, id: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(id);
    toast.success(tr("API key copied", "API key 已复制"));
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const copyPrompt = (apiKey: string, id: string) => {
    navigator.clipboard.writeText(buildGuidePrompt(apiKey));
    setCopiedPrompt(id);
    toast.success(tr("Prompt copied", "提示词已复制"));
    setTimeout(() => setCopiedPrompt(null), 2000);
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    toast.success(tr("Copied to clipboard", "已复制到剪贴板"));
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-1 w-fit rounded-2xl border border-border bg-accent p-1">
        <button
          onClick={() => setOwnStep("api")}
          className={`h-8 rounded-xl border px-4 text-xs font-medium transition-all duration-200 ease-in-out ${
            ownStep === "api"
              ? "bg-card text-foreground border-border shadow-sm"
              : "text-muted-foreground border-transparent hover:text-foreground"
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5" />
                {tr("Agent API & Skill", "Agent API 与 Skill")}
          </div>
        </button>
        <button
          onClick={() => setOwnStep("first-run")}
          className={`h-8 rounded-xl border px-4 text-xs font-medium transition-all duration-200 ease-in-out ${
            ownStep === "first-run"
              ? "bg-card text-foreground border-border shadow-sm"
              : "text-muted-foreground border-transparent hover:text-foreground"
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Rocket className="w-3.5 h-3.5" />
                {tr("First Run", "首次运行")}
          </div>
        </button>
      </div>

      {ownStep === "api" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="border-b border-border px-6 py-4 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-primary" />
                  <span className="text-base font-semibold text-foreground">{tr("Agent API", "Agent API")}</span>
                  <span className="ml-1 text-xs text-muted-foreground">({apiKeys.length})</span>
                </div>
                <button
                  className="flex h-8 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-medium text-primary-foreground transition-all duration-200 ease-in-out hover:brightness-110"
                  onClick={handleCreateApiKey}
                >
                  <Zap className="w-3.5 h-3.5" />
                      {tr("New API Key", "新建 API Key")}
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-3">
                {apiKeys.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-border bg-accent/50 p-4 transition-colors duration-200 hover:border-primary/20"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="truncate text-sm font-semibold text-foreground">{item.name}</span>
                      <button
                        onClick={() => copyPrompt(item.apiKey, item.id)}
                        className={`flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs transition-all duration-200 ease-in-out ${
                          item.skillVersion !== SKILL_LATEST
                            ? "border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
                            : "border-primary/20 text-primary hover:bg-primary/10"
                        }`}
                      >
                        {copiedPrompt === item.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedPrompt === item.id ? tr("Copied", "已复制") : item.skillVersion !== SKILL_LATEST ? tr("Copy Latest Prompt", "复制最新提示词") : tr("Copy Prompt", "复制提示词")}
                      </button>
                    </div>

                    <div className="mb-2 flex items-center gap-2">
                      <span className="w-14 shrink-0 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{tr("API Key", "API Key")}</span>
                      <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-border/60 bg-background/60 px-2.5 py-1">
                        <code className="flex-1 truncate font-mono text-xs text-primary">
                          {visibleKeys.has(item.id) ? item.apiKey : item.apiKey.slice(0, 6) + "\u2022".repeat(16) + "..."}
                        </code>
                        <button
                          onClick={() => toggleKeyVisibility(item.id)}
                          aria-label={visibleKeys.has(item.id) ? `Hide API key for ${item.name}` : `Show API key for ${item.name}`}
                          className="shrink-0 p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {visibleKeys.has(item.id) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={() => copyApiKey(item.apiKey, item.id)}
                          aria-label={`Copy API key for ${item.name}`}
                          className="shrink-0 p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {copiedKey === item.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="font-medium uppercase tracking-wider">{tr("Skill", "Skill")}</span>
                        <span className="font-semibold text-primary">{item.skillVersion}</span>
                        {item.skillVersion !== SKILL_LATEST && (
                          <span className="ml-0.5 text-amber-500">{tr(`(update available: ${SKILL_LATEST})`, `（可更新：${SKILL_LATEST}）`)}</span>
                        )}
                      </span>
                      <span className="border-l border-border pl-4">{tr("Updated", "更新于")} {item.updatedAt}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {ownStep === "first-run" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
            <div>
                  <h2 className="mb-1 text-base font-semibold text-foreground">{tr("First Run", "首次运行")}</h2>
                  <p className="text-xs text-muted-foreground">
                    {tr("Try these example prompts in your AI coding agent to test the Otter factor skill.", "在你的 AI 编码 Agent 中试用以下示例提示词，测试 Otter 因子技能。")}
                  </p>
            </div>

            <div className="space-y-4">
              {FIRST_RUN_PROMPTS.map((item) => (
                <div key={item.category} className="rounded-xl border border-border bg-accent p-5 transition-all duration-200 ease-in-out hover:border-primary/30">
                  <div className="mb-3 flex items-center gap-2">
                    <Rocket className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary">{item.category}</span>
                  </div>
                  <div className="relative mb-3 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700/50 dark:bg-slate-950">
                    <pre className="overflow-x-auto whitespace-pre-wrap p-4 pr-12 font-mono text-xs leading-relaxed text-slate-800 dark:text-slate-100">
                      {item.prompt}
                    </pre>
                    <button
                      onClick={() => copyCode(item.prompt, item.category)}
                      aria-label={`Copy ${item.category} example prompt`}
                      className={`absolute top-2.5 right-2.5 rounded-lg border p-1.5 transition-all duration-200 ease-in-out ${
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
          </div>
        </div>
      )}
    </div>
  );
}
