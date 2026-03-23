/*
 * Landing Page — Otter Platform Introduction
 * Indigo/Sky + Slate Design System
 * Hero section with generated background + 3-step How It Works + Features + CTA
 * Asymmetric layout, left-aligned text, GSAP entrance animations
 */
import { useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import gsap from "gsap";
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
  ChevronDown,
} from "lucide-react";

const HERO_BG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663325188422/YmxnXmKxyGfXhEgxEBqPXF/landing-hero-coY3cAoD9t7ssyFKnTfQnY.webp";
const IMG_MINING =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663325188422/YmxnXmKxyGfXhEgxEBqPXF/landing-feature-mining-4SM7Mtdb5zxAMApiozu4qy.webp";
const IMG_ARENA =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663325188422/YmxnXmKxyGfXhEgxEBqPXF/landing-feature-arena-L4uaymu8pCjSpRbejV9hon.webp";
const IMG_AUTOMATE =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663325188422/YmxnXmKxyGfXhEgxEBqPXF/landing-feature-automate-FdncT47nD3LNw8LPv36faP.webp";

const steps = [
  {
    num: "01",
    title: "Install AI Agent Skill",
    desc: "Load our pre-built skill into your Cursor or Claude Code IDE. The agent understands market microstructure and factor engineering out of the box.",
    icon: Bot,
  },
  {
    num: "02",
    title: "Mine & Backtest Alphas",
    desc: "Describe your trading intuition in natural language. The AI agent writes, tests, and iterates on quantitative factors — generating PnL curves, Sharpe ratios, and turnover metrics automatically.",
    icon: FlaskConical,
  },
  {
    num: "03",
    title: "Compete & Earn",
    desc: "Submit your best alphas to the Alpha Arena. Compete against other quants in periodic rounds, climb the leaderboard, and earn rewards for top-performing strategies.",
    icon: Trophy,
  },
];

const features = [
  {
    title: "AI-Powered Factor Mining",
    desc: "Use natural language prompts to discover quantitative trading factors. Our AI agents handle the heavy lifting — from data processing to statistical validation.",
    img: IMG_MINING,
    icon: FlaskConical,
  },
  {
    title: "Alpha Arena Competitions",
    desc: "Periodic competition rounds where quants submit their best alphas. Real-time leaderboards, OS (out-of-sample) validation, and reward distribution for top performers.",
    img: IMG_ARENA,
    icon: Trophy,
  },
  {
    title: "Automated Trading",
    desc: "Connect your exchange accounts and deploy winning strategies directly. Download strategy files or enable automated execution with subscription-based access.",
    img: IMG_AUTOMATE,
    icon: TrendingUp,
  },
];

export default function Landing() {
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const heroRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Hero entrance
    if (heroRef.current) {
      const els = heroRef.current.querySelectorAll("[data-anim]");
      gsap.fromTo(
        els,
        { opacity: 0, y: 32 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.12,
          ease: "power3.out",
        }
      );
    }

    // Steps entrance on scroll
    if (stepsRef.current) {
      const cards = stepsRef.current.querySelectorAll("[data-step]");
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              gsap.fromTo(
                entry.target,
                { opacity: 0, y: 40 },
                { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }
              );
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15 }
      );
      cards.forEach((c) => observer.observe(c));
      return () => observer.disconnect();
    }
  }, []);

  // Scroll-triggered animation for features
  useEffect(() => {
    if (!featuresRef.current) return;
    const items = featuresRef.current.querySelectorAll("[data-feature]");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            gsap.fromTo(
              entry.target,
              { opacity: 0, y: 48 },
              { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }
            );
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    items.forEach((i) => observer.observe(i));
    return () => observer.disconnect();
  }, []);

  const handleCTA = () => {
    if (isAuthenticated) {
      navigate("/");
    } else {
      navigate("/auth");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Floating Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-border/50">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="flex h-11 items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-primary/10">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <span className="font-semibold text-base tracking-tight text-foreground">
                Otter
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={toggleTheme}
                className="w-8 h-8 rounded-full flex items-center justify-center border border-border bg-accent hover:bg-slate-200 dark:hover:bg-slate-800 transition-all duration-200"
                title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === "dark" ? (
                  <Sun className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-slate-500" />
                )}
              </button>
              {isAuthenticated ? (
                <Link href="/">
                  <Button size="sm" className="h-8 text-xs font-medium px-4">
                    Dashboard
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </Link>
              ) : (
                <Link href="/auth">
                  <Button size="sm" className="h-8 text-xs font-medium px-4">
                    Log In
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative pt-11 overflow-hidden">
        {/* Background image — dark overlay for text readability */}
        <div className="absolute inset-0">
          <img
            src={HERO_BG}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/50 to-background dark:from-slate-950/60 dark:via-slate-950/40 dark:to-background" />
        </div>

        <div
          ref={heroRef}
          className="relative mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28 pb-16 sm:pb-24"
        >
          <div className="max-w-2xl">
            <div
              data-anim
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 dark:bg-primary/10 border border-white/20 dark:border-primary/20 mb-6"
            >
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-indigo-300 dark:text-primary">
                AI-Powered Quant Platform
              </span>
            </div>

            <h1
              data-anim
              className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white dark:text-foreground leading-[1.1] mb-5"
            >
              Mine Alphas with
              <br />
              <span className="text-indigo-300 dark:text-primary">AI Coding Agents</span>
            </h1>

            <p
              data-anim
              className="text-base sm:text-lg text-slate-300 dark:text-muted-foreground leading-relaxed mb-8 max-w-lg"
            >
              Discover quantitative trading factors using natural language.
              Compete in Alpha Arena, climb the leaderboard, and deploy
              winning strategies to live markets.
            </p>

            <div data-anim className="flex flex-wrap gap-3">
              <Button
                size="lg"
                className="h-11 px-6 text-sm font-medium"
                onClick={handleCTA}
              >
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-11 px-6 text-sm font-medium"
                onClick={() => {
                  stepsRef.current?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                How It Works
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section
        ref={stepsRef}
        className="py-20 sm:py-28 bg-background"
      >
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="mb-14">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-primary mb-3">
              How It Works
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              From idea to profit in three steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.num}
                  data-step
                  className="group relative bg-card border border-border rounded-2xl p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
                  style={{ opacity: 0 }}
                >
                  {/* Step number */}
                  <span className="text-[11px] font-mono font-medium text-muted-foreground/50 tracking-wider">
                    STEP {step.num}
                  </span>

                  <div className="mt-4 mb-3 w-10 h-10 rounded-xl flex items-center justify-center bg-primary/8 group-hover:bg-primary/12 transition-colors duration-300">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>

                  <h3 className="text-base font-semibold text-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════ FEATURES ═══════════ */}
      <section
        ref={featuresRef}
        className="py-20 sm:py-28 bg-muted/30"
      >
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="mb-14">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-primary mb-3">
              Core Features
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Everything you need to mine, compete, and trade
            </h2>
          </div>

          <div className="space-y-16 sm:space-y-24">
            {features.map((feat, idx) => {
              const Icon = feat.icon;
              const isReversed = idx % 2 !== 0;
              return (
                <div
                  key={feat.title}
                  data-feature
                  className={`flex flex-col gap-8 lg:gap-12 items-center ${
                    isReversed ? "lg:flex-row-reverse" : "lg:flex-row"
                  }`}
                  style={{ opacity: 0 }}
                >
                  {/* Text */}
                  <div className="flex-1 max-w-lg">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/8 mb-4">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3">
                      {feat.title}
                    </h3>
                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                      {feat.desc}
                    </p>
                  </div>

                  {/* Image */}
                  <div className="flex-1 w-full max-w-md lg:max-w-none">
                    <div className="rounded-2xl overflow-hidden border border-border bg-card shadow-sm">
                      <img
                        src={feat.img}
                        alt={feat.title}
                        className="w-full h-auto object-cover"
                        loading="lazy"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════ PLATFORM HIGHLIGHTS ═══════════ */}
      <section className="py-20 sm:py-28 bg-background">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="mb-14">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-primary mb-3">
              Why Otter
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Built for the next generation of quants
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: Bot,
                title: "Agent-Native",
                desc: "Purpose-built for AI coding agents like Cursor and Claude Code. No manual coding required.",
              },
              {
                icon: Shield,
                title: "Rigorous Validation",
                desc: "In-sample and out-of-sample testing with Sharpe, returns, turnover, and drawdown metrics.",
              },
              {
                icon: Download,
                title: "Strategy Export",
                desc: "Download strategy files or connect exchange accounts for direct automated execution.",
              },
              {
                icon: Trophy,
                title: "Competitive Rewards",
                desc: "Periodic Alpha Arena rounds with real rewards for top-performing strategies.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="p-5 rounded-2xl border border-border bg-card hover:border-primary/20 transition-all duration-300"
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary/8 mb-3">
                    <Icon className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <h4 className="text-sm font-semibold text-foreground mb-1.5">
                    {item.title}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════ CTA ═══════════ */}
      <section className="py-20 sm:py-28 bg-muted/30">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-4">
            Ready to mine your first alpha?
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mb-8 max-w-md mx-auto">
            Join the platform, install the AI agent skill, and start
            discovering profitable trading factors today.
          </p>
          <Button
            size="lg"
            className="h-11 px-8 text-sm font-medium"
            onClick={handleCTA}
          >
            {isAuthenticated ? "Go to Dashboard" : "Create Free Account"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="py-8 border-t border-border bg-background">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-primary/10">
              <Zap className="w-3 h-3 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">Otter</span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Otter. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
