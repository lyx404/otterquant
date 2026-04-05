/*
 * Landing Page — Otter Platform Introduction
 * Design System: "The Synthetic Neural" — Indigo Intelligence & Command Precision
 * Surface Base: #000000 dark / #FFFFFF light
 * Primary: #4F47E6 (Indigo) — the only chromatic accent
 * Typography: Geist + Inter + Geist Mono
 * Borders: 1px rgba(255,255,255,0.06) → hover rgba(79,71,230,0.4)
 * Max border-radius: 12px
 * Easing: cubic-bezier(0.16, 1, 0.3, 1)
 * Landing has its OWN nav (not AppLayout)
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { ScrambleText } from "@/components/ui/scramble-text";
import { TextLoop } from "@/components/ui/text-loop";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import AsciiVisionExport from "@/components/AsciiVisionExport";
import {
  ArrowRight,
  MessageSquare,
  BarChart3,
  Trophy,
  Shield,
  Zap,
  Lock,
  Database,
  Terminal,
  RefreshCw,
  CheckCircle,
  Award,
} from "lucide-react";

/* ── CDN Assets ── */
const HERO_BG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663325188422/YmxnXmKxyGfXhEgxEBqPXF/indigo-hero-bg-EsuKbHY6NkKkXtGAhTcqx2.webp";
const IMG_MINING =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663325188422/YmxnXmKxyGfXhEgxEBqPXF/indigo-feature-mining-6Zp44X4yVqYdzAcmzZa5u2.webp";
const IMG_ARENA =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663325188422/YmxnXmKxyGfXhEgxEBqPXF/indigo-feature-arena-kur4hYkEpQcJF32dLxFdPw.webp";
const IMG_DEPLOY =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663325188422/YmxnXmKxyGfXhEgxEBqPXF/indigo-feature-deploy-kmY3yFB94jLwDy7MwSrQkH.webp";

/* ── Design Tokens ── */
const T = {
  indigo: "#4F47E6",
  indigoGlow: "rgba(79, 71, 230, 0.15)",
  indigoGlowSubtle: "rgba(79, 71, 230, 0.08)",
  indigoBorder: "rgba(79, 71, 230, 0.4)",
  indigoShadow: "0 0 20px rgba(79, 71, 230, 0.2)",
  neuralGradient: "linear-gradient(135deg, #4F47E6 0%, #312E81 100%)",
  surfaceDark: "#000000",
  containerDark: "#121212",
  borderDark: "rgba(255, 255, 255, 0.06)",
  textHighDark: "#FFFFFF",
  textMutedDark: "#707070",
  surfaceLight: "#FFFFFF",
  containerLight: "#F5F5F7",
  borderLight: "rgba(0, 0, 0, 0.06)",
  textHighLight: "#1A1A1E",
  textMutedLight: "#86868B",
  indigoGlowLight: "rgba(79, 71, 230, 0.08)",
};

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

/* ── Workflow Steps (Section IV) ── */
const workflowSteps = [
  {
    num: "01",
    title: "Deploy Skill",
    desc: "Obtain your unique AI Agent credentials from the dashboard. Load the optimized Quant-Skill into your favorite AI assistant.",
    icon: Terminal,
  },
  {
    num: "02",
    title: "Iterate via Chat",
    desc: 'Ask your AI: "Generate a mean-reversion factor based on RSI divergence." The Skill template enforces standardized output schemas.',
    icon: MessageSquare,
  },
  {
    num: "03",
    title: "Instant Sync",
    desc: "No manual coding required — the factor appears in your platform library in real-time, with pre-calculations against historical data.",
    icon: RefreshCw,
  },
  {
    num: "04",
    title: "Validate & Win",
    desc: "Filter for factors with Sharpe > 2.0 and submit to the global leaderboard to earn rewards.",
    icon: CheckCircle,
  },
];

/* ── Core Feature Modules (Section II) ── */
const coreFeatures = [
  {
    title: "NL2Factor Sync",
    subtitle: "Seamless Cross-Platform Integration",
    desc: "Copy our optimized Quant-Skill to your AI assistant. As you describe trading logic in natural language, the AI generates standardized factor expressions that sync instantly to your private cloud library via API.",
    img: IMG_MINING,
    icon: MessageSquare,
    details: [
      { label: "Input", text: 'Natural language prompts (e.g., "Find stocks with price momentum and decreasing volatility")' },
      { label: "Processing", text: "The Skill template enforces the AI to output JSON/Expression schemas compatible with our engine" },
      { label: "Output", text: "The platform automatically parses the expression and initiates pre-calculations against historical data" },
    ],
  },
  {
    title: "Alpha Dashboard",
    subtitle: "Professional Portfolio Management",
    desc: "Every synced factor receives a comprehensive Lifecycle Report. Transform scattered AI inspirations into structured, actionable quantitative assets.",
    img: IMG_DEPLOY,
    icon: BarChart3,
    details: [
      { label: "Predictive Power", text: "Automated IC/IR (Information Coefficient/Ratio) and T-Stats" },
      { label: "Risk Metrics", text: "Sharpe Ratio, Turnover Rate, and Max Drawdown (MDD)" },
      { label: "Version Control", text: "Track every iteration to prevent strategy drift and over-optimization" },
    ],
  },
  {
    title: "Alpha Competition",
    subtitle: "Incentivized Ecosystem",
    desc: "A crowdsourced alpha discovery engine that rewards high-quality, non-correlated signals. Submit your best factors to periodic tournaments validated using Out-of-Sample testing.",
    img: IMG_ARENA,
    icon: Trophy,
    details: [
      { label: "Ranking", text: "Ranked by risk-adjusted returns and decay stability" },
      { label: "Prize Pool", text: "Top-tier participants share USDT/Cash prize pool every epoch" },
      { label: "Incubation", text: "Elite factors qualify for the Seed Fund with performance fee-sharing (Carry)" },
    ],
  },
];

/* ── Stats ── */
const stats = [
  { value: "2,400+", label: "Factors Synced" },
  { value: "580+", label: "Active Quants" },
  { value: "12", label: "Arena Epochs" },
  { value: "99.8%", label: "Uptime" },
];

/* ── Technical Moat (Section III) ── */
const moatItems = [
  {
    icon: Database,
    dimension: "Data Integrity",
    implementation: "Strict Point-in-Time data alignment",
    value: "Eliminates look-ahead bias and ensures backtest validity.",
  },
  {
    icon: Zap,
    dimension: "Execution Fidelity",
    implementation: "Advanced matching engine with Slippage & commissions",
    value: 'Prevents "Paper Alpha" that fails in real-world liquidity.',
  },
  {
    icon: BarChart3,
    dimension: "Compute Power",
    implementation: "High-performance Vectorized calculation engine",
    value: "Enables rapid validation across high-frequency datasets.",
  },
  {
    icon: Lock,
    dimension: "Privacy & IP",
    implementation: "Non-asymmetric encryption for Skill transfers",
    value: "Your proprietary Alpha logic remains confidential.",
  },
];

/* ── Ripple Button Component ── */
function IndigoButton({
  children,
  onClick,
  variant = "filled",
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "filled" | "ghost";
  className?: string;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const btn = btnRef.current;
      if (btn) {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const ripple = document.createElement("span");
        ripple.style.cssText = `
          position:absolute;left:${x}px;top:${y}px;width:0;height:0;
          border-radius:50%;background:rgba(79,71,230,0.35);
          transform:translate(-50%,-50%);pointer-events:none;
          animation:indigo-ripple 300ms ${EASE} forwards;
        `;
        btn.appendChild(ripple);
        setTimeout(() => ripple.remove(), 350);
      }
      onClick?.();
    },
    [onClick]
  );

  const isFilled = variant === "filled";

  return (
    <button
      ref={btnRef}
      onClick={handleClick}
      className={`relative overflow-hidden inline-flex items-center gap-2 font-semibold transition-all ${className}`}
      style={{
        height: "44px",
        padding: "0 28px",
        borderRadius: "8px",
        fontSize: "14px",
        background: isFilled ? T.indigo : "transparent",
        color: isFilled ? "#FFFFFF" : T.indigo,
        border: isFilled ? "none" : `1px solid ${T.indigo}`,
        boxShadow: isFilled ? T.indigoShadow : "none",
        transitionTimingFunction: EASE,
        transitionDuration: "200ms",
      }}
    >
      {children}
    </button>
  );
}

/* ── Hover Card Wrapper ── */
function HoverCard({
  children,
  className = "",
  isDark,
}: {
  children: React.ReactNode;
  className?: string;
  isDark: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={`transition-all ${className}`}
      style={{
        borderRadius: "12px",
        background: isDark ? T.containerDark : T.containerLight,
        border: `1px solid ${hovered ? T.indigoBorder : isDark ? T.borderDark : T.borderLight}`,
        boxShadow: hovered ? T.indigoShadow : "none",
        transitionTimingFunction: EASE,
        transitionDuration: "200ms",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </div>
  );
}

/* ── Main Component ── */
export default function Landing() {
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const heroRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scrolled, setScrolled] = useState(false);

  const isDark = theme === "dark";
  const bg = isDark ? T.surfaceDark : T.surfaceLight;
  const textHigh = isDark ? T.textHighDark : T.textHighLight;
  const textMuted = isDark ? T.textMutedDark : T.textMutedLight;
  const border = isDark ? T.borderDark : T.borderLight;

  /* ── Hero headline text loop ── */
  const heroLoopTexts = ["Tradable Alpha", "Quant Signals"];

  /* ── Scroll listener ── */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ── Particle Background ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animationFrameId: number;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);
    handleResize();

    const particleCount = 150;
    const particles: Array<{
      x: number; y: number; vx: number; vy: number;
      size: number; alpha: number;
    }> = [];
    const color = "#4F47E6";

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.5 + 0.1,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      animationFrameId = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  /* ── GSAP-style entrance (CSS-only for perf) ── */
  useEffect(() => {
    if (!heroRef.current) return;
    const els = heroRef.current.querySelectorAll<HTMLElement>("[data-anim]");
    els.forEach((el, i) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(40px)";
      el.style.transition = `opacity 0.7s ${EASE} ${i * 0.1}s, transform 0.7s ${EASE} ${i * 0.1}s`;
      requestAnimationFrame(() => {
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
      });
    });
  }, []);

  /* ── Scroll reveal ── */
  useEffect(() => {
    const items = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            el.style.opacity = "1";
            el.style.transform = "translateY(0)";
            obs.unobserve(el);
          }
        });
      },
      { threshold: 0.08 }
    );
    items.forEach((el) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(32px)";
      el.style.transition = `opacity 0.6s ${EASE}, transform 0.6s ${EASE}`;
      obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  const handleCTA = () => navigate(isAuthenticated ? "/" : "/auth");
  const handleExplorePrize = () =>
    document.getElementById("alpha-competition")?.scrollIntoView({ behavior: "smooth" });

  return (
    <div
      style={{
        background: bg,
        fontFamily: "'Geist', 'Inter', system-ui, sans-serif",
        color: textHigh,
        minHeight: "100vh",
      }}
    >
      {/* Ripple keyframes */}
      <style>{`
        @keyframes indigo-ripple {
          to { width: 300px; height: 300px; opacity: 0; }
        }
      `}</style>

      {/* ═══════════ NAVIGATION ═══════════ */}
      <header
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          background: scrolled
            ? isDark
              ? "rgba(0,0,0,0.8)"
              : "rgba(255,255,255,0.8)"
            : "transparent",
          backdropFilter: scrolled ? "blur(20px) saturate(180%)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(20px) saturate(180%)" : "none",
          borderBottom: scrolled ? `1px solid ${border}` : "1px solid transparent",
          transition: `all 200ms ${EASE}`,
        }}
      >
        <div className="mx-auto max-w-[1120px] px-6">
          <div className="flex h-14 items-center justify-between">
            <Link href="/landing">
              <div className="flex items-center gap-2.5 cursor-pointer">
                <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663325188422/YmxnXmKxyGfXhEgxEBqPXF/otter-logo_ef58ab33.png" alt="Otter" className="w-8 h-8 rounded-full object-cover" />
                <span className="font-semibold text-base tracking-tight" style={{ color: textHigh }}>
                  Otter
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-2.5">
              <AnimatedThemeToggler
                className="w-8 h-8 flex items-center justify-center transition-colors"
                style={{
                  borderRadius: "6px",
                  border: `1px solid ${border}`,
                  background: "transparent",
                  transitionTimingFunction: EASE,
                }}
                title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              />

              {isAuthenticated ? (
                <Link href="/">
                  <span
                    className="h-8 px-4 text-xs font-medium inline-flex items-center gap-1.5 transition-all"
                    style={{
                      borderRadius: "6px",
                      background: T.indigo,
                      color: "#FFFFFF",
                      boxShadow: T.indigoShadow,
                      transitionTimingFunction: EASE,
                    }}
                  >
                    Dashboard
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </Link>
              ) : (
                <Link href="/auth">
                  <span
                    className="h-8 px-4 text-xs font-medium inline-flex items-center gap-1.5 transition-all"
                    style={{
                      borderRadius: "6px",
                      background: T.indigo,
                      color: "#FFFFFF",
                      boxShadow: T.indigoShadow,
                      transitionTimingFunction: EASE,
                    }}
                  >
                    Log In
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════ PARTICLE BACKGROUND ═══════════ */}
      <canvas
        ref={canvasRef}
        className="fixed top-0 left-0 w-full h-full pointer-events-none z-0"
        style={{
          maskImage: "radial-gradient(circle at center, white, transparent 80%)",
          WebkitMaskImage: "radial-gradient(circle at center, white, transparent 80%)",
        }}
      />

      {/* ═══════════ HERO (Section I) ═══════════ */}
      <section className="relative pt-14 overflow-hidden">
        <div
          className="absolute pointer-events-none"
          style={{
            top: "30%",
            left: "30%",
            transform: "translate(-50%, -50%)",
            width: "700px",
            height: "700px",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${isDark ? "rgba(79,71,230,0.08)" : "rgba(79,71,230,0.04)"} 0%, transparent 70%)`,
            filter: "blur(60px)",
          }}
        />

        <div
          ref={heroRef}
          className="relative mx-auto max-w-[1120px] px-6 pt-28 sm:pt-36 pb-20 sm:pb-28"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* ── Left Column: Text Content ── */}
            <div className="flex flex-col items-start">


              {/* Display XL — text loop */}
              <h1
                data-anim
                className="flex flex-wrap items-baseline gap-[0.25em]"
                style={{
                  fontSize: "clamp(2rem, 4.5vw, 3.25rem)",
                  fontWeight: 700,
                  lineHeight: 1.1,
                  letterSpacing: "-0.04em",
                  color: textHigh,
                }}
              >
                <span>Conversations into</span>
                <TextLoop
                  texts={heroLoopTexts}
                  interval={2500}
                  className=""
                  style={{ color: isDark ? "#818CF8" : "#4F47E6" }}
                />
              </h1>

              <p
                data-anim
                className="max-w-lg mt-6 mb-10"
                style={{
                  fontSize: "0.9375rem",
                  lineHeight: 1.7,
                  color: textMuted,
                }}
              >
                Bridge the gap between Generative AI and professional quantitative research.
                Deploy our Quant-Skills to your favorite AI (ChatGPT / Claude / DeepSeek) to
                automatically sync, backtest, and monetize your trading signals.
              </p>

              {/* CTA */}
              <div data-anim className="flex flex-wrap gap-3 mb-10">
                <IndigoButton onClick={handleCTA}>
                  Get Your Skill Key
                  <ArrowRight className="w-4 h-4" />
                </IndigoButton>
                <IndigoButton variant="ghost" onClick={handleExplorePrize}>
                  Explore Prize Pools
                </IndigoButton>
              </div>

              {/* Works with */}
              <div data-anim className="flex flex-col gap-3">
                <span
                  className="text-[11px] font-medium uppercase"
                  style={{
                    fontFamily: "'Geist Mono', monospace",
                    color: textMuted,
                    letterSpacing: "0.05em",
                  }}
                >
                  Works with
                </span>
                <TooltipProvider delayDuration={200}>
                  <div className="flex items-center gap-3">
                    {[
                      { name: "ChatGPT", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M20.562 10.188c.25-.688.313-1.376.25-2.063c-.062-.687-.312-1.375-.625-2c-.562-.937-1.375-1.687-2.312-2.125c-1-.437-2.063-.562-3.125-.312c-.5-.5-1.063-.938-1.688-1.25S11.687 2 11 2a5.17 5.17 0 0 0-3 .938c-.875.624-1.5 1.5-1.813 2.5c-.75.187-1.375.5-2 .875c-.562.437-1 1-1.375 1.562c-.562.938-.75 2-.625 3.063a5.44 5.44 0 0 0 1.25 2.874a4.7 4.7 0 0 0-.25 2.063c.063.688.313 1.375.625 2c.563.938 1.375 1.688 2.313 2.125c1 .438 2.062.563 3.125.313c.5.5 1.062.937 1.687 1.25S12.312 22 13 22a5.17 5.17 0 0 0 3-.937c.875-.625 1.5-1.5 1.812-2.5a4.54 4.54 0 0 0 1.938-.875c.562-.438 1.062-.938 1.375-1.563c.562-.937.75-2 .625-3.062c-.125-1.063-.5-2.063-1.188-2.876m-7.5 10.5c-1 0-1.75-.313-2.437-.875c0 0 .062-.063.125-.063l4-2.312a.5.5 0 0 0 .25-.25a.57.57 0 0 0 .062-.313V11.25l1.688 1v4.625a3.685 3.685 0 0 1-3.688 3.813M5 17.25c-.438-.75-.625-1.625-.438-2.5c0 0 .063.063.125.063l4 2.312a.56.56 0 0 0 .313.063c.125 0 .25 0 .312-.063l4.875-2.812v1.937l-4.062 2.375A3.7 3.7 0 0 1 7.312 19c-1-.25-1.812-.875-2.312-1.75M3.937 8.563a3.8 3.8 0 0 1 1.938-1.626v4.751c0 .124 0 .25.062.312a.5.5 0 0 0 .25.25l4.875 2.813l-1.687 1l-4-2.313a3.7 3.7 0 0 1-1.75-2.25c-.25-.937-.188-2.062.312-2.937M17.75 11.75l-4.875-2.812l1.687-1l4 2.312c.625.375 1.125.875 1.438 1.5s.5 1.313.437 2.063a3.7 3.7 0 0 1-.75 1.937c-.437.563-1 1-1.687 1.25v-4.75c0-.125 0-.25-.063-.312c0 0-.062-.126-.187-.188m1.687-2.5s-.062-.062-.125-.062l-4-2.313c-.125-.062-.187-.062-.312-.062s-.25 0-.313.062L9.812 9.688V7.75l4.063-2.375c.625-.375 1.312-.5 2.062-.5c.688 0 1.375.25 2 .688c.563.437 1.063 1 1.313 1.625s.312 1.375.187 2.062m-10.5 3.5l-1.687-1V7.063c0-.688.187-1.438.562-2C8.187 4.438 8.75 4 9.375 3.688a3.37 3.37 0 0 1 2.062-.313c.688.063 1.375.375 1.938.813c0 0-.063.062-.125.062l-4 2.313a.5.5 0 0 0-.25.25c-.063.125-.063.187-.063.312zm.875-2L12 9.5l2.187 1.25v2.5L12 14.5l-2.188-1.25z"/></svg>' },
                      { name: "Claude", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M16.765 5h-3.308l5.923 15h3.23zM7.226 5L1.38 20h3.308l1.307-3.154h6.154l1.23 3.077h3.309L10.688 5zm-.308 9.077l2-5.308l2.077 5.308z"/></svg>' },
                      { name: "DeepSeek", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M23.75 4.927c-.245-.12-.34.108-.482.224c-.049.038-.09.087-.131.13c-.357.384-.773.634-1.315.604c-.796-.044-1.474.207-2.074.818c-.127-.754-.551-1.203-1.195-1.492c-.338-.15-.68-.3-.915-.626c-.165-.231-.21-.49-.293-.744c-.052-.153-.105-.31-.28-.337c-.192-.03-.266.13-.341.265c-.3.55-.416 1.158-.406 1.772c.027 1.382.608 2.482 1.762 3.266c.132.09.166.18.124.311c-.079.27-.172.531-.255.8c-.052.173-.13.211-.314.135A5.3 5.3 0 0 1 15.97 8.92c-.82-.797-1.563-1.677-2.489-2.366a11 11 0 0 0-.66-.454c-.944-.922.125-1.679.372-1.768c.259-.093.09-.416-.747-.412c-.835.004-1.6.285-2.574.659c-.143.057-.326.153-.446.13a9.2 9.2 0 0 0-2.763-.096c-1.806.203-3.25 1.06-4.31 2.525c-1.275 1.76-1.574 3.759-1.207 5.846c.385 2.197 1.502 4.019 3.22 5.442c1.78 1.474 3.83 2.197 6.169 2.058c1.42-.081 3.003-.273 4.786-1.789c.45.224.922.313 1.707.381c.603.057 1.184-.03 1.634-.123c.704-.15.655-.804.4-.926c-2.065-.966-1.612-.573-2.024-.89c1.05-1.248 2.632-2.544 3.25-6.741c.049-.334.007-.543 0-.814c-.003-.163.034-.228.22-.247a4 4 0 0 0 1.482-.457c1.338-.734 1.867-1.939 1.995-3.385c.019-.22-.004-.45-.236-.565m-11.652 13.01c-2.002-1.58-2.972-2.1-3.373-2.078c-.375.021-.308.452-.225.733c.086.277.198.468.356.711c.109.162.184.402-.108.58c-.645.403-1.766-.134-1.82-.16c-1.303-.77-2.394-1.79-3.163-3.182c-.741-1.342-1.172-2.78-1.243-4.315c-.02-.372.09-.503.456-.57a4.5 4.5 0 0 1 1.466-.037c2.043.3 3.782 1.218 5.24 2.67c.832.829 1.462 1.817 2.11 2.783c.69 1.027 1.432 2.004 2.377 2.804c.333.281.6.495.854.653c-.768.085-2.05.104-2.927-.592m.96-6.199a.294.294 0 1 1 .588 0a.294.294 0 0 1-.296.296a.29.29 0 0 1-.293-.296m2.98 1.537c-.192.078-.383.146-.566.154a1.2 1.2 0 0 1-.765-.245c-.262-.22-.45-.343-.53-.73a1.7 1.7 0 0 1 .016-.566c.068-.315-.008-.516-.228-.7c-.18-.15-.408-.19-.66-.19a.5.5 0 0 1-.244-.076c-.105-.053-.191-.184-.109-.345a1 1 0 0 1 .185-.201c.34-.195.734-.13 1.098.015c.337.139.592.393.959.752c.375.434.442.555.656.88c.168.256.323.518.428.818c.063.186-.02.34-.24.434"/></svg>' },
                      { name: "Cursor", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M11.503.131L1.891 5.678a.84.84 0 0 0-.42.726v11.188c0 .3.162.575.42.724l9.609 5.55a1 1 0 0 0 .998 0l9.61-5.55a.84.84 0 0 0 .42-.724V6.404a.84.84 0 0 0-.42-.726L12.497.131a1.01 1.01 0 0 0-.996 0M2.657 6.338h18.55c.263 0 .43.287.297.515L12.23 22.918c-.062.107-.229.064-.229-.06V12.335a.59.59 0 0 0-.295-.51l-9.11-5.257c-.109-.063-.064-.23.061-.23"/></svg>' },
                      { name: "Windsurf", svg: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M23.55 5.067a2.177 2.177 0 0 0-2.18 2.177v4.867a1.77 1.77 0 0 1-1.76 1.76a1.82 1.82 0 0 1-1.472-.766l-4.971-7.1a2.2 2.2 0 0 0-1.81-.942c-1.134 0-2.154.964-2.154 2.153v4.896c0 .972-.797 1.76-1.76 1.76c-.57 0-1.136-.287-1.472-.766L.408 5.16A.224.224 0 0 0 0 5.288v4.245c0 .215.066.423.188.6l5.475 7.818c.324.462.8.805 1.351.93a2.164 2.164 0 0 0 2.645-2.098V11.89c0-.972.787-1.76 1.76-1.76h.002a1.8 1.8 0 0 1 1.472.766l4.972 7.1a2.172 2.172 0 0 0 3.96-1.212v-4.895a1.76 1.76 0 0 1 1.76-1.76h.195a.22.22 0 0 0 .22-.22V5.287a.22.22 0 0 0-.22-.22Z"/></svg>' },
                    ].map((ai) => (
                      <Tooltip key={ai.name}>
                        <TooltipTrigger asChild>
                          <div
                            className="flex items-center justify-center w-9 h-9 rounded-lg transition-all hover:scale-110 cursor-default"
                            style={{
                              background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                              border: `1px solid ${border}`,
                              color: isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)",
                            }}
                            dangerouslySetInnerHTML={{ __html: ai.svg }}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                          {ai.name}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </TooltipProvider>
              </div>
            </div>

            {/* ── Right Column: ASCII Art ── */}
            <div
              className="relative w-full aspect-[4/3] rounded-xl overflow-hidden hidden lg:block"
            >
              <AsciiVisionExport />
            </div>

          </div>
        </div>
      </section>

      {/* ═══════════ WORKFLOW — 4 Steps (Section IV) ═══════════ */}
      <section
        id="how-it-works"
        className="py-24 sm:py-32"
        style={{ background: bg }}
      >
        <div className="mx-auto max-w-[1120px] px-6">
          <div className="text-center mb-16" data-reveal>
            <p
              className="text-[11px] font-medium uppercase mb-3"
              style={{
                fontFamily: "'Geist Mono', monospace",
                color: T.indigo,
                letterSpacing: "0.05em",
              }}
            >
              How It Works
            </p>
            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: 600,
                lineHeight: 1.3,
                letterSpacing: "-0.02em",
                color: textHigh,
              }}
            >
              From chat to profit in four steps
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {workflowSteps.map((step) => {
              const Icon = step.icon;
              return (
                <HoverCard key={step.num} isDark={isDark} className="p-6">
                  <div data-reveal>
                    <span
                      className="text-[11px] font-medium uppercase"
                      style={{
                        fontFamily: "'Geist Mono', monospace",
                        color: textMuted,
                        letterSpacing: "0.05em",
                      }}
                    >
                      Step {step.num}
                    </span>

                    <div
                      className="mt-4 mb-3 w-10 h-10 flex items-center justify-center"
                      style={{
                        borderRadius: "8px",
                        background: isDark ? T.indigoGlow : T.indigoGlowLight,
                      }}
                    >
                      <Icon className="w-5 h-5" style={{ color: T.indigo }} />
                    </div>

                    <h3
                      className="text-[15px] font-semibold mb-2"
                      style={{ color: textHigh, letterSpacing: "-0.01em" }}
                    >
                      {step.title}
                    </h3>
                    <p
                      style={{
                        fontSize: "0.875rem",
                        lineHeight: 1.6,
                        color: textMuted,
                      }}
                    >
                      {step.desc}
                    </p>
                  </div>
                </HoverCard>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════ CORE FEATURES — 3 Modules (Section II) ═══════════ */}
      <section className="py-24 sm:py-32" style={{ background: bg }}>
        <div className="mx-auto max-w-[1120px] px-6">
          <div className="text-center mb-16" data-reveal>
            <p
              className="text-[11px] font-medium uppercase mb-3"
              style={{
                fontFamily: "'Geist Mono', monospace",
                color: T.indigo,
                letterSpacing: "0.05em",
              }}
            >
              Core Features
            </p>
            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: 600,
                lineHeight: 1.3,
                letterSpacing: "-0.02em",
                color: textHigh,
              }}
            >
              Sync, manage, and compete — all in one platform
            </h2>
          </div>

          {/* Feature 1: NL2Factor Sync — Full width with IPO model */}
          <div className="mb-5" data-reveal>
            <HoverCard isDark={isDark} className="overflow-hidden group">
              <div className="grid grid-cols-1 lg:grid-cols-2">
                <div className="p-8">
                  <div
                    className="w-10 h-10 flex items-center justify-center mb-4"
                    style={{
                      borderRadius: "8px",
                      background: isDark ? T.indigoGlow : T.indigoGlowLight,
                    }}
                  >
                    <MessageSquare className="w-5 h-5" style={{ color: T.indigo }} />
                  </div>
                  <p
                    className="text-[11px] font-medium uppercase mb-2"
                    style={{
                      fontFamily: "'Geist Mono', monospace",
                      color: T.indigo,
                      letterSpacing: "0.05em",
                    }}
                  >
                    {coreFeatures[0].subtitle}
                  </p>
                  <h3
                    className="text-lg font-semibold mb-3"
                    style={{ color: textHigh, letterSpacing: "-0.01em" }}
                  >
                    {coreFeatures[0].title}
                  </h3>
                  <p
                    className="mb-6"
                    style={{ fontSize: "0.875rem", lineHeight: 1.6, color: textMuted }}
                  >
                    {coreFeatures[0].desc}
                  </p>

                  {/* IPO Model */}
                  <div className="space-y-3">
                    {coreFeatures[0].details.map((d) => (
                      <div key={d.label} className="flex gap-3">
                        <span
                          className="shrink-0 mt-0.5 text-[10px] font-bold uppercase px-2 py-0.5 rounded"
                          style={{
                            background: isDark ? T.indigoGlow : T.indigoGlowLight,
                            color: T.indigo,
                            fontFamily: "'Geist Mono', monospace",
                            letterSpacing: "0.05em",
                          }}
                        >
                          {d.label}
                        </span>
                        <p style={{ fontSize: "0.8125rem", lineHeight: 1.5, color: textMuted }}>
                          {d.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-end p-6 pt-0 lg:pt-6">
                  <div style={{ borderRadius: "10px", overflow: "hidden" }}>
                    <img
                      src={coreFeatures[0].img}
                      alt={coreFeatures[0].title}
                      className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                      style={{ transitionTimingFunction: EASE }}
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>
            </HoverCard>
          </div>

          {/* Feature 2 & 3: Side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {coreFeatures.slice(1).map((feature) => {
              const Icon = feature.icon;
              return (
                <HoverCard key={feature.title} isDark={isDark} className="overflow-hidden group" >
                  <div data-reveal>
                    <div className="p-6 pb-0">
                      <div
                        className="w-10 h-10 flex items-center justify-center mb-4"
                        style={{
                          borderRadius: "8px",
                          background: isDark ? T.indigoGlow : T.indigoGlowLight,
                        }}
                      >
                        <Icon className="w-5 h-5" style={{ color: T.indigo }} />
                      </div>
                      <p
                        className="text-[11px] font-medium uppercase mb-2"
                        style={{
                          fontFamily: "'Geist Mono', monospace",
                          color: T.indigo,
                          letterSpacing: "0.05em",
                        }}
                      >
                        {feature.subtitle}
                      </p>
                      <h3
                        className="text-[15px] font-semibold mb-2"
                        style={{ color: textHigh, letterSpacing: "-0.01em" }}
                      >
                        {feature.title}
                      </h3>
                      <p
                        className="mb-4"
                        style={{ fontSize: "0.8125rem", lineHeight: 1.6, color: textMuted }}
                      >
                        {feature.desc}
                      </p>

                      {/* Detail bullets */}
                      <div className="space-y-2 mb-4">
                        {feature.details.map((d) => (
                          <div key={d.label} className="flex gap-2.5">
                            <span
                              className="shrink-0 mt-0.5 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
                              style={{
                                background: isDark ? T.indigoGlow : T.indigoGlowLight,
                                color: T.indigo,
                                fontFamily: "'Geist Mono', monospace",
                                letterSpacing: "0.04em",
                              }}
                            >
                              {d.label}
                            </span>
                            <p style={{ fontSize: "0.75rem", lineHeight: 1.5, color: textMuted }}>
                              {d.text}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="px-6">
                      <div style={{ borderRadius: "10px 10px 0 0", overflow: "hidden" }}>
                        <img
                          src={feature.img}
                          alt={feature.title}
                          className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                          style={{ transitionTimingFunction: EASE }}
                          loading="lazy"
                        />
                      </div>
                    </div>
                  </div>
                </HoverCard>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════ STATS ═══════════ */}
      <section
        className="py-20 sm:py-24"
        style={{
          background: bg,
          borderTop: `1px solid ${border}`,
          borderBottom: `1px solid ${border}`,
        }}
      >
        <div className="mx-auto max-w-[1120px] px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            {stats.map((stat, idx) => (
              <div key={stat.label} data-reveal className="text-center">
                <p
                  className="text-3xl sm:text-4xl font-bold mb-1.5"
                  style={{
                    fontFamily: "'Geist Mono', monospace",
                    color: T.indigo,
                    letterSpacing: "-0.02em",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  <ScrambleText
                    text={stat.value}
                    scrambleDuration={0.5}
                    stagger={0.02}
                    cycles={10}
                    characters="0123456789$%+."
                    repeatInterval={5000}
                    initialDelay={800 + idx * 200}
                    style={{ color: "inherit", font: "inherit" }}
                  />
                </p>
                <p
                  className="text-[11px] font-medium uppercase"
                  style={{
                    fontFamily: "'Geist Mono', monospace",
                    color: textMuted,
                    letterSpacing: "0.05em",
                  }}
                >
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ TECHNICAL MOAT (Section III) ═══════════ */}
      <section className="py-24 sm:py-32" style={{ background: bg }}>
        <div className="mx-auto max-w-[1120px] px-6">
          <div className="text-center mb-16" data-reveal>
            <p
              className="text-[11px] font-medium uppercase mb-3"
              style={{
                fontFamily: "'Geist Mono', monospace",
                color: T.indigo,
                letterSpacing: "0.05em",
              }}
            >
              Technical Moat
            </p>
            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: 600,
                lineHeight: 1.3,
                letterSpacing: "-0.02em",
                color: textHigh,
              }}
            >
              Precision & reliability at every layer
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {moatItems.map((item) => {
              const Icon = item.icon;
              return (
                <HoverCard key={item.dimension} isDark={isDark} className="p-5">
                  <div data-reveal>
                    <div
                      className="w-9 h-9 flex items-center justify-center mb-3"
                      style={{
                        borderRadius: "8px",
                        background: isDark ? T.indigoGlow : T.indigoGlowLight,
                      }}
                    >
                      <Icon className="w-4 h-4" style={{ color: T.indigo }} />
                    </div>
                    <h4
                      className="text-sm font-semibold mb-1"
                      style={{ color: textHigh }}
                    >
                      {item.dimension}
                    </h4>
                    <p
                      className="mb-2"
                      style={{
                        fontSize: "0.8125rem",
                        lineHeight: 1.5,
                        color: T.indigo,
                        fontFamily: "'Geist Mono', monospace",
                      }}
                    >
                      {item.implementation}
                    </p>
                    <p
                      style={{
                        fontSize: "0.8125rem",
                        lineHeight: 1.6,
                        color: textMuted,
                      }}
                    >
                      {item.value}
                    </p>
                  </div>
                </HoverCard>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════ CTA ═══════════ */}
      <section
        id="alpha-competition"
        className="py-24 sm:py-32 relative overflow-hidden"
        style={{ background: bg }}
      >
        <div
          className="absolute pointer-events-none"
          style={{
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${isDark ? "rgba(79,71,230,0.06)" : "rgba(79,71,230,0.03)"} 0%, transparent 70%)`,
            filter: "blur(60px)",
          }}
        />

        <div className="relative mx-auto max-w-[1120px] px-6 text-center">
          <h2
            data-reveal
            style={{
              fontSize: "1.5rem",
              fontWeight: 600,
              lineHeight: 1.3,
              letterSpacing: "-0.02em",
              color: textHigh,
              marginBottom: "12px",
            }}
          >
            Ready to turn conversations into alpha?
          </h2>
          <p
            data-reveal
            className="mx-auto max-w-lg mb-10"
            style={{
              fontSize: "0.9375rem",
              lineHeight: 1.6,
              color: textMuted,
            }}
          >
            Deploy the Quant-Skill, start chatting with your AI, and watch
            tradable factors sync to your library in real-time.
          </p>
          <div data-reveal>
            <IndigoButton onClick={handleCTA}>
              {isAuthenticated ? "Go to Dashboard" : "Get Your Skill Key"}
              <ArrowRight className="w-4 h-4" />
            </IndigoButton>
          </div>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer
        className="py-8"
        style={{
          background: bg,
          borderTop: `1px solid ${border}`,
        }}
      >
        <div className="mx-auto max-w-[1120px] px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663325188422/YmxnXmKxyGfXhEgxEBqPXF/otter-logo_ef58ab33.png" alt="Otter" className="w-7 h-7 rounded-full object-cover" />
            <span className="text-sm font-semibold tracking-tight" style={{ color: textHigh }}>
              Otter
            </span>
          </div>
          <p
            className="text-xs"
            style={{ color: textMuted }}
          >
            &copy; {new Date().getFullYear()} Otter. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
