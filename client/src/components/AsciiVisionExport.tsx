import React, { useEffect, useRef, useState, useCallback } from 'react';

interface Point {
  x: number;
  y: number;
}

export default function AsciiVisionExport() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mousePosRef = useRef<Point>({ x: -1000, y: -1000 });
  const animFrameRef = useRef<number>(0);
  const cachedImageDataRef = useRef<{
    data: Uint8ClampedArray;
    sampleCols: number;
    sampleRows: number;
  } | null>(null);

  const IMG_SRC = "data:image/png;base64,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";

  const RESOLUTION = 80;
  const CONTRAST = 1.2;
  const CHARS = " oterquan";
  const CUSTOM_COLOR = "#4c48e7";
  const COLOR_MODE = "custom" as 'custom' | 'original';
  const CELL_WIDTH_PX = 8;
  const PARTICLE_SPACING = 1.2;
  const SCALE = 1.5;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const img = new Image();
    if (/^https?:\/\//i.test(IMG_SRC)) img.crossOrigin = 'anonymous';
    img.onerror = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ff7d6a';
      ctx.globalAlpha = 1;
      ctx.font = '14px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('CORS error: image pixels are blocked.', 16, 16);
    };

    img.onload = () => {
      // Pre-compute image data once
      const container = containerRef.current;
      const containerW = container ? container.clientWidth : 400;
      const containerH = container ? container.clientHeight : 300;
      const displayW = Math.max(1, Math.round(containerW));
      const displayH = Math.max(1, Math.round(containerH));
      const dpr = window.devicePixelRatio || 1;
      const renderW = Math.max(1, Math.round(displayW * dpr));
      const renderH = Math.max(1, Math.round(displayH * dpr));

      canvas.width = renderW;
      canvas.height = renderH;
      canvas.style.width = displayW + 'px';
      canvas.style.height = displayH + 'px';

      const spacing = Math.max(0.6, PARTICLE_SPACING);
      const baseCols = Math.max(1, Math.round(displayW / CELL_WIDTH_PX));
      const baseRows = Math.max(1, Math.round(displayH / (CELL_WIDTH_PX / 0.6)));
      const cols = Math.max(1, Math.round(baseCols / spacing));
      const rows = Math.max(1, Math.round(baseRows / spacing));
      const cellWidth = renderW / cols;
      const cellHeight = renderH / rows;
      const charWidth = cellWidth / spacing;
      const charHeight = cellHeight / spacing;
      const sampleCols = Math.max(1, Math.round(RESOLUTION));
      const sampleRows = Math.max(1, Math.round((sampleCols * rows) / cols));

      // Sample image once
      const offscreen = document.createElement('canvas');
      offscreen.width = sampleCols;
      offscreen.height = sampleRows;
      const offCtx = offscreen.getContext('2d');
      if (!offCtx) return;

      const imgAspect = img.width / img.height;
      const gridAspect = (cols * charWidth) / (rows * charHeight);
      const cwCh = charWidth / charHeight;

      let destW: number, destH: number;
      if (imgAspect > gridAspect) {
        destW = sampleCols * SCALE;
        destH = (sampleCols * cwCh * SCALE) / imgAspect;
      } else {
        destH = sampleRows * SCALE;
        destW = (sampleRows * imgAspect * SCALE) / cwCh;
      }
      const imgOffsetX = (sampleCols - destW) / 2;
      const imgOffsetY = (sampleRows - destH) / 2;

      offCtx.clearRect(0, 0, sampleCols, sampleRows);
      offCtx.drawImage(img, 0, 0, img.width, img.height, imgOffsetX, imgOffsetY, destW, destH);

      let imageData: Uint8ClampedArray;
      try {
        imageData = offCtx.getImageData(0, 0, sampleCols, sampleRows).data;
      } catch {
        return;
      }

      // Pre-compute static grid data
      const gridData = new Array(rows * cols);
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
          const posX = x * cellWidth;
          const posY = y * cellHeight;
          const centerX = posX + charWidth / 2;
          const centerY = posY + charHeight / 2;

          gridData[y * cols + x] = {
            r, g, b, brightness, charIndex,
            posX, posY, centerX, centerY,
          };
        }
      }

      cachedImageDataRef.current = { data: imageData, sampleCols, sampleRows };

      const hoverInvertRadius = 72;
      const hoverRadiusPx = hoverInvertRadius * dpr;
      const hoverRadiusSq = hoverRadiusPx * hoverRadiusPx;
      const pointerRadius = 120 * dpr;
      const customFillStyle = CUSTOM_COLOR;

      const render = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = `${charHeight}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        const mx = mousePosRef.current.x;
        const my = mousePosRef.current.y;

        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            const cell = gridData[y * cols + x];
            const { brightness, charIndex, posX, posY, centerX, centerY, r, g, b } = cell;

            const dx = mx - centerX;
            const dy = my - centerY;
            const distSq = dx * dx + dy * dy;

            let drawX = posX;
            let drawY = posY;
            let alpha = brightness / 255;
            let isHighlighted = false;
            let char = CHARS[charIndex];

            if (distSq < pointerRadius * pointerRadius) {
              const dist = Math.sqrt(distSq);
              const intensity = Math.pow(1 - dist / pointerRadius, 1.5);
              drawX += -dx * intensity * 0.3;
              drawY += -dy * intensity * 0.3;
              alpha = Math.min(1, alpha + intensity * 1.2);
              if (intensity > 0.4 && charIndex < CHARS.length - 1) {
                char = CHARS[Math.min(CHARS.length - 1, charIndex + 1)];
              }
              if (intensity > 0.8) {
                isHighlighted = true;
              }
            }

            if (alpha > 0.02 || isHighlighted) {
              const inHoverInvert = distSq <= hoverRadiusSq;

              const originalFillStyle = `rgb(${r},${g},${b})`;
              const normalFillStyle = COLOR_MODE === 'original' ? originalFillStyle : customFillStyle;
              const inverseFillStyle = COLOR_MODE === 'original' ? customFillStyle : originalFillStyle;
              const fillStyle = inHoverInvert ? inverseFillStyle : normalFillStyle;

              ctx.fillStyle = isHighlighted ? '#ffffff' : fillStyle;
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
  }, []);

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

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden"
      onMouseMove={(e) => {
        const point = getCanvasPoint(e.clientX, e.clientY);
        if (!point) return;
        mousePosRef.current = point;
      }}
      onMouseLeave={() => { mousePosRef.current = { x: -1000, y: -1000 }; }}
    >
      <canvas ref={canvasRef} className="w-full h-full block cursor-crosshair" />
    </div>
  );
}
