import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type MousePoint = {
  x: number;
  y: number;
  width: number;
  height: number;
};

interface AwardBadgeProps {
  active: boolean;
  mouseX: number;
  mouseY: number;
  width: number;
  height: number;
  className?: string;
}

const identityMatrix =
  "1, 0, 0, 0, " +
  "0, 1, 0, 0, " +
  "0, 0, 1, 0, " +
  "0, 0, 0, 1";

const maxRotate = 0.25;
const minRotate = -0.25;
const maxScale = 1;
const minScale = 0.97;

function getMatrix(point: MousePoint) {
  const xCenter = point.width / 2;
  const yCenter = point.height / 2;
  const xRatio = point.x / Math.max(point.width, 1);
  const yRatio = point.y / Math.max(point.height, 1);

  const scale = [
    maxScale - (maxScale - minScale) * Math.abs(xCenter - point.x) / Math.max(xCenter, 1),
    maxScale - (maxScale - minScale) * Math.abs(yCenter - point.y) / Math.max(yCenter, 1),
    maxScale - (maxScale - minScale) * (Math.abs(xCenter - point.x) + Math.abs(yCenter - point.y)) / Math.max(xCenter + yCenter, 1),
  ];

  const rotate = {
    x1: 0.25 * ((yCenter - point.y) / Math.max(yCenter, 1) - (xCenter - point.x) / Math.max(xCenter, 1)),
    x2: maxRotate - (maxRotate - minRotate) * (1 - xRatio),
    x3: 0,
    y0: 0,
    y2: maxRotate - (maxRotate - minRotate) * yRatio,
    y3: 0,
    z0: -(maxRotate - (maxRotate - minRotate) * (1 - xRatio)),
    z1: 0.2 - (0.2 + 0.6) * yRatio,
    z3: 0,
  };

  return `${scale[0]}, ${rotate.y0}, ${rotate.z0}, 0, ` +
    `${rotate.x1}, ${scale[1]}, ${rotate.z1}, 0, ` +
    `${rotate.x2}, ${rotate.y2}, ${scale[2]}, 0, ` +
    `${rotate.x3}, ${rotate.y3}, ${rotate.z3}, 1`;
}

function getOppositeMatrix(matrix: string, point: MousePoint, onMouseEnter?: boolean) {
  const weakening = onMouseEnter ? 0.7 : 4;
  const multiplier = onMouseEnter ? -1 : 1;
  const xRatio = point.x / Math.max(point.width, 1);
  const yRatio = point.y / Math.max(point.height, 1);

  return matrix.split(", ").map((item, index) => {
    if (index === 2 || index === 4 || index === 8) {
      return -parseFloat(item) * multiplier / weakening;
    }
    if (index === 0 || index === 5 || index === 10) {
      return "1";
    }
    if (index === 6) {
      return multiplier * (maxRotate - (maxRotate - minRotate) * yRatio) / weakening;
    }
    if (index === 9) {
      return (maxRotate - (maxRotate - minRotate) * xRatio) / weakening;
    }
    return item;
  }).join(", ");
}

export function AwardBadge({
  active,
  mouseX,
  mouseY,
  width,
  height,
  className,
}: AwardBadgeProps) {
  const [firstOverlayPosition, setFirstOverlayPosition] = useState<number>(0);
  const [matrix, setMatrix] = useState<string>(identityMatrix);
  const [currentMatrix, setCurrentMatrix] = useState<string>(identityMatrix);
  const [disableInOutOverlayAnimation, setDisableInOutOverlayAnimation] = useState<boolean>(true);
  const [disableOverlayAnimation, setDisableOverlayAnimation] = useState<boolean>(false);
  const [isTimeoutFinished, setIsTimeoutFinished] = useState<boolean>(false);
  const enterTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimeout1 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimeout2 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimeout3 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uid = useId().replace(/:/g, "");

  useEffect(() => {
    if (leaveTimeout1.current) clearTimeout(leaveTimeout1.current);
    if (leaveTimeout2.current) clearTimeout(leaveTimeout2.current);
    if (leaveTimeout3.current) clearTimeout(leaveTimeout3.current);
    if (enterTimeout.current) clearTimeout(enterTimeout.current);

    if (!active || !width || !height) {
      setDisableOverlayAnimation(false);
      setDisableInOutOverlayAnimation(true);
      setFirstOverlayPosition(0);
      setMatrix(identityMatrix);
      setCurrentMatrix(identityMatrix);
      setIsTimeoutFinished(false);
      return undefined;
    }

    setDisableOverlayAnimation(true);
    setDisableInOutOverlayAnimation(false);
    enterTimeout.current = setTimeout(() => setDisableInOutOverlayAnimation(true), 350);

    const point = { x: mouseX, y: mouseY, width, height };
    const centerX = width / 2;
    const centerY = height / 2;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setFirstOverlayPosition((Math.abs(centerX - mouseX) + Math.abs(centerY - mouseY)) / 1.5);
      });
    });

    const nextMatrix = getMatrix(point);
    const oppositeMatrix = getOppositeMatrix(nextMatrix, point, true);

    setMatrix(oppositeMatrix);
    setIsTimeoutFinished(false);

    const timeout = setTimeout(() => {
      setIsTimeoutFinished(true);
    }, 200);

    return () => {
      clearTimeout(timeout);
    };
  }, [active, mouseX, mouseY, width, height]);

  useEffect(() => {
    if (isTimeoutFinished) {
      setMatrix(currentMatrix);
    }
  }, [currentMatrix, isTimeoutFinished]);

  useEffect(() => {
    if (!active) return undefined;
    const point = { x: mouseX, y: mouseY, width, height };
    setCurrentMatrix(getMatrix(point));
    return undefined;
  }, [active, mouseX, mouseY, width, height]);

  const overlayAnimations = useMemo(() => {
    return [...Array(10).keys()].map((e) => (
      `
      @keyframes overlayAnimation${e + 1} {
        0% { transform: rotate(${e * 10}deg); }
        50% { transform: rotate(${(e + 1) * 10}deg); }
        100% { transform: rotate(${e * 10}deg); }
      }
      `
    )).join(" ");
  }, []);

  return (
    <div
      className={cn("pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]", className)}
      aria-hidden="true"
      style={{
        opacity: active ? 0.96 : 0.58,
        transform: `perspective(700px) matrix3d(${matrix})`,
        transformOrigin: "center center",
        transition: "transform 200ms ease-out, opacity 220ms ease-out, filter 220ms ease-out",
        willChange: "transform, opacity, filter",
        filter: active ? "saturate(1.28) contrast(1.1)" : "saturate(1.08) contrast(1.02)",
      }}
    >
      <style>{overlayAnimations}</style>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 260 400"
        className="h-full w-full"
        preserveAspectRatio="none"
      >
        <defs>
          <filter id={`award-badge-blur-${uid}`}>
            <feGaussianBlur in="SourceGraphic" stdDeviation="4.2" />
          </filter>
          <mask id={`award-badge-mask-${uid}`}>
            <rect width="260" height="400" fill="white" rx="24" />
          </mask>
          <linearGradient id={`award-badge-sheen-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
            <stop offset="35%" stopColor="rgba(255,255,255,0.02)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.26)" />
            <stop offset="65%" stopColor="rgba(255,255,255,0.03)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.16)" />
          </linearGradient>
          <radialGradient id={`award-badge-halo-${uid}`} cx="50%" cy="34%" r="72%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
            <stop offset="52%" stopColor="rgba(255,255,255,0.05)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>

        <g mask={`url(#award-badge-mask-${uid})`}>
          <rect width="260" height="400" fill={`url(#award-badge-halo-${uid})`} />
          <rect width="260" height="400" fill={`url(#award-badge-sheen-${uid})`} opacity=".34" />
          <g style={{ mixBlendMode: "screen", transformOrigin: "center center" }}>
            <g style={{
              transform: `rotate(${firstOverlayPosition}deg)`,
              transformOrigin: "center center",
              transition: !disableInOutOverlayAnimation ? "transform 200ms ease-out" : "none",
              animation: disableOverlayAnimation ? "none" : "overlayAnimation1 5s infinite",
              willChange: "transform",
            }}>
              <polygon points="0,0 260,400 260,0 0,400" fill="rgba(255, 79, 159, .62)" filter={`url(#award-badge-blur-${uid})`} opacity=".66" />
            </g>
            <g style={{
              transform: `rotate(${firstOverlayPosition + 10}deg)`,
              transformOrigin: "center center",
              transition: !disableInOutOverlayAnimation ? "transform 200ms ease-out" : "none",
              animation: disableOverlayAnimation ? "none" : "overlayAnimation2 5s infinite",
              willChange: "transform",
            }}>
              <polygon points="0,0 260,400 260,0 0,400" fill="rgba(255, 192, 92, .6)" filter={`url(#award-badge-blur-${uid})`} opacity=".62" />
            </g>
            <g style={{
              transform: `rotate(${firstOverlayPosition + 20}deg)`,
              transformOrigin: "center center",
              transition: !disableInOutOverlayAnimation ? "transform 200ms ease-out" : "none",
              animation: disableOverlayAnimation ? "none" : "overlayAnimation3 5s infinite",
              willChange: "transform",
            }}>
              <polygon points="0,0 260,400 260,0 0,400" fill="rgba(255, 244, 118, .58)" filter={`url(#award-badge-blur-${uid})`} opacity=".6" />
            </g>
            <g style={{
              transform: `rotate(${firstOverlayPosition + 30}deg)`,
              transformOrigin: "center center",
              transition: !disableInOutOverlayAnimation ? "transform 200ms ease-out" : "none",
              animation: disableOverlayAnimation ? "none" : "overlayAnimation4 5s infinite",
              willChange: "transform",
            }}>
              <polygon points="0,0 260,400 260,0 0,400" fill="rgba(102, 255, 178, .54)" filter={`url(#award-badge-blur-${uid})`} opacity=".54" />
            </g>
            <g style={{
              transform: `rotate(${firstOverlayPosition + 40}deg)`,
              transformOrigin: "center center",
              transition: !disableInOutOverlayAnimation ? "transform 200ms ease-out" : "none",
              animation: disableOverlayAnimation ? "none" : "overlayAnimation5 5s infinite",
              willChange: "transform",
            }}>
              <polygon points="0,0 260,400 260,0 0,400" fill="rgba(75, 159, 255, .58)" filter={`url(#award-badge-blur-${uid})`} opacity=".58" />
            </g>
            <g style={{
              transform: `rotate(${firstOverlayPosition + 50}deg)`,
              transformOrigin: "center center",
              transition: !disableInOutOverlayAnimation ? "transform 200ms ease-out" : "none",
              animation: disableOverlayAnimation ? "none" : "overlayAnimation6 5s infinite",
              willChange: "transform",
            }}>
              <polygon points="0,0 260,400 260,0 0,400" fill="rgba(167, 92, 255, .58)" filter={`url(#award-badge-blur-${uid})`} opacity=".58" />
            </g>
            <g style={{
              transform: `rotate(${firstOverlayPosition + 60}deg)`,
              transformOrigin: "center center",
              transition: !disableInOutOverlayAnimation ? "transform 200ms ease-out" : "none",
              animation: disableOverlayAnimation ? "none" : "overlayAnimation7 5s infinite",
              willChange: "transform",
            }}>
              <polygon points="0,0 260,400 260,0 0,400" fill="rgba(255, 255, 255, .38)" filter={`url(#award-badge-blur-${uid})`} opacity=".48" />
            </g>
            <g style={{
              transform: `rotate(${firstOverlayPosition + 72}deg)`,
              transformOrigin: "center center",
              transition: !disableInOutOverlayAnimation ? "transform 200ms ease-out" : "none",
              animation: disableOverlayAnimation ? "none" : "overlayAnimation8 5s infinite",
              willChange: "transform",
              mixBlendMode: "overlay",
            }}>
              <polygon points="0,0 260,400 260,0 0,400" fill="url(#award-badge-sheen-${uid})" filter={`url(#award-badge-blur-${uid})`} opacity=".48" />
            </g>
            <g style={{
              transform: `rotate(${firstOverlayPosition + 82}deg)`,
              transformOrigin: "center center",
              transition: !disableInOutOverlayAnimation ? "transform 200ms ease-out" : "none",
              animation: disableOverlayAnimation ? "none" : "overlayAnimation9 5s infinite",
              willChange: "transform",
              mixBlendMode: "soft-light",
            }}>
              <polygon points="0,0 260,400 260,0 0,400" fill="rgba(255,255,255,.18)" filter={`url(#award-badge-blur-${uid})`} opacity=".28" />
            </g>
            <g style={{
              transform: `rotate(${firstOverlayPosition + 92}deg)`,
              transformOrigin: "center center",
              transition: !disableInOutOverlayAnimation ? "transform 200ms ease-out" : "none",
              animation: disableOverlayAnimation ? "none" : "overlayAnimation10 5s infinite",
              willChange: "transform",
            }}>
              <polygon points="0,0 260,400 260,0 0,400" fill="white" filter={`url(#award-badge-blur-${uid})`} opacity=".3" />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}
