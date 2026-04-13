/*
 * GradeRevealModal — Emotional grade reveal animation
 * Centered overlay with grade letter, glow, particles, and label
 * Two modes:
 *   1. Single grade reveal (platform agent: after generating a factor)
 *   2. Batch grade summary (own agent: when returning to alphas page)
 * Design: Indigo/Sky + Slate | GSAP animations
 */
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { X } from "lucide-react";
import { type AlphaGrade, GRADE_CONFIG } from "@/lib/mockData";

/* ── Single Grade Reveal ── */
interface SingleRevealProps {
  grade: AlphaGrade;
  factorName?: string;
  onClose: () => void;
}

export function GradeRevealSingle({ grade, factorName, onClose }: SingleRevealProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const gradeRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const config = GRADE_CONFIG[grade];

  useEffect(() => {
    const tl = gsap.timeline();

    // Backdrop fade in
    tl.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3 });

    // Ring pulse
    tl.fromTo(ringRef.current,
      { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.6, ease: "back.out(1.7)" },
      0.2
    );

    // Grade letter slam in
    tl.fromTo(gradeRef.current,
      { scale: 3, opacity: 0, rotateZ: -15 },
      { scale: 1, opacity: 1, rotateZ: 0, duration: 0.5, ease: "back.out(2)" },
      0.4
    );

    // Particles burst
    if (particlesRef.current) {
      const particles = particlesRef.current.children;
      tl.fromTo(particles,
        { scale: 0, opacity: 1 },
        { scale: 1, opacity: 0, duration: 0.8, stagger: 0.03, ease: "power2.out" },
        0.5
      );
    }

    // Label fade in
    tl.fromTo(labelRef.current,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.4, ease: "power3.out" },
      0.7
    );

    // Factor name
    if (nameRef.current) {
      tl.fromTo(nameRef.current,
        { y: 10, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.3, ease: "power3.out" },
        0.9
      );
    }

    // Continuous glow pulse on grade
    gsap.to(gradeRef.current, {
      textShadow: `0 0 60px ${config.color}, 0 0 120px ${config.color}40`,
      duration: 1.5,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      delay: 1,
    });

    return () => { tl.kill(); };
  }, [grade, config.color]);

  // Generate particle positions
  const particles = Array.from({ length: 16 }, (_, i) => {
    const angle = (i / 16) * Math.PI * 2;
    const radius = 100 + Math.random() * 60;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      size: 3 + Math.random() * 5,
    };
  });

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all duration-200"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="relative flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
        {/* Glow ring */}
        <div
          ref={ringRef}
          className="absolute w-48 h-48 rounded-full"
          style={{
            background: `radial-gradient(circle, ${config.color}20 0%, transparent 70%)`,
            boxShadow: config.glow,
          }}
        />

        {/* Particles */}
        <div ref={particlesRef} className="absolute">
          {particles.map((p, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: p.size,
                height: p.size,
                backgroundColor: config.color,
                left: p.x,
                top: p.y,
                transform: "translate(-50%, -50%)",
              }}
            />
          ))}
        </div>

        {/* Grade Letter */}
        <div
          ref={gradeRef}
          className="relative text-[120px] font-black leading-none select-none"
          style={{
            color: config.color,
            textShadow: `0 0 40px ${config.color}, 0 0 80px ${config.color}30`,
          }}
        >
          {grade}
        </div>

        {/* Label */}
        <div ref={labelRef} className="mt-4 text-center">
          <div
            className="text-lg font-semibold tracking-wider uppercase"
            style={{ color: config.color }}
          >
            {config.label}
          </div>
        </div>

        {/* Factor Name */}
        {factorName && (
          <div ref={nameRef} className="mt-3 text-center">
            <div className="text-sm text-white/60 font-mono">{factorName}</div>
          </div>
        )}

        {/* Dismiss hint */}
        <div className="mt-8 text-xs text-white/30 animate-pulse">
          Click anywhere to continue
        </div>
      </div>
    </div>
  );
}

/* ── Batch Grade Summary ── */
interface GradeSummaryItem {
  grade: AlphaGrade;
  count: number;
}

interface BatchRevealProps {
  grades: GradeSummaryItem[];
  onClose: () => void;
}

export function GradeRevealBatch({ grades, onClose }: BatchRevealProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const [animDone, setAnimDone] = useState(false);

  const totalCount = grades.reduce((sum, g) => sum + g.count, 0);

  useEffect(() => {
    const tl = gsap.timeline({
      onComplete: () => setAnimDone(true),
    });

    // Backdrop
    tl.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3 });

    // Title
    tl.fromTo(titleRef.current,
      { y: -30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" },
      0.2
    );

    // Cards stagger
    if (cardsRef.current) {
      const cards = cardsRef.current.children;
      tl.fromTo(cards,
        { scale: 0.5, opacity: 0, y: 40 },
        { scale: 1, opacity: 1, y: 0, duration: 0.5, stagger: 0.12, ease: "back.out(1.5)" },
        0.4
      );
    }

    return () => { tl.kill(); };
  }, []);

  // Sort by grade priority: S > A > B > C > D
  const sortedGrades = [...grades].sort((a, b) => {
    const order: Record<AlphaGrade, number> = { S: 0, A: 1, B: 2, C: 3, D: 4 };
    return order[a.grade] - order[b.grade];
  });

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all duration-200"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="flex flex-col items-center max-w-lg w-full px-6" onClick={(e) => e.stopPropagation()}>
        {/* Title */}
        <div ref={titleRef} className="text-center mb-8">
          <div className="text-2xl font-bold text-white mb-2">New Alpha Results</div>
          <div className="text-sm text-white/50">
            {totalCount} alpha{totalCount !== 1 ? "s" : ""} generated while you were away
          </div>
        </div>

        {/* Grade Cards */}
        <div ref={cardsRef} className="flex flex-wrap justify-center gap-4">
          {sortedGrades.map((item) => {
            const config = GRADE_CONFIG[item.grade];
            return (
              <div
                key={item.grade}
                className="relative flex flex-col items-center justify-center w-28 h-36 rounded-2xl border transition-transform duration-200 hover:scale-105"
                style={{
                  backgroundColor: config.bg,
                  borderColor: config.border,
                  boxShadow: config.glow,
                }}
              >
                {/* Count badge */}
                <div
                  className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    backgroundColor: config.color,
                    color: item.grade === "C" || item.grade === "S" ? "#000" : "#FFF",
                  }}
                >
                  {item.count}
                </div>

                <div
                  className="text-5xl font-black leading-none"
                  style={{
                    color: config.color,
                    textShadow: `0 0 20px ${config.color}60`,
                  }}
                >
                  {item.grade}
                </div>
                <div
                  className="mt-2 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: config.color }}
                >
                  {config.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Dismiss */}
        <div className="mt-8 text-xs text-white/30 animate-pulse">
          Click anywhere to continue
        </div>
      </div>
    </div>
  );
}

/* ── Hook: manage grade reveal state ── */
export function useGradeReveal() {
  const [singleReveal, setSingleReveal] = useState<{ grade: AlphaGrade; factorName?: string } | null>(null);
  const [batchReveal, setBatchReveal] = useState<GradeSummaryItem[] | null>(null);

  const showSingle = (grade: AlphaGrade, factorName?: string) => {
    setSingleReveal({ grade, factorName });
  };

  const showBatch = (grades: GradeSummaryItem[]) => {
    setBatchReveal(grades);
  };

  const closeSingle = () => setSingleReveal(null);
  const closeBatch = () => setBatchReveal(null);

  return {
    singleReveal,
    batchReveal,
    showSingle,
    showBatch,
    closeSingle,
    closeBatch,
  };
}
