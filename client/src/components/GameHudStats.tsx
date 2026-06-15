import { useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useInView, useReducedMotion } from "motion/react";
import { formatBalance, HUD_ASSETS } from "@/lib/gameWallet";
import "./GameHudStats.css";

type CountUpProps = {
  to?: number | string;
  children: ReactNode;
  from?: number;
  direction?: "up" | "down";
  delay?: number;
  duration?: number;
  className?: string;
  startWhen?: boolean;
  separator?: string;
  prefix?: string;
  decimals?: number;
  onStart?: () => void;
  onEnd?: () => void;
};

type GameHudStatsProps = {
  coinBalance: number;
  cashBalance: number;
  fishBalance?: number;
  showFish?: boolean;
  tr: (en: string, zh: string) => string;
  onOpenWallet: (accountKind: "coin" | "cash") => void;
};

function CountUp({
  to,
  children,
  from = 0,
  direction = "up",
  delay = 0,
  duration = 0.5,
  className = "",
  startWhen = true,
  separator = ",",
  prefix = "",
  decimals,
  onStart,
  onEnd,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const parseNumber = useCallback((value: unknown) => {
    if (typeof value === "number") return value;
    const matched = String(value ?? "")
      .replace(/,/g, "")
      .match(/-?\d+(\.\d+)?/);
    return matched ? Number(matched[0]) : 0;
  }, []);

  const targetValue = useMemo(
    () => (typeof to === "number" ? to : parseNumber(to ?? children)),
    [children, parseNumber, to],
  );
  const startValue = direction === "down" ? targetValue : from;
  const endValue = direction === "down" ? from : targetValue;
  const isInView = useInView(ref, { once: true, margin: "0px" });

  const getDecimalPlaces = useCallback((num: number) => {
    const str = num.toString();
    if (!str.includes(".")) return 0;
    const decimalPart = str.split(".")[1] ?? "";
    return parseInt(decimalPart, 10) !== 0 ? decimalPart.length : 0;
  }, []);

  const inferredDecimals = Math.max(getDecimalPlaces(from), getDecimalPlaces(targetValue));
  const maxDecimals = decimals ?? inferredDecimals;

  const formatValue = useCallback(
    (latest: number) => {
      const hasDecimals = maxDecimals > 0;
      const formattedNumber = Intl.NumberFormat("en-US", {
        useGrouping: Boolean(separator),
        minimumFractionDigits: hasDecimals ? maxDecimals : 0,
        maximumFractionDigits: hasDecimals ? maxDecimals : 0,
      }).format(latest);
      const normalizedNumber = separator ? formattedNumber.replace(/,/g, separator) : formattedNumber;
      return `${prefix}${normalizedNumber}`;
    },
    [maxDecimals, prefix, separator],
  );

  useEffect(() => {
    if (ref.current) ref.current.textContent = formatValue(startValue);
  }, [formatValue, startValue]);

  useEffect(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (!isInView || !startWhen) return undefined;
    onStart?.();

    if (shouldReduceMotion) {
      if (ref.current) ref.current.textContent = formatValue(endValue);
      onEnd?.();
      return undefined;
    }

    const durationMs = Math.max(duration, 0.1) * 1000;
    const startAnimation = () => {
      const animationStart = performance.now();

      const tick = (now: number) => {
        const progress = Math.min((now - animationStart) / durationMs, 1);
        const latest = startValue + (endValue - startValue) * progress;

        if (ref.current) ref.current.textContent = formatValue(latest);

        if (progress < 1) {
          frameRef.current = window.requestAnimationFrame(tick);
          return;
        }

        frameRef.current = null;
        onEnd?.();
      };

      frameRef.current = window.requestAnimationFrame(tick);
    };

    timeoutRef.current = window.setTimeout(startAnimation, delay * 1000);

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [delay, duration, endValue, formatValue, isInView, onEnd, onStart, shouldReduceMotion, startWhen, startValue]);

  return (
    <span className={className} ref={ref}>
      {children}
    </span>
  );
}

export function GameHudStats({
  coinBalance,
  cashBalance,
  fishBalance,
  showFish = true,
  tr,
  onOpenWallet,
}: GameHudStatsProps) {
  return (
    <div className="hud-top-stats" aria-label={tr("Stats", "数值统计")}>
      <button
        className="hud-stat-card hud-stat-card--button"
        type="button"
        aria-label={tr("Open game coins", "打开游戏币")}
        onClick={() => onOpenWallet("coin")}
      >
        <img
          className="hud-stat-icon"
          src={HUD_ASSETS.coin}
          alt=""
          width="36"
          height="37"
        />
        <div className="hud-stat-value hud-stat-value--balance">
          <CountUp to={coinBalance} duration={0.5}>
            {formatBalance(coinBalance)}
          </CountUp>
        </div>
      </button>

      <button
        className="hud-stat-card hud-stat-card--button"
        type="button"
        aria-label={tr("Open cash", "打开现金")}
        onClick={() => onOpenWallet("cash")}
      >
        <img
          className="hud-stat-icon"
          src={HUD_ASSETS.cash}
          alt=""
          width="44"
          height="28"
        />
        <div className="hud-stat-value hud-stat-value--cash">
          <CountUp to={cashBalance} duration={0.5} prefix="$" decimals={1}>
            {`$${cashBalance.toFixed(1)}`}
          </CountUp>
        </div>
      </button>

      {showFish && typeof fishBalance === "number" && (
        <div className="hud-stat-card" aria-label={tr("Fish balance", "鱼额")}>
          <img
            className="hud-stat-icon"
            src={HUD_ASSETS.fish}
            alt=""
            width="40"
            height="27"
          />
          <div className="hud-stat-value hud-stat-value--fish">
            <CountUp to={fishBalance} duration={0.5}>
              {formatBalance(fishBalance)}
            </CountUp>
          </div>
        </div>
      )}
    </div>
  );
}
