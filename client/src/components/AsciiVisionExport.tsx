import React, { useEffect, useRef, useCallback } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface Point {
  x: number;
  y: number;
}

interface ColorWave {
  x: number;
  y: number;
  startAt: number;
  durationMs: number;
  maxRadius: number;
  toMode: 'custom' | 'original';
}

export default function AsciiVisionExport() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mousePosRef = useRef<Point>({ x: -1000, y: -1000 });
  const animFrameRef = useRef<number>(0);
  const colorModeRef = useRef<'custom' | 'original'>('custom');
  const colorWaveRef = useRef<ColorWave | null>(null);

  const IMG_SRC = "data:image/png;base64,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";

  const RESOLUTION = 129;
  const CONTRAST = 1.5;
  const CHARS = " .oO0";
  const CUSTOM_COLOR = "#4c48e7";
  const CANVAS_BG = isDark ? "#000000" : "#ffffff";
  const HIGHLIGHT_COLOR = isDark ? '#ffffff' : '#000000';
  const canvasBgRef = useRef(CANVAS_BG);
  canvasBgRef.current = CANVAS_BG;
  const highlightColorRef = useRef(HIGHLIGHT_COLOR);
  highlightColorRef.current = HIGHLIGHT_COLOR;
  const CELL_PX = 6;
  const CELL_WH = 0.6;
  const PARTICLE_SPACING = 1;
  const HOVER_INVERT_RADIUS = 72;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const img = new Image();
    if (/^https?:\/\//i.test(IMG_SRC)) img.crossOrigin = 'anonymous';
    img.onerror = () => {
      ctx.fillStyle = canvasBgRef.current;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ff7d6a';
      ctx.globalAlpha = 1;
      ctx.font = '14px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('Image load error.', 16, 16);
    };

    img.onload = () => {
      const sampleCols = Math.max(1, Math.round(RESOLUTION));

      const render = () => {
        const dpr = window.devicePixelRatio || 1;
        const imgAspect = img.width / img.height;
        const container = containerRef.current;
        const containerW = container ? container.clientWidth : window.innerWidth;
        const containerH = container ? container.clientHeight : window.innerHeight;

        let displayW = containerW;
        let displayH = containerW / imgAspect;
        if (displayH > containerH) {
          displayH = containerH;
          displayW = containerH * imgAspect;
        }
        displayW = Math.max(1, Math.round(displayW));
        displayH = Math.max(1, Math.round(displayH));
        const renderW = Math.max(1, Math.round(displayW * dpr));
        const renderH = Math.max(1, Math.round(displayH * dpr));
        if (canvas.width !== renderW || canvas.height !== renderH) {
          canvas.width = renderW;
          canvas.height = renderH;
        }
        canvas.style.width = displayW + 'px';
        canvas.style.height = displayH + 'px';

        const spacing = Math.max(0.6, PARTICLE_SPACING);
        const baseCols = Math.max(1, Math.round(displayW / CELL_PX));
        const baseRows = Math.max(1, Math.round(displayH / (CELL_PX / CELL_WH)));
        const cols = Math.max(1, Math.round(baseCols / spacing));
        const rows = Math.max(1, Math.round(baseRows / spacing));
        const cellWidth = renderW / cols;
        const cellHeight = renderH / rows;
        const charWidth = cellWidth / spacing;
        const charHeight = cellHeight / spacing;
        const sampleRows = Math.max(1, Math.round((sampleCols * rows) / cols));

        const offscreen = document.createElement('canvas');
        offscreen.width = sampleCols;
        offscreen.height = sampleRows;
        const offCtx = offscreen.getContext('2d');
        if (!offCtx) {
          animFrameRef.current = requestAnimationFrame(render);
          return;
        }

        const gridAspect = (cols * charWidth) / (rows * charHeight);
        const cwCh = charWidth / charHeight;

        let destW: number, destH: number;
        if (imgAspect > gridAspect) {
          destW = sampleCols;
          destH = (sampleCols * cwCh) / imgAspect;
        } else {
          destH = sampleRows;
          destW = (sampleRows * imgAspect) / cwCh;
        }
        const offsetX = (sampleCols - destW) / 2;
        const offsetY = (sampleRows - destH) / 2;

        offCtx.fillStyle = canvasBgRef.current;
        offCtx.fillRect(0, 0, sampleCols, sampleRows);
        offCtx.drawImage(img, 0, 0, img.width, img.height, offsetX, offsetY, destW, destH);

        let imageData: Uint8ClampedArray;
        try {
          imageData = offCtx.getImageData(0, 0, sampleCols, sampleRows).data;
        } catch {
          ctx.fillStyle = canvasBgRef.current;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#ff7d6a';
          ctx.globalAlpha = 1;
          ctx.font = '14px "JetBrains Mono", monospace';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText('CORS error: image pixels are blocked.', 16, 16);
          return;
        }

        ctx.fillStyle = canvasBgRef.current;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = `${charHeight}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        const customFillStyle = CUSTOM_COLOR;
        const now = performance.now();
        const diagonal = Math.hypot(canvas.width, canvas.height);
        let waveRadiusSq = -1;
        const colorWave = colorWaveRef.current;
        let colorMode = colorModeRef.current;

        if (colorWave) {
          const progress = Math.min(1, (now - colorWave.startAt) / colorWave.durationMs);
          const easedProgress = 1 - Math.pow(1 - progress, 3);
          const finalRadius = colorWave.maxRadius > 0 ? colorWave.maxRadius : diagonal;
          const waveRadius = easedProgress * finalRadius;
          waveRadiusSq = waveRadius * waveRadius;
          if (progress >= 1) {
            colorModeRef.current = colorWave.toMode;
            colorMode = colorWave.toMode;
            colorWaveRef.current = null;
          }
        }

        const hoverRadiusPx = HOVER_INVERT_RADIUS * dpr;
        const hoverRadiusSq = hoverRadiusPx * hoverRadiusPx;
        const pointerRadius = 120 * dpr;

        const mx = mousePosRef.current.x;
        const my = mousePosRef.current.y;

        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            const sx = Math.min(sampleCols - 1, Math.max(0, Math.round(((x + 0.5) / cols) * (sampleCols - 1))));
            const sy = Math.min(sampleRows - 1, Math.max(0, Math.round(((y + 0.5) / rows) * (sampleRows - 1))));
            const i = (sy * sampleCols + sx) * 4;
            const r = imageData[i];
            const g = imageData[i + 1];
            const b = imageData[i + 2];

            let brightness = (0.299 * r + 0.587 * g + 0.114 * b);
            brightness = ((brightness / 255 - 0.5) * CONTRAST + 0.5) * 255;
            brightness = Math.max(0, Math.min(255, brightness));

            const charIndex = Math.floor((brightness / 255) * (CHARS.length - 1));
            let char = CHARS[charIndex];

            const posX = x * cellWidth;
            const posY = y * cellHeight;
            const centerX = posX + charWidth / 2;
            const centerY = posY + charHeight / 2;

            const dx = mx - centerX;
            const dy = my - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            let drawX = posX;
            let drawY = posY;
            let alpha = brightness / 255;
            let isHighlighted = false;
            let oX = 0;
            let oY = 0;

            if (dist < pointerRadius) {
              const intensity = Math.pow(1 - dist / pointerRadius, 1.5);
              oX = -dx * intensity * 0.3;
              oY = -dy * intensity * 0.3;
              alpha = Math.min(1, alpha + intensity * 1.2);
              if (intensity > 0.4 && charIndex < CHARS.length - 1) {
                char = CHARS[Math.min(CHARS.length - 1, charIndex + 1)];
              }
              if (intensity > 0.8) {
                isHighlighted = true;
              }
            }

            drawX += oX;
            drawY += oY;

            if (alpha > 0.02 || isHighlighted) {
              const hoverDx = mx - centerX;
              const hoverDy = my - centerY;
              const inHoverInvert = hoverDx * hoverDx + hoverDy * hoverDy <= hoverRadiusSq;

              let inWaveInvert = false;
              if (colorWave && waveRadiusSq >= 0) {
                const waveDx = colorWave.x - centerX;
                const waveDy = colorWave.y - centerY;
                inWaveInvert = waveDx * waveDx + waveDy * waveDy <= waveRadiusSq;
              }

              const effectiveMode = inWaveInvert && colorWave ? colorWave.toMode : colorMode;
              const originalFillStyle = `rgb(${r},${g},${b})`;
              const normalFillStyle = effectiveMode === 'original' ? originalFillStyle : customFillStyle;
              const inverseFillStyle = effectiveMode === 'original' ? customFillStyle : originalFillStyle;
              const fillStyle = inHoverInvert ? inverseFillStyle : normalFillStyle;

              ctx.fillStyle = isHighlighted ? highlightColorRef.current : fillStyle;
              ctx.globalAlpha = isHighlighted ? 1 : alpha * 0.8 + 0.2;
              ctx.fillText(char, drawX, drawY);
            }
          }
        }
        ctx.globalAlpha = 1;
        animFrameRef.current = requestAnimationFrame(render);
      };

      animFrameRef.current = requestAnimationFrame(render);
    };

    img.src = IMG_SRC;

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isDark]);

  const getCanvasPoint = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || canvas.width < 1 || canvas.height < 1) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return null;
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const point = getCanvasPoint(e.clientX, e.clientY);
    if (!point) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const nextMode = colorModeRef.current === 'custom' ? 'original' : 'custom';
    colorWaveRef.current = {
      x: point.x,
      y: point.y,
      startAt: performance.now(),
      durationMs: 720,
      maxRadius: Math.hypot(canvas.width, canvas.height),
      toMode: nextMode,
    };
  }, [getCanvasPoint]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden flex items-center justify-center"
      style={{ backgroundColor: CANVAS_BG }}
      onMouseMove={(e) => {
        const point = getCanvasPoint(e.clientX, e.clientY);
        if (!point) return;
        mousePosRef.current = point;
      }}
      onMouseLeave={() => { mousePosRef.current = { x: -1000, y: -1000 }; }}
      onTouchMove={(e) => {
        if (!e.touches[0]) return;
        const point = getCanvasPoint(e.touches[0].clientX, e.touches[0].clientY);
        if (!point) return;
        mousePosRef.current = point;
      }}
      onClick={handleClick}
    >
      <canvas ref={canvasRef} className="block cursor-crosshair" style={{ transform: 'scale(1.2)', transformOrigin: 'center center' }} />
    </div>
  );
}
