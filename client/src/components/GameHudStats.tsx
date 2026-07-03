import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { formatHudBalance, formatHudCashBalance, HUD_ASSETS } from "@/lib/gameWallet";
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
  formatter?: (value: number) => string;
  onStart?: () => void;
  onEnd?: () => void;
};

type GameHudStatsProps = {
  coinBalance: number;
  cashBalance: number;
  fishBalance?: number;
  showFish?: boolean;
  variant?: "normal" | "mvp";
  className?: string;
  cashDecimals?: number;
  animatedDirections?: {
    coin?: "up" | "down" | "idle";
    cash?: "up" | "down" | "idle";
    fish?: "up" | "down" | "idle";
  };
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
  formatter,
  onStart,
  onEnd,
}: CountUpProps) {
  const frameRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const onStartRef = useRef(onStart);
  const onEndRef = useRef(onEnd);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    onStartRef.current = onStart;
    onEndRef.current = onEnd;
  }, [onEnd, onStart]);

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
  const [displayValue, setDisplayValue] = useState(startValue);

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
      if (formatter) return formatter(latest);

      const hasDecimals = maxDecimals > 0;
      const formattedNumber = Intl.NumberFormat("en-US", {
        useGrouping: Boolean(separator),
        minimumFractionDigits: hasDecimals ? maxDecimals : 0,
        maximumFractionDigits: hasDecimals ? maxDecimals : 0,
      }).format(latest);
      const normalizedNumber = separator ? formattedNumber.replace(/,/g, separator) : formattedNumber;
      return `${prefix}${normalizedNumber}`;
    },
    [formatter, maxDecimals, prefix, separator],
  );

  useEffect(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setDisplayValue(startValue);

    if (!startWhen) return undefined;
    onStartRef.current?.();

    if (shouldReduceMotion) {
      setDisplayValue(endValue);
      onEndRef.current?.();
      return undefined;
    }

    const durationMs = Math.max(duration, 0.1) * 1000;
    const startAnimation = () => {
      const animationStart = performance.now();

      const tick = (now: number) => {
        const progress = Math.min((now - animationStart) / durationMs, 1);
        const latest = startValue + (endValue - startValue) * progress;

        setDisplayValue(latest);

        if (progress < 1) {
          frameRef.current = window.requestAnimationFrame(tick);
          return;
        }

        frameRef.current = null;
        onEndRef.current?.();
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
  }, [delay, duration, endValue, formatValue, shouldReduceMotion, startWhen, startValue]);

  return (
    <span className={className}>
      {formatValue(displayValue)}
    </span>
  );
}

export function GameHudStats({
  coinBalance,
  cashBalance,
  fishBalance,
  showFish = true,
  variant = "normal",
  className,
  cashDecimals = 1,
  animatedDirections,
  tr,
  onOpenWallet,
}: GameHudStatsProps) {
  const shouldShowWalletStats = variant === "normal";
  const rootClassName = ["hud-top-stats", className].filter(Boolean).join(" ");
  const coinValueClassName = ["hud-stat-value", "hud-stat-value--balance", animatedDirections?.coin ? `hud-stat-value--${animatedDirections.coin}` : ""].filter(Boolean).join(" ");
  const cashValueClassName = ["hud-stat-value", "hud-stat-value--cash", animatedDirections?.cash ? `hud-stat-value--${animatedDirections.cash}` : ""].filter(Boolean).join(" ");
  const fishValueClassName = ["hud-stat-value", "hud-stat-value--fish", animatedDirections?.fish ? `hud-stat-value--${animatedDirections.fish}` : ""].filter(Boolean).join(" ");

  return (
    <div className={rootClassName} aria-label={tr("Stats", "数值统计")}>
      {shouldShowWalletStats && (
        <>
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
            <div className={coinValueClassName}>
              <CountUp to={coinBalance} duration={0.5} formatter={formatHudBalance}>
                {formatHudBalance(coinBalance)}
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
            <div className={cashValueClassName}>
              <CountUp to={cashBalance} duration={0.5} formatter={formatHudCashBalance}>
                {formatHudCashBalance(cashBalance)}
              </CountUp>
            </div>
          </button>
        </>
      )}

      {showFish && typeof fishBalance === "number" && (
        <div className="hud-stat-card" aria-label={tr("Fish balance", "鱼额")}>
          <img
            className="hud-stat-icon"
            src={HUD_ASSETS.fish}
            alt=""
            width="40"
            height="27"
          />
          <div className={fishValueClassName}>
            <CountUp key={`fish-${variant}-${fishBalance}`} to={fishBalance} duration={0.5} formatter={formatHudBalance}>
              {formatHudBalance(fishBalance)}
            </CountUp>
          </div>
        </div>
      )}
    </div>
  );
}
