import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";
import { X } from "lucide-react";
import { useLocation } from "wouter";
import { GameHudStats } from "@/components/GameHudStats";
import { useGameWalletModal } from "@/components/GameWalletModalHost";
import { useAppLanguage } from "@/contexts/AppLanguageContext";
import { useGameEconomy } from "@/contexts/GameEconomyContext";
import { usePageTransition } from "@/contexts/PageTransitionContext";
import {
  DESKTOP_STAGE_H,
  DESKTOP_STAGE_W,
  MOBILE_BREAKPOINT,
  MOBILE_STAGE_H,
  MOBILE_STAGE_W,
  SCRATCH_CARD_ASSETS,
} from "@/components/scratch-card/scratchCardData";
import { useMobilePageTransition } from "@/hooks/useMobilePageTransition";
import pondAtmosphereVideo from "@/assets/fish-pond/pond-atmosphere.mp4";
import goldenKoiImage from "@/assets/fish-pond/golden-koi.svg";
import pinkSeahorseImage from "@/assets/fish-pond/pink-seahorse.svg";
import "@/styles/mobilePageTransition.css";

type FishPondStageLayout = {
  width: number;
  height: number;
  scale: number;
  mode: "desktop" | "mobile";
};

type FishPondSwimmer = {
  id: string;
  image: string;
  className: string;
  size: number;
  opacity: number;
  zIndex: number;
  motion: FishMotionProfile;
};

const FISH_POND_CANVAS_W = 1920;
const FISH_POND_CANVAS_H = 1080;
const FISH_POND_BOUNDS = {
  minX: 80,
  maxX: 1840,
  minY: 120,
  maxY: 920,
};

type FishPondPoint = {
  x: number;
  y: number;
};

type FishDirection = 1 | -1;

type FishMotionProfile = {
  waterLayer: "upper" | "middle" | "lower";
  xRange: readonly [number, number];
  yRange: readonly [number, number];
  pathLengthRange: readonly [number, number];
  speedRange: readonly [number, number];
  floatAmpRange: readonly [number, number];
  floatFrequencyRange: readonly [number, number];
  pauseRangeMs: readonly [number, number];
  turnRangeMs: readonly [number, number];
  delayRangeMs: readonly [number, number];
  curveRange: readonly [number, number];
  scaleRange: readonly [number, number];
  tailFrequencyRange: readonly [number, number];
};

type FishSegment = {
  start: FishPondPoint;
  target: FishPondPoint;
  c1: FishPondPoint;
  c2: FishPondPoint;
  direction: FishDirection;
  distance: number;
  speed: number;
  durationMs: number;
  floatAmp: number;
  floatFrequency: number;
  hoverMs: number;
  turnMs: number;
  hasPause: boolean;
  scaleMin: number;
  scaleMax: number;
  tailFrequency: number;
  startedAt: number;
};

type FishMotionPhase = "delay" | "swim" | "hover" | "turn";

type FishElements = {
  root: HTMLDivElement;
  path: HTMLElement;
  turn: HTMLElement;
  tilt: HTMLElement;
  float: HTMLElement;
  body: HTMLElement;
  image: HTMLElement;
};

type FishRuntime = {
  elements: FishElements;
  motion: FishMotionProfile;
  rng: () => number;
  position: FishPondPoint;
  direction: FishDirection;
  phase: FishMotionPhase;
  phaseStartedAt: number;
  phaseEndsAt: number;
  segment: FishSegment | null;
  pendingSegment: FishSegment | null;
  pendingDirection: FishDirection | null;
  lastSpeed: number;
  floatPhase: number;
  tailPhase: number;
  scalePhase: number;
  idleFloatAmp: number;
  idleFloatFrequency: number;
};

// Layer 2: group allocation for water layer, activity region, and timing offsets.
const FISH_POND_SWIMMERS: FishPondSwimmer[] = [
  {
    id: "golden-koi-near",
    image: goldenKoiImage,
    className: "fish-pond-swimmer--koi fish-pond-swimmer--near",
    size: 132,
    opacity: 0.92,
    zIndex: 3,
    motion: {
      waterLayer: "middle",
      xRange: [220, 1680],
      yRange: [360, 660],
      pathLengthRange: [620, 1280],
      speedRange: [72, 112],
      floatAmpRange: [14, 30],
      floatFrequencyRange: [0.74, 1.18],
      pauseRangeMs: [520, 1350],
      turnRangeMs: [420, 760],
      delayRangeMs: [400, 3600],
      curveRange: [120, 300],
      scaleRange: [0.972, 1.036],
      tailFrequencyRange: [0.9, 1.28],
    },
  },
  {
    id: "pink-seahorse-mid",
    image: pinkSeahorseImage,
    className: "fish-pond-swimmer--seahorse fish-pond-swimmer--mid",
    size: 86,
    opacity: 0.82,
    zIndex: 2,
    motion: {
      waterLayer: "upper",
      xRange: [620, 1760],
      yRange: [180, 460],
      pathLengthRange: [460, 980],
      speedRange: [42, 76],
      floatAmpRange: [18, 36],
      floatFrequencyRange: [0.62, 1.02],
      pauseRangeMs: [700, 1500],
      turnRangeMs: [460, 800],
      delayRangeMs: [1600, 5000],
      curveRange: [100, 260],
      scaleRange: [0.978, 1.03],
      tailFrequencyRange: [0.8, 1.18],
    },
  },
  {
    id: "golden-koi-far",
    image: goldenKoiImage,
    className: "fish-pond-swimmer--koi fish-pond-swimmer--far",
    size: 82,
    opacity: 0.72,
    zIndex: 1,
    motion: {
      waterLayer: "upper",
      xRange: [120, 1240],
      yRange: [140, 380],
      pathLengthRange: [520, 1040],
      speedRange: [48, 82],
      floatAmpRange: [8, 22],
      floatFrequencyRange: [0.8, 1.36],
      pauseRangeMs: [360, 1100],
      turnRangeMs: [340, 620],
      delayRangeMs: [0, 4200],
      curveRange: [80, 220],
      scaleRange: [0.982, 1.026],
      tailFrequencyRange: [0.95, 1.45],
    },
  },
  {
    id: "pink-seahorse-low",
    image: pinkSeahorseImage,
    className: "fish-pond-swimmer--seahorse fish-pond-swimmer--near",
    size: 104,
    opacity: 0.86,
    zIndex: 3,
    motion: {
      waterLayer: "lower",
      xRange: [160, 1320],
      yRange: [610, 900],
      pathLengthRange: [520, 1120],
      speedRange: [44, 78],
      floatAmpRange: [20, 36],
      floatFrequencyRange: [0.6, 0.98],
      pauseRangeMs: [820, 1500],
      turnRangeMs: [480, 800],
      delayRangeMs: [900, 4800],
      curveRange: [110, 280],
      scaleRange: [0.976, 1.032],
      tailFrequencyRange: [0.78, 1.12],
    },
  },
  {
    id: "golden-koi-shallow",
    image: goldenKoiImage,
    className: "fish-pond-swimmer--koi fish-pond-swimmer--mid",
    size: 70,
    opacity: 0.66,
    zIndex: 1,
    motion: {
      waterLayer: "lower",
      xRange: [760, 1840],
      yRange: [560, 880],
      pathLengthRange: [440, 940],
      speedRange: [58, 96],
      floatAmpRange: [8, 24],
      floatFrequencyRange: [0.88, 1.5],
      pauseRangeMs: [300, 980],
      turnRangeMs: [320, 620],
      delayRangeMs: [2200, 5000],
      curveRange: [80, 240],
      scaleRange: [0.982, 1.028],
      tailFrequencyRange: [1, 1.48],
    },
  },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function smoothstep(progress: number) {
  const t = clamp(progress, 0, 1);
  return t * t * (3 - 2 * t);
}

function randomRange(rng: () => number, min: number, max: number) {
  return min + (max - min) * rng();
}

function randomRangeFromTuple(rng: () => number, range: readonly [number, number]) {
  return randomRange(rng, range[0], range[1]);
}

function createRng(seed: number) {
  let value = seed || 1;

  return () => {
    value |= 0;
    value = (value + 0x6D2B79F5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createFishSeed(id: string, index: number) {
  let hash = 2166136261;

  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return (hash ^ Math.floor(Math.random() * 0xffffffff) ^ Date.now() ^ (index * 2654435761)) >>> 0;
}

function getMotionBounds(motion: FishMotionProfile) {
  const minX = clamp(motion.xRange[0], FISH_POND_BOUNDS.minX, FISH_POND_BOUNDS.maxX);
  const maxX = clamp(motion.xRange[1], minX, FISH_POND_BOUNDS.maxX);
  const minY = clamp(motion.yRange[0], FISH_POND_BOUNDS.minY, FISH_POND_BOUNDS.maxY);
  const maxY = clamp(motion.yRange[1], minY, FISH_POND_BOUNDS.maxY);

  return { minX, maxX, minY, maxY };
}

function clampPoint(point: FishPondPoint, motion?: FishMotionProfile): FishPondPoint {
  const bounds = motion ? getMotionBounds(motion) : FISH_POND_BOUNDS;

  return {
    x: clamp(point.x, bounds.minX, bounds.maxX),
    y: clamp(point.y, bounds.minY, bounds.maxY),
  };
}

function getRandomFishPoint(rng: () => number, motion: FishMotionProfile): FishPondPoint {
  const bounds = getMotionBounds(motion);

  return {
    x: randomRange(rng, bounds.minX, bounds.maxX),
    y: randomRange(rng, bounds.minY, bounds.maxY),
  };
}

function getFishElements(root: HTMLDivElement): FishElements | null {
  const path = root.querySelector<HTMLElement>("[data-fish-path]");
  const turn = root.querySelector<HTMLElement>("[data-fish-turn]");
  const tilt = root.querySelector<HTMLElement>("[data-fish-tilt]");
  const float = root.querySelector<HTMLElement>("[data-fish-float]");
  const body = root.querySelector<HTMLElement>("[data-fish-body]");
  const image = root.querySelector<HTMLElement>("[data-fish-image]");

  if (!path || !turn || !tilt || !float || !body || !image) {
    return null;
  }

  return { root, path, turn, tilt, float, body, image };
}

function pickFishTarget(rng: () => number, start: FishPondPoint, motion: FishMotionProfile): FishPondPoint {
  const bounds = getMotionBounds(motion);
  const regionWidth = bounds.maxX - bounds.minX;
  const minDistance = motion.pathLengthRange[0];
  const maxDistance = motion.pathLengthRange[1];
  const minHorizontal = Math.min(regionWidth * 0.48, Math.max(360, minDistance * 0.62));

  for (let i = 0; i < 48; i += 1) {
    const target = getRandomFishPoint(rng, motion);
    const distance = Math.hypot(target.x - start.x, target.y - start.y);
    const horizontalDistance = Math.abs(target.x - start.x);

    if (distance >= minDistance && distance <= maxDistance && horizontalDistance >= minHorizontal) {
      return target;
    }
  }

  for (let i = 0; i < 48; i += 1) {
    const distance = randomRangeFromTuple(rng, motion.pathLengthRange);
    const verticalTravel = randomRange(rng, -Math.min(420, distance * 0.48), Math.min(420, distance * 0.48));
    const horizontalTravel = Math.sqrt(Math.max(distance * distance - verticalTravel * verticalTravel, minHorizontal * minHorizontal));
    const direction = rng() > 0.5 ? 1 : -1;
    const target = clampPoint({
      x: start.x + direction * horizontalTravel,
      y: start.y + verticalTravel,
    }, motion);
    const actualDistance = Math.hypot(target.x - start.x, target.y - start.y);
    const horizontalDistance = Math.abs(target.x - start.x);

    if (actualDistance >= minDistance && actualDistance <= maxDistance && horizontalDistance >= minHorizontal) {
      return target;
    }
  }

  const centerX = (bounds.minX + bounds.maxX) / 2;
  const fallbackDirection = start.x < centerX ? 1 : -1;
  const fallbackDistance = Math.min(regionWidth * 0.72, maxDistance);

  return clampPoint({
    x: start.x + fallbackDirection * Math.max(minHorizontal, fallbackDistance),
    y: start.y + randomRange(rng, -Math.min(260, fallbackDistance * 0.38), Math.min(260, fallbackDistance * 0.38)),
  }, motion);
}

function pickFishSpeed(rng: () => number, lastSpeed: number, motion: FishMotionProfile) {
  const rawSpeed = randomRangeFromTuple(rng, motion.speedRange);

  if (!lastSpeed) {
    return rawSpeed;
  }

  const speedDelta = Math.max(10, (motion.speedRange[1] - motion.speedRange[0]) * 0.48);
  return clamp(
    rawSpeed,
    Math.max(motion.speedRange[0], lastSpeed - speedDelta),
    Math.min(motion.speedRange[1], lastSpeed + speedDelta),
  );
}

function pickFishScale(rng: () => number, motion: FishMotionProfile) {
  return {
    min: randomRange(rng, motion.scaleRange[0], Math.min(0.99, motion.scaleRange[1])),
    max: randomRange(rng, Math.max(1.01, motion.scaleRange[0]), motion.scaleRange[1]),
  };
}

function createFishSegment(runtime: FishRuntime, now: number): FishSegment {
  const rng = runtime.rng;
  const motion = runtime.motion;
  const start = { ...runtime.position };
  const target = pickFishTarget(rng, start, motion);
  const dx = target.x - start.x;
  const dy = target.y - start.y;
  const distance = Math.hypot(dx, dy);
  const direction: FishDirection = dx >= 0 ? 1 : -1;
  const speed = pickFishSpeed(rng, runtime.lastSpeed, motion);
  const durationMs = clamp(distance / speed, 6, 18) * 1000;
  const curveSign = rng() > 0.5 ? 1 : -1;
  const curveStrength = randomRangeFromTuple(rng, motion.curveRange) * curveSign;
  const crossDrift = randomRange(rng, -70, 70);
  const scale = pickFishScale(rng, motion);
  const c1 = clampPoint({
    x: lerp(start.x, target.x, randomRange(rng, 0.24, 0.38)),
    y: lerp(start.y, target.y, randomRange(rng, 0.24, 0.38)) + curveStrength + crossDrift,
  }, motion);
  const c2 = clampPoint({
    x: lerp(start.x, target.x, randomRange(rng, 0.62, 0.78)),
    y: lerp(start.y, target.y, randomRange(rng, 0.62, 0.78)) - curveStrength * randomRange(rng, 0.55, 1.05) - crossDrift,
  }, motion);

  return {
    start,
    target,
    c1,
    c2,
    direction,
    distance,
    speed,
    durationMs,
    floatAmp: randomRangeFromTuple(rng, motion.floatAmpRange),
    floatFrequency: randomRangeFromTuple(rng, motion.floatFrequencyRange),
    hoverMs: randomRangeFromTuple(rng, motion.pauseRangeMs),
    turnMs: randomRangeFromTuple(rng, motion.turnRangeMs),
    hasPause: rng() > 0.42,
    scaleMin: scale.min,
    scaleMax: scale.max,
    tailFrequency: randomRangeFromTuple(rng, motion.tailFrequencyRange),
    startedAt: now,
  };
}

function cubicPoint(segment: FishSegment, t: number): FishPondPoint {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;

  return {
    x: mt2 * mt * segment.start.x
      + 3 * mt2 * t * segment.c1.x
      + 3 * mt * t2 * segment.c2.x
      + t2 * t * segment.target.x,
    y: mt2 * mt * segment.start.y
      + 3 * mt2 * t * segment.c1.y
      + 3 * mt * t2 * segment.c2.y
      + t2 * t * segment.target.y,
  };
}

function cubicTangent(segment: FishSegment, t: number): FishPondPoint {
  const mt = 1 - t;

  return {
    x: 3 * mt * mt * (segment.c1.x - segment.start.x)
      + 6 * mt * t * (segment.c2.x - segment.c1.x)
      + 3 * t * t * (segment.target.x - segment.c2.x),
    y: 3 * mt * mt * (segment.c1.y - segment.start.y)
      + 6 * mt * t * (segment.c2.y - segment.c1.y)
      + 3 * t * t * (segment.target.y - segment.c2.y),
  };
}

function createFishRuntime(root: HTMLDivElement, fish: FishPondSwimmer, index: number, now: number): FishRuntime | null {
  const elements = getFishElements(root);

  if (!elements) {
    return null;
  }

  const rng = createRng(createFishSeed(fish.id, index));
  const position = getRandomFishPoint(rng, fish.motion);
  const direction: FishDirection = rng() > 0.5 ? 1 : -1;
  const delayMs = randomRangeFromTuple(rng, fish.motion.delayRangeMs);

  return {
    elements,
    motion: fish.motion,
    rng,
    position,
    direction,
    phase: "delay",
    phaseStartedAt: now,
    phaseEndsAt: now + delayMs,
    segment: null,
    pendingSegment: null,
    pendingDirection: null,
    lastSpeed: randomRangeFromTuple(rng, fish.motion.speedRange),
    floatPhase: randomRange(rng, 0, Math.PI * 2),
    tailPhase: randomRange(rng, 0, Math.PI * 2),
    scalePhase: randomRange(rng, 0, Math.PI * 2),
    idleFloatAmp: randomRangeFromTuple(rng, fish.motion.floatAmpRange) * 0.62,
    idleFloatFrequency: randomRangeFromTuple(rng, fish.motion.floatFrequencyRange),
  };
}

function startFishSegment(runtime: FishRuntime, segment: FishSegment, now: number) {
  runtime.segment = { ...segment, startedAt: now };
  runtime.pendingSegment = null;
  runtime.pendingDirection = null;
  runtime.direction = segment.direction;
  runtime.phase = "swim";
  runtime.phaseStartedAt = now;
  runtime.phaseEndsAt = now + segment.durationMs;
}

function prepareNextFishSegment(runtime: FishRuntime, now: number) {
  const segment = createFishSegment(runtime, now);
  const needsTurn = segment.direction !== runtime.direction;
  runtime.pendingSegment = segment;
  runtime.pendingDirection = needsTurn ? segment.direction : null;

  if (needsTurn || segment.hasPause) {
    runtime.phase = "hover";
    runtime.phaseStartedAt = now;
    runtime.phaseEndsAt = now + segment.hoverMs;
    return;
  }

  startFishSegment(runtime, segment, now);
}

function advanceFishRuntime(runtime: FishRuntime, now: number) {
  for (let guard = 0; guard < 5; guard += 1) {
    if (runtime.phase === "delay") {
      if (now < runtime.phaseEndsAt) {
        return;
      }

      prepareNextFishSegment(runtime, now);
      continue;
    }

    if (runtime.phase === "swim") {
      if (!runtime.segment || now < runtime.phaseEndsAt) {
        return;
      }

      runtime.position = { ...runtime.segment.target };
      runtime.direction = runtime.segment.direction;
      runtime.lastSpeed = runtime.segment.speed;
      runtime.segment = null;
      prepareNextFishSegment(runtime, now);
      continue;
    }

    if (runtime.phase === "hover") {
      if (now < runtime.phaseEndsAt) {
        return;
      }

      if (runtime.pendingDirection && runtime.pendingSegment) {
        runtime.phase = "turn";
        runtime.phaseStartedAt = now;
        runtime.phaseEndsAt = now + runtime.pendingSegment.turnMs;
        return;
      }

      if (runtime.pendingSegment) {
        startFishSegment(runtime, runtime.pendingSegment, now);
      }

      return;
    }

    if (runtime.phase === "turn") {
      if (now < runtime.phaseEndsAt) {
        return;
      }

      if (runtime.pendingDirection) {
        runtime.direction = runtime.pendingDirection;
      }

      if (runtime.pendingSegment) {
        startFishSegment(runtime, runtime.pendingSegment, now);
      }

      return;
    }
  }
}

function getTurnTransform(runtime: FishRuntime, now: number) {
  if (runtime.phase !== "turn" || !runtime.pendingDirection) {
    return {
      scaleX: runtime.direction,
      scaleY: 1,
    };
  }

  const progress = smoothstep((now - runtime.phaseStartedAt) / (runtime.phaseEndsAt - runtime.phaseStartedAt));

  if (progress < 0.48) {
    const compression = lerp(1, 0.84, progress / 0.48);
    return {
      scaleX: runtime.direction * compression,
      scaleY: lerp(1, 1.035, progress / 0.48),
    };
  }

  const restore = (progress - 0.48) / 0.52;
  return {
    scaleX: runtime.pendingDirection * lerp(0.84, 1, restore),
    scaleY: lerp(1.035, 1, restore),
  };
}

// Layer 1: per-fish self motion applied through nested transform nodes.
function drawFishRuntime(runtime: FishRuntime, now: number) {
  const activeSegment = runtime.segment ?? runtime.pendingSegment;
  let point = runtime.position;
  let tilt = Math.sin(now * 0.0012 + runtime.floatPhase) * 1.4;

  if (runtime.phase === "swim" && runtime.segment) {
    const rawProgress = (now - runtime.segment.startedAt) / runtime.segment.durationMs;
    const progress = smoothstep(rawProgress);
    const tangent = cubicTangent(runtime.segment, progress);
    point = cubicPoint(runtime.segment, progress);
    runtime.position = point;
    tilt = clamp(Math.atan2(tangent.y, Math.max(Math.abs(tangent.x), 1)) * 180 / Math.PI * 0.42, -6, 6);
  }

  const floatAmp = activeSegment?.floatAmp ?? runtime.idleFloatAmp;
  const floatFrequency = activeSegment?.floatFrequency ?? runtime.idleFloatFrequency;
  const scaleMin = activeSegment?.scaleMin ?? 0.98;
  const scaleMax = activeSegment?.scaleMax ?? 1.02;
  const tailFrequency = activeSegment?.tailFrequency ?? 1;
  const floatOffset = Math.sin(now * 0.001 * floatFrequency * 1.6 + runtime.floatPhase) * floatAmp;
  const scalePulse = (Math.sin(now * 0.001 * tailFrequency * 3.2 + runtime.scalePhase) + 1) / 2;
  const bodyScaleX = lerp(scaleMin, scaleMax, scalePulse);
  const bodyScaleY = clamp(1 + (1 - bodyScaleX) * 0.38, 0.97, 1.04);
  const tailSway = Math.sin(now * 0.001 * tailFrequency * 4.4 + runtime.tailPhase) * 2.35;
  const turn = getTurnTransform(runtime, now);
  const { path, turn: turnElement, tilt: tiltElement, float, body, image } = runtime.elements;

  path.style.transform = `translate3d(${point.x.toFixed(2)}px, ${point.y.toFixed(2)}px, 0) translate(-50%, -50%)`;
  turnElement.style.transform = `scaleX(${turn.scaleX.toFixed(3)}) scaleY(${turn.scaleY.toFixed(3)})`;
  tiltElement.style.transform = `rotate(${tilt.toFixed(2)}deg)`;
  float.style.transform = `translate3d(0, ${floatOffset.toFixed(2)}px, 0)`;
  body.style.transform = `scale(${bodyScaleX.toFixed(3)}, ${bodyScaleY.toFixed(3)})`;
  image.style.transform = `rotate(${tailSway.toFixed(2)}deg)`;
}

function drawStaticFish(root: HTMLDivElement, index: number) {
  const elements = getFishElements(root);

  if (!elements) {
    return;
  }

  const motion = FISH_POND_SWIMMERS[index]?.motion;
  const bounds = motion ? getMotionBounds(motion) : FISH_POND_BOUNDS;
  const spread = index % 2 === 0 ? 0.32 : 0.68;
  const x = lerp(bounds.minX, bounds.maxX, spread);
  const y = lerp(bounds.minY, bounds.maxY, 0.5);
  const direction = index % 2 === 0 ? 1 : -1;

  elements.path.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
  elements.turn.style.transform = `scaleX(${direction})`;
  elements.tilt.style.transform = "rotate(0deg)";
  elements.float.style.transform = "translate3d(0, 0, 0)";
  elements.body.style.transform = "scale(1)";
  elements.image.style.transform = "rotate(0deg)";
}

function getFishPondStageLayout(): FishPondStageLayout {
  if (typeof window === "undefined") {
    return {
      width: DESKTOP_STAGE_W,
      height: DESKTOP_STAGE_H,
      scale: 1,
      mode: "desktop",
    };
  }

  const mode = window.innerWidth <= MOBILE_BREAKPOINT ? "mobile" : "desktop";
  const width = mode === "mobile" ? MOBILE_STAGE_W : DESKTOP_STAGE_W;
  const height = mode === "mobile" ? MOBILE_STAGE_H : DESKTOP_STAGE_H;
  const scale = Math.min(window.innerWidth / width, window.innerHeight / height);

  return { width, height, scale, mode };
}

export default function FishPond() {
  const [, setLocation] = useLocation();
  const { t } = useAppLanguage();
  const { fishBalance } = useGameEconomy();
  const walletController = useGameWalletModal();
  const { navigateWithTransition } = usePageTransition();
  const [mobilePageOpen, setMobilePageOpen] = useState(true);
  const [stageLayout, setStageLayout] = useState(getFishPondStageLayout);
  const swimmerRefs = useRef<Array<HTMLDivElement | null>>([]);
  const pageTransition = useMobilePageTransition(mobilePageOpen, 260);
  const tr = useCallback((en: string, zh: string) => t(en, zh), [t]);
  const stageStyle = {
    "--fish-pond-stage-width": `${stageLayout.width}px`,
    "--fish-pond-stage-height": `${stageLayout.height}px`,
    "--fish-pond-stage-scale": stageLayout.scale,
    "--fish-pond-canvas-width": `${FISH_POND_CANVAS_W}px`,
    "--fish-pond-canvas-height": `${FISH_POND_CANVAS_H}px`,
    "--fish-pond-canvas-scale": Math.max(
      stageLayout.width / FISH_POND_CANVAS_W,
      stageLayout.height / FISH_POND_CANVAS_H,
    ),
    "--scale": stageLayout.scale,
    "--mobile-page-base-transform": "translate(-50%, -50%) scale(var(--fish-pond-stage-scale))",
  } as CSSProperties;

  useEffect(() => {
    setMobilePageOpen(true);
  }, []);

  useEffect(() => {
    const syncStageLayout = () => {
      setStageLayout(getFishPondStageLayout());
    };

    syncStageLayout();
    window.addEventListener("resize", syncStageLayout);
    return () => window.removeEventListener("resize", syncStageLayout);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrame = 0;
    let disposed = false;

    const stopAnimation = () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
    };

    const startAnimation = () => {
      stopAnimation();

      const entries = FISH_POND_SWIMMERS.flatMap((fish, index) => {
        const root = swimmerRefs.current[index];
        return root ? [{ fish, index, root }] : [];
      });

      if (mediaQuery.matches) {
        entries.forEach(({ root, index }) => drawStaticFish(root, index));
        return;
      }

      const now = window.performance.now();
      const runtimes = entries.flatMap(({ root, fish, index }) => {
        const runtime = createFishRuntime(root, fish, index, now);
        return runtime ? [runtime] : [];
      });

      const drawFrame = (timestamp: number) => {
        if (disposed) {
          return;
        }

        runtimes.forEach((runtime) => {
          advanceFishRuntime(runtime, timestamp);
          drawFishRuntime(runtime, timestamp);
        });
        animationFrame = window.requestAnimationFrame(drawFrame);
      };

      drawFrame(now);
    };

    startAnimation();
    mediaQuery.addEventListener("change", startAnimation);

    return () => {
      disposed = true;
      stopAnimation();
      mediaQuery.removeEventListener("change", startAnimation);
    };
  }, []);

  const handleBackClick = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
    const origin = typeof window === "undefined"
      ? undefined
      : {
          x: event.clientX / window.innerWidth,
          y: event.clientY / window.innerHeight,
        };

    if (typeof window !== "undefined" && window.innerWidth <= 700 && !pageTransition.prefersReducedMotion) {
      setMobilePageOpen(false);
      window.setTimeout(() => {
        setLocation("/");
      }, pageTransition.exitDurationMs);
      return;
    }

    void navigateWithTransition("/", origin);
  }, [navigateWithTransition, pageTransition.exitDurationMs, pageTransition.prefersReducedMotion, setLocation]);

  const handleOpenFishMarket = useCallback(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 700 && !pageTransition.prefersReducedMotion) {
      setMobilePageOpen(false);
      window.setTimeout(() => {
        setLocation("/fish-market");
      }, pageTransition.exitDurationMs);
      return;
    }

    void navigateWithTransition("/fish-market");
  }, [navigateWithTransition, pageTransition.exitDurationMs, pageTransition.prefersReducedMotion, setLocation]);

  return (
    <main
      className="fish-pond-route mobile-page-transition-route"
      data-mobile-page-transition={pageTransition.phase}
      aria-label={tr("Pond", "鱼塘")}
    >
      <section
        className="fish-pond-route__surface mobile-page-transition-surface"
        data-layout={stageLayout.mode}
        style={stageStyle}
      >
        <video
          className="fish-pond-route__background-video"
          src={pondAtmosphereVideo}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          aria-hidden="true"
        />
        <div className="fish-pond-swimmers" aria-hidden="true">
          {FISH_POND_SWIMMERS.map((fish, index) => (
            <div
              className={`fish-pond-swimmer ${fish.className}`}
              data-water-layer={fish.motion.waterLayer}
              key={fish.id}
              ref={(node) => {
                swimmerRefs.current[index] = node;
              }}
              style={{
                "--fish-size": `${fish.size}px`,
                "--fish-opacity": fish.opacity,
                "--fish-z": fish.zIndex,
              } as CSSProperties}
            >
              <div className="fish-pond-swimmer__path" data-fish-path>
                <div className="fish-pond-swimmer__turn" data-fish-turn>
                  <div className="fish-pond-swimmer__tilt" data-fish-tilt>
                    <div className="fish-pond-swimmer__float" data-fish-float>
                      <div className="fish-pond-swimmer__body" data-fish-body>
                        <div className="fish-pond-swimmer__asset">
                          <img className="fish-pond-swimmer__image" src={fish.image} alt="" loading="lazy" data-fish-image />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <header className="fish-pond-route__hud" aria-label={tr("Stats", "数值统计")}>
          <button
            className="fish-pond-back-button"
            type="button"
            aria-label={stageLayout.mode === "mobile" ? tr("Close", "关闭") : tr("Back", "返回")}
            onClick={handleBackClick}
          >
            <span className="fish-pond-back-button__icon" aria-hidden="true">
              <X size={22} strokeWidth={3} />
            </span>
            <img src={SCRATCH_CARD_ASSETS.back} alt="" />
          </button>
          <GameHudStats
            className="fish-pond-hud-stats"
            coinBalance={walletController.coinBalanceValue}
            cashBalance={walletController.cashBalanceValue}
            cashDecimals={1}
            fishBalance={fishBalance}
            tr={tr}
            onOpenWallet={walletController.openWalletModal}
            onOpenFishMarket={handleOpenFishMarket}
          />
        </header>
      </section>
      <style>{`
        .fish-pond-route {
          position: fixed;
          inset: 0;
          overflow: hidden;
          background: #90CBF3;
          --ac-cream-light: #f8f8f0;
          --ac-border: #c4b89e;
          --ac-shadow: #bdaea0;
          --radius-xs: 4px;
          image-rendering: pixelated;
        }

        .fish-pond-route__surface {
          position: absolute;
          top: 50%;
          left: 50%;
          width: var(--fish-pond-stage-width);
          height: var(--fish-pond-stage-height);
          background: #90CBF3;
          overflow: hidden;
          transform-origin: center;
        }

        .fish-pond-route__background-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          pointer-events: none;
          user-select: none;
        }

        .fish-pond-swimmers {
          position: absolute;
          left: 50%;
          top: 50%;
          z-index: 2;
          width: var(--fish-pond-canvas-width);
          height: var(--fish-pond-canvas-height);
          overflow: hidden;
          pointer-events: none;
          contain: paint;
          transform: translate(-50%, -50%) scale(var(--fish-pond-canvas-scale));
          transform-origin: center;
        }

        .fish-pond-swimmer {
          position: absolute;
          inset: 0;
          z-index: var(--fish-z, 2);
          opacity: var(--fish-opacity, .82);
        }

        .fish-pond-swimmer__path,
        .fish-pond-swimmer__turn,
        .fish-pond-swimmer__tilt,
        .fish-pond-swimmer__float,
        .fish-pond-swimmer__body,
        .fish-pond-swimmer__asset,
        .fish-pond-swimmer__image {
          display: block;
          transform-origin: center;
          will-change: transform;
        }

        .fish-pond-swimmer__path {
          position: absolute;
          left: 0;
          top: 0;
          width: var(--fish-size);
          transform: translate3d(960px, 540px, 0) translate(-50%, -50%);
        }

        .fish-pond-swimmer__asset {
          width: 100%;
          transform: scaleX(-1);
        }

        .fish-pond-swimmer__image {
          width: 100%;
          height: auto;
          max-width: none;
          filter: drop-shadow(0 5px 7px rgba(36, 119, 148, .16));
          user-select: none;
        }

        .fish-pond-swimmer--seahorse .fish-pond-swimmer__image {
          transform-origin: 48% 58%;
        }

        .fish-pond-swimmer--koi .fish-pond-swimmer__image {
          transform-origin: 20% 52%;
        }

        .fish-pond-swimmer--far .fish-pond-swimmer__image {
          filter: drop-shadow(0 4px 5px rgba(36, 119, 148, .12));
        }

        .fish-pond-route__hud {
          position: absolute;
          top: 40px;
          left: 40px;
          display: flex;
          align-items: center;
          gap: 30px;
          z-index: 8;
        }

        .fish-pond-back-button {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 50px;
          height: 50px;
          border: 1.5px solid rgba(196, 184, 158, 0.86);
          border-radius: 4px;
          background: #f8f8f0;
          box-shadow: 2px 2px 0 rgba(189, 174, 160, 0.48);
          cursor: pointer;
        }

        .fish-pond-back-button__icon {
          display: none;
          color: #6b4a2d;
          line-height: 0;
        }

        .fish-pond-back-button__icon svg {
          width: 22px;
          height: 22px;
          display: block;
        }

        .fish-pond-back-button img {
          width: 26px;
          height: 26px;
        }

        .fish-pond-hud-stats {
          position: static;
          left: auto;
          top: auto;
          z-index: auto;
        }

        .fish-pond-hud-stats .hud-stat-card--button {
          cursor: pointer;
        }

        @media (max-width: 700px) {
          .fish-pond-route__hud {
            top: 26px;
            left: 50%;
            width: 514px;
            justify-content: flex-start;
            gap: 12px;
            transform: translateX(-50%);
          }

          .fish-pond-back-button {
            width: calc(38px / var(--scale));
            height: calc(38px / var(--scale));
            flex: 0 0 auto;
            display: inline-grid;
            place-items: center;
            border-width: 1.5px;
            border-color: rgba(196, 184, 158, 0.86);
            border-radius: var(--radius-xs);
            background: var(--ac-cream-light, #fff8e7);
            box-shadow: 2px 2px 0 rgba(189, 174, 160, 0.48);
            order: 2;
            margin-left: auto;
          }

          .fish-pond-back-button__icon {
            display: inline-grid;
            place-items: center;
          }

          .fish-pond-back-button img {
            display: none;
          }

          .fish-pond-hud-stats {
            gap: calc(4.8px / var(--scale));
            --hud-stat-height: calc(40px / var(--scale));
            --hud-stat-padding: calc(6px / var(--scale));
            --hud-stat-border-width: 2px;
            --hud-stat-radius: calc(8px / var(--scale));
            --hud-stat-font-size: calc(13.6px / var(--scale));
            --hud-stat-balance-width: calc(60.8px / var(--scale));
            --hud-stat-compact-width: calc(41.6px / var(--scale));
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .fish-pond-swimmer__path,
          .fish-pond-swimmer__turn,
          .fish-pond-swimmer__tilt,
          .fish-pond-swimmer__float,
          .fish-pond-swimmer__body,
          .fish-pond-swimmer__asset,
          .fish-pond-swimmer__image {
            will-change: auto;
          }
        }
      `}</style>
    </main>
  );
}
