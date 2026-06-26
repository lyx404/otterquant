import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { X } from "lucide-react";
import { GameHudStats } from "@/components/GameHudStats";
import { useGameWalletModal } from "@/components/GameWalletModalHost";
import { useAppLanguage } from "@/contexts/AppLanguageContext";
import { useGameEconomy } from "@/contexts/GameEconomyContext";
import {
  HUD_ASSETS,
} from "@/lib/gameWallet";
import {
  BASE_NUMBER_H,
  BASE_NUMBER_W,
  BASE_TILE,
  DESKTOP_STAGE_H,
  DESKTOP_STAGE_W,
  MAX_TICKET_QUANTITY,
  MIN_TICKET_QUANTITY,
  MOBILE_BREAKPOINT,
  MOBILE_STAGE_H,
  MOBILE_STAGE_W,
  pickScratchTicket,
  SCRATCH_CARD_ASSETS,
  SCRATCH_CARD_COPY,
  TICKET_POOL,
  TICKET_PRICE,
  ticketWinCents,
  type ScratchTicket,
  formatScratchCash,
} from "./scratchCardData";
import "./ScratchCardGame.css";

type ScratchViewState = "purchase" | "ready" | "scratching" | "done";
type LayoutMode = "desktop" | "mobile";
type ScratchArea = {
  canvas: HTMLCanvasElement;
  type: "number" | "tile";
  x: number;
  y: number;
  width: number;
  height: number;
};
type Point = {
  x: number;
  y: number;
};

type ScratchCardGameProps = {
  onBack: (origin?: Point) => void;
};

type AnimatedStatDirection = "up" | "down" | "idle";

const ALLOWED_INPUT_KEYS = [
  "Backspace",
  "Delete",
  "Tab",
  "Enter",
  "Escape",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
];

function clampQuantity(value: number) {
  if (!Number.isFinite(value)) return MIN_TICKET_QUANTITY;
  return Math.max(MIN_TICKET_QUANTITY, Math.min(MAX_TICKET_QUANTITY, Math.round(value)));
}

function clearTimeouts(ids: number[]) {
  ids.forEach((id) => window.clearTimeout(id));
  ids.length = 0;
}

function useAnimatedStatValue(value: number, formatter: (value: number) => string, duration = 420) {
  const [displayValue, setDisplayValue] = useState(value);
  const [direction, setDirection] = useState<AnimatedStatDirection>("idle");
  const displayedValueRef = useRef(value);
  const frameRef = useRef<number | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      displayedValueRef.current = value;
      setDisplayValue(value);
      return;
    }

    const fromValue = displayedValueRef.current;
    if (fromValue === value) return;

    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
      displayedValueRef.current = value;
      setDisplayValue(value);
      setDirection("idle");
      return;
    }

    const nextDirection: AnimatedStatDirection = value > fromValue ? "up" : "down";
    const delta = value - fromValue;
    let startAt: number | null = null;

    setDirection(nextDirection);

    const animate = (timestamp: number) => {
      if (startAt === null) startAt = timestamp;
      const progress = Math.min(1, (timestamp - startAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextValue = progress >= 1
        ? value
        : delta >= 0
          ? Math.floor(fromValue + delta * eased)
          : Math.ceil(fromValue + delta * eased);

      displayedValueRef.current = nextValue;
      setDisplayValue(nextValue);

      if (progress < 1) {
        frameRef.current = window.requestAnimationFrame(animate);
        return;
      }

      frameRef.current = null;
      setDirection("idle");
    };

    frameRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [duration, value]);

  useEffect(() => () => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
    }
  }, []);

  return {
    direction,
    text: formatter(displayValue),
  };
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawClover(ctx: CanvasRenderingContext2D) {
  const paths = [
    "M97.0246 101.438C99.4018 104.141 100.661 107.648 100.546 111.245C100.431 114.844 98.95 118.263 96.4044 120.809C93.8589 123.355 90.439 124.835 86.841 124.951C83.2431 125.066 79.7364 123.806 77.0333 121.429L75.0314 119.427C74.4691 120.189 73.7954 120.863 73.0333 121.425C70.3291 123.803 66.8202 125.063 63.2208 124.948C59.6217 124.832 56.2017 123.35 53.6554 120.804C51.109 118.258 49.6272 114.837 49.5119 111.238C49.3966 107.638 50.6562 104.13 53.0343 101.426L75.0236 79.4369L97.0246 101.438Z",
    "M111.277 49.473C114.876 49.5883 118.297 51.0691 120.844 53.6156C123.39 56.162 124.871 59.5827 124.986 63.182C125.102 66.7815 123.842 70.2903 121.464 72.9945L119.466 74.9926L121.468 76.9945C123.843 79.7012 125.103 83.2084 124.993 86.808C124.883 90.4077 123.411 93.8317 120.874 96.3881C118.341 98.9681 114.91 100.471 111.296 100.581C107.682 100.692 104.165 99.402 101.48 96.9818L79.4757 74.9847L101.465 52.9955C104.169 50.6171 107.677 49.3579 111.277 49.473Z",
    "M38.7814 49.4193C42.395 49.3087 45.9121 50.5977 48.5978 53.0179L70.5949 75.015L48.6046 97.0043C45.9005 99.3826 42.3925 100.642 38.7931 100.527C35.1937 100.412 31.7732 98.9305 29.2267 96.3842C26.6802 93.8377 25.1985 90.4171 25.0831 86.8177C24.9679 83.2183 26.2272 79.7095 28.6056 77.0052L30.6036 75.0072L28.6017 73.0052C26.1827 70.3186 24.895 66.8014 25.007 63.1879C25.119 59.5742 26.6223 56.1434 29.2033 53.6117C31.736 51.0317 35.1677 49.5299 38.7814 49.4193Z",
    "M63.2267 25.0492C66.8264 24.939 70.3344 26.1989 73.0411 28.5746L75.0421 30.5765C75.6043 29.8144 76.2781 29.1407 77.0402 28.5785C79.7478 26.2038 83.2559 24.9455 86.8556 25.057C90.4554 25.1686 93.8793 26.6422 96.4347 29.1801C99.0155 31.7117 100.519 35.1427 100.631 38.7562C100.743 42.3698 99.4545 45.887 97.0353 48.5736L75.046 70.5629L53.0451 48.5629C50.7143 45.835 49.4847 42.3357 49.5958 38.7494C49.707 35.163 51.1513 31.7466 53.6466 29.1683C56.203 26.6315 59.6269 25.1594 63.2267 25.0492Z",
  ];

  paths.forEach((path) => {
    ctx.fill(new Path2D(path));
  });
}

export function ScratchCardGame({ onBack }: ScratchCardGameProps) {
  const { uiLang } = useAppLanguage();
  const { coinBalance, cashCents, fishBalance, spendCoins, addCashCents } = useGameEconomy();
  const tr = useCallback((en: string, zh: string) => (uiLang === "zh" ? zh : en), [uiLang]);
  const copy = SCRATCH_CARD_COPY[uiLang === "zh" ? "zh" : "en"];
  const walletController = useGameWalletModal();
  const [viewState, setViewState] = useState<ScratchViewState>("purchase");
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [quantityInput, setQuantityInput] = useState("1");
  const [balanceWarning, setBalanceWarning] = useState(false);
  const [batchTickets, setBatchTickets] = useState<ScratchTicket[]>([TICKET_POOL[0]]);
  const [batchWins, setBatchWins] = useState<number[]>([]);
  const [currentTicketIndex, setCurrentTicketIndex] = useState(0);
  const [cashAwardSettled, setCashAwardSettled] = useState(false);
  const [layout, setLayout] = useState(() => ({
    mode: "desktop" as LayoutMode,
    stageWidth: DESKTOP_STAGE_W,
    stageHeight: DESKTOP_STAGE_H,
    scale: 1,
  }));

  const stageRef = useRef<HTMLElement | null>(null);
  const sideCoinRef = useRef<HTMLDivElement | null>(null);
  const quantityInputRef = useRef<HTMLInputElement | null>(null);
  const quantityFocusedRef = useRef(false);
  const scratchAreasRef = useRef<ScratchArea[]>([]);
  const numberCanvasRefs = useRef<Array<HTMLCanvasElement | null>>([]);
  const tileCanvasRefs = useRef<Array<HTMLCanvasElement | null>>([]);
  const tileRefs = useRef<Array<HTMLDivElement | null>>([]);
  const scratchActiveRef = useRef(false);
  const lastScratchPointRef = useRef<Point | null>(null);
  const lastProgressCheckRef = useRef(0);
  const lastSparkAtRef = useRef(0);
  const revealTimeoutsRef = useRef<number[]>([]);

  const currentTicket = batchTickets[currentTicketIndex] ?? TICKET_POOL[0];
  const hasMoreTickets = currentTicketIndex < batchTickets.length - 1;
  const canRevealAll = batchTickets.length > 1 && hasMoreTickets;
  const currentTicketWin = batchWins[currentTicketIndex] ?? 0;
  const batchTotalWin = batchWins.reduce((sum, value) => sum + (value || 0), 0);
  const isBatchFinished = batchTickets.length > 1 && currentTicketIndex === batchTickets.length - 1;
  const settlementAmount = isBatchFinished ? batchTotalWin : currentTicketWin;
  const settlementLabel = settlementAmount > 0
    ? (isBatchFinished ? copy.totalPrizeAmount : copy.prizeAmount)
    : copy.noPrize;
  const settlementExtra = batchTickets.length > 1 && !isBatchFinished
    ? `${copy.cumulative} ${formatScratchCash(batchTotalWin)}`
    : "";
  const batchProgressText = batchTickets.length > 1
    ? (viewState === "done" && !hasMoreTickets
      ? copy.completedProgress(batchTickets.length)
      : copy.currentProgress(currentTicketIndex + 1, batchTickets.length))
    : "";
  const actionKind = viewState === "purchase"
    ? "start"
    : viewState === "done"
      ? (hasMoreTickets ? "next" : "confirm")
      : "reveal";
  const actionLabel = actionKind === "start"
    ? copy.start
    : actionKind === "next"
      ? copy.next
      : actionKind === "confirm"
        ? copy.confirm
        : copy.reveal;
  const animatedCoinBalance = useAnimatedStatValue(coinBalance, (value) => value.toString());
  const animatedCashBalance = useAnimatedStatValue(cashCents / 1000, (value) => value.toFixed(1));
  const animatedFishBalance = useAnimatedStatValue(fishBalance, (value) => value.toString());

  const stageStyle = useMemo(() => ({
    "--scale": String(layout.scale),
    "--stage-width": `${layout.stageWidth}px`,
    "--stage-height": `${layout.stageHeight}px`,
  }) as CSSProperties, [layout.scale, layout.stageHeight, layout.stageWidth]);

  const getCoinReadyPoint = useCallback(() => (
    layout.mode === "mobile"
      ? { x: layout.stageWidth / 2, y: MOBILE_STAGE_H - 170 }
      : { x: 580, y: 420 }
  ), [layout.mode, layout.stageWidth]);

  const moveCoin = useCallback((x: number, y: number, tilt = 0) => {
    const node = sideCoinRef.current;
    if (!node) return;
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    node.style.setProperty("--coin-tilt", `${tilt}deg`);
  }, []);

  const buildScratchAreas = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const stageRect = stage.getBoundingClientRect();
    if (!stageRect.width || !stageRect.height) {
      scratchAreasRef.current = [];
      return;
    }

    const createArea = (canvas: HTMLCanvasElement, type: ScratchArea["type"]): ScratchArea => {
      const rect = canvas.getBoundingClientRect();
      return {
        canvas,
        type,
        x: ((rect.left - stageRect.left) / stageRect.width) * layout.stageWidth,
        y: ((rect.top - stageRect.top) / stageRect.height) * layout.stageHeight,
        width: (rect.width / stageRect.width) * layout.stageWidth,
        height: (rect.height / stageRect.height) * layout.stageHeight,
      };
    };

    const numberAreas = numberCanvasRefs.current
      .filter((canvas): canvas is HTMLCanvasElement => Boolean(canvas))
      .map((canvas) => createArea(canvas, "number"));
    const tileAreas = tileCanvasRefs.current
      .filter((canvas): canvas is HTMLCanvasElement => Boolean(canvas))
      .map((canvas) => createArea(canvas, "tile"));

    scratchAreasRef.current = [...numberAreas, ...tileAreas];
  }, [layout.stageHeight, layout.stageWidth]);

  const getCanvasLogicalSize = useCallback((
    canvas: HTMLCanvasElement,
    fallbackWidth: number,
    fallbackHeight = fallbackWidth,
  ) => {
    const parent = canvas.parentElement;
    const measuredWidth = parent?.clientWidth || canvas.offsetWidth || fallbackWidth;
    const measuredHeight = parent?.clientHeight || canvas.offsetHeight || fallbackHeight;

    return {
      width: Math.max(1, Math.round(measuredWidth)),
      height: Math.max(1, Math.round(measuredHeight)),
    };
  }, []);

  const drawNumberCover = useCallback((canvas: HTMLCanvasElement) => {
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = getCanvasLogicalSize(canvas, BASE_NUMBER_W, BASE_NUMBER_H);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.style.opacity = "1";
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    roundedRect(ctx, 0, 0, width, height, Math.round(height * 0.25));
    ctx.fillStyle = "#d2d2d1";
    ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, .42)";
    ctx.font = `900 ${Math.round(height * 0.5)}px "Alimama FangYuanTi VF", "PingFang SC", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("?", width / 2, height / 2 + 1);
    ctx.globalCompositeOperation = "source-over";
  }, [getCanvasLogicalSize]);

  const drawTileCover = useCallback((canvas: HTMLCanvasElement) => {
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = getCanvasLogicalSize(canvas, BASE_TILE, BASE_TILE);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.style.opacity = "1";
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, Math.min(width, height) / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "#d2d2d1";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "rgba(255, 255, 255, .3)";
    ctx.save();
    ctx.scale(width / BASE_TILE, height / BASE_TILE);
    drawClover(ctx);
    ctx.restore();
    ctx.restore();
    ctx.globalCompositeOperation = "source-over";
  }, [getCanvasLogicalSize]);

  const clearSparks = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.querySelectorAll(".spark").forEach((spark) => spark.remove());
  }, []);

  const renderScratchSurfaces = useCallback(() => {
    numberCanvasRefs.current.forEach((canvas) => {
      if (canvas) drawNumberCover(canvas);
    });
    tileCanvasRefs.current.forEach((canvas) => {
      if (canvas) drawTileCover(canvas);
    });
    tileRefs.current.forEach((tile) => tile?.classList.remove("win-pop"));
    scratchActiveRef.current = false;
    lastScratchPointRef.current = null;
    lastProgressCheckRef.current = 0;
    const readyPoint = getCoinReadyPoint();
    moveCoin(readyPoint.x, readyPoint.y, 0);
    buildScratchAreas();
  }, [buildScratchAreas, drawNumberCover, drawTileCover, getCoinReadyPoint, moveCoin]);

  const showRevealedTicket = useCallback(() => {
    clearTimeouts(revealTimeoutsRef.current);
    scratchAreasRef.current.forEach((area) => {
      const ctx = area.canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, area.canvas.width, area.canvas.height);
      area.canvas.style.opacity = "0";
    });
    tileRefs.current.forEach((tile) => tile?.classList.remove("win-pop"));
    currentTicket.prizes.forEach((prize, index) => {
      if (!currentTicket.winning.includes(prize.num)) return;
      const timeoutId = window.setTimeout(() => {
        tileRefs.current[index]?.classList.add("win-pop");
      }, index * 55);
      revealTimeoutsRef.current.push(timeoutId);
    });
    scratchActiveRef.current = false;
    lastScratchPointRef.current = null;
  }, [currentTicket]);

  const alignFloatingCoin = useCallback(() => {
    if (viewState === "done") return;
    const readyPoint = getCoinReadyPoint();
    if (viewState === "purchase") {
      moveCoin(readyPoint.x, readyPoint.y, 0);
      return;
    }

    if (lastScratchPointRef.current) {
      moveCoin(
        lastScratchPointRef.current.x,
        lastScratchPointRef.current.y,
        scratchActiveRef.current ? 8 : 0,
      );
      return;
    }

    moveCoin(readyPoint.x, readyPoint.y, 0);
  }, [getCoinReadyPoint, moveCoin, viewState]);

  const getAreaMetrics = useCallback((area: ScratchArea) => ({
    centerX: area.width / 2,
    centerY: area.height / 2,
    radius: Math.min(area.width, area.height) / 2,
    numberInsetX: Math.max(24, area.width * 0.22),
    numberInsetY: Math.max(24, area.height * 0.4),
  }), []);

  const revealProgress = useCallback(() => {
    let transparent = 0;
    let total = 0;
    let numberTransparent = 0;
    let numberTotal = 0;
    let tileTransparent = 0;
    let tileTotal = 0;
    const dpr = window.devicePixelRatio || 1;

    scratchAreasRef.current.forEach((area) => {
      const ctx = area.canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      const data = ctx.getImageData(0, 0, area.canvas.width, area.canvas.height).data;
      const step = Math.max(4, Math.floor(dpr * 5));
      const metrics = getAreaMetrics(area);

      for (let y = 0; y < area.canvas.height; y += step) {
        for (let x = 0; x < area.canvas.width; x += step) {
          const lx = x / dpr - metrics.centerX;
          const ly = y / dpr - metrics.centerY;
          if (area.type === "tile" && lx * lx + ly * ly > metrics.radius * metrics.radius) continue;
          total += 1;
          if (area.type === "number") {
            numberTotal += 1;
          } else {
            tileTotal += 1;
          }
          const isTransparent = data[(y * area.canvas.width + x) * 4 + 3] < 18;
          if (isTransparent) {
            transparent += 1;
            if (area.type === "number") {
              numberTransparent += 1;
            } else {
              tileTransparent += 1;
            }
          }
        }
      }
    });

    return {
      overall: total ? transparent / total : 0,
      numbers: numberTotal ? numberTransparent / numberTotal : 0,
      tiles: tileTotal ? tileTransparent / tileTotal : 0,
    };
  }, [getAreaMetrics]);

  const setCurrentTicketWin = useCallback((index: number, cents: number) => {
    setBatchWins((current) => {
      const next = [...current];
      next[index] = cents;
      return next;
    });
  }, []);

  const revealAllCurrentTicket = useCallback(() => {
    if (viewState === "done") return;
    setCurrentTicketWin(currentTicketIndex, ticketWinCents(currentTicket));
    setViewState("done");
  }, [currentTicket, currentTicketIndex, setCurrentTicketWin, viewState]);

  const eraseCircle = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) => {
    const gradient = ctx.createRadialGradient(x, y, 2, x, y, radius);
    gradient.addColorStop(0, "rgba(0,0,0,1)");
    gradient.addColorStop(0.72, "rgba(0,0,0,.88)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  }, []);

  const maybeSpark = useCallback((x: number, y: number) => {
    const stage = stageRef.current;
    if (!stage) return;
    const now = performance.now();
    if (now - lastSparkAtRef.current < 70) return;
    lastSparkAtRef.current = now;

    const spark = document.createElement("span");
    spark.className = "spark";
    spark.style.left = `${x}px`;
    spark.style.top = `${y}px`;
    spark.style.setProperty("--dx", `${Math.round((Math.random() - 0.5) * 70)}px`);
    spark.style.setProperty("--dy", `${Math.round((Math.random() - 0.5) * 70)}px`);
    stage.appendChild(spark);
    spark.addEventListener("animationend", () => spark.remove(), { once: true });
  }, []);

  const scratchAt = useCallback((sceneX: number, sceneY: number) => {
    if (viewState === "ready") {
      setViewState("scratching");
    }

    const point = { x: sceneX, y: sceneY };

    scratchAreasRef.current.forEach((area) => {
      const localX = sceneX - area.x;
      const localY = sceneY - area.y;
      const metrics = getAreaMetrics(area);
      const inTileReach = area.type === "tile"
        && Math.hypot(localX - metrics.centerX, localY - metrics.centerY) <= metrics.radius * 1.5;
      const inNumberReach = area.type === "number"
        && localX >= -metrics.numberInsetX
        && localX <= area.width + metrics.numberInsetX
        && localY >= -metrics.numberInsetY
        && localY <= area.height + metrics.numberInsetY;

      if (!inTileReach && !inNumberReach) return;

      const ctx = area.canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const eraseRadius = area.type === "number"
        ? Math.max(18, Math.min(area.width, area.height) * 0.31)
        : Math.max(24, Math.min(area.width, area.height) * 0.2);

      if (lastScratchPointRef.current) {
        const prevX = lastScratchPointRef.current.x - area.x;
        const prevY = lastScratchPointRef.current.y - area.y;
        const distance = Math.hypot(localX - prevX, localY - prevY);
        const steps = Math.max(1, Math.ceil(distance / Math.max(8, eraseRadius * 0.45)));
        for (let index = 0; index <= steps; index += 1) {
          const t = index / steps;
          eraseCircle(
            ctx,
            prevX + (localX - prevX) * t,
            prevY + (localY - prevY) * t,
            eraseRadius,
          );
        }
      } else {
        eraseCircle(ctx, localX, localY, eraseRadius + 4);
      }
    });

    lastScratchPointRef.current = point;
    maybeSpark(sceneX, sceneY);

    const now = performance.now();
    if (now - lastProgressCheckRef.current > 120) {
      lastProgressCheckRef.current = now;
      const progress = revealProgress();
      if (progress.overall > 0.66 && progress.numbers > 0.52 && progress.tiles > 0.58) {
        revealAllCurrentTicket();
      }
    }
  }, [eraseCircle, getAreaMetrics, maybeSpark, revealAllCurrentTicket, revealProgress, viewState]);

  const scenePointFromPointer = useCallback((event: ReactPointerEvent<HTMLElement>): Point | null => {
    const stage = stageRef.current;
    if (!stage) return null;
    const rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      x: ((event.clientX - rect.left) / rect.width) * layout.stageWidth,
      y: ((event.clientY - rect.top) / rect.height) * layout.stageHeight,
    };
  }, [layout.stageHeight, layout.stageWidth]);

  const syncStageLayout = useCallback(() => {
    const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
    if (isMobile) {
      const scale = window.innerWidth / MOBILE_STAGE_W;
      const stageHeight = Math.max(MOBILE_STAGE_H, Math.ceil(window.innerHeight / scale));
      setLayout((current) => (
        current.mode === "mobile"
        && current.stageWidth === MOBILE_STAGE_W
        && current.stageHeight === stageHeight
        && Math.abs(current.scale - scale) < 0.0001
          ? current
          : {
              mode: "mobile",
              stageWidth: MOBILE_STAGE_W,
              stageHeight,
              scale,
            }
      ));
      return;
    }

    const scale = Math.min(window.innerWidth / DESKTOP_STAGE_W, window.innerHeight / DESKTOP_STAGE_H);
    setLayout((current) => (
      current.mode === "desktop"
      && current.stageWidth === DESKTOP_STAGE_W
      && current.stageHeight === DESKTOP_STAGE_H
      && Math.abs(current.scale - scale) < 0.0001
        ? current
        : {
            mode: "desktop",
            stageWidth: DESKTOP_STAGE_W,
            stageHeight: DESKTOP_STAGE_H,
            scale,
          }
    ));
  }, []);

  const addCashAward = useCallback(() => {
    if (cashAwardSettled) return;
    const awardCents = batchWins.length > 0 ? batchTotalWin : ticketWinCents(currentTicket);
    addCashCents(awardCents);
    setCashAwardSettled(true);
  }, [addCashCents, batchTotalWin, batchWins.length, cashAwardSettled, currentTicket]);

  const returnToDefault = useCallback(() => {
    clearTimeouts(revealTimeoutsRef.current);
    clearSparks();
    setSelectedQuantity(1);
    setQuantityInput("1");
    setBalanceWarning(false);
    setBatchTickets([TICKET_POOL[0]]);
    setBatchWins([]);
    setCurrentTicketIndex(0);
    setCashAwardSettled(false);
    setViewState("purchase");
  }, [clearSparks]);

  const beginBatch = useCallback(() => {
    const purchaseCost = TICKET_PRICE * selectedQuantity;
    if (purchaseCost > coinBalance) {
      setBalanceWarning(true);
      return;
    }

    const tickets = Array.from({ length: selectedQuantity }, () => pickScratchTicket());
    spendCoins(purchaseCost);
    setBalanceWarning(false);
    setBatchTickets(tickets);
    setBatchWins(new Array(tickets.length).fill(0));
    setCurrentTicketIndex(0);
    setCashAwardSettled(false);
    setViewState("ready");
  }, [coinBalance, selectedQuantity, spendCoins]);

  const revealBatchAll = useCallback(() => {
    if (viewState === "purchase" || batchTickets.length <= 1) return;
    const wins = batchTickets.map((ticket) => ticketWinCents(ticket));
    setBatchWins(wins);
    setCurrentTicketIndex(batchTickets.length - 1);
    setViewState("done");
  }, [batchTickets, viewState]);

  const nextTicket = useCallback(() => {
    if (!hasMoreTickets) return;
    setCurrentTicketIndex((current) => current + 1);
    setViewState("ready");
  }, [hasMoreTickets]);

  const handleActionButtonClick = useCallback(() => {
    if (viewState === "purchase") {
      beginBatch();
      return;
    }

    if (viewState === "done") {
      if (hasMoreTickets) {
        nextTicket();
      } else {
        addCashAward();
        returnToDefault();
      }
      return;
    }

    revealAllCurrentTicket();
  }, [addCashAward, beginBatch, hasMoreTickets, nextTicket, returnToDefault, revealAllCurrentTicket, viewState]);

  const commitQuantityInput = useCallback(() => {
    const digits = quantityInput.replace(/\D/g, "");
    if (!digits) {
      setQuantityInput(String(selectedQuantity));
      return;
    }

    const next = clampQuantity(Number(digits));
    setSelectedQuantity(next);
    setQuantityInput(String(next));
    setBalanceWarning(false);
  }, [quantityInput, selectedQuantity]);

  const updateQuantity = useCallback((value: number) => {
    const next = clampQuantity(value);
    setSelectedQuantity(next);
    setQuantityInput(String(next));
    setBalanceWarning(false);
  }, []);

  const handleQuantityKeyDown = useCallback((event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitQuantityInput();
      event.currentTarget.blur();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setQuantityInput(String(selectedQuantity));
      event.currentTarget.blur();
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      updateQuantity(selectedQuantity + 1);
      quantityInputRef.current?.select();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      updateQuantity(selectedQuantity - 1);
      quantityInputRef.current?.select();
      return;
    }

    const isShortcut = event.metaKey || event.ctrlKey;
    const isDigit = /^\d$/.test(event.key);
    if (!isDigit && !ALLOWED_INPUT_KEYS.includes(event.key) && !isShortcut) {
      event.preventDefault();
    }
  }, [commitQuantityInput, selectedQuantity, updateQuantity]);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (viewState !== "ready" && viewState !== "scratching") return;
    if ((event.target as HTMLElement).closest("button, input")) return;
    event.preventDefault();
    scratchActiveRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = scenePointFromPointer(event);
    if (!point) return;
    moveCoin(point.x, point.y, 8);
    scratchAt(point.x, point.y);
  }, [moveCoin, scenePointFromPointer, scratchAt, viewState]);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (viewState !== "ready" && viewState !== "scratching") return;
    const point = scenePointFromPointer(event);
    if (!point) return;
    const tilt = Math.max(-16, Math.min(16, (event.movementX || 0) * 0.8));
    moveCoin(point.x, point.y, scratchActiveRef.current ? tilt : 0);
    if (scratchActiveRef.current) {
      event.preventDefault();
      scratchAt(point.x, point.y);
    }
  }, [moveCoin, scenePointFromPointer, scratchAt, viewState]);

  const handlePointerEnd = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (!scratchActiveRef.current) return;
    event.preventDefault();
    scratchActiveRef.current = false;
    lastScratchPointRef.current = null;
    sideCoinRef.current?.style.setProperty("--coin-tilt", "0deg");
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const handleBackClick = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
    const origin = typeof window === "undefined"
      ? undefined
      : {
          x: event.clientX / window.innerWidth,
          y: event.clientY / window.innerHeight,
        };
    onBack(origin);
  }, [onBack]);

  useEffect(() => {
    syncStageLayout();
    window.addEventListener("resize", syncStageLayout);
    return () => window.removeEventListener("resize", syncStageLayout);
  }, [syncStageLayout]);

  useEffect(() => {
    if (!quantityFocusedRef.current) {
      setQuantityInput(String(selectedQuantity));
    }
  }, [selectedQuantity]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      renderScratchSurfaces();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [
    batchTickets,
    currentTicketIndex,
    layout.mode,
    layout.scale,
    layout.stageHeight,
    layout.stageWidth,
    renderScratchSurfaces,
  ]);

  useEffect(() => {
    if (viewState !== "done") return;
    showRevealedTicket();
  }, [showRevealedTicket, viewState]);

  useEffect(() => {
    alignFloatingCoin();
  }, [alignFloatingCoin]);

  useEffect(() => () => {
    clearTimeouts(revealTimeoutsRef.current);
  }, []);

  return (
    <>
      <main
        ref={stageRef}
        className="scratch-card-stage"
        data-lang={uiLang}
        data-layout={layout.mode}
        data-state={viewState}
        data-batch={batchTickets.length > 1 ? "multi" : "single"}
        data-can-reveal-all={canRevealAll ? "true" : "false"}
        data-balance-warning={balanceWarning ? "true" : "false"}
        aria-label={copy.title}
        style={stageStyle}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <img className="sky" src={SCRATCH_CARD_ASSETS.sky} alt="" aria-hidden="true" />
        <img className="top-ribbon left" src={SCRATCH_CARD_ASSETS.ribbonLeft} alt="" aria-hidden="true" />
        <img className="top-ribbon right" src={SCRATCH_CARD_ASSETS.ribbonRight} alt="" aria-hidden="true" />

        <header className="hud" aria-label={copy.stats}>
          <button
            className="back-button"
            type="button"
            aria-label={copy.closeScratchCard}
            onClick={handleBackClick}
          >
            <span className="back-button__icon" aria-hidden="true">
              <X size={22} strokeWidth={3} />
            </span>
            <img src={SCRATCH_CARD_ASSETS.back} alt="" />
          </button>
          <GameHudStats
            className="scratch-card-hud-stats"
            coinBalance={coinBalance}
            cashBalance={cashCents / 1000}
            cashDecimals={1}
            fishBalance={fishBalance}
            tr={tr}
            onOpenWallet={walletController.openWalletModal}
            animatedDirections={{
              coin: animatedCoinBalance.direction,
              cash: animatedCashBalance.direction,
              fish: animatedFishBalance.direction,
            }}
          />
        </header>

        <section className="action" aria-label={copy.scratchAction}>
          <img className="coin-front" src={SCRATCH_CARD_ASSETS.coinFront} alt="" aria-hidden="true" />
          <div className="settlement" aria-live="polite">
            <img src={SCRATCH_CARD_ASSETS.cash} alt="" />
            <div className="settlement-text">
              <span className="settlement-label">{settlementLabel}</span>
              <span className="settlement-amount">{formatScratchCash(settlementAmount)}</span>
              <span className="settlement-extra">{settlementExtra}</span>
            </div>
          </div>
          <div className="action-controls">
            <div className="batch-progress" id="batchProgress">{batchProgressText}</div>
            <button
              className="primary-button"
              type="button"
              id="actionButton"
              data-action-kind={actionKind}
              onClick={handleActionButtonClick}
            >
              <span className="action-label">{actionLabel}</span>
              <span className="action-price" aria-hidden="true">
                <img src={SCRATCH_CARD_ASSETS.balance} alt="" />
                <span className="action-price-value">{TICKET_PRICE * selectedQuantity}</span>
              </span>
            </button>
            <button
              className="batch-all-button"
              type="button"
              id="batchAllButton"
              onClick={revealBatchAll}
            >
              {copy.revealAll}
            </button>
            <div className="purchase-meta" aria-label={copy.purchaseInfo}>
              <div
                className="quantity-picker"
                aria-label={copy.quantity}
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest("button")) return;
                  quantityInputRef.current?.focus();
                  quantityInputRef.current?.select();
                }}
              >
                <button
                  className="quantity-button"
                  type="button"
                  aria-label={copy.quantityMinus}
                  onClick={(event) => {
                    event.stopPropagation();
                    updateQuantity(selectedQuantity - 1);
                  }}
                >
                  −
                </button>
                <input
                  ref={quantityInputRef}
                  className="quantity-value"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={quantityInput}
                  aria-label={copy.quantity}
                  autoComplete="off"
                  onFocus={() => {
                    quantityFocusedRef.current = true;
                    quantityInputRef.current?.select();
                  }}
                  onBlur={() => {
                    quantityFocusedRef.current = false;
                    commitQuantityInput();
                  }}
                  onChange={(event) => {
                    const digits = event.target.value.replace(/\D/g, "");
                    setQuantityInput(digits);
                    if (!digits) return;
                    setSelectedQuantity(clampQuantity(Number(digits)));
                    setBalanceWarning(false);
                  }}
                  onKeyDown={handleQuantityKeyDown}
                />
                <span className="quantity-unit" aria-hidden="true">{copy.ticketUnit}</span>
                <button
                  className="quantity-button"
                  type="button"
                  aria-label={copy.quantityPlus}
                  onClick={(event) => {
                    event.stopPropagation();
                    updateQuantity(selectedQuantity + 1);
                  }}
                >
                  +
                </button>
              </div>
            </div>
            <div className="balance-warning" role="status" aria-live="polite">
              {copy.insufficientBalance}
            </div>
          </div>
        </section>

        <section className="ticket" aria-label={copy.ticket}>
          <img className="ticket-stars" src={SCRATCH_CARD_ASSETS.stars} alt="" aria-hidden="true" />
          <div className="banner">
            <img src={SCRATCH_CARD_ASSETS.banner} alt="" aria-hidden="true" />
            <h1 className="banner-title">{copy.title}</h1>
            <div className="banner-subtitle">
              <img src={SCRATCH_CARD_ASSETS.starSmall} alt="" aria-hidden="true" />
              <span>{copy.subtitle}</span>
              <img src={SCRATCH_CARD_ASSETS.starSmall} alt="" aria-hidden="true" />
            </div>
          </div>

          <div className="panel winning" aria-label={copy.winningNumbers}>
            <div className="section-title">
              <img src={SCRATCH_CARD_ASSETS.starMed} alt="" aria-hidden="true" />
              <span>{copy.winningNumbers}</span>
              <img src={SCRATCH_CARD_ASSETS.starMed} alt="" aria-hidden="true" />
            </div>
            <div className="winning-slots">
              {currentTicket.winning.map((value, index) => (
                <div className="winning-slot" key={`winning-${index}`}>
                  <span>{value}</span>
                  <canvas
                    className="number-canvas"
                    ref={(node) => {
                      numberCanvasRefs.current[index] = node;
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="panel scratch-panel" id="scratchPanel" aria-label={copy.scratchArea}>
            <div className="scratch-grid" id="scratchGrid">
              {currentTicket.prizes.map((prize, index) => (
                <div
                  className="prize-tile"
                  data-index={index}
                  key={`prize-${index}`}
                  ref={(node) => {
                    tileRefs.current[index] = node;
                  }}
                >
                  <div className="result">
                    <span className="num">{prize.num}</span>
                    <span className="cash">{formatScratchCash(prize.cents)}</span>
                  </div>
                  <canvas
                    className="tile-canvas"
                    ref={(node) => {
                      tileCanvasRefs.current[index] = node;
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="side-coin" ref={sideCoinRef} aria-hidden="true">
          <img src={SCRATCH_CARD_ASSETS.coinSide} alt="" />
        </div>
      </main>
    </>
  );
}
