/*
 * LaunchGuide — Multi-step onboarding wizard
 * Design: Modern Developer Tool Aesthetic — pure Tailwind classes, zero inline styles
 * Steps: Welcome → Install Skill → Verify → First Run
 * Persists completion state via OnboardingContext
 */
import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useOnboarding } from "@/App";
import {
  ChevronRight,
  ChevronDown,
  Check,
  Copy,
  Terminal,
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
} from "lucide-react";
import { toast } from "sonner";

/* ── Step definitions ── */
const STEPS = [
  { id: "welcome", label: "Welcome", icon: Zap },
  { id: "install", label: "Install Skill", icon: Terminal },
  { id: "verify", label: "Verify", icon: Cpu },
  { id: "first-run", label: "First Run", icon: Rocket },
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
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Step 1: Welcome
  const [teamName, setTeamName] = useState("");
  const [experience, setExperience] = useState("");
  const [selectedMarkets, setSelectedMarkets] = useState<Set<string>>(new Set());

  // Step 2: Install
  const [expandedSection, setExpandedSection] = useState<string | null>("method-1");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

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
    toast.success("Setup complete! Welcome to AlphaForge.");
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
          { name: "Factor Mining Engine", status: "ok" },
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
      case 0: return teamName.trim().length >= 2 && experience !== "";
      case 1: return true;
      case 2: return verifyStatus === "success" || verifyStatus === "partial";
      case 3: return true;
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

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  /* ═══ RENDER ═══ */
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-black">
      {/* ── Minimal header ── */}
      <header className="shrink-0 px-6 sm:px-10 py-5 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary/10">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <span className="font-semibold text-base tracking-tight text-zinc-950 dark:text-white">
            AlphaForge
          </span>
          <span className="text-xs font-mono ml-2 px-2 py-0.5 rounded text-primary bg-primary/10">
            SETUP
          </span>
        </div>
      </header>

      {/* ── Content area ── */}
      <div className="flex-1 overflow-y-auto" ref={contentRef}>
        <div className="mx-auto max-w-[860px] px-6 sm:px-10 py-10">
          {/* Title */}
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-10 text-zinc-950 dark:text-white">
            Launch Guide
          </h1>

          {/* ── Horizontal Stepper ── */}
          <div className="mb-12">
            <div className="flex items-center justify-between relative">
              {/* Background line */}
              <div className="absolute top-4 left-0 right-0 h-[2px] bg-zinc-200 dark:bg-zinc-800" />
              {/* Progress line */}
              <div
                className="absolute top-4 left-0 h-[2px] transition-all duration-500 bg-primary"
                style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
              />

              {STEPS.map((step, i) => {
                const isCompleted = completedSteps.has(i);
                const isCurrent = i === currentStep;
                return (
                  <div
                    key={step.id}
                    className={`relative z-10 flex flex-col items-center ${isCompleted ? "cursor-pointer" : "cursor-default"}`}
                    onClick={() => { if (isCompleted || i < currentStep) setCurrentStep(i); }}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isCompleted
                        ? "bg-primary border-2 border-primary"
                        : isCurrent
                        ? "bg-primary border-2 border-primary shadow-[0_0_0_4px_rgba(59,130,246,0.15)]"
                        : "bg-white dark:bg-black border-2 border-zinc-300 dark:border-zinc-600"
                    }`}>
                      {isCompleted ? (
                        <Check className="w-4 h-4 text-white" />
                      ) : (
                        <span className={`text-xs font-bold ${isCurrent ? "text-white" : "text-zinc-400 dark:text-zinc-500"}`}>
                          {i + 1}
                        </span>
                      )}
                    </div>
                    <span className={`mt-2.5 text-[11px] font-medium tracking-wide ${
                      isCurrent
                        ? "text-zinc-950 dark:text-white"
                        : isCompleted
                        ? "text-primary"
                        : "text-zinc-400 dark:text-zinc-500"
                    }`}>
                      {step.label}
                    </span>
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
                  <h2 className="text-xl font-semibold mb-1 text-zinc-950 dark:text-white">Welcome</h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Let's set up your AlphaForge workspace. This only takes a minute.
                  </p>
                </div>

                {/* Team Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-950 dark:text-white">Choose Team Name</label>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">You can change it any time</p>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="Team Name"
                    className="w-full px-4 py-3 rounded-xl text-sm font-mono outline-none transition-all duration-200 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* Experience Level */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-950 dark:text-white">
                    What best describes your experience?
                  </label>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">
                    This helps us tailor the platform to your needs
                  </p>
                  <div className="space-y-2">
                    {EXPERIENCE_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        onClick={() => setExperience(opt.value)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 border ${
                          experience === opt.value
                            ? "bg-primary/10 border-primary"
                            : "bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          experience === opt.value ? "border-primary" : "border-zinc-400 dark:border-zinc-500"
                        }`}>
                          {experience === opt.value && (
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <span className={`text-sm ${
                          experience === opt.value
                            ? "text-zinc-950 dark:text-white"
                            : "text-zinc-600 dark:text-zinc-400"
                        }`}>
                          {opt.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Preferred Markets */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-950 dark:text-white">
                    Preferred Markets
                    <span className="font-normal ml-1 text-zinc-400 dark:text-zinc-500">(optional)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {MARKETS.map((m) => {
                      const selected = selectedMarkets.has(m);
                      return (
                        <button
                          key={m}
                          onClick={() => toggleMarket(m)}
                          className={`px-3 py-1.5 rounded-full text-xs font-mono transition-all duration-200 border ${
                            selected
                              ? "bg-primary/10 border-primary text-primary"
                              : "bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700"
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

            {/* ═══ STEP 1: Install Skill ═══ */}
            {currentStep === 1 && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div>
                  <h2 className="text-xl font-semibold mb-1 text-zinc-950 dark:text-white">Install Skill</h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Connect your AI agent to AlphaForge by installing the mining skill. Choose one of the methods below.
                  </p>
                </div>

                <AccordionSection
                  id="method-1"
                  title="Method 1 — pip install (Recommended)"
                  subtitle="Install via Python package manager"
                  expanded={expandedSection === "method-1"}
                  onToggle={() => toggleSection("method-1")}
                >
                  <div className="space-y-4">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Run the following command in your terminal to install the AlphaForge skill package:
                    </p>
                    <CodeBlock code="pip install alphaforge-skill --upgrade" id="pip" copiedCode={copiedCode} onCopy={copyCode} />
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">Then configure your API key:</p>
                    <CodeBlock
                      code={`alphaforge-skill init \\
  --api-key YOUR_API_KEY \\
  --agent openai  # or "claude", "cursor"`}
                      id="init" copiedCode={copiedCode} onCopy={copyCode}
                    />
                    <div className="flex items-start gap-2 p-3 rounded-lg text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>
                        Your API key can be found in <span className="font-mono">Account → API Keys</span>. Keep it private.
                      </span>
                    </div>
                  </div>
                </AccordionSection>

                <AccordionSection
                  id="method-2"
                  title="Method 2 — Docker Container"
                  subtitle="Run as a containerized service"
                  expanded={expandedSection === "method-2"}
                  onToggle={() => toggleSection("method-2")}
                >
                  <div className="space-y-4">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">Pull and run the official Docker image:</p>
                    <CodeBlock
                      code={`docker pull alphaforge/skill:latest
docker run -d \\
  --name alphaforge-skill \\
  -e API_KEY=YOUR_API_KEY \\
  -e AGENT_TYPE=openai \\
  alphaforge/skill:latest`}
                      id="docker" copiedCode={copiedCode} onCopy={copyCode}
                    />
                  </div>
                </AccordionSection>

                <AccordionSection
                  id="method-3"
                  title="Method 3 — Manual Configuration"
                  subtitle="For custom agent setups"
                  expanded={expandedSection === "method-3"}
                  onToggle={() => toggleSection("method-3")}
                >
                  <div className="space-y-4">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">Clone the repository and configure manually:</p>
                    <CodeBlock
                      code={`git clone https://github.com/alphaforge/skill.git
cd skill
cp .env.example .env
# Edit .env with your API key and agent type
npm install && npm start`}
                      id="manual" copiedCode={copiedCode} onCopy={copyCode}
                    />
                    <a
                      href="#"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:opacity-80 transition-opacity"
                      onClick={(e) => { e.preventDefault(); toast("Feature coming soon"); }}
                    >
                      View full documentation
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </AccordionSection>
              </div>
            )}

            {/* ═══ STEP 2: Verify ═══ */}
            {currentStep === 2 && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div>
                  <h2 className="text-xl font-semibold mb-1 text-zinc-950 dark:text-white">Verify Installation</h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Let's check if your skill is properly connected and all components are running.
                  </p>
                </div>

                <div className="flex flex-col items-center gap-6 py-6">
                  {verifyStatus === "idle" && (
                    <button
                      onClick={runVerification}
                      className="flex items-center gap-2.5 px-8 py-3.5 rounded-full text-sm font-semibold bg-primary text-white hover:bg-primary/90 hover:-translate-y-0.5 transition-all duration-200"
                    >
                      <Cpu className="w-4 h-4" />
                      Run Connection Check
                    </button>
                  )}

                  {verifyStatus === "checking" && (
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="w-10 h-10 animate-spin text-primary" />
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">Checking connection and skill status...</p>
                    </div>
                  )}

                  {(verifyStatus === "success" || verifyStatus === "partial") && verifyDetails && (
                    <div className="w-full space-y-4">
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-success/10 border border-success/20">
                        <CheckCircle2 className="w-5 h-5 shrink-0 text-success" />
                        <div>
                          <p className="text-sm font-medium text-zinc-950 dark:text-white">Connection Established</p>
                          <p className="text-xs font-mono mt-0.5 text-zinc-600 dark:text-zinc-400">
                            Skill version: {verifyDetails.version}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
                        <div className="px-4 py-3 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                          <span className="text-xs font-medium uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                            Skill Components
                          </span>
                        </div>
                        {verifyDetails.skills.map((skill, i) => (
                          <div
                            key={skill.name}
                            className={`flex items-center justify-between px-4 py-3 ${
                              i < verifyDetails.skills.length - 1 ? "border-b border-zinc-100 dark:border-zinc-800/50" : ""
                            }`}
                          >
                            <span className="text-sm text-zinc-950 dark:text-white">{skill.name}</span>
                            <div className="flex items-center gap-1.5">
                              {skill.status === "ok" && (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                                  <span className="text-xs font-mono text-success">OK</span>
                                </>
                              )}
                              {skill.status === "warn" && (
                                <>
                                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                                  <span className="text-xs font-mono text-amber-500">OPTIONAL</span>
                                </>
                              )}
                              {skill.status === "error" && (
                                <>
                                  <XCircle className="w-3.5 h-3.5 text-red-500" />
                                  <span className="text-xs font-mono text-red-500">FAILED</span>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {verifyStatus === "partial" && (
                        <div className="flex items-start gap-2 p-3 rounded-lg text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>
                            Live Trading Bridge is optional for getting started. You can configure it later in Account → Exchanges.
                          </span>
                        </div>
                      )}

                      <button
                        onClick={runVerification}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-primary hover:text-primary transition-all duration-200"
                      >
                        <Loader2 className="w-3 h-3" />
                        Re-check
                      </button>
                    </div>
                  )}

                  {verifyStatus === "failed" && (
                    <div className="w-full space-y-4">
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                        <XCircle className="w-5 h-5 shrink-0 text-red-500" />
                        <div>
                          <p className="text-sm font-medium text-zinc-950 dark:text-white">Connection Failed</p>
                          <p className="text-xs mt-0.5 text-zinc-600 dark:text-zinc-400">
                            Please check your installation and try again.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={runVerification}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-all duration-200"
                      >
                        <Loader2 className="w-3.5 h-3.5" />
                        Retry
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ═══ STEP 3: First Run ═══ */}
            {currentStep === 3 && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div>
                  <h2 className="text-xl font-semibold mb-1 text-zinc-950 dark:text-white">First Run</h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Create your first Alpha factor and submit it for backtesting. Here's a quick walkthrough.
                  </p>
                </div>

                {/* Quick start cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { icon: FlaskConical, title: "Create Factor", desc: "Define your trading signal using our expression builder or Python SDK", step: "01" },
                    { icon: BarChart3, title: "Run Backtest", desc: "Submit to our cloud backtesting engine with 5+ years of historical data", step: "02" },
                    { icon: Trophy, title: "Compete & Earn", desc: "Qualified factors enter the Epoch leaderboard for prize pool rewards", step: "03" },
                  ].map((card) => (
                    <div
                      key={card.step}
                      className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 hover:border-primary hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-all duration-200"
                    >
                      <div className="flex items-center gap-2.5 mb-3">
                        <span className="text-[10px] font-mono font-bold text-zinc-400 dark:text-zinc-500">{card.step}</span>
                        <card.icon className="w-4 h-4 text-primary" />
                      </div>
                      <h3 className="text-sm font-semibold mb-1.5 text-zinc-950 dark:text-white">{card.title}</h3>
                      <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">{card.desc}</p>
                    </div>
                  ))}
                </div>

                {/* Quick factor form */}
                <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 space-y-5">
                  <div className="flex items-center gap-2 mb-1">
                    <FlaskConical className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-zinc-950 dark:text-white">
                      Quick Start — Create Your First Factor
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Factor Name</label>
                      <input
                        type="text"
                        value={factorName}
                        onChange={(e) => setFactorName(e.target.value)}
                        placeholder="e.g. BTC Momentum RSI"
                        className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all duration-200 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Target Market</label>
                      <select
                        value={factorMarket}
                        onChange={(e) => setFactorMarket(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all duration-200 appearance-none bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="">Select market</option>
                        {MARKETS.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      Description
                      <span className="font-normal ml-1 text-zinc-400 dark:text-zinc-500">(optional)</span>
                    </label>
                    <textarea
                      value={factorDescription}
                      onChange={(e) => setFactorDescription(e.target.value)}
                      placeholder="Briefly describe your factor's trading logic..."
                      rows={3}
                      className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all duration-200 resize-none bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Bottom Navigation ── */}
          <div className="flex items-center justify-between mt-12 pt-6 border-t border-zinc-100 dark:border-zinc-800/50">
            {currentStep > 0 ? (
              <button
                onClick={goBack}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors duration-200"
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
                className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                  canProceed()
                    ? "bg-primary text-white hover:bg-primary/90 hover:-translate-y-0.5 cursor-pointer"
                    : "bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-600 border border-zinc-200 dark:border-zinc-800 cursor-not-allowed"
                }`}
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={finishGuide}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold bg-primary text-white hover:bg-primary/90 hover:-translate-y-0.5 transition-all duration-200"
              >
                <Rocket className="w-4 h-4" />
                Launch AlphaForge
              </button>
            )}
          </div>

          {/* Skip link */}
          <div className="text-center mt-6 pb-8">
            <button
              onClick={finishGuide}
              className="text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors duration-200"
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
    <div className={`rounded-xl overflow-hidden transition-all duration-200 border ${
      expanded
        ? "border-primary bg-zinc-50 dark:bg-zinc-900/50"
        : "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30"
    }`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors duration-200"
      >
        <div>
          <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">{title}</h3>
          <p className="text-xs mt-0.5 text-zinc-400 dark:text-zinc-500">{subtitle}</p>
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 shrink-0 text-zinc-400 dark:text-zinc-500" />
        ) : (
          <ChevronRight className="w-4 h-4 shrink-0 text-zinc-400 dark:text-zinc-500" />
        )}
      </button>
      {expanded && (
        <div className="px-5 pb-5 border-t border-zinc-200 dark:border-zinc-800/50">
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
    <div className="relative rounded-lg overflow-hidden bg-zinc-900 dark:bg-black/60 border border-zinc-800 dark:border-zinc-700/50">
      <pre className="p-4 pr-12 text-xs font-mono leading-relaxed overflow-x-auto text-zinc-100">
        {code}
      </pre>
      <button
        onClick={() => onCopy(code, id)}
        className={`absolute top-2.5 right-2.5 p-1.5 rounded-md border transition-all duration-200 ${
          copiedCode === id
            ? "border-success/30 text-success bg-zinc-800"
            : "border-zinc-700 text-zinc-500 bg-zinc-800 hover:border-primary hover:text-primary"
        }`}
      >
        {copiedCode === id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      </button>
    </div>
  );
}
