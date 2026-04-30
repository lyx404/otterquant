import { Suspense, lazy, useEffect, useId, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Bot, Check, Code2, Play, Pause, RefreshCw, Trash2, ChevronDown, ChevronUp, X, Sparkles, Undo2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAppLanguage } from "@/contexts/AppLanguageContext";
import AlphaDetail from "@/pages/AlphaDetail";
import { factors as detailFactors } from "@/lib/mockData";
import { useTheme } from "@/contexts/ThemeContext";

type AgentMode = "platform" | "own";
type StrategyType = "time-series" | "cross-sectional";
type ModelKey =
  | "chatgpt-5-5"
  | "chatgpt-5-4"
  | "chatgpt-5-3"
  | "claude-opus-4-6"
  | "claude-sonnet-4-6"
  | "gemini-3-1-pro"
  | "deepseek-v3-2";
type GenerationStatus = "generating" | "paused" | "complete";

const OwnAgentPanel = lazy(() => import("@/components/alpha-edit/OwnAgentPanel"));

type RoundResult = {
  id: string;
  factorName: string;
  factorId: string;
  model: string;
  fitness: number;
  returns: number;
  drawdown: number;
  pnlSeries: number[];
};

type GenerationRound = {
  id: string;
  createdAt: string;
  status: GenerationStatus;
  strategyType: StrategyType;
  prompt: string;
  models: ModelKey[];
  resultCount: number;
  estimatedCredit: number;
  results: RoundResult[];
};

const CREDIT_BALANCE_STORAGE_KEY = "otterquant:credit-balance";
const DEFAULT_CREDIT_BALANCE = 3;
const CREDIT_DISPLAY_RATE = 1000;

function readCreditBalance() {
  if (typeof window === "undefined") return DEFAULT_CREDIT_BALANCE;
  const raw = window.localStorage.getItem(CREDIT_BALANCE_STORAGE_KEY);
  const parsed = raw ? Number(raw) : DEFAULT_CREDIT_BALANCE;
  return Number.isFinite(parsed) ? parsed : DEFAULT_CREDIT_BALANCE;
}

function writeCreditBalance(value: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CREDIT_BALANCE_STORAGE_KEY, value.toFixed(2));
}

function formatCreditUnits(value: number) {
  return new Intl.NumberFormat("en-US").format(Math.round((Number(value) || 0) * CREDIT_DISPLAY_RATE));
}

const MODEL_OPTIONS: Array<{
  value: ModelKey;
  label: string;
  unitCost: number;
  provider: string;
  description: string;
  descriptionZh: string;
  latency: string;
  brand: "openai" | "claude" | "gemini" | "deepseek";
}> = [
  {
    value: "chatgpt-5-5",
    label: "ChatGPT 5.5",
    unitCost: 0.42,
    provider: "OpenAI",
    description: "Flagship reasoning model for complex factor exploration.",
    descriptionZh: "适合复杂因子探索的旗舰推理模型。",
    latency: "35s",
    brand: "openai",
  },
  {
    value: "chatgpt-5-4",
    label: "ChatGPT 5.4",
    unitCost: 0.32,
    provider: "OpenAI",
    description: "Balanced model for most factor generation workflows.",
    descriptionZh: "适合大多数因子生成流程的均衡模型。",
    latency: "28s",
    brand: "openai",
  },
  {
    value: "chatgpt-5-3",
    label: "ChatGPT 5.3",
    unitCost: 0.24,
    provider: "OpenAI",
    description: "Lightweight option for fast iteration and broad sampling.",
    descriptionZh: "适合快速迭代和批量初筛的轻量模型。",
    latency: "22s",
    brand: "openai",
  },
  {
    value: "claude-opus-4-6",
    label: "Claude Opus 4.6",
    unitCost: 0.46,
    provider: "Anthropic",
    description: "Strong long-chain reasoning for structured research tasks.",
    descriptionZh: "适合结构化研究任务的长链推理模型。",
    latency: "40s",
    brand: "claude",
  },
  {
    value: "claude-sonnet-4-6",
    label: "Claude Sonnet 4.6",
    unitCost: 0.34,
    provider: "Anthropic",
    description: "Balanced speed and quality for frequent factor iteration.",
    descriptionZh: "在速度和质量之间均衡，适合高频因子迭代。",
    latency: "30s",
    brand: "claude",
  },
  {
    value: "gemini-3-1-pro",
    label: "Gemini 3.1 Pro",
    unitCost: 0.36,
    provider: "Google",
    description: "Research-oriented model with strong multimodal context handling.",
    descriptionZh: "偏研究型模型，具备较强的多模态上下文处理能力。",
    latency: "26s",
    brand: "gemini",
  },
  {
    value: "deepseek-v3-2",
    label: "Deepseek V3.2",
    unitCost: 0.22,
    provider: "DeepSeek",
    description: "Low-cost, high-throughput option for large initial sweeps.",
    descriptionZh: "低成本、高吞吐，适合大规模初始筛选。",
    latency: "18s",
    brand: "deepseek",
  },
];

const TIME_SERIES_FACTOR_NAMES = [
  "Funding Rate Mean Rev",
  "Volatility Breakout Pulse",
  "Cross-Exchange Spread Edge",
  "Momentum Regime Switch",
  "Liquidity Drift Capture",
  "Trend Persistence Signal",
  "Market Microstructure Imbalance",
  "Orderflow Momentum Core",
  "Mean-Reversion Velocity",
  "Drawdown Recovery Timing",
];

const CROSS_SECTION_FACTOR_NAMES = [
  "Relative Strength Rotation",
  "Cross-Asset Quality Rank",
  "Funding Pressure Basket",
  "Liquidity-Weighted Momentum",
  "Multi-Symbol Spread Ranking",
  "Factor Neutral Selection",
  "Tail Risk Dispersion",
  "Ranking Stability Filter",
  "Correlation-Aware Selection",
  "Volatility-Adjusted Alpha Rank",
];

function formatStrategyLabel(value: StrategyType) {
  return value === "time-series" ? "Time-Series" : "Cross-Sectional";
}

function formatMinutesAgo(timestamp: string, uiLang: "en" | "zh") {
  const delta = Math.max(1, Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000));
  if (uiLang === "zh") return `${delta} 分钟前`;
  return `${delta} minute${delta === 1 ? "" : "s"} ago`;
}

function buildPnlSeries(seed: number) {
  let value = 100;
  const points: number[] = [];
  for (let i = 0; i < 18; i++) {
    const drift = Math.sin((i + 1 + seed) / 2.7) * 1.35 + 0.6;
    const noise = (Math.cos((i + seed) * 1.7) + 1) * 0.35;
    value = Math.max(70, value + drift - noise);
    points.push(Number(value.toFixed(2)));
  }
  return points;
}

function buildFactorName(strategyType: StrategyType, index: number) {
  const bank = strategyType === "time-series" ? TIME_SERIES_FACTOR_NAMES : CROSS_SECTION_FACTOR_NAMES;
  return bank[index % bank.length];
}

function optimizePromptText(value: string, strategyType: StrategyType) {
  const base = value.trim();
  const scope =
    strategyType === "time-series"
      ? "time-series factor for perpetual futures"
      : "cross-sectional factor for multi-symbol ranking";

  return [
    `Generate a robust ${scope} based on: ${base}`,
    "Focus on clear signal logic, stable market intuition, risk-aware filtering, and deployable parameter ranges.",
    "Return concise factor definitions with expected behavior, required inputs, normalization method, and failure conditions.",
  ].join("\n");
}

function getModelOption(model: ModelKey) {
  return MODEL_OPTIONS.find((item) => item.value === model) ?? MODEL_OPTIONS[0];
}

function formatModelSummary(models: ModelKey[]) {
  if (models.length === 1) return getModelOption(models[0]).label;
  return `${models.length} models`;
}

function orderModels(models: ModelKey[]) {
  return MODEL_OPTIONS.filter((item) => models.includes(item.value)).map((item) => item.value);
}

function CreditIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden="true">
      <path
        d="M28 12C30.6 23.4 35.6 28.4 47 31C35.6 33.6 30.6 38.6 28 50C25.4 38.6 20.4 33.6 9 31C20.4 28.4 25.4 23.4 28 12Z"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M50 7C51.1 11.6 53.4 13.9 58 15C53.4 16.1 51.1 18.4 50 23C48.9 18.4 46.6 16.1 42 15C46.6 13.9 48.9 11.6 50 7Z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ModelLogo({ model }: { model: ModelKey }) {
  const option = getModelOption(model);
  const svgId = useId().replace(/:/g, "");

  if (option.brand === "openai") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-foreground" fill="currentColor" fillRule="evenodd" aria-hidden="true">
        <path d="M9.205 8.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357 1.356-.523 2.117-.523 2.854 0 4.662 2.212 4.662 4.566 0 .167 0 .357-.024.547l-4.71-2.759a.797.797 0 00-.856 0l-5.97 3.473zm10.609 8.8V12.06c0-.333-.143-.57-.429-.737l-5.97-3.473 1.95-1.118a.433.433 0 01.476 0l4.543 2.617c1.309.76 2.189 2.378 2.189 3.948 0 1.808-1.07 3.473-2.76 4.163zM7.802 12.703l-1.95-1.142c-.167-.095-.239-.238-.239-.428V5.899c0-2.545 1.95-4.472 4.591-4.472 1 0 1.927.333 2.712.928L8.23 5.067c-.285.166-.428.404-.428.737v6.898zM12 15.128l-2.795-1.57v-3.33L12 8.658l2.795 1.57v3.33L12 15.128zm1.796 7.23c-1 0-1.927-.332-2.712-.927l4.686-2.712c.285-.166.428-.404.428-.737v-6.898l1.974 1.142c.167.095.238.238.238.428v5.233c0 2.545-1.974 4.472-4.614 4.472zm-5.637-5.303l-4.544-2.617c-1.308-.761-2.188-2.378-2.188-3.948A4.482 4.482 0 014.21 6.327v5.423c0 .333.143.571.428.738l5.947 3.449-1.95 1.118a.432.432 0 01-.476 0zm-.262 3.9c-2.688 0-4.662-2.021-4.662-4.519 0-.19.024-.38.047-.57l4.686 2.71c.286.167.571.167.856 0l5.97-3.448v2.26c0 .19-.07.333-.237.428l-4.543 2.616c-.619.357-1.356.523-2.117.523zm5.899 2.83a5.947 5.947 0 005.827-4.756C22.287 18.339 24 15.84 24 13.296c0-1.665-.713-3.282-1.998-4.448.119-.5.19-.999.19-1.498 0-3.401-2.759-5.947-5.946-5.947-.642 0-1.26.095-1.88.31A5.962 5.962 0 0010.205 0a5.947 5.947 0 00-5.827 4.757C1.713 5.447 0 7.945 0 10.49c0 1.666.713 3.283 1.998 4.448-.119.5-.19 1-.19 1.499 0 3.401 2.759 5.946 5.946 5.946.642 0 1.26-.095 1.88-.309a5.96 5.96 0 004.162 1.713z" />
      </svg>
    );
  }

  if (option.brand === "claude") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#D97757" aria-hidden="true">
        <path d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z" />
      </svg>
    );
  }

  if (option.brand === "gemini") {
    return (
      <svg viewBox="0 0 296 298" className="h-5 w-5" fill="none" aria-hidden="true">
        <mask id={`${svgId}-gemini-mask`} width="296" height="298" x="0" y="0" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }}>
          <path fill="#3186FF" d="M141.201 4.886c2.282-6.17 11.042-6.071 13.184.148l5.985 17.37a184.004 184.004 0 0 0 111.257 113.049l19.304 6.997c6.143 2.227 6.156 10.91.02 13.155l-19.35 7.082a184.001 184.001 0 0 0-109.495 109.385l-7.573 20.629c-2.241 6.105-10.869 6.121-13.133.025l-7.908-21.296a184 184 0 0 0-109.02-108.658l-19.698-7.239c-6.102-2.243-6.118-10.867-.025-13.132l20.083-7.467A183.998 183.998 0 0 0 133.291 26.28l7.91-21.394Z" />
        </mask>
        <g mask={`url(#${svgId}-gemini-mask)`}>
          <g filter={`url(#${svgId}-gemini-b)`}>
            <ellipse cx="163" cy="149" fill="#3689FF" rx="196" ry="159" />
          </g>
          <g filter={`url(#${svgId}-gemini-c)`}>
            <ellipse cx="33.5" cy="142.5" fill="#F6C013" rx="68.5" ry="72.5" />
          </g>
          <g filter={`url(#${svgId}-gemini-d)`}>
            <ellipse cx="19.5" cy="148.5" fill="#F6C013" rx="68.5" ry="72.5" />
          </g>
          <g filter={`url(#${svgId}-gemini-e)`}>
            <path fill="#FA4340" d="M194 10.5C172 82.5 65.5 134.333 22.5 135L144-66l50 76.5Z" />
          </g>
          <g filter={`url(#${svgId}-gemini-f)`}>
            <path fill="#FA4340" d="M190.5-12.5C168.5 59.5 62 111.333 19 112L140.5-89l50 76.5Z" />
          </g>
          <g filter={`url(#${svgId}-gemini-g)`}>
            <path fill="#14BB69" d="M194.5 279.5C172.5 207.5 66 155.667 23 155l121.5 201 50-76.5Z" />
          </g>
          <g filter={`url(#${svgId}-gemini-h)`}>
            <path fill="#14BB69" d="M196.5 320.5C174.5 248.5 68 196.667 25 196l121.5 201 50-76.5Z" />
          </g>
        </g>
        <defs>
          <filter id={`${svgId}-gemini-b`} width="464" height="390" x="-69" y="-46" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
            <feGaussianBlur result="effect1_foregroundBlur_69_17998" stdDeviation="18" />
          </filter>
          <filter id={`${svgId}-gemini-c`} width="265" height="273" x="-99" y="6" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
            <feGaussianBlur result="effect1_foregroundBlur_69_17998" stdDeviation="32" />
          </filter>
          <filter id={`${svgId}-gemini-d`} width="265" height="273" x="-113" y="12" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
            <feGaussianBlur result="effect1_foregroundBlur_69_17998" stdDeviation="32" />
          </filter>
          <filter id={`${svgId}-gemini-e`} width="299.5" height="329" x="-41.5" y="-130" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
            <feGaussianBlur result="effect1_foregroundBlur_69_17998" stdDeviation="32" />
          </filter>
          <filter id={`${svgId}-gemini-f`} width="299.5" height="329" x="-45" y="-153" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
            <feGaussianBlur result="effect1_foregroundBlur_69_17998" stdDeviation="32" />
          </filter>
          <filter id={`${svgId}-gemini-g`} width="299.5" height="329" x="-41" y="91" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
            <feGaussianBlur result="effect1_foregroundBlur_69_17998" stdDeviation="32" />
          </filter>
          <filter id={`${svgId}-gemini-h`} width="299.5" height="329" x="-39" y="132" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
            <feGaussianBlur result="effect1_foregroundBlur_69_17998" stdDeviation="32" />
          </filter>
        </defs>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="#4D6BFE" d="M23.748 4.482c-.254-.124-.364.113-.512.234-.051.039-.094.09-.137.136-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.156-.708-.311-.955-.65-.172-.241-.219-.51-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.093.172.187.129.323-.082.28-.18.552-.266.833-.055.179-.137.217-.329.14a5.526 5.526 0 0 1-1.736-1.18c-.857-.828-1.631-1.742-2.597-2.458a11.365 11.365 0 0 0-.689-.471c-.985-.957.13-1.743.388-1.836.27-.098.093-.432-.779-.428-.872.004-1.67.295-2.687.684a3.055 3.055 0 0 1-.465.137 9.597 9.597 0 0 0-2.883-.102c-1.885.21-3.39 1.102-4.497 2.623C.082 8.606-.231 10.684.152 12.85c.403 2.284 1.569 4.175 3.36 5.653 1.858 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.133-.284 4.994-1.86.47.234.962.327 1.78.397.63.059 1.236-.03 1.705-.128.735-.156.684-.837.419-.961-2.155-1.004-1.682-.595-2.113-.926 1.096-1.296 2.746-2.642 3.392-7.003.05-.347.007-.565 0-.845-.004-.17.035-.237.23-.256a4.173 4.173 0 0 0 1.545-.475c1.396-.763 1.96-2.015 2.093-3.517.02-.23-.004-.467-.247-.588zM11.581 18c-2.089-1.642-3.102-2.183-3.52-2.16-.392.024-.321.471-.235.763.09.288.207.486.371.739.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.167-1.361-.802-2.5-1.86-3.301-3.307-.774-1.393-1.224-2.887-1.298-4.482-.02-.386.093-.522.477-.592a4.696 4.696 0 0 1 1.529-.039c2.132.312 3.946 1.265 5.468 2.774.868.86 1.525 1.887 2.202 2.891.72 1.066 1.494 2.082 2.48 2.914.348.292.625.514.891.677-.802.09-2.14.11-3.054-.614zm1-6.44a.306.306 0 0 1 .415-.287.302.302 0 0 1 .2.288.306.306 0 0 1-.31.307.303.303 0 0 1-.304-.308zm3.11 1.596c-.2.081-.399.151-.59.16a1.245 1.245 0 0 1-.798-.254c-.274-.23-.47-.358-.552-.758a1.73 1.73 0 0 1 .016-.588c.07-.327-.008-.537-.239-.727-.187-.156-.426-.199-.688-.199a.559.559 0 0 1-.254-.078.253.253 0 0 1-.114-.358c.028-.054.16-.186.192-.21.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.391.451.462.576.685.914.176.265.336.537.445.848.067.195-.019.354-.25.452z" />
    </svg>
  );
}

function Sparkline({ data }: { data: number[] }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const gradientId = useId().replace(/:/g, "");
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1 || 1)) * 100;
    const y = 84 - ((value - min) / range) * 68;
    return { x, y };
  });
  const allPoints = points.map(({ x, y }) => `${x},${y}`).join(" ");
  const testStartIndex = Math.max(1, data.length - Math.max(4, Math.round(data.length * 0.28)));
  const trainPoints = points.slice(0, testStartIndex + 1).map(({ x, y }) => `${x},${y}`).join(" ");
  const testPoints = points.slice(testStartIndex).map(({ x, y }) => `${x},${y}`).join(" ");
  const lastPoint = points[points.length - 1];
  const trainColor = isDark ? "#818CF8" : "#4F46E5";
  const testColor = isDark ? "#34D399" : "#10B981";
  const areaBaseY = 90;

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
      <defs>
        <linearGradient id={`${gradientId}-pnl-fill`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={isDark ? "rgba(129,140,248,0.32)" : "rgba(79,70,229,0.26)"} />
          <stop offset="68%" stopColor={isDark ? "rgba(52,211,153,0.12)" : "rgba(16,185,129,0.08)"} />
          <stop offset="100%" stopColor="rgba(15,23,42,0.02)" />
        </linearGradient>
      </defs>
      <polyline
        fill={`url(#${gradientId}-pnl-fill)`}
        stroke="none"
        points={`${allPoints} 100,${areaBaseY} 0,${areaBaseY}`}
      />
      <polyline
        fill="none"
        stroke={trainColor}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={trainPoints}
      />
      <polyline
        fill="none"
        stroke={testColor}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={testPoints}
      />
      <circle cx={lastPoint.x} cy={lastPoint.y} r="2.3" fill={testColor} />
    </svg>
  );
}

function ResultCard({
  result,
  onSelect,
  className = "",
  active = false,
  status = "complete",
}: {
  result: RoundResult;
  onSelect?: () => void;
  className?: string;
  active?: boolean;
  status?: GenerationStatus;
}) {
  const { uiLang } = useAppLanguage();
  const tr = (en: string, zh: string) => (uiLang === "zh" ? zh : en);
  const isGenerating = status === "generating";
  const clickable = Boolean(onSelect) && !isGenerating;
  const detailFactor = detailFactors.find((item) => item.id === result.factorId);
  const isPassed = detailFactor?.status === "active" || detailFactor?.status === "testing";

  return (
    <article
      className={`surface-card relative flex h-full min-w-0 flex-col gap-0 overflow-hidden rounded-2xl border border-border px-[8px] py-[12px] ${
        clickable ? "cursor-pointer transition hover:border-primary/35 hover:bg-primary/5" : ""
      } ${active ? "border-primary/45 ring-1 ring-primary/35" : ""} ${className}`}
      onClick={clickable ? onSelect : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect?.();
              }
            }
          : undefined
      }
    >
      {isGenerating ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/70 backdrop-blur-[1px]">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
            {tr("Generating", "生成中")}
            </span>
          </div>
        ) : null}

      <div className="mb-3 min-w-0">
        <p className="line-clamp-2 break-words pl-2 text-[12px] font-semibold leading-[1.25] tracking-[-0.01em] text-foreground">
          {result.factorName}
        </p>
      </div>

      <div className="flex flex-none flex-col rounded-[1.1rem] border border-border/70 bg-[linear-gradient(180deg,rgba(99,102,241,0.08),rgba(15,23,42,0.02))] px-3 py-3">
        <div className="mb-2 flex items-center gap-2">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/90">{tr("PnL Curve", "盈亏曲线")}</p>
        </div>
        <div className="aspect-video w-full min-h-0">
          <Sparkline data={result.pnlSeries} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-[6px] text-[12px]">
        <div className="min-w-0 rounded-xl border border-border/50 bg-accent/55 px-2.5 py-2.5">
          <p className="text-[10px] font-medium uppercase leading-[10px] tracking-[0.08em] text-muted-foreground/85">{tr("Fitness", "适应度")}</p>
          <p className="mt-2 truncate font-mono text-[12px] font-semibold leading-none tabular-nums text-foreground">
            {result.fitness.toFixed(2)}
          </p>
        </div>
        <div className="min-w-0 rounded-xl border border-border/50 bg-accent/55 px-2.5 py-2.5">
          <p className="text-[10px] font-medium uppercase leading-[10px] tracking-[0.08em] text-muted-foreground/85">{tr("Returns", "收益率")}</p>
          <p className="mt-2 truncate font-mono text-[12px] font-semibold leading-none tabular-nums text-emerald-400">
            +{result.returns.toFixed(1)}%
          </p>
        </div>
        <div className="min-w-0 rounded-xl border border-border/50 bg-accent/55 px-2.5 py-2.5">
          <p className="text-[10px] font-medium uppercase leading-[10px] tracking-[0.08em] text-muted-foreground/85">{tr("Drawdown", "回撤")}</p>
          <p className="mt-2 truncate font-mono text-[12px] font-semibold leading-none tabular-nums text-rose-400">
            -{result.drawdown.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="mt-auto flex items-center gap-2 pt-2">
        <span
          className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-mono tracking-[0.15em] ${
            isPassed
              ? "border-success/20 bg-success/10 text-success"
              : "border-destructive/20 bg-destructive/10 text-destructive"
          }`}
        >
          {isPassed ? tr("PASSED", "已通过") : tr("FAILED", "未通过")}
        </span>
        <span className="max-w-full truncate rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          {result.model}
        </span>
      </div>
    </article>
  );
}

function buildRound(input: {
  strategyType: StrategyType;
  prompt: string;
  models: ModelKey[];
  resultCount: number;
  estimatedCredit: number;
  status?: GenerationStatus;
}) {
  const totalResultCount = input.resultCount * input.models.length;
  const results: RoundResult[] = Array.from({ length: totalResultCount }).map((_, index) => {
    const seed = Date.now() + index;
    const modelKey = input.models[Math.floor(index / input.resultCount)] ?? input.models[0];
    const modelLabel = getModelOption(modelKey).label;
    const pnlSeries = buildPnlSeries(seed % 17);
    const fitness = Number((1.2 + (index + 1) * 0.18).toFixed(2));
    const returns = Number((8 + index * 3.4 + (seed % 9) * 0.3).toFixed(2));
    const drawdown = Number((4.2 + index * 1.1 + (seed % 5) * 0.5).toFixed(2));

    return {
      id: `${seed}-${index}`,
      factorName: buildFactorName(input.strategyType, index),
      factorId: detailFactors[(seed + index) % detailFactors.length]?.id ?? detailFactors[0].id,
      model: modelLabel,
      fitness,
      returns,
      drawdown,
      pnlSeries,
    };
  });

  return {
    id: String(Date.now()),
    createdAt: new Date().toISOString(),
    status: input.status ?? "complete",
    strategyType: input.strategyType,
    prompt: input.prompt,
    models: input.models,
    resultCount: totalResultCount,
    estimatedCredit: input.estimatedCredit,
    results,
  } satisfies GenerationRound;
}

export default function AlphaEdit() {
  const { uiLang } = useAppLanguage();
  const latestRoundRef = useRef<HTMLElement | null>(null);
  const generationTimerRef = useRef<number | null>(null);
  const [mode, setMode] = useState<AgentMode>("platform");
  const [composerCollapsed, setComposerCollapsed] = useState(false);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [resultCountMenuOpen, setResultCountMenuOpen] = useState(false);
  const [selectedFactorId, setSelectedFactorId] = useState<string | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<RoundResult | null>(null);
  const [pendingDeleteRoundId, setPendingDeleteRoundId] = useState<string | null>(null);
  const [showInsufficientCreditDialog, setShowInsufficientCreditDialog] = useState(false);
  const [availableCredit, setAvailableCredit] = useState(() => readCreditBalance());
  const [activeGeneratingRoundId, setActiveGeneratingRoundId] = useState<string | null>(null);
  const [latestRoundId, setLatestRoundId] = useState<string | null>(null);

  const [strategyType, setStrategyType] = useState<StrategyType>("time-series");
  const [prompt, setPrompt] = useState("");
  const [promptBeforeOptimization, setPromptBeforeOptimization] = useState<string | null>(null);
  const [selectedModels, setSelectedModels] = useState<ModelKey[]>(["chatgpt-5-4"]);
  const [resultCount, setResultCount] = useState(4);
  const [rounds, setRounds] = useState<GenerationRound[]>([
    buildRound({
      strategyType: "time-series",
      prompt: "Generate robust mean-reversion factors for BTC perpetual futures.",
      models: ["chatgpt-5-4"],
      resultCount: 3,
      estimatedCredit: 0.96,
    }),
  ]);

  const estimatedCredit = useMemo(() => {
    const modelCost = selectedModels.reduce((sum, item) => sum + getModelOption(item).unitCost, 0);
    const promptCost = prompt.trim().length > 0 ? Math.min(0.22, prompt.trim().length * 0.0015) : 0;
    return Number((modelCost * resultCount + promptCost).toFixed(2));
  }, [prompt, resultCount, selectedModels]);

  const totalResultCount = resultCount * selectedModels.length;
  const selectedModelSummary = useMemo(() => formatModelSummary(selectedModels), [selectedModels]);
  const selectedLogoModels = useMemo(() => {
    const seenBrands = new Set<string>();
    return selectedModels.filter((item) => {
      const brand = getModelOption(item).brand;
      if (seenBrands.has(brand)) return false;
      seenBrands.add(brand);
      return true;
    });
  }, [selectedModels]);

  const promptOptimized = promptBeforeOptimization !== null;
  const tr = (en: string, zh: string) => (uiLang === "zh" ? zh : en);

  const optimizePrompt = () => {
    if (!prompt.trim()) return;
    setPromptBeforeOptimization(prompt);
    setPrompt(optimizePromptText(prompt, strategyType));
  };

  const undoPromptOptimization = () => {
    if (promptBeforeOptimization === null) return;
    setPrompt(promptBeforeOptimization);
    setPromptBeforeOptimization(null);
  };

  const finishGeneration = (roundId: string) => {
    setRounds((prev) => prev.map((round) => (round.id === roundId ? { ...round, status: "complete" } : round)));
    setActiveGeneratingRoundId((current) => (current === roundId ? null : current));
    generationTimerRef.current = null;
  };

  const pauseGeneration = () => {
    if (!activeGeneratingRoundId) return;
    if (generationTimerRef.current) {
      window.clearTimeout(generationTimerRef.current);
      generationTimerRef.current = null;
    }
    setRounds((prev) =>
      prev.map((round) => (round.id === activeGeneratingRoundId ? { ...round, status: "paused" } : round)),
    );
    setActiveGeneratingRoundId(null);
  };

  const runGeneration = () => {
    if (activeGeneratingRoundId) {
      pauseGeneration();
      return;
    }

    if (availableCredit < estimatedCredit) {
      setShowInsufficientCreditDialog(true);
      return;
    }

    const nextRound = buildRound({
      strategyType,
      prompt,
      models: selectedModels,
      resultCount,
      estimatedCredit,
      status: "generating",
    });
    const nextCreditBalance = Number((availableCredit - estimatedCredit).toFixed(2));
    setAvailableCredit(nextCreditBalance);
    writeCreditBalance(nextCreditBalance);
    setRounds((prev) => [nextRound, ...prev]);
    setActiveGeneratingRoundId(nextRound.id);
    setLatestRoundId(nextRound.id);

    if (generationTimerRef.current) window.clearTimeout(generationTimerRef.current);
    generationTimerRef.current = window.setTimeout(() => finishGeneration(nextRound.id), 2400);
  };

  const refillComposerFromRound = (round: GenerationRound) => {
    const perModelResultCount = Math.max(1, Math.round(round.resultCount / Math.max(round.models.length, 1)));
    setStrategyType(round.strategyType);
    setPrompt(round.prompt);
    setPromptBeforeOptimization(null);
    setSelectedModels(orderModels(round.models));
    setResultCount(perModelResultCount);
    setComposerCollapsed(false);
    setModelMenuOpen(false);
    setResultCountMenuOpen(false);
  };

  const toggleModelSelection = (nextModel: ModelKey) => {
    setSelectedModels((prev) => {
      if (prev.includes(nextModel)) {
        return prev.length === 1 ? prev : prev.filter((item) => item !== nextModel);
      }

      return orderModels([...prev, nextModel]);
    });
  };

  const confirmDeleteRound = () => {
    if (!pendingDeleteRoundId) return;
    if (pendingDeleteRoundId === activeGeneratingRoundId) {
      if (generationTimerRef.current) {
        window.clearTimeout(generationTimerRef.current);
        generationTimerRef.current = null;
      }
      setActiveGeneratingRoundId(null);
    }
    setRounds((prev) => prev.filter((round) => round.id !== pendingDeleteRoundId));
    setPendingDeleteRoundId(null);
  };

  useEffect(() => {
    return () => {
      if (generationTimerRef.current) window.clearTimeout(generationTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!latestRoundId) return;
    const frame = window.requestAnimationFrame(() => {
      latestRoundRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [latestRoundId, rounds.length]);

  useEffect(() => {
    if (!selectedFactorId) return;
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedFactorId(null);
        setSelectedPreview(null);
      }
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [selectedFactorId]);

  useEffect(() => {
    if (!selectedFactorId) return;

    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyOverscroll = document.body.style.overscrollBehavior;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevHtmlOverscroll = document.documentElement.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.overscrollBehavior = prevBodyOverscroll;
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.documentElement.style.overscrollBehavior = prevHtmlOverscroll;
    };
  }, [selectedFactorId]);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-6.5rem)] max-w-[1180px] flex-col gap-5">
      <div className="space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/alphas">
              <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
              </button>
            </Link>
            <div>
              <h1
                className="text-[20px] font-semibold leading-none tracking-[-0.02em] text-foreground"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {tr("Create New Factor", "创建新因子")}
              </h1>
              <p
                className="mt-1 text-[12px] leading-[1.4] text-muted-foreground"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {tr("Choose a workflow for factor generation", "选择因子生成方式")}
              </p>
            </div>
          </div>

          <div className="inline-flex self-auto h-10 items-center justify-start rounded-[50px] border border-border bg-card p-0">
            <button
              onClick={() => setMode("platform")}
              className={`inline-flex h-10 items-center gap-2 rounded-[50px] px-4 text-[12px] font-semibold transition ${
                mode === "platform"
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Bot className="h-4 w-4" />
              {tr("Platform Agent", "平台 Agent")}
              {mode === "platform" ? <Check className="h-4 w-4" /> : null}
            </button>

            <button
              onClick={() => setMode("own")}
              className={`inline-flex h-10 items-center gap-2 rounded-[50px] px-4 text-[12px] font-semibold transition ${
                mode === "own"
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Code2 className="h-4 w-4" />
              {tr("Your Own Agent", "自有 Agent")}
              {mode === "own" ? <Check className="h-4 w-4" /> : null}
            </button>
          </div>
        </div>
      </div>

      {mode === "own" ? (
        <Suspense
          fallback={
            <div className="surface-card flex min-h-[240px] items-center justify-center rounded-3xl border border-border p-10 text-center">
              <p className="text-sm text-muted-foreground">{tr("Loading own-agent workspace...", "正在加载自有 Agent 工作区...")}</p>
            </div>
          }
        >
          <OwnAgentPanel />
        </Suspense>
      ) : (
        <>
          <div className="flex-1 space-y-5 overflow-y-auto pb-72">
            {rounds.map((round) => (
              <section
                key={round.id}
                ref={round.id === latestRoundId ? latestRoundRef : null}
                className="scroll-mt-4 grid items-start gap-4 md:grid-cols-3 xl:grid-cols-4"
              >
                <article className="surface-card h-fit rounded-2xl border border-border p-4 text-sm">
                  <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {round.status === "generating" ? tr("Generating", "生成中") : `${round.resultCount} ${tr("generations", "生成数量")}`}
                    </span>
                    <span>{formatMinutesAgo(round.createdAt, uiLang)}</span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div>
                      <p className="text-[11px] text-muted-foreground">{tr("Factor Type", "因子类型")}</p>
                      <p className="text-[12px] font-medium text-foreground">
                        {round.strategyType === "time-series" ? tr("Time-Series", "时序因子") : tr("Cross-Sectional", "截面因子")}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">{tr("Factor Prompt", "因子提示词")}</p>
                      <p className="line-clamp-3 text-[12px] text-foreground/90">{round.prompt.trim() || "--"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">{tr("Model", "模型")}</p>
                      <p className="text-[12px] font-medium text-foreground">{formatModelSummary(round.models)}</p>
                      {round.models.length > 1 ? (
                        <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                          {round.models.map((item) => getModelOption(item).label).join(" · ")}
                        </p>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[11px] text-muted-foreground">{tr("Generation Count", "生成数量")}</p>
                        <p className="text-[12px] font-medium text-foreground">{round.resultCount}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">{tr("Credit", "额度")}</p>
                        <p className="text-[12px] font-medium text-emerald-600 dark:text-emerald-400">{round.estimatedCredit.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-1.5 text-muted-foreground">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            className="transition hover:text-foreground"
                            aria-label={tr("Regenerate", "重新生成")}
                            onClick={() => refillComposerFromRound(round)}
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>{tr("Regenerate", "重新生成")}</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            className="transition hover:text-destructive"
                            aria-label={tr("Delete", "删除")}
                            onClick={() => setPendingDeleteRoundId(round.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>{tr("Delete", "删除")}</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </article>

                <div className="grid gap-4 md:col-span-2 md:grid-cols-2 xl:col-span-3 xl:grid-cols-3">
                  {round.results.map((result) => (
                    <ResultCard
                      key={result.id}
                      result={result}
                      status={round.status}
                      className="sm:min-h-[300px]"
                      active={selectedFactorId === result.factorId}
                      onSelect={() => {
                        setSelectedFactorId(result.factorId);
                        setSelectedPreview(result);
                      }}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="sticky bottom-0 z-10 mx-auto self-auto w-[800px] max-w-full rounded-xl border border-border bg-card/95 p-2.5 shadow-[0_-18px_50px_rgba(15,23,42,0.12)] backdrop-blur dark:shadow-[0_-14px_24px_rgba(2,6,23,0.3)] md:p-3">
            <div className={`relative ${composerCollapsed ? "space-y-2 pt-0.5" : "space-y-3 pt-6"}`}>
              <button
                type="button"
                onClick={() => setComposerCollapsed((prev) => !prev)}
                className="absolute right-0 top-0 inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-accent text-muted-foreground transition hover:text-foreground"
                aria-label={composerCollapsed ? tr("Expand composer", "展开编辑器") : tr("Collapse composer", "收起编辑器")}
              >
                {composerCollapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {!composerCollapsed ? (
                <>
                  <div className="grid gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    {tr("Factor Type", "因子类型")} <span className="text-destructive">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setStrategyType("time-series")}
                          className={`h-9 rounded-md border px-2.5 text-left text-sm font-semibold transition ${
                            strategyType === "time-series"
                              ? "border-primary/40 bg-primary/10 text-primary"
                              : "border-border bg-accent/70 text-foreground hover:border-primary/25 hover:bg-accent"
                          }`}
                        >
                          {tr("Time-Series", "时序因子")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setStrategyType("cross-sectional")}
                          className={`h-9 rounded-md border px-2.5 text-left text-sm font-semibold transition ${
                            strategyType === "cross-sectional"
                              ? "border-primary/40 bg-primary/10 text-primary"
                              : "border-border bg-accent/70 text-foreground hover:border-primary/25 hover:bg-accent"
                          }`}
                        >
                          {tr("Cross-Sectional", "截面因子")}
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <label className="block text-xs font-medium text-muted-foreground">{tr("Factor Prompt", "因子提示词")}</label>
                        <button
                          type="button"
                          onClick={promptOptimized ? undoPromptOptimization : optimizePrompt}
                          disabled={!promptOptimized && !prompt.trim()}
                          className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-accent/70 px-2 text-xs font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {promptOptimized ? <Undo2 className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                          {promptOptimized ? tr("Revert", "撤回") : tr("Optimize Prompt", "优化提示词")}
                        </button>
                      </div>
                      <Textarea
                        value={prompt}
                        onChange={(event) => setPrompt(event.target.value)}
                        placeholder={tr(
                          "Describe the factor hypothesis, market intuition, and required inputs...",
                          "描述因子假设、市场逻辑和所需输入..."
                        )}
                        rows={2}
                        className="h-[64px] resize-none rounded-md border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <Popover open={modelMenuOpen} onOpenChange={setModelMenuOpen}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="flex h-9 w-full items-center gap-2 rounded-md border border-border bg-accent/70 px-2.5 text-left text-sm text-foreground transition hover:border-primary/30 hover:bg-accent"
                          >
                            <span className="shrink-0 text-xs text-muted-foreground">{tr("Model", "模型")}</span>
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              <div className="flex items-center gap-1.5 shrink-0">
                                {selectedLogoModels.slice(0, 2).map((item) => (
                                  <span key={item} className="inline-flex h-5 w-5 items-center justify-center">
                                    <ModelLogo model={item} />
                                  </span>
                                ))}
                                {selectedLogoModels.length > 2 ? (
                                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-muted px-1 text-[9px] font-semibold text-muted-foreground">
                                    +{selectedLogoModels.length - 2}
                                  </span>
                                ) : null}
                              </div>
                              <span className="truncate font-medium text-foreground">{selectedModelSummary}</span>
                            </div>
                            <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition ${modelMenuOpen ? "rotate-180" : ""}`} />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          align="start"
                          side="top"
                          sideOffset={10}
                          className="w-[min(520px,calc(100vw-4rem))] rounded-[24px] border border-border bg-popover/95 p-0 text-popover-foreground shadow-[0_24px_60px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:shadow-[0_24px_60px_rgba(2,6,23,0.5)]"
                        >
                          <div className="border-b border-border px-5 py-4">
                            <div className="flex items-center justify-between gap-4">
                              <div className="text-[15px] font-semibold text-foreground">{tr("Model Selection", "模型选择")}</div>
                              <div className="text-[12px] text-muted-foreground">{selectedModels.length} {tr("selected", "已选")}</div>
                            </div>
                          </div>

                          <div className="max-h-[340px] space-y-1.5 overflow-y-auto px-3 py-3">
                            {MODEL_OPTIONS.map((item) => {
                              const selected = selectedModels.includes(item.value);

                              return (
                                <div
                                  key={item.value}
                                  onClick={() => toggleModelSelection(item.value)}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                      event.preventDefault();
                                      toggleModelSelection(item.value);
                                    }
                                  }}
                                  role="checkbox"
                                  aria-checked={selected}
                                  aria-label={item.label}
                                  tabIndex={0}
                                  className={`flex w-full items-start gap-3 rounded-[18px] px-3 py-3 text-left transition ${
                                    selected
                                      ? "bg-primary/10 ring-1 ring-primary/25"
                                      : "bg-transparent hover:bg-accent/70"
                                  }`}
                                >
                                  <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-background">
                                    <ModelLogo model={item.value} />
                                  </span>

                                  <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-2">
                                      <span className="truncate text-[14px] font-semibold text-foreground">{item.label}</span>
                                    </span>
                                    <span className="mt-1 block text-[12px] leading-[1.45] text-muted-foreground">
                                      {tr(item.description, item.descriptionZh)}
                                    </span>
                                  </span>

                                  <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center">
                                    <Checkbox
                                      checked={selected}
                                      aria-hidden="true"
                                      tabIndex={-1}
                                      className="h-6 w-6 rounded-[8px] border-border bg-background data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                                    />
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <span className="flex h-9 shrink-0 items-center justify-center px-1 text-sm font-semibold text-muted-foreground">x</span>

                    <div className="w-[188px]">
                      <Popover open={resultCountMenuOpen} onOpenChange={setResultCountMenuOpen}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="flex h-9 w-full items-center gap-2 rounded-md border border-border bg-accent/70 px-2.5 text-left text-sm text-foreground transition hover:border-primary/30 hover:bg-accent"
                          >
                            <span className="shrink-0 text-xs text-muted-foreground">{tr("Result Count", "结果数量")}</span>
                            <span className="ml-auto font-medium text-foreground">{resultCount}</span>
                            <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition ${resultCountMenuOpen ? "rotate-180" : ""}`} />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          align="end"
                          side="top"
                          sideOffset={10}
                          className="w-[188px] rounded-[18px] border border-border bg-popover p-2 text-popover-foreground shadow-[0_20px_50px_rgba(15,23,42,0.16)] backdrop-blur-xl dark:shadow-[0_20px_50px_rgba(2,6,23,0.45)]"
                        >
                          <div className="space-y-1">
                            {[1, 2, 3, 4, 8, 10].map((count) => {
                              const selected = resultCount === count;

                              return (
                                <button
                                  key={count}
                                  type="button"
                                  onClick={() => {
                                    setResultCount(count);
                                    setResultCountMenuOpen(false);
                                  }}
                                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
                                    selected
                                      ? "bg-primary/10 text-primary ring-1 ring-primary/25"
                                      : "text-popover-foreground hover:bg-accent/70"
                                  }`}
                                >
                                  <span>{count}</span>
                                  {selected ? <Check className="h-4 w-4 text-primary" /> : null}
                                </button>
                              );
                            })}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-xs text-muted-foreground">
                  {tr("Current setup:", "当前配置：")} {strategyType === "time-series" ? tr("Time-Series", "时序因子") : tr("Cross-Sectional", "截面因子")}, {selectedModels.length} {tr(`model${selectedModels.length > 1 ? "s" : ""}`, "个模型")}, {resultCount} {tr(`generation${resultCount > 1 ? "s" : ""} per model`, "个生成/模型")}.
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
                <div className="inline-flex items-center gap-2 text-sm text-foreground">
                  <span className="text-xs text-muted-foreground">
                    {tr(
                      `Will run ${selectedModels.length} model${selectedModels.length > 1 ? "s" : ""}, each generating ${resultCount} output${resultCount > 1 ? "s" : ""}`,
                      `将运行 ${selectedModels.length} 个模型，分别生成 ${resultCount} 个结果`
                    )}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    <span>{tr("Estimated spend", "预计消耗")}</span>
                    <CreditIcon className="h-3.5 w-3.5 shrink-0" />
                    <span>{formatCreditUnits(estimatedCredit)}</span>
                  </span>
                  {availableCredit < estimatedCredit ? (
                    <span className="text-xs font-medium text-rose-600 dark:text-rose-400">{tr("Insufficient credit", "额度不足")}</span>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={runGeneration}
                  className="inline-flex h-9 min-w-[120px] items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
                >
                  {activeGeneratingRoundId ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  {activeGeneratingRoundId ? tr("Pause", "暂停") : tr("Generate", "生成")}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {selectedFactorId ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-black/55"
            onClick={() => {
              setSelectedFactorId(null);
              setSelectedPreview(null);
            }}
            aria-label={tr("Close factor detail panel", "关闭因子详情面板")}
          />

          <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-1/3 items-center justify-center p-4 xl:flex">
            {selectedPreview ? (
              <div className="w-full max-w-[360px]">
                <ResultCard result={selectedPreview} />
              </div>
            ) : null}
          </div>

          <aside className="absolute inset-y-0 right-0 w-full border-l border-border bg-background shadow-[0_10px_40px_rgba(2,6,23,0.45)] sm:w-2/3">
            <button
              type="button"
              onClick={() => {
                setSelectedFactorId(null);
                setSelectedPreview(null);
              }}
              className="absolute right-4 top-4 z-10 inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition hover:text-foreground"
              aria-label={tr("Close panel", "关闭面板")}
            >
              <X className="h-4 w-4" />
            </button>
            <div className="h-full overflow-y-auto p-5 sm:p-6">
              <AlphaDetail embedded factorIdOverride={selectedFactorId} />
            </div>
          </aside>
        </div>
      ) : null}

      <AlertDialog
        open={showInsufficientCreditDialog}
        onOpenChange={setShowInsufficientCreditDialog}
      >
        <AlertDialogContent className="border-border bg-card text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>{tr("Insufficient credit", "额度不足")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tr(
                `This generation requires ${estimatedCredit.toFixed(2)} credit, but your balance is ${availableCredit.toFixed(2)}.`,
                `本次生成需消耗 ${estimatedCredit.toFixed(2)} 额度，当前余额为 ${availableCredit.toFixed(2)}。`
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tr("Cancel", "取消")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => window.location.assign("/subscription")}>
              {tr("Recharge credit", "去充值额度")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(pendingDeleteRoundId)}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteRoundId(null);
        }}
      >
        <AlertDialogContent className="border-border bg-card text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>{tr("Delete this result set?", "删除这组结果？")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tr("This action cannot be undone.", "此操作不可撤销。")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tr("Cancel", "取消")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteRound}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {tr("Delete", "删除")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
