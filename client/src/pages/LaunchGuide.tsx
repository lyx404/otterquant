/*
 * LaunchGuide — Multi-step onboarding wizard
 * Design: Katana Deep Navy + horizontal stepper (Alpaca-style)
 * Steps: Welcome → Install Skill → Verify → First Run
 * Persists completion state in localStorage
 */
import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useOnboarding } from "@/App";
import { useKatanaColors } from "@/hooks/useKatanaColors";
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

/* ── Design tokens (page-local) ── */
function useC() {
  const k = useKatanaColors();
  return {
    ...k,
    stepActive: "#0058ff",
    stepCompleted: "#00ffc2",
    stepPending: k.isDark ? "rgba(236,238,243,0.20)" : "rgba(13,17,28,0.20)",
    stepLine: k.isDark ? "rgba(236,238,243,0.12)" : "rgba(13,17,28,0.12)",
    stepLineCompleted: "#00ffc2",
    inputBg: k.isDark ? "rgba(236,238,243,0.04)" : "rgba(0,0,0,0.03)",
    inputBorder: k.isDark ? "rgba(236,238,243,0.12)" : "rgba(0,0,0,0.10)",
    inputFocus: "rgba(0,88,255,0.30)",
    codeBg: k.isDark ? "rgba(0,0,0,0.40)" : "rgba(0,0,0,0.06)",
    successDim: k.isDark ? "rgba(0,255,194,0.08)" : "rgba(0,200,150,0.06)",
    dangerDim: k.isDark ? "rgba(241,34,17,0.08)" : "rgba(241,34,17,0.06)",
    warnDim: k.isDark ? "rgba(215,255,0,0.08)" : "rgba(180,180,0,0.06)",
  };
}

/* ── Step definitions ── */
const STEPS = [
  { id: "welcome", label: "Welcome", icon: Zap },
  { id: "install", label: "Install Skill", icon: Terminal },
  { id: "verify", label: "Verify", icon: Cpu },
  { id: "first-run", label: "First Run", icon: Rocket },
] as const;

type StepId = (typeof STEPS)[number]["id"];

/* ── Simulated verification states ── */
type VerifyStatus = "idle" | "checking" | "success" | "partial" | "failed";

/* ── Markets ── */
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
  const C = useC();
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
      // Simulate a successful partial verification
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
      case 0:
        return teamName.trim().length >= 2 && experience !== "";
      case 1:
        return true; // install step can always proceed
      case 2:
        return verifyStatus === "success" || verifyStatus === "partial";
      case 3:
        return true;
      default:
        return false;
    }
  };

  /* ── Toggle market ── */
  const toggleMarket = (m: string) => {
    setSelectedMarkets((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });
  };

  /* ── Accordion toggle ── */
  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  /* ═══════════════════════════════════════════════════════════════
   *  RENDER
   * ═══════════════════════════════════════════════════════════════ */
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: C.bg0 }}
    >
      {/* ── Minimal header ── */}
      <header
        className="shrink-0 px-6 sm:px-10 py-5"
        style={{ borderBottom: `1px solid ${C.border}` }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: C.primaryDim }}
          >
            <Zap className="w-4 h-4" style={{ color: C.primary }} />
          </div>
          <span
            className="font-semibold text-base tracking-tight"
            style={{ color: C.text1 }}
          >
            AlphaForge
          </span>
          <span
            className="text-xs font-mono ml-2 px-2 py-0.5 rounded"
            style={{
              color: C.primary,
              backgroundColor: C.primaryDim,
            }}
          >
            SETUP
          </span>
        </div>
      </header>

      {/* ── Content area ── */}
      <div className="flex-1 overflow-y-auto" ref={contentRef}>
        <div className="mx-auto max-w-[860px] px-6 sm:px-10 py-10">
          {/* Title */}
          <h1
            className="text-3xl sm:text-4xl font-bold tracking-tight mb-10"
            style={{ color: C.text1 }}
          >
            Launch Guide
          </h1>

          {/* ── Horizontal Stepper ── */}
          <div className="mb-12">
            <div className="flex items-center justify-between relative">
              {/* Background line */}
              <div
                className="absolute top-4 left-0 right-0 h-[2px]"
                style={{ backgroundColor: C.stepLine }}
              />
              {/* Progress line */}
              <div
                className="absolute top-4 left-0 h-[2px] transition-all duration-500"
                style={{
                  backgroundColor: C.stepLineCompleted,
                  width: `${(currentStep / (STEPS.length - 1)) * 100}%`,
                }}
              />

              {STEPS.map((step, i) => {
                const isCompleted = completedSteps.has(i);
                const isCurrent = i === currentStep;
                const isPending = !isCompleted && !isCurrent;

                return (
                  <div
                    key={step.id}
                    className="relative z-10 flex flex-col items-center"
                    style={{ cursor: isCompleted ? "pointer" : "default" }}
                    onClick={() => {
                      if (isCompleted || i < currentStep) setCurrentStep(i);
                    }}
                  >
                    {/* Circle */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300"
                      style={{
                        backgroundColor: isCompleted
                          ? C.stepCompleted
                          : isCurrent
                          ? C.stepActive
                          : C.bg0,
                        border: `2px solid ${
                          isCompleted
                            ? C.stepCompleted
                            : isCurrent
                            ? C.stepActive
                            : C.stepPending
                        }`,
                        boxShadow: isCurrent
                          ? `0 0 0 4px ${C.primaryDim}`
                          : "none",
                      }}
                    >
                      {isCompleted ? (
                        <Check className="w-4 h-4 text-black" />
                      ) : (
                        <span
                          className="text-xs font-bold"
                          style={{
                            color: isCurrent ? "#fff" : C.text3,
                          }}
                        >
                          {i + 1}
                        </span>
                      )}
                    </div>
                    {/* Label */}
                    <span
                      className="mt-2.5 text-[11px] font-medium tracking-wide whitespace-nowrap"
                      style={{
                        color: isCurrent
                          ? C.text1
                          : isCompleted
                          ? C.success
                          : C.text3,
                      }}
                    >
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
                  <h2
                    className="text-xl font-semibold mb-1"
                    style={{ color: C.text1 }}
                  >
                    Welcome
                  </h2>
                  <p className="text-sm" style={{ color: C.text2 }}>
                    Let's set up your AlphaForge workspace. This only takes a minute.
                  </p>
                </div>

                {/* Team Name */}
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    style={{ color: C.text1 }}
                  >
                    Choose Team Name
                  </label>
                  <p className="text-xs" style={{ color: C.text3 }}>
                    You can change it any time
                  </p>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="Team Name"
                    className="w-full px-4 py-3 rounded-xl text-sm font-mono outline-none transition-all duration-200"
                    style={{
                      backgroundColor: C.inputBg,
                      border: `1px solid ${C.inputBorder}`,
                      color: C.text1,
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = C.primary;
                      e.currentTarget.style.boxShadow = `0 0 0 3px ${C.inputFocus}`;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = C.inputBorder;
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                </div>

                {/* Experience Level */}
                <div className="space-y-3">
                  <label
                    className="text-sm font-medium"
                    style={{ color: C.text1 }}
                  >
                    What best describes your experience?
                  </label>
                  <p className="text-xs" style={{ color: C.text3 }}>
                    This helps us tailor the platform to your needs
                  </p>
                  <div className="space-y-2">
                    {EXPERIENCE_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        onClick={() => setExperience(opt.value)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200"
                        style={{
                          backgroundColor:
                            experience === opt.value
                              ? C.primaryDim
                              : C.inputBg,
                          border: `1px solid ${
                            experience === opt.value
                              ? C.primary
                              : C.inputBorder
                          }`,
                        }}
                        onMouseEnter={(e) => {
                          if (experience !== opt.value)
                            e.currentTarget.style.backgroundColor = C.cardHover;
                        }}
                        onMouseLeave={(e) => {
                          if (experience !== opt.value)
                            e.currentTarget.style.backgroundColor = C.inputBg;
                        }}
                      >
                        <div
                          className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                          style={{
                            borderColor:
                              experience === opt.value
                                ? C.primary
                                : C.text3,
                          }}
                        >
                          {experience === opt.value && (
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: C.primary }}
                            />
                          )}
                        </div>
                        <span
                          className="text-sm"
                          style={{
                            color:
                              experience === opt.value
                                ? C.text1
                                : C.text2,
                          }}
                        >
                          {opt.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Preferred Markets */}
                <div className="space-y-3">
                  <label
                    className="text-sm font-medium"
                    style={{ color: C.text1 }}
                  >
                    Preferred Markets
                    <span className="font-normal ml-1" style={{ color: C.text3 }}>
                      (optional)
                    </span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {MARKETS.map((m) => {
                      const selected = selectedMarkets.has(m);
                      return (
                        <button
                          key={m}
                          onClick={() => toggleMarket(m)}
                          className="px-3 py-1.5 rounded-full text-xs font-mono transition-all duration-200"
                          style={{
                            backgroundColor: selected
                              ? C.primaryDim
                              : C.inputBg,
                            border: `1px solid ${
                              selected ? C.primary : C.inputBorder
                            }`,
                            color: selected ? C.primary : C.text2,
                          }}
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
                  <h2
                    className="text-xl font-semibold mb-1"
                    style={{ color: C.text1 }}
                  >
                    Install Skill
                  </h2>
                  <p className="text-sm" style={{ color: C.text2 }}>
                    Connect your AI agent to AlphaForge by installing the mining
                    skill. Choose one of the methods below.
                  </p>
                </div>

                {/* Method 1: pip install */}
                <AccordionSection
                  id="method-1"
                  title="Method 1 — pip install (Recommended)"
                  subtitle="Install via Python package manager"
                  expanded={expandedSection === "method-1"}
                  onToggle={() => toggleSection("method-1")}
                  C={C}
                >
                  <div className="space-y-4">
                    <p className="text-sm" style={{ color: C.text2 }}>
                      Run the following command in your terminal to install the
                      AlphaForge skill package:
                    </p>
                    <CodeBlock
                      code="pip install alphaforge-skill --upgrade"
                      id="pip"
                      copiedCode={copiedCode}
                      onCopy={copyCode}
                      C={C}
                    />
                    <p className="text-sm" style={{ color: C.text2 }}>
                      Then configure your API key:
                    </p>
                    <CodeBlock
                      code={`alphaforge-skill init \\
  --api-key YOUR_API_KEY \\
  --agent openai  # or "claude", "cursor"`}
                      id="init"
                      copiedCode={copiedCode}
                      onCopy={copyCode}
                      C={C}
                    />
                    <div
                      className="flex items-start gap-2 p-3 rounded-lg text-xs"
                      style={{
                        backgroundColor: C.warnDim,
                        color: C.accent,
                      }}
                    >
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>
                        Your API key can be found in{" "}
                        <span className="font-mono">Account → API Keys</span>.
                        Keep it private.
                      </span>
                    </div>
                  </div>
                </AccordionSection>

                {/* Method 2: Docker */}
                <AccordionSection
                  id="method-2"
                  title="Method 2 — Docker Container"
                  subtitle="Run as a containerized service"
                  expanded={expandedSection === "method-2"}
                  onToggle={() => toggleSection("method-2")}
                  C={C}
                >
                  <div className="space-y-4">
                    <p className="text-sm" style={{ color: C.text2 }}>
                      Pull and run the official Docker image:
                    </p>
                    <CodeBlock
                      code={`docker pull alphaforge/skill:latest
docker run -d \\
  --name alphaforge-skill \\
  -e API_KEY=YOUR_API_KEY \\
  -e AGENT_TYPE=openai \\
  alphaforge/skill:latest`}
                      id="docker"
                      copiedCode={copiedCode}
                      onCopy={copyCode}
                      C={C}
                    />
                  </div>
                </AccordionSection>

                {/* Method 3: Manual */}
                <AccordionSection
                  id="method-3"
                  title="Method 3 — Manual Configuration"
                  subtitle="For custom agent setups"
                  expanded={expandedSection === "method-3"}
                  onToggle={() => toggleSection("method-3")}
                  C={C}
                >
                  <div className="space-y-4">
                    <p className="text-sm" style={{ color: C.text2 }}>
                      Clone the repository and configure manually:
                    </p>
                    <CodeBlock
                      code={`git clone https://github.com/alphaforge/skill.git
cd skill
cp .env.example .env
# Edit .env with your API key and agent type
npm install && npm start`}
                      id="manual"
                      copiedCode={copiedCode}
                      onCopy={copyCode}
                      C={C}
                    />
                    <a
                      href="#"
                      className="inline-flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-80"
                      style={{ color: C.primary }}
                      onClick={(e) => {
                        e.preventDefault();
                        toast("Feature coming soon");
                      }}
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
                  <h2
                    className="text-xl font-semibold mb-1"
                    style={{ color: C.text1 }}
                  >
                    Verify Installation
                  </h2>
                  <p className="text-sm" style={{ color: C.text2 }}>
                    Let's check if your skill is properly connected and all
                    components are running.
                  </p>
                </div>

                {/* Run check button */}
                <div className="flex flex-col items-center gap-6 py-6">
                  {verifyStatus === "idle" && (
                    <button
                      onClick={runVerification}
                      className="flex items-center gap-2.5 px-8 py-3.5 rounded-full text-sm font-semibold transition-all duration-250"
                      style={{
                        backgroundColor: C.primary,
                        color: "#fff",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = "0.85";
                        e.currentTarget.style.transform = "translateY(-1px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = "1";
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      <Cpu className="w-4 h-4" />
                      Run Connection Check
                    </button>
                  )}

                  {verifyStatus === "checking" && (
                    <div className="flex flex-col items-center gap-4">
                      <Loader2
                        className="w-10 h-10 animate-spin"
                        style={{ color: C.primary }}
                      />
                      <p className="text-sm" style={{ color: C.text2 }}>
                        Checking connection and skill status...
                      </p>
                    </div>
                  )}

                  {(verifyStatus === "success" ||
                    verifyStatus === "partial") &&
                    verifyDetails && (
                      <div className="w-full space-y-4">
                        {/* Connection status */}
                        <div
                          className="flex items-center gap-3 p-4 rounded-xl"
                          style={{
                            backgroundColor: C.successDim,
                            border: `1px solid rgba(0,255,194,0.15)`,
                          }}
                        >
                          <CheckCircle2
                            className="w-5 h-5 shrink-0"
                            style={{ color: C.success }}
                          />
                          <div>
                            <p
                              className="text-sm font-medium"
                              style={{ color: C.text1 }}
                            >
                              Connection Established
                            </p>
                            <p
                              className="text-xs font-mono mt-0.5"
                              style={{ color: C.text2 }}
                            >
                              Skill version: {verifyDetails.version}
                            </p>
                          </div>
                        </div>

                        {/* Skill components */}
                        <div
                          className="rounded-xl overflow-hidden"
                          style={{
                            border: `1px solid ${C.border}`,
                          }}
                        >
                          <div
                            className="px-4 py-3"
                            style={{
                              backgroundColor: C.card,
                              borderBottom: `1px solid ${C.borderWeak}`,
                            }}
                          >
                            <span
                              className="text-xs font-medium uppercase tracking-wider"
                              style={{ color: C.text2 }}
                            >
                              Skill Components
                            </span>
                          </div>
                          {verifyDetails.skills.map((skill, i) => (
                            <div
                              key={skill.name}
                              className="flex items-center justify-between px-4 py-3"
                              style={{
                                borderBottom:
                                  i < verifyDetails.skills.length - 1
                                    ? `1px solid ${C.borderWeak}`
                                    : "none",
                              }}
                            >
                              <span
                                className="text-sm"
                                style={{ color: C.text1 }}
                              >
                                {skill.name}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {skill.status === "ok" && (
                                  <>
                                    <CheckCircle2
                                      className="w-3.5 h-3.5"
                                      style={{ color: C.success }}
                                    />
                                    <span
                                      className="text-xs font-mono"
                                      style={{ color: C.success }}
                                    >
                                      OK
                                    </span>
                                  </>
                                )}
                                {skill.status === "warn" && (
                                  <>
                                    <AlertCircle
                                      className="w-3.5 h-3.5"
                                      style={{ color: C.accent }}
                                    />
                                    <span
                                      className="text-xs font-mono"
                                      style={{ color: C.accent }}
                                    >
                                      OPTIONAL
                                    </span>
                                  </>
                                )}
                                {skill.status === "error" && (
                                  <>
                                    <XCircle
                                      className="w-3.5 h-3.5"
                                      style={{ color: C.danger }}
                                    />
                                    <span
                                      className="text-xs font-mono"
                                      style={{ color: C.danger }}
                                    >
                                      FAILED
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {verifyStatus === "partial" && (
                          <div
                            className="flex items-start gap-2 p-3 rounded-lg text-xs"
                            style={{
                              backgroundColor: C.warnDim,
                              color: C.accent,
                            }}
                          >
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>
                              Live Trading Bridge is optional for getting started.
                              You can configure it later in Account → Exchanges.
                            </span>
                          </div>
                        )}

                        {/* Retry button */}
                        <button
                          onClick={runVerification}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200"
                          style={{
                            color: C.text2,
                            border: `1px solid ${C.border}`,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = C.primary;
                            e.currentTarget.style.color = C.primary;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = C.border;
                            e.currentTarget.style.color = C.text2;
                          }}
                        >
                          <Loader2 className="w-3 h-3" />
                          Re-check
                        </button>
                      </div>
                    )}

                  {verifyStatus === "failed" && (
                    <div className="w-full space-y-4">
                      <div
                        className="flex items-center gap-3 p-4 rounded-xl"
                        style={{
                          backgroundColor: C.dangerDim,
                          border: `1px solid rgba(241,34,17,0.15)`,
                        }}
                      >
                        <XCircle
                          className="w-5 h-5 shrink-0"
                          style={{ color: C.danger }}
                        />
                        <div>
                          <p
                            className="text-sm font-medium"
                            style={{ color: C.text1 }}
                          >
                            Connection Failed
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: C.text2 }}>
                            Please check your installation and try again.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={runVerification}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-200"
                        style={{
                          backgroundColor: C.primary,
                          color: "#fff",
                        }}
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
                  <h2
                    className="text-xl font-semibold mb-1"
                    style={{ color: C.text1 }}
                  >
                    First Run
                  </h2>
                  <p className="text-sm" style={{ color: C.text2 }}>
                    Create your first Alpha factor and submit it for backtesting.
                    Here's a quick walkthrough.
                  </p>
                </div>

                {/* Quick start cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    {
                      icon: FlaskConical,
                      title: "Create Factor",
                      desc: "Define your trading signal using our expression builder or Python SDK",
                      step: "01",
                    },
                    {
                      icon: BarChart3,
                      title: "Run Backtest",
                      desc: "Submit to our cloud backtesting engine with 5+ years of historical data",
                      step: "02",
                    },
                    {
                      icon: Trophy,
                      title: "Compete & Earn",
                      desc: "Qualified factors enter the Epoch leaderboard for prize pool rewards",
                      step: "03",
                    },
                  ].map((card) => (
                    <div
                      key={card.step}
                      className="p-5 rounded-xl transition-all duration-250"
                      style={{
                        backgroundColor: C.card,
                        border: `1px solid ${C.border}`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = C.primary;
                        e.currentTarget.style.backgroundColor = C.cardHover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = C.border;
                        e.currentTarget.style.backgroundColor = C.card;
                      }}
                    >
                      <div className="flex items-center gap-2.5 mb-3">
                        <span
                          className="text-[10px] font-mono font-bold"
                          style={{ color: C.text3 }}
                        >
                          {card.step}
                        </span>
                        <card.icon
                          className="w-4 h-4"
                          style={{ color: C.primary }}
                        />
                      </div>
                      <h3
                        className="text-sm font-semibold mb-1.5"
                        style={{ color: C.text1 }}
                      >
                        {card.title}
                      </h3>
                      <p className="text-xs leading-relaxed" style={{ color: C.text2 }}>
                        {card.desc}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Quick factor form */}
                <div
                  className="p-6 rounded-xl space-y-5"
                  style={{
                    backgroundColor: C.card,
                    border: `1px solid ${C.border}`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <FlaskConical
                      className="w-4 h-4"
                      style={{ color: C.primary }}
                    />
                    <span
                      className="text-sm font-semibold"
                      style={{ color: C.text1 }}
                    >
                      Quick Start — Create Your First Factor
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label
                        className="text-xs font-medium"
                        style={{ color: C.text2 }}
                      >
                        Factor Name
                      </label>
                      <input
                        type="text"
                        value={factorName}
                        onChange={(e) => setFactorName(e.target.value)}
                        placeholder="e.g. BTC Momentum RSI"
                        className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all duration-200"
                        style={{
                          backgroundColor: C.inputBg,
                          border: `1px solid ${C.inputBorder}`,
                          color: C.text1,
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = C.primary;
                          e.currentTarget.style.boxShadow = `0 0 0 3px ${C.inputFocus}`;
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = C.inputBorder;
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label
                        className="text-xs font-medium"
                        style={{ color: C.text2 }}
                      >
                        Target Market
                      </label>
                      <select
                        value={factorMarket}
                        onChange={(e) => setFactorMarket(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all duration-200 appearance-none"
                        style={{
                          backgroundColor: C.inputBg,
                          border: `1px solid ${C.inputBorder}`,
                          color: factorMarket ? C.text1 : C.text3,
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = C.primary;
                          e.currentTarget.style.boxShadow = `0 0 0 3px ${C.inputFocus}`;
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = C.inputBorder;
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      >
                        <option value="">Select market</option>
                        {MARKETS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      className="text-xs font-medium"
                      style={{ color: C.text2 }}
                    >
                      Description
                      <span className="font-normal ml-1" style={{ color: C.text3 }}>
                        (optional)
                      </span>
                    </label>
                    <textarea
                      value={factorDescription}
                      onChange={(e) => setFactorDescription(e.target.value)}
                      placeholder="Briefly describe your factor's trading logic..."
                      rows={3}
                      className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all duration-200 resize-none"
                      style={{
                        backgroundColor: C.inputBg,
                        border: `1px solid ${C.inputBorder}`,
                        color: C.text1,
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = C.primary;
                        e.currentTarget.style.boxShadow = `0 0 0 3px ${C.inputFocus}`;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = C.inputBorder;
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Bottom Navigation ── */}
          <div
            className="flex items-center justify-between mt-12 pt-6"
            style={{ borderTop: `1px solid ${C.borderWeak}` }}
          >
            {/* Back */}
            {currentStep > 0 ? (
              <button
                onClick={goBack}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
                style={{ color: C.text2 }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = C.text1;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = C.text2;
                }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            ) : (
              <div />
            )}

            {/* Next / Finish */}
            {currentStep < STEPS.length - 1 ? (
              <button
                onClick={goNext}
                disabled={!canProceed()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-250"
                style={{
                  backgroundColor: canProceed() ? C.primary : C.card,
                  color: canProceed() ? "#fff" : C.text3,
                  border: canProceed()
                    ? "none"
                    : `1px solid ${C.borderWeak}`,
                  cursor: canProceed() ? "pointer" : "not-allowed",
                }}
                onMouseEnter={(e) => {
                  if (canProceed()) {
                    e.currentTarget.style.opacity = "0.85";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "1";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={finishGuide}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-250"
                style={{
                  backgroundColor: C.success,
                  color: "#000",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "0.85";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "1";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
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
              className="text-xs transition-colors duration-200"
              style={{ color: C.text3 }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = C.text2;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = C.text3;
              }}
            >
              Skip setup and go to dashboard →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
 *  Sub-components
 * ═══════════════════════════════════════════════════════════════ */

/* ── Accordion Section ── */
function AccordionSection({
  id,
  title,
  subtitle,
  expanded,
  onToggle,
  children,
  C,
}: {
  id: string;
  title: string;
  subtitle: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  C: ReturnType<typeof useC>;
}) {
  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-250"
      style={{
        border: `1px solid ${expanded ? C.primary : C.border}`,
        backgroundColor: expanded ? C.cardHover : C.card,
      }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors duration-200"
        onMouseEnter={(e) => {
          if (!expanded)
            e.currentTarget.style.backgroundColor = C.cardHover;
        }}
        onMouseLeave={(e) => {
          if (!expanded)
            e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        <div>
          <h3 className="text-sm font-semibold" style={{ color: C.text1 }}>
            {title}
          </h3>
          <p className="text-xs mt-0.5" style={{ color: C.text3 }}>
            {subtitle}
          </p>
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 shrink-0" style={{ color: C.text3 }} />
        ) : (
          <ChevronRight className="w-4 h-4 shrink-0" style={{ color: C.text3 }} />
        )}
      </button>
      {expanded && (
        <div
          className="px-5 pb-5"
          style={{ borderTop: `1px solid ${C.borderWeak}` }}
        >
          <div className="pt-4">{children}</div>
        </div>
      )}
    </div>
  );
}

/* ── Code Block ── */
function CodeBlock({
  code,
  id,
  copiedCode,
  onCopy,
  C,
}: {
  code: string;
  id: string;
  copiedCode: string | null;
  onCopy: (code: string, id: string) => void;
  C: ReturnType<typeof useC>;
}) {
  return (
    <div
      className="relative rounded-lg overflow-hidden"
      style={{
        backgroundColor: C.codeBg,
        border: `1px solid ${C.borderWeak}`,
      }}
    >
      <pre className="p-4 pr-12 text-xs font-mono leading-relaxed overflow-x-auto" style={{ color: C.text1 }}>
        {code}
      </pre>
      <button
        onClick={() => onCopy(code, id)}
        className="absolute top-2.5 right-2.5 p-1.5 rounded-md transition-all duration-200"
        style={{
          backgroundColor: C.card,
          border: `1px solid ${C.borderWeak}`,
          color: copiedCode === id ? C.success : C.text3,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = C.primary;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = C.borderWeak;
        }}
      >
        {copiedCode === id ? (
          <Check className="w-3 h-3" />
        ) : (
          <Copy className="w-3 h-3" />
        )}
      </button>
    </div>
  );
}
