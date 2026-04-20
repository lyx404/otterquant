/**
 * ScratchCard — 刮刮乐模态弹窗组件
 * 替换范围：
 * 1) 唤起弹窗动效
 * 2) 刮开交互（仅中央等级字母区域达到阈值后自动揭晓）
 * 3) S/A 结果彩带动效
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";

type Grade = "S" | "A" | "B" | "C" | "D";
type ScratchCardStatus = "passed" | "failed";

type HighlightGradeTheme = {
  bg: string;
  text: string;
  border: string;
  shadow: string;
  shadowHover: string;
};

const HIGHLIGHT_GRADE_THEME: Record<Extract<Grade, "S" | "A">, HighlightGradeTheme> = {
  S: {
    bg: "linear-gradient(135deg, #E7C65B 0%, #F3DA84 50%, #E2BC45 100%)",
    text: "#6A4B00",
    border: "#E5C35A",
    shadow: "0 0 20px rgba(229,195,90,0.10), inset 0 1px 0 rgba(255,255,255,0.10)",
    shadowHover: "0 0 30px rgba(229,195,90,0.18), inset 0 1px 0 rgba(255,255,255,0.18)",
  },
  A: {
    bg: "linear-gradient(135deg, #7B61FF 0%, #9B86FF 50%, #6B4FEA 100%)",
    text: "#FFFFFF",
    border: "#9C86F8",
    shadow: "0 0 20px rgba(129,102,248,0.10), inset 0 1px 0 rgba(255,255,255,0.08)",
    shadowHover: "0 0 30px rgba(129,102,248,0.18), inset 0 1px 0 rgba(255,255,255,0.14)",
  },
};

const UNREVEALED_CARD_STYLE = {
  bg: "linear-gradient(135deg, #8B9099 0%, #A1A6B0 50%, #8E949E 100%)",
  text: "#F3F4F6",
  border: "#B8BDC7",
  shadow: "0 0 20px rgba(148,163,184,0.16), inset 0 1px 0 rgba(255,255,255,0.08)",
  shadowHover: "0 0 32px rgba(148,163,184,0.24), inset 0 1px 0 rgba(255,255,255,0.12)",
};

const GRADE_SUBTITLE: Record<Grade, string> = {
  S: "Exceptional",
  A: "Excellent",
  B: "Good",
  C: "Average",
  D: "Below Average",
};

const REVEAL_THRESHOLD = 0.6;
const SCRATCH_RADIUS = 34;
const MASK_OVERDRAW = 4;
const REVEALED_GRADE_STORAGE_PREFIX = "alphaforge_grade_reset_v5_";
const LETTER_REGION = {
  x: 0.32,
  y: 0.28,
  width: 0.36,
  height: 0.34,
};

interface ScratchCardProps {
  factorId: string;
  grade: string;
  status?: ScratchCardStatus;
  onReveal?: (grade: string) => void;
}

function normalizeGrade(value: string): Grade {
  if (value === "S" || value === "A" || value === "B" || value === "C" || value === "D") {
    return value;
  }
  return "D";
}

function shouldCelebrate(grade: Grade): boolean {
  return grade === "S" || grade === "A";
}

function ConfettiLayer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const fire = confetti.create(canvas, { resize: true, useWorker: true });
    const durationMs = 3000;
    const endAt = Date.now() + durationMs;
    const colors = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1"];
    // Opening burst to make celebration instantly visible.
    fire({
      particleCount: 56,
      spread: 82,
      startVelocity: 52,
      origin: { x: 0.5, y: 0.18 },
      gravity: 0.92,
      ticks: 220,
      colors,
    });

    const timer = window.setInterval(() => {
      const timeLeft = endAt - Date.now();
      if (timeLeft <= 0) {
        window.clearInterval(timer);
        return;
      }

      const phase = Math.max(0.2, timeLeft / durationMs);

      // Background ribbon rain across the full modal.
      fire({
        particleCount: Math.max(5, Math.round(14 * phase)),
        spread: 36,
        startVelocity: 36 + Math.random() * 14,
        origin: { x: Math.random(), y: -0.08 },
        gravity: 1.02,
        drift: (Math.random() - 0.5) * 0.6,
        scalar: 0.85 + Math.random() * 0.45,
        ticks: 260,
        colors,
      });

      // Side cannons to match the requested celebratory style.
      fire({
        particleCount: 3,
        angle: 60,
        spread: 52,
        startVelocity: 58,
        origin: { x: 0, y: 0.58 },
        gravity: 0.98,
        ticks: 220,
        colors,
      });
      fire({
        particleCount: 3,
        angle: 120,
        spread: 52,
        startVelocity: 58,
        origin: { x: 1, y: 0.58 },
        gravity: 0.98,
        ticks: 220,
        colors,
      });
    }, 160);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-0 h-full w-full" />;
}

function RevealedGradeCard({
  grade,
  isHovered = false,
  interactive = false,
  size = "card",
  className = "",
  onMouseEnter,
  onMouseLeave,
}: {
  grade: Grade;
  isHovered?: boolean;
  interactive?: boolean;
  size?: "card" | "modal";
  className?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const isHighlightGrade = grade === "S" || grade === "A";
  const revStyle = isHighlightGrade ? HIGHLIGHT_GRADE_THEME[grade] : null;
  const interactiveClass = interactive ? "transition-all duration-300 group" : "";
  const isModal = size === "modal";

  return (
    <div
      className={`text-center relative overflow-hidden ${
        isModal ? "rounded-[28px]" : "rounded-2xl"
      } ${
        isHighlightGrade
          ? ""
          : "border border-slate-300/70 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 dark:border-slate-600/60 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800"
      } ${interactiveClass} ${className}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        backgroundImage: revStyle?.bg,
        border: revStyle ? `1px solid ${revStyle.border}66` : undefined,
        boxShadow: revStyle
          ? isHovered
            ? revStyle.shadowHover
            : revStyle.shadow
          : undefined,
        backgroundSize: revStyle ? "200% 200%" : undefined,
        backgroundPosition: revStyle ? (isHovered ? "100% 50%" : "0% 50%") : undefined,
        transform: interactive
          ? isHovered
            ? "translateY(-1px) scale(1.01)"
            : "translateY(0) scale(1)"
          : undefined,
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent_30%,rgba(255,255,255,0.12)_50%,transparent_70%)] bg-[size:180%_100%] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className={`relative z-10 flex h-full w-full flex-col items-center justify-center ${isModal ? "gap-4" : "gap-1"}`}>
        <div
          className={`label-upper ${isModal ? "text-[clamp(14px,1.8vw,18px)]" : "text-[9px]"} ${
            isHighlightGrade ? "" : "text-slate-600 dark:text-slate-400"
          }`}
          style={{ color: revStyle?.text, opacity: 0.65 }}
        >
          GRADE
        </div>
        <div
          className={`${isModal ? "text-[clamp(72px,10vw,122px)] leading-none" : "text-lg"} font-bold ${
            isHighlightGrade ? "" : "text-slate-900 dark:text-slate-100"
          }`}
          style={{
            color: revStyle?.text,
            textShadow: revStyle ? "0 0 10px rgba(255,255,255,0.12)" : undefined,
          }}
        >
          {grade}
        </div>
        <div
          className={`${isModal ? "text-[clamp(20px,2.6vw,30px)]" : "text-[9px]"} ${
            isHighlightGrade ? "" : "text-slate-700 dark:text-slate-300"
          }`}
          style={{ color: revStyle?.text, opacity: 0.78 }}
        >
          {GRADE_SUBTITLE[grade]}
        </div>
      </div>
    </div>
  );
}

function ScratchSurface({ grade, onDone }: { grade: Grade; onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const isDrawingRef = useRef(false);
  const revealedRef = useRef(false);
  const [started, setStarted] = useState(false);
  const [maskHidden, setMaskHidden] = useState(false);
  const [revealedHovered, setRevealedHovered] = useState(false);

  const initMask = useCallback(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return false;

    const dpr = window.devicePixelRatio || 1;
    const hostWidth = host.clientWidth;
    const hostHeight = host.clientHeight;
    if (hostWidth === 0 || hostHeight === 0) return false;

    const cssWidth = Math.max(1, Math.ceil(hostWidth));
    const cssHeight = Math.max(1, Math.ceil(hostHeight));
    const drawWidth = cssWidth + MASK_OVERDRAW;
    const drawHeight = cssHeight + MASK_OVERDRAW;

    canvas.width = Math.ceil(drawWidth * dpr);
    canvas.height = Math.ceil(drawHeight * dpr);
    canvas.style.width = `${drawWidth}px`;
    canvas.style.height = `${drawHeight}px`;
    canvas.style.left = `-${MASK_OVERDRAW / 2}px`;
    canvas.style.top = `-${MASK_OVERDRAW / 2}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return false;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, drawWidth, drawHeight);

    // Keep scratch mask style consistent with the unrevealed entry card (neutral grey gradient).
    const gradient = ctx.createLinearGradient(0, 0, drawWidth, drawHeight);
    gradient.addColorStop(0, "rgba(171,178,189,1)");
    gradient.addColorStop(0.5, "rgba(160,167,178,1)");
    gradient.addColorStop(1, "rgba(145,153,165,1)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, drawWidth, drawHeight);

    const sheen = ctx.createRadialGradient(
      drawWidth * 0.18,
      drawHeight * 0.12,
      0,
      drawWidth * 0.18,
      drawHeight * 0.12,
      drawWidth * 0.9
    );
    sheen.addColorStop(0, "rgba(255,255,255,0.2)");
    sheen.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, drawWidth, drawHeight);

    for (let i = 0; i < 18; i += 1) {
      const x = Math.random() * drawWidth;
      const y = Math.random() * drawHeight;
      const r = 1 + Math.random() * 4;
      ctx.beginPath();
      ctx.fillStyle =
        i % 3 === 0
          ? "rgba(255,255,255,0.28)"
          : i % 3 === 1
            ? "rgba(255,255,255,0.18)"
            : "rgba(203,213,225,0.22)";
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    revealedRef.current = false;
    setMaskHidden(false);
    setStarted(false);
    setRevealedHovered(false);
    return true;
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let rafId = 0;
    let settleTimer: ReturnType<typeof setTimeout> | null = null;
    const queueInit = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        initMask();
      });
    };

    queueInit();
    // Re-run once after entrance animation settles to avoid fractional seams.
    settleTimer = setTimeout(() => {
      queueInit();
    }, 650);
    const resizeObserver = new ResizeObserver(queueInit);
    resizeObserver.observe(host);
    window.addEventListener("resize", queueInit);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (settleTimer) clearTimeout(settleTimer);
      resizeObserver.disconnect();
      window.removeEventListener("resize", queueInit);
    };
  }, [grade, initMask]);

  const getLetterRevealRatio = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement
  ) => {
    const regionX = Math.floor(canvas.width * LETTER_REGION.x);
    const regionY = Math.floor(canvas.height * LETTER_REGION.y);
    const regionWidth = Math.floor(canvas.width * LETTER_REGION.width);
    const regionHeight = Math.floor(canvas.height * LETTER_REGION.height);

    if (regionWidth <= 0 || regionHeight <= 0) return 0;

    const sample = ctx.getImageData(regionX, regionY, regionWidth, regionHeight).data;
    let transparent = 0;
    const step = 12;

    for (let i = 3; i < sample.length; i += 4 * step) {
      if (sample[i] < 110) transparent += 1;
    }

    const total = sample.length / (4 * step);
    return total > 0 ? transparent / total : 0;
  };

  const eraseAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const rect = host.getBoundingClientRect();
    const x = clientX - rect.left + MASK_OVERDRAW / 2;
    const y = clientY - rect.top + MASK_OVERDRAW / 2;

    ctx.globalCompositeOperation = "destination-out";
    const gradient = ctx.createRadialGradient(x, y, 4, x, y, SCRATCH_RADIUS);
    gradient.addColorStop(0, "rgba(0,0,0,1)");
    gradient.addColorStop(0.72, "rgba(0,0,0,0.92)");
    gradient.addColorStop(1, "rgba(0,0,0,0.22)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, SCRATCH_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    if (!revealedRef.current) {
      const ratio = getLetterRevealRatio(ctx, canvas);
      if (ratio > REVEAL_THRESHOLD) {
        revealedRef.current = true;
        isDrawingRef.current = false;
        setMaskHidden(true);
        onDone();
      }
    }
  };

  return (
    <div
      ref={hostRef}
      className="relative w-full overflow-hidden rounded-[28px] shadow-[0_20px_60px_rgba(9,10,30,0.55)]"
      style={{ aspectRatio: "370 / 220", maxWidth: 520 }}
    >
      <div
        className="h-full w-full transition-opacity duration-150"
        style={{ opacity: started || maskHidden ? 1 : 0 }}
      >
        <RevealedGradeCard
          grade={grade}
          size="modal"
          className="h-full w-full px-8 py-7 md:px-10 md:py-8"
          interactive={maskHidden}
          isHovered={revealedHovered}
          onMouseEnter={() => setRevealedHovered(true)}
          onMouseLeave={() => setRevealedHovered(false)}
        />
      </div>
      <motion.canvas
        ref={canvasRef}
        className={`absolute left-0 top-0 rounded-[28px] touch-none ${
          maskHidden ? "pointer-events-none cursor-default" : "pointer-events-auto cursor-crosshair"
        }`}
        animate={maskHidden ? { opacity: 0 } : { opacity: 1 }}
        transition={{ duration: 0.24 }}
        onPointerDown={(e) => {
          isDrawingRef.current = true;
          setStarted(true);
          eraseAt(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (!isDrawingRef.current || revealedRef.current) return;
          eraseAt(e.clientX, e.clientY);
        }}
        onPointerUp={() => {
          isDrawingRef.current = false;
        }}
        onPointerLeave={() => {
          isDrawingRef.current = false;
        }}
        onPointerCancel={() => {
          isDrawingRef.current = false;
        }}
      />
      {!started && !maskHidden && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="pointer-events-none absolute inset-x-0 bottom-8 text-center text-base text-violet-200/85"
        >
          Scratch to reveal
        </motion.div>
      )}
    </div>
  );
}

export default function ScratchCard({
  factorId,
  grade,
  status = "passed",
  onReveal,
}: ScratchCardProps) {
  const storageKey = `${REVEALED_GRADE_STORAGE_PREFIX}${factorId}`;
  const normalizedGrade = normalizeGrade(grade);
  const isFailed = status === "failed";
  const [revealedGrade, setRevealedGrade] = useState<string | null>(() =>
    localStorage.getItem(storageKey)
  );
  const [showModal, setShowModal] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [modalRevealed, setModalRevealed] = useState(false);

  const openModal = () => {
    if (isFailed) return;
    setModalRevealed(false);
    setShowModal(true);
  };

  const closeModal = useCallback(() => {
    setShowModal(false);
  }, []);

  const handleRevealDone = useCallback(() => {
    if (modalRevealed) return;
    setModalRevealed(true);
    setRevealedGrade(normalizedGrade);
    localStorage.setItem(storageKey, normalizedGrade);
    onReveal?.(normalizedGrade);
  }, [modalRevealed, normalizedGrade, onReveal, storageKey]);

  if (isFailed) {
    return (
      <div className="text-center p-4 rounded-2xl relative overflow-hidden border border-border/60 bg-accent">
        <div className="label-upper mb-1 text-[9px] text-muted-foreground">GRADE</div>
        <div className="text-lg font-bold font-mono text-muted-foreground">-</div>
        <div className="text-[9px] mt-0.5 text-muted-foreground/80">No grade</div>
      </div>
    );
  }

  if (revealedGrade && !showModal) {
    const displayGrade = normalizeGrade(revealedGrade);
    return (
      <RevealedGradeCard
        grade={displayGrade}
        isHovered={isHovered}
        interactive
        className="p-4"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
    );
  }

  return (
    <>
      <div
        className="text-center p-4 rounded-2xl cursor-pointer group transition-all duration-300 relative overflow-hidden"
        style={{
          backgroundImage: UNREVEALED_CARD_STYLE.bg,
          border: `1px solid ${UNREVEALED_CARD_STYLE.border}66`,
          boxShadow: isHovered
            ? UNREVEALED_CARD_STYLE.shadowHover
            : UNREVEALED_CARD_STYLE.shadow,
          backgroundSize: "200% 200%",
          backgroundPosition: isHovered ? "100% 50%" : "0% 50%",
          transform: isHovered ? "translateY(-1px) scale(1.01)" : "translateY(0) scale(1)",
        }}
        onClick={openModal}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
          <div className="absolute w-1 h-1 rounded-full bg-white/30 top-[20%] left-[15%]" style={{ animation: "scratchPulse 3s ease-in-out infinite" }} />
          <div className="absolute w-0.5 h-0.5 rounded-full bg-white/20 top-[60%] left-[75%]" style={{ animation: "scratchPulse 4s ease-in-out 1s infinite" }} />
          <div className="absolute w-0.5 h-0.5 rounded-full bg-white/16 top-[35%] left-[85%]" style={{ animation: "scratchPulse 3.5s ease-in-out 0.5s infinite" }} />
          <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_30%,rgba(255,255,255,0.12)_50%,transparent_70%)] bg-[size:180%_100%] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </div>

        <div
          className="label-upper mb-1 text-[9px]"
          style={{ color: UNREVEALED_CARD_STYLE.text, opacity: 0.65 }}
        >
          GRADE
        </div>
        <div className="relative h-7 flex items-center justify-center">
          <div
            className="text-2xl font-black select-none"
            style={{
              color: UNREVEALED_CARD_STYLE.text,
              animation: "scratchShimmer 3s ease-in-out infinite",
              filter: "drop-shadow(0 0 8px rgba(255,255,255,0.18))",
            }}
          >
            ?
          </div>
        </div>
        <div
          className="text-[9px] mt-1 font-medium tracking-wide"
          style={{
            color: UNREVEALED_CARD_STYLE.text,
            opacity: 0.78,
          }}
        >
          Tap to reveal
        </div>
      </div>

      <style>{`
        @keyframes scratchShimmer {
          0%, 100% { background-position: 0% 50%; filter: drop-shadow(0 0 8px rgba(129,140,248,0.4)); }
          50% { background-position: 100% 50%; filter: drop-shadow(0 0 14px rgba(192,132,252,0.5)); }
        }
        @keyframes scratchPulse {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.8); }
        }
      `}</style>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent
          showCloseButton={false}
          className="!fixed !left-0 !top-0 !z-50 !h-screen !w-screen !max-w-none !translate-x-0 !translate-y-0 rounded-none border-none bg-[#050814]/96 p-0 shadow-none data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100"
          style={{ transform: "none", inset: 0 }}
        >
          <DialogTitle className="sr-only">Scratch card reveal</DialogTitle>

          <div
            className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[#050814]"
            onClick={closeModal}
          >
            <AnimatePresence>
              {modalRevealed && shouldCelebrate(normalizedGrade) && <ConfettiLayer />}
            </AnimatePresence>
            <div
              className="absolute inset-0 z-10 flex items-center justify-center px-2 sm:px-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.92, rotate: -6, y: 18, filter: "blur(6px)" }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  rotate: [-6, 2, 0],
                  y: [18, -4, 0],
                  filter: "blur(0px)",
                }}
                exit={{ opacity: 0, scale: 0.96, rotate: 3, y: 10 }}
                transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
                className="relative mx-auto w-full max-w-[620px] px-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="pointer-events-none absolute inset-[-32px] -z-10 rounded-[44px] bg-[radial-gradient(circle_at_50%_50%,rgba(112,87,255,0.28),rgba(74,155,255,0.12),transparent_68%)] blur-2xl" />
                <div className="pointer-events-none absolute inset-x-[12%] top-[-20px] -z-10 h-20 rounded-full bg-violet-300/18 blur-3xl" />

                <motion.div
                  animate={modalRevealed ? { scale: [1, 1.03, 1] } : { scale: 1 }}
                  transition={{ duration: 0.38 }}
                >
                  <ScratchSurface grade={normalizedGrade} onDone={handleRevealDone} />
                </motion.div>
              </motion.div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
