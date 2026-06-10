import React, { useCallback, useEffect, useRef } from "react";

type BorderGlowProps<T extends React.ElementType = "div"> = {
  as?: T;
  children: React.ReactNode;
  className?: string;
  edgeSensitivity?: number;
  glowColor?: string;
  backgroundColor?: string;
  borderRadius?: number;
  glowRadius?: number;
  glowIntensity?: number;
  coneSpread?: number;
  animated?: boolean;
  animationDurationMs?: number;
  colors?: string[];
  fillOpacity?: number;
  perimeterGlow?: boolean;
  holographic?: boolean;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

const GRADIENT_POSITIONS = ["80% 55%", "69% 34%", "8% 6%", "41% 38%", "86% 85%", "82% 18%", "51% 4%"];
const GRADIENT_KEYS = [
  "--gradient-one",
  "--gradient-two",
  "--gradient-three",
  "--gradient-four",
  "--gradient-five",
  "--gradient-six",
  "--gradient-seven",
];
const COLOR_MAP = [0, 1, 2, 0, 1, 2, 1];

function parseHsl(hslStr: string) {
  const match = hslStr.match(/([\d.]+)\s*([\d.]+)%?\s*([\d.]+)%?/);
  if (!match) return { h: 40, s: 80, l: 80 };
  return { h: Number(match[1]), s: Number(match[2]), l: Number(match[3]) };
}

function buildGlowVars(glowColor: string, intensity: number) {
  const { h, s, l } = parseHsl(glowColor);
  const base = `${h}deg ${s}% ${l}%`;
  const opacities = [100, 60, 50, 40, 30, 20, 10];
  const keys = ["", "-60", "-50", "-40", "-30", "-20", "-10"];
  const vars: Record<string, string> = {};

  for (let index = 0; index < opacities.length; index += 1) {
    vars[`--glow-color${keys[index]}`] = `hsl(${base} / ${Math.min(opacities[index] * intensity, 100)}%)`;
  }

  return vars;
}

function buildGradientVars(colors: string[]) {
  const vars: Record<string, string> = {};

  for (let index = 0; index < 7; index += 1) {
    const color = colors[Math.min(COLOR_MAP[index], colors.length - 1)];
    vars[GRADIENT_KEYS[index]] = `radial-gradient(at ${GRADIENT_POSITIONS[index]}, ${color} 0px, transparent 50%)`;
  }

  vars["--gradient-base"] = `linear-gradient(${colors[0]} 0 100%)`;
  return vars;
}

export function BorderGlow<T extends React.ElementType = "div">({
  as,
  children,
  className,
  edgeSensitivity = 30,
  glowColor = "40 80 80",
  backgroundColor = "#120F17",
  borderRadius = 28,
  glowRadius = 40,
  glowIntensity = 1,
  coneSpread = 25,
  animated = false,
  animationDurationMs = 5000,
  colors = ["#c084fc", "#f472b6", "#38bdf8"],
  fillOpacity = 0.5,
  perimeterGlow = false,
  holographic = false,
  ...props
}: BorderGlowProps<T>) {
  const Component = (as || "div") as React.ElementType;
  const cardRef = useRef<HTMLElement | HTMLDivElement | null>(null);
  const isHolographic = holographic;
  const rootClassName = [
    "border-glow-card",
    perimeterGlow ? "border-glow-card--perimeter" : "",
    isHolographic ? "border-glow-card--holographic" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const getCenterOfElement = useCallback((el: HTMLElement) => {
    const { width, height } = el.getBoundingClientRect();
    return [width / 2, height / 2];
  }, []);

  const getEdgeProximity = useCallback(
    (el: HTMLElement, x: number, y: number) => {
      const [cx, cy] = getCenterOfElement(el);
      const dx = x - cx;
      const dy = y - cy;
      let kx = Infinity;
      let ky = Infinity;
      if (dx !== 0) kx = cx / Math.abs(dx);
      if (dy !== 0) ky = cy / Math.abs(dy);
      return Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
    },
    [getCenterOfElement]
  );

  const getCursorAngle = useCallback(
    (el: HTMLElement, x: number, y: number) => {
      const [cx, cy] = getCenterOfElement(el);
      const dx = x - cx;
      const dy = y - cy;
      if (dx === 0 && dy === 0) return 0;
      const radians = Math.atan2(dy, dx);
      let degrees = (radians * 180) / Math.PI + 90;
      if (degrees < 0) degrees += 360;
      return degrees;
    },
    [getCenterOfElement]
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      const card = cardRef.current;
      if (!card) return;

      const rect = card.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const edge = getEdgeProximity(card as HTMLElement, x, y);
      const angle = getCursorAngle(card as HTMLElement, x, y);

      card.style.setProperty("--edge-proximity", `${(edge * 100).toFixed(3)}`);
      card.style.setProperty("--cursor-angle", `${angle.toFixed(3)}deg`);
    },
    [getCursorAngle, getEdgeProximity]
  );

  useEffect(() => {
    if (animated || isHolographic) return;

    document.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
    };
  }, [animated, handlePointerMove, isHolographic]);

  useEffect(() => {
    if (!animated || isHolographic || !cardRef.current) return;
    const card = cardRef.current;
    const cycleMs = animationDurationMs;
    let frameId = 0;
    const startedAt = performance.now();
    card.classList.add("sweep-active");
    card.style.setProperty("--edge-proximity", "100");

    const tick = (now: number) => {
      const elapsed = (now - startedAt) % cycleMs;
      const progress = elapsed / cycleMs;
      card.style.setProperty("--cursor-angle", `${(progress * 360).toFixed(3)}deg`);
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      card.classList.remove("sweep-active");
    };
  }, [animated, animationDurationMs, isHolographic]);

  const glowVars = buildGlowVars(glowColor, glowIntensity);
  const gradientVars = buildGradientVars(colors);

  return (
    <Component
      ref={cardRef as never}
      className={rootClassName}
      style={{
        ["--card-bg" as never]: backgroundColor,
        ["--edge-sensitivity" as never]: edgeSensitivity,
        ["--border-radius" as never]: `${borderRadius}px`,
        ["--glow-padding" as never]: `${glowRadius}px`,
        ["--cone-spread" as never]: coneSpread,
        ["--fill-opacity" as never]: fillOpacity,
        ...glowVars,
        ...gradientVars,
      }}
      {...props}
      >
      {!isHolographic && (
        <>
          <span className="border-glow-card__mesh" aria-hidden="true" />
          <span className="border-glow-card__fill" aria-hidden="true" />
          {perimeterGlow && <span className="border-glow-card__orbit" aria-hidden="true" />}
          <span className="edge-light" />
        </>
      )}
      {isHolographic && (
        <>
          <span className="border-glow-card__holographic-glow" aria-hidden="true" />
          <span className="border-glow-card__holographic-shift" aria-hidden="true" />
        </>
      )}
      <div className="border-glow-inner">{children}</div>
    </Component>
  );
}

export default BorderGlow;
