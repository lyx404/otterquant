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
import { EncryptedText } from "@/components/ui/encrypted-text";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import {
  Zap,
  ArrowRight,
  FlaskConical,
  Trophy,
  Bot,
  TrendingUp,
  Shield,
  Download,
  Sun,
  Moon,
  Terminal,
  Cpu,
  Sparkles,
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
  // Dark
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
  // Light
  surfaceLight: "#FFFFFF",
  containerLight: "#F5F5F7",
  borderLight: "rgba(0, 0, 0, 0.06)",
  textHighLight: "#1A1A1E",
  textMutedLight: "#86868B",
  indigoGlowLight: "rgba(79, 71, 230, 0.08)",
};

/* ── Easing ── */
const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

/* ── Steps data ── */
const steps = [
  {
    num: "01",
    title: "Install AI Agent Skill",
    desc: "Load our pre-built skill into your Cursor or Claude Code IDE. The agent understands market microstructure and factor engineering out of the box.",
    icon: Terminal,
  },
  {
    num: "02",
    title: "Mine & Backtest Alphas",
    desc: "Describe your trading intuition in natural language. The AI agent writes, tests, and iterates on quantitative factors automatically.",
    icon: Cpu,
  },
  {
    num: "03",
    title: "Compete & Earn",
    desc: "Submit your best alphas to the Alpha Arena. Compete against other quants in periodic rounds, climb the leaderboard, and earn rewards.",
    icon: Trophy,
  },
];

/* ── Bento feature cards ── */
const bentoCards = [
  {
    title: "AI-Powered Factor Mining",
    desc: "Use natural language prompts to discover quantitative trading factors. Our AI agents handle the heavy lifting — from data processing to statistical validation.",
    img: IMG_MINING,
    icon: FlaskConical,
  },
  {
    title: "Alpha Arena",
    desc: "Periodic competition rounds where quants submit their best alphas. Real-time leaderboards and reward distribution.",
    img: IMG_ARENA,
    icon: Trophy,
  },
  {
    title: "Automated Deployment",
    desc: "Connect exchange accounts and deploy winning strategies directly. Download strategy files or enable automated execution.",
    img: IMG_DEPLOY,
    icon: TrendingUp,
  },
];

/* ── Stats ── */
const stats = [
  { value: "2,400+", label: "Alphas Mined" },
  { value: "580+", label: "Active Quants" },
  { value: "12", label: "Arena Rounds" },
  { value: "99.8%", label: "Uptime" },
];

/* ── Why Otter items ── */
const whyItems = [
  {
    icon: Bot,
    title: "Agent-Native",
    desc: "Purpose-built for AI coding agents like Cursor and Claude Code.",
  },
  {
    icon: Shield,
    title: "Rigorous Validation",
    desc: "In-sample and out-of-sample testing with Sharpe, returns, turnover metrics.",
  },
  {
    icon: Download,
    title: "Strategy Export",
    desc: "Download strategy files or connect exchange accounts for automated execution.",
  },
  {
    icon: Sparkles,
    title: "Competitive Rewards",
    desc: "Periodic Alpha Arena rounds with real rewards for top-performing strategies.",
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
            {/* Logo */}
            <Link href="/landing">
              <div className="flex items-center gap-2.5 cursor-none">
                <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663325188422/YmxnXmKxyGfXhEgxEBqPXF/otter-logo_ef58ab33.png" alt="Otter" className="w-8 h-8 rounded-full object-cover" />
                <span className="font-semibold text-base tracking-tight" style={{ color: textHigh }}>
                  Otter
                </span>
              </div>
            </Link>

            {/* Right */}
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

      {/* ═══════════ PARTICLE BACKGROUND (full page) ═══════════ */}
      <canvas
        ref={canvasRef}
        className="fixed top-0 left-0 w-full h-full pointer-events-none z-0"
        style={{
          maskImage: "radial-gradient(circle at center, white, transparent 80%)",
          WebkitMaskImage: "radial-gradient(circle at center, white, transparent 80%)",
        }}
      />

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative pt-14 overflow-hidden">
        {/* Radial indigo glow */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: "30%",
            left: "50%",
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
          className="relative mx-auto max-w-[1120px] px-6 pt-28 sm:pt-40 pb-24 sm:pb-36 text-center"
        >
          {/* Badge */}
          <div
            data-anim
            className="inline-flex items-center gap-2 px-3 py-1.5 mb-8"
            style={{
              borderRadius: "8px",
              background: isDark ? T.indigoGlow : T.indigoGlowLight,
              border: `1px solid ${T.indigoBorder}`,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: T.indigo }}
            />
            <span
              className="text-[11px] font-medium uppercase"
              style={{
                fontFamily: "'Geist Mono', monospace",
                color: T.indigo,
                letterSpacing: "0.05em",
              }}
            >
              AI-Powered Quant Platform
            </span>
          </div>

          {/* Display XL */}
          <h1
            data-anim
            className="mx-auto max-w-3xl"
            style={{
              fontSize: "clamp(2.5rem, 6vw, 4rem)",
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.04em",
              color: textHigh,
            }}
          >
            Mine Alphas with
            <br />
            <EncryptedText
              text="AI Coding Agents"
              encryptedClassName={isDark ? "text-[#818cf8]" : "text-[#a5b4fc]"}
              revealedClassName={isDark ? "text-[#8B83F0]" : "text-[#4F47E6]"}
              revealDelayMs={50}
              animateOnMount
            />
          </h1>

          <p
            data-anim
            className="mx-auto max-w-lg mt-6 mb-10"
            style={{
              fontSize: "0.9375rem",
              lineHeight: 1.6,
              color: textMuted,
            }}
          >
            Discover quantitative trading factors using natural language.
            Compete in Alpha Arena, climb the leaderboard, and deploy
            winning strategies to live markets.
          </p>

          {/* CTA */}
          <div data-anim className="flex flex-wrap justify-center gap-3">
            <IndigoButton onClick={handleCTA}>
              Get Started
              <ArrowRight className="w-4 h-4" />
            </IndigoButton>
            <IndigoButton
              variant="ghost"
              onClick={() =>
                document
                  .getElementById("how-it-works")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              How It Works
            </IndigoButton>
          </div>
        </div>
      </section>

      {/* ═══════════ HOW IT WORKS — 3 Steps ═══════════ */}
      <section
        id="how-it-works"
        className="py-24 sm:py-32"
        style={{ background: bg }}
      >
        <div className="mx-auto max-w-[1120px] px-6">
          {/* Section header */}
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
              From idea to profit in three steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {steps.map((step) => {
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

      {/* ═══════════ BENTO GRID — Core Features ═══════════ */}
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
              Everything you need to mine, compete, and trade
            </h2>
          </div>

          {/* Bento: 2-col top (large + small), 1-col bottom full */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            {/* Large card — AI Mining (3/5) */}
            <HoverCard
              isDark={isDark}
              className="lg:col-span-3 overflow-hidden group"
            >
              <div data-reveal>
                <div className="p-6 pb-0">
                  <div
                    className="w-10 h-10 flex items-center justify-center mb-4"
                    style={{
                      borderRadius: "8px",
                      background: isDark ? T.indigoGlow : T.indigoGlowLight,
                    }}
                  >
                    <FlaskConical
                      className="w-5 h-5"
                      style={{ color: T.indigo }}
                    />
                  </div>
                  <h3
                    className="text-lg font-semibold mb-2"
                    style={{ color: textHigh, letterSpacing: "-0.01em" }}
                  >
                    {bentoCards[0].title}
                  </h3>
                  <p
                    className="max-w-md"
                    style={{
                      fontSize: "0.875rem",
                      lineHeight: 1.6,
                      color: textMuted,
                    }}
                  >
                    {bentoCards[0].desc}
                  </p>
                </div>
                <div className="mt-6 px-6">
                  <div style={{ borderRadius: "10px 10px 0 0", overflow: "hidden" }}>
                    <img
                      src={bentoCards[0].img}
                      alt={bentoCards[0].title}
                      className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                      style={{ transitionTimingFunction: EASE }}
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>
            </HoverCard>

            {/* Right column — 2 stacked cards (2/5) */}
            <div className="lg:col-span-2 flex flex-col gap-5">
              {/* Arena */}
              <HoverCard isDark={isDark} className="overflow-hidden group flex-1">
                <div data-reveal>
                  <div className="p-6 pb-0">
                    <div
                      className="w-10 h-10 flex items-center justify-center mb-4"
                      style={{
                        borderRadius: "8px",
                        background: isDark ? T.indigoGlow : T.indigoGlowLight,
                      }}
                    >
                      <Trophy
                        className="w-5 h-5"
                        style={{ color: T.indigo }}
                      />
                    </div>
                    <h3
                      className="text-[15px] font-semibold mb-1.5"
                      style={{ color: textHigh, letterSpacing: "-0.01em" }}
                    >
                      {bentoCards[1].title}
                    </h3>
                    <p
                      style={{
                        fontSize: "0.8125rem",
                        lineHeight: 1.6,
                        color: textMuted,
                      }}
                    >
                      {bentoCards[1].desc}
                    </p>
                  </div>
                  <div className="mt-4 px-6">
                    <div
                      style={{
                        borderRadius: "10px 10px 0 0",
                        overflow: "hidden",
                      }}
                    >
                      <img
                        src={bentoCards[1].img}
                        alt={bentoCards[1].title}
                        className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                        style={{ transitionTimingFunction: EASE }}
                        loading="lazy"
                      />
                    </div>
                  </div>
                </div>
              </HoverCard>

              {/* Deploy */}
              <HoverCard isDark={isDark} className="overflow-hidden group flex-1">
                <div data-reveal>
                  <div className="p-6 pb-0">
                    <div
                      className="w-10 h-10 flex items-center justify-center mb-4"
                      style={{
                        borderRadius: "8px",
                        background: isDark ? T.indigoGlow : T.indigoGlowLight,
                      }}
                    >
                      <TrendingUp
                        className="w-5 h-5"
                        style={{ color: T.indigo }}
                      />
                    </div>
                    <h3
                      className="text-[15px] font-semibold mb-1.5"
                      style={{ color: textHigh, letterSpacing: "-0.01em" }}
                    >
                      {bentoCards[2].title}
                    </h3>
                    <p
                      style={{
                        fontSize: "0.8125rem",
                        lineHeight: 1.6,
                        color: textMuted,
                      }}
                    >
                      {bentoCards[2].desc}
                    </p>
                  </div>
                  <div className="mt-4 px-6">
                    <div
                      style={{
                        borderRadius: "10px 10px 0 0",
                        overflow: "hidden",
                      }}
                    >
                      <img
                        src={bentoCards[2].img}
                        alt={bentoCards[2].title}
                        className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                        style={{ transitionTimingFunction: EASE }}
                        loading="lazy"
                      />
                    </div>
                  </div>
                </div>
              </HoverCard>
            </div>
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
            {stats.map((stat) => (
              <div key={stat.label} data-reveal className="text-center">
                <p
                  className="text-3xl sm:text-4xl font-bold mb-1.5"
                  style={{
                    fontFamily: "'Geist Mono', monospace",
                    background: T.neuralGradient,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    letterSpacing: "-0.02em",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {stat.value}
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

      {/* ═══════════ WHY OTTER — 4 cards ═══════════ */}
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
              Why Otter
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
              Built for the next generation of quants
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {whyItems.map((item) => {
              const Icon = item.icon;
              return (
                <HoverCard key={item.title} isDark={isDark} className="p-5">
                  <div data-reveal>
                    <div
                      className="w-9 h-9 flex items-center justify-center mb-3"
                      style={{
                        borderRadius: "8px",
                        background: isDark ? T.indigoGlow : T.indigoGlowLight,
                      }}
                    >
                      <Icon
                        className="w-4 h-4"
                        style={{ color: T.indigo }}
                      />
                    </div>
                    <h4
                      className="text-sm font-semibold mb-1.5"
                      style={{ color: textHigh }}
                    >
                      {item.title}
                    </h4>
                    <p
                      style={{
                        fontSize: "0.8125rem",
                        lineHeight: 1.6,
                        color: textMuted,
                      }}
                    >
                      {item.desc}
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
        className="py-24 sm:py-32 relative overflow-hidden"
        style={{ background: bg }}
      >
        {/* Ambient glow */}
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
            Ready to mine your first alpha?
          </h2>
          <p
            data-reveal
            className="mx-auto max-w-md mb-10"
            style={{
              fontSize: "0.9375rem",
              lineHeight: 1.6,
              color: textMuted,
            }}
          >
            Join the platform, install the AI agent skill, and start
            discovering profitable trading factors today.
          </p>
          <div data-reveal>
            <IndigoButton onClick={handleCTA}>
              {isAuthenticated ? "Go to Dashboard" : "Create Free Account"}
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
