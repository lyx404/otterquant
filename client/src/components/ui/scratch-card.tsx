/**
 * ScratchCard — 刮刮乐模态弹窗组件
 * Canvas 刮涂层 + S/A 礼花动效 + localStorage 持久化
 */
import { useState, useRef, useEffect, useCallback } from "react";

/* ── Confetti 粒子系统 ── */
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  shape: "rect" | "circle" | "strip";
}

function ConfettiCanvas({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (!active || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96E6A1", "#DDA0DD", "#F7DC6F", "#BB8FCE", "#85C1E9", "#F8C471"];
    const shapes: Particle["shape"][] = ["rect", "circle", "strip"];

    // 创建粒子 — 从顶部和两侧喷射
    for (let i = 0; i < 150; i++) {
      const fromTop = Math.random() > 0.3;
      particlesRef.current.push({
        x: fromTop ? Math.random() * canvas.width : (Math.random() > 0.5 ? -10 : canvas.width + 10),
        y: fromTop ? -10 : Math.random() * canvas.height * 0.5,
        vx: (Math.random() - 0.5) * 8,
        vy: Math.random() * 4 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        opacity: 1,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      particlesRef.current.forEach((p) => {
        if (p.opacity <= 0) return;
        alive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12; // gravity
        p.vx *= 0.99;
        p.rotation += p.rotationSpeed;
        p.opacity -= 0.004;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;

        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        } else if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -1, p.size, 2);
        }
        ctx.restore();
      });

      if (alive) {
        animRef.current = requestAnimationFrame(animate);
      }
    };
    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
      particlesRef.current = [];
    };
  }, [active]);

  if (!active) return null;
  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 9999 }}
    />
  );
}

/* ── Grade 配色 ── */
const GRADE_STYLES: Record<string, { bg: string; text: string; glow: string }> = {
  S: { bg: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)", text: "#000", glow: "0 0 40px rgba(255,215,0,0.5)" },
  A: { bg: "linear-gradient(135deg, #C084FC 0%, #818CF8 100%)", text: "#FFF", glow: "0 0 40px rgba(129,140,248,0.5)" },
  B: { bg: "linear-gradient(135deg, #34D399 0%, #10B981 100%)", text: "#FFF", glow: "0 0 30px rgba(52,211,153,0.3)" },
  C: { bg: "linear-gradient(135deg, #60A5FA 0%, #3B82F6 100%)", text: "#FFF", glow: "0 0 30px rgba(96,165,250,0.3)" },
  D: { bg: "linear-gradient(135deg, #94A3B8 0%, #64748B 100%)", text: "#FFF", glow: "0 0 20px rgba(148,163,184,0.2)" },
};

/* ── 主组件 ── */
interface ScratchCardProps {
  factorId: string;
  grade: string;
  onReveal?: (grade: string) => void;
}

export default function ScratchCard({ factorId, grade, onReveal }: ScratchCardProps) {
  const storageKey = `alphaforge_grade_${factorId}`;
  const [revealedGrade, setRevealedGrade] = useState<string | null>(() => {
    return localStorage.getItem(storageKey);
  });
  const [showModal, setShowModal] = useState(false);
  const [isScratching, setIsScratching] = useState(false);
  const [scratchPercent, setScratchPercent] = useState(0);
  const [fullyRevealed, setFullyRevealed] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  const CARD_W = 280;
  const CARD_H = 320;

  // 初始化刮涂层
  const initScratchLayer = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = CARD_W;
    canvas.height = CARD_H;

    // 银灰色刮涂层 + 纹理
    const gradient = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
    gradient.addColorStop(0, "#C0C0C0");
    gradient.addColorStop(0.5, "#D4D4D4");
    gradient.addColorStop(1, "#A8A8A8");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CARD_W, CARD_H);

    // 添加纹理噪点
    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * CARD_W;
      const y = Math.random() * CARD_H;
      ctx.fillStyle = `rgba(${Math.random() > 0.5 ? 180 : 160}, ${Math.random() > 0.5 ? 180 : 160}, ${Math.random() > 0.5 ? 180 : 160}, 0.3)`;
      ctx.fillRect(x, y, 1, 1);
    }

    // 中间文字提示
    ctx.fillStyle = "rgba(100, 100, 100, 0.6)";
    ctx.font = "bold 16px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("✨ Scratch to reveal ✨", CARD_W / 2, CARD_H / 2 - 10);
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillText("Your Alpha Grade", CARD_W / 2, CARD_H / 2 + 15);
  }, []);

  useEffect(() => {
    if (showModal && !revealedGrade) {
      // 延迟初始化确保 canvas 已挂载
      requestAnimationFrame(() => {
        initScratchLayer();
      });
    }
  }, [showModal, revealedGrade, initScratchLayer]);

  // 计算刮开百分比
  const calcScratchPercent = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const ctx = canvas.getContext("2d")!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    let transparent = 0;
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] === 0) transparent++;
    }
    return transparent / (pixels.length / 4);
  }, []);

  // 刮除操作
  const scratch = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 28, 0, Math.PI * 2);
    ctx.fill();

    // 连线刮除（平滑）
    if (lastPosRef.current.x !== 0 || lastPosRef.current.y !== 0) {
      ctx.lineWidth = 56;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    lastPosRef.current = { x, y };

    const pct = calcScratchPercent();
    setScratchPercent(pct);

    // 刮开超过 50% 自动揭开
    if (pct > 0.5 && !fullyRevealed) {
      setFullyRevealed(true);
      setRevealedGrade(grade);
      localStorage.setItem(storageKey, grade);
      onReveal?.(grade);

      // S/A 播放礼花
      if (grade === "S" || grade === "A") {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 4000);
      }
    }
  }, [calcScratchPercent, fullyRevealed, grade, storageKey, onReveal]);

  const getCanvasPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  const handleStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDrawingRef.current = true;
    setIsScratching(true);
    const pos = getCanvasPos(e);
    lastPosRef.current = pos;
    scratch(pos.x, pos.y);
  }, [getCanvasPos, scratch]);

  const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDrawingRef.current) return;
    const pos = getCanvasPos(e);
    scratch(pos.x, pos.y);
  }, [getCanvasPos, scratch]);

  const handleEnd = useCallback((e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    isDrawingRef.current = false;
    setIsScratching(false);
    lastPosRef.current = { x: 0, y: 0 };
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setFullyRevealed(false);
    setScratchPercent(0);
  }, []);

  const gradeStyle = GRADE_STYLES[grade] || GRADE_STYLES.D;

  // ── 已揭开状态：直接显示 Grade ──
  if (revealedGrade) {
    const revStyle = GRADE_STYLES[revealedGrade] || GRADE_STYLES.D;
    return (
      <div className="text-center p-4 rounded-2xl bg-accent border border-border/60">
        <div className="label-upper mb-1 text-[9px]">GRADE</div>
        <div
          className="text-lg font-bold font-mono"
          style={{
            background: revStyle.bg,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {revealedGrade}
        </div>
        <div className="text-[9px] text-muted-foreground mt-0.5">
          {revealedGrade === "S" ? "Exceptional" : revealedGrade === "A" ? "Excellent" : revealedGrade === "B" ? "Good" : revealedGrade === "C" ? "Average" : "Below Average"}
        </div>
      </div>
    );
  }

  // ── 未揭开状态：显示刮刮乐入口（强调未知感） ──
  return (
    <>
      <div
        className="text-center p-4 rounded-2xl cursor-pointer group transition-all duration-500 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(30,20,50,0.9) 0%, rgba(15,10,30,0.95) 100%)",
          border: "1px solid rgba(129,140,248,0.2)",
          boxShadow: "0 0 20px rgba(129,140,248,0.08), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
        onClick={() => setShowModal(true)}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "rgba(129,140,248,0.45)";
          e.currentTarget.style.boxShadow = "0 0 30px rgba(129,140,248,0.15), inset 0 1px 0 rgba(255,255,255,0.08)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgba(129,140,248,0.2)";
          e.currentTarget.style.boxShadow = "0 0 20px rgba(129,140,248,0.08), inset 0 1px 0 rgba(255,255,255,0.05)";
        }}
      >
        {/* 微光粒子背景 */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
          <div className="absolute w-1 h-1 rounded-full bg-indigo-400/40 top-[20%] left-[15%]" style={{ animation: "scratchPulse 3s ease-in-out infinite" }} />
          <div className="absolute w-0.5 h-0.5 rounded-full bg-purple-400/30 top-[60%] left-[75%]" style={{ animation: "scratchPulse 4s ease-in-out 1s infinite" }} />
          <div className="absolute w-0.5 h-0.5 rounded-full bg-sky-400/25 top-[35%] left-[85%]" style={{ animation: "scratchPulse 3.5s ease-in-out 0.5s infinite" }} />
        </div>

        <div className="label-upper mb-1 text-[9px] text-white/40">GRADE</div>
        <div className="relative h-7 flex items-center justify-center">
          {/* 问号 — 脉冲呼吸 */}
          <div
            className="text-2xl font-black font-mono select-none"
            style={{
              background: "linear-gradient(135deg, #818cf8 0%, #c084fc 50%, #818cf8 100%)",
              backgroundSize: "200% 200%",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              animation: "scratchShimmer 3s ease-in-out infinite",
              filter: "drop-shadow(0 0 8px rgba(129,140,248,0.4))",
            }}
          >
            ?
          </div>
        </div>
        <div
          className="text-[9px] mt-1 font-medium tracking-wide"
          style={{
            background: "linear-gradient(90deg, rgba(129,140,248,0.6), rgba(192,132,252,0.6))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Tap to reveal
        </div>
      </div>

      {/* 内联动画 keyframes */}
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

      {/* ── 模态弹窗 ── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={closeModal}
        >
          {/* 背景遮罩 */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* 卡片容器 */}
          <div
            className="relative"
            onClick={(e) => e.stopPropagation()}
            style={{ width: CARD_W, height: CARD_H }}
          >
            {/* 底层：Grade 结果 */}
            <div
              className="absolute inset-0 rounded-3xl flex flex-col items-center justify-center gap-3 overflow-hidden"
              style={{
                background: gradeStyle.bg,
                boxShadow: fullyRevealed ? gradeStyle.glow : "none",
              }}
            >
              <div className="text-[11px] font-semibold tracking-[0.2em] uppercase" style={{ color: `${gradeStyle.text}99` }}>
                YOUR GRADE
              </div>
              <div
                className="text-8xl font-black font-mono leading-none"
                style={{
                  color: gradeStyle.text,
                  textShadow: fullyRevealed ? `0 0 20px ${gradeStyle.text}40` : "none",
                  transform: fullyRevealed ? "scale(1)" : "scale(0.9)",
                  transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              >
                {grade}
              </div>
              <div className="text-sm font-medium" style={{ color: `${gradeStyle.text}CC` }}>
                {grade === "S" ? "Exceptional Alpha!" : grade === "A" ? "Excellent Alpha!" : grade === "B" ? "Good Alpha" : grade === "C" ? "Average Alpha" : "Below Average"}
              </div>
              {fullyRevealed && (grade === "S" || grade === "A") && (
                <div className="text-xs mt-2 animate-bounce" style={{ color: `${gradeStyle.text}AA` }}>
                  🎉 Congratulations! 🎉
                </div>
              )}
              {fullyRevealed && (
                <div className="text-[10px] mt-4 opacity-60" style={{ color: gradeStyle.text }}>
                  Tap anywhere to close
                </div>
              )}
            </div>

            {/* 刮涂层 Canvas */}
            {!fullyRevealed && (
              <canvas
                ref={canvasRef}
                className="absolute inset-0 rounded-3xl touch-none"
                style={{
                  cursor: isScratching ? "grabbing" : "grab",
                  opacity: fullyRevealed ? 0 : 1,
                  transition: "opacity 0.5s ease-out",
                }}
                onMouseDown={handleStart}
                onMouseMove={handleMove}
                onMouseUp={handleEnd}
                onMouseLeave={handleEnd}
                onTouchStart={handleStart}
                onTouchMove={handleMove}
                onTouchEnd={handleEnd}
              />
            )}

            {/* 刮开进度提示 */}
            {!fullyRevealed && scratchPercent > 0.1 && (
              <div className="absolute bottom-3 left-0 right-0 text-center pointer-events-none">
                <span className="text-[10px] text-white/60 bg-black/40 px-2 py-0.5 rounded-full">
                  {Math.round(scratchPercent * 100)}% revealed
                </span>
              </div>
            )}
          </div>

          {/* Confetti 礼花 */}
          <ConfettiCanvas active={showConfetti} />
        </div>
      )}
    </>
  );
}
