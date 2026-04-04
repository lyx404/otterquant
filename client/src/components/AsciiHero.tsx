/**
 * AsciiHero — Interactive ASCII-style shader animation
 * Uses Canvas 2D to render a grid of characters that respond to mouse movement.
 * Color palette matches the Indigo design system (#4F47E6).
 */
import { useRef, useEffect, useCallback } from "react";

interface AsciiHeroProps {
  isDark: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const ASCII_CHARS = " .:-=+*#%@";

export function AsciiHero({ isDark, className = "", style }: AsciiHeroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseRef.current = {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Sizing
    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resizeCanvas();

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas);

    // Animation
    const CELL = 14; // px per character cell
    const FONT_SIZE = 11;

    const animate = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const cols = Math.floor(w / CELL);
      const rows = Math.floor(h / CELL);
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const t = timeRef.current;

      ctx.clearRect(0, 0, w, h);

      // Background
      ctx.fillStyle = isDark ? "#0a0a0f" : "#f0f0f5";
      ctx.fillRect(0, 0, w, h);

      ctx.font = `${FONT_SIZE}px "Geist Mono", "SF Mono", "Fira Code", monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const nx = col / cols;
          const ny = row / rows;

          // Distance from mouse
          const dx = nx - mx;
          const dy = ny - my;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Wave pattern
          const wave1 = Math.sin(nx * 8 + t * 0.8) * Math.cos(ny * 6 + t * 0.6);
          const wave2 = Math.sin((nx + ny) * 5 + t * 1.2) * 0.5;
          const wave3 = Math.cos(nx * 12 - t * 0.4) * Math.sin(ny * 10 + t * 0.7) * 0.3;

          // Mouse influence — ripple effect
          const mouseInfluence = Math.max(0, 1 - dist * 3) * Math.sin(dist * 20 - t * 3) * 0.8;

          // Combine
          let brightness = (wave1 + wave2 + wave3 + mouseInfluence) * 0.5 + 0.5;
          brightness = Math.max(0, Math.min(1, brightness));

          // Pick character
          const charIdx = Math.floor(brightness * (ASCII_CHARS.length - 1));
          const char = ASCII_CHARS[charIdx];

          if (char === " ") continue;

          // Color — indigo palette with distance-based intensity
          const mouseGlow = Math.max(0, 1 - dist * 2.5);
          const alpha = 0.15 + brightness * 0.65 + mouseGlow * 0.2;

          if (isDark) {
            // Dark mode: indigo to white gradient based on brightness
            const r = Math.floor(79 + (255 - 79) * brightness * mouseGlow);
            const g = Math.floor(71 + (255 - 71) * brightness * mouseGlow);
            const b = Math.floor(230 + (255 - 230) * brightness * 0.3);
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
          } else {
            // Light mode: deeper indigo
            const r = Math.floor(49 + 30 * brightness);
            const g = Math.floor(41 + 30 * brightness);
            const b = Math.floor(180 + 50 * brightness);
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.8})`;
          }

          const x = col * CELL + CELL / 2;
          const y = row * CELL + CELL / 2;
          ctx.fillText(char, x, y);
        }
      }

      // Vignette overlay
      const gradient = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.7);
      gradient.addColorStop(0, "transparent");
      gradient.addColorStop(1, isDark ? "rgba(0, 0, 0, 0.6)" : "rgba(240, 240, 245, 0.6)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      timeRef.current += 0.02;
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    // Mouse listener on window for smooth tracking
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("mousemove", handleMouseMove);
      resizeObserver.disconnect();
    };
  }, [isDark, handleMouseMove]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        ...style,
      }}
    />
  );
}
