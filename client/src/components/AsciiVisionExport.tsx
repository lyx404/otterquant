import React, { useEffect, useRef, useState, useCallback } from 'react';

interface Point {
  x: number;
  y: number;
}

export default function AsciiVisionExport() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePos, setMousePos] = useState<Point>({ x: -1000, y: -1000 });
  const [viewport, setViewport] = useState({ w: 0, h: 0 });

  const IMG_SRC = "data:image/png;base64,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";
  const RESOLUTION = 129;
  const CONTRAST = 1.2;
  const CHARS = " abcdefghijklmnopqrstuvwxyz";
  const CUSTOM_COLOR = "#4c48e7";
  const COLOR_MODE = "custom" as 'custom' | 'original';
  const CANVAS_BG = "#0b0b0b";
  const CELL_WIDTH_PX = 6;
  const PARTICLE_SPACING = 1.2;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const img = new Image();
    if (/^https?:\/\//i.test(IMG_SRC)) img.crossOrigin = 'anonymous';
    img.onerror = () => {
      ctx.fillStyle = CANVAS_BG;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ff7d6a';
      ctx.globalAlpha = 1;
      ctx.font = '14px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('CORS error: image pixels are blocked.', 16, 16);
      ctx.fillText('Use same-origin image or enable Access-Control-Allow-Origin.', 16, 36);
    };

    img.onload = () => {
      const render = () => {
        const dpr = window.devicePixelRatio || 1;
        const imgAspect = img.width / img.height;
        let displayW = window.innerWidth;
        let displayH = displayW / imgAspect;
        if (displayH > window.innerHeight) {
          displayH = window.innerHeight;
          displayW = displayH * imgAspect;
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

        const offscreen = document.createElement('canvas');
        offscreen.width = sampleCols;
        offscreen.height = sampleRows;
        const offCtx = offscreen.getContext('2d');
        if (!offCtx) {
          requestAnimationFrame(render);
          return;
        }

        const gridAspect = (cols * charWidth) / (rows * charHeight);
        const cwCh = charWidth / charHeight;

        let destW, destH;
        if (imgAspect > gridAspect) {
          destW = sampleCols;
          destH = (sampleCols * cwCh) / imgAspect;
        } else {
          destH = sampleRows;
          destW = (sampleRows * imgAspect) / cwCh;
        }
        const offsetX = (sampleCols - destW) / 2;
        const offsetY = (sampleRows - destH) / 2;

        offCtx.fillStyle = CANVAS_BG;
        offCtx.fillRect(0, 0, sampleCols, sampleRows);
        offCtx.drawImage(img, 0, 0, img.width, img.height, offsetX, offsetY, destW, destH);
        let imageData;
        try {
          imageData = offCtx.getImageData(0, 0, sampleCols, sampleRows).data;
        } catch {
          ctx.fillStyle = CANVAS_BG;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#ff7d6a';
          ctx.globalAlpha = 1;
          ctx.font = '14px "JetBrains Mono", monospace';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText('CORS error: image pixels are blocked.', 16, 16);
          ctx.fillText('Use same-origin image or enable Access-Control-Allow-Origin.', 16, 36);
          return;
        }

        ctx.fillStyle = CANVAS_BG;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = `${charHeight}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        const customFillStyle = CUSTOM_COLOR;
        const now = performance.now();
        const diagonal = Math.hypot(canvas.width, canvas.height);
        let waveRadiusSq = -1;
        
        const hoverInvertRadius = 72;
        const hoverRadiusPx = hoverInvertRadius * dpr;
        const hoverRadiusSq = hoverRadiusPx * hoverRadiusPx;
        const pointerRadius = 120 * dpr;

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

            const dx = mousePos.x - centerX;
            const dy = mousePos.y - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            let drawX = posX;
            let drawY = posY;
            let alpha = brightness / 255;
            let isHighlighted = false;
            let offsetX = 0;
            let offsetY = 0;

            if (dist < pointerRadius) {
              const intensity = Math.pow(1 - dist / pointerRadius, 1.5);
              offsetX = -dx * intensity * 0.3;
              offsetY = -dy * intensity * 0.3;
              alpha = Math.min(1, alpha + intensity * 1.2);
              if (intensity > 0.4 && charIndex < CHARS.length - 1) {
                char = CHARS[Math.min(CHARS.length - 1, charIndex + 1)];
              }
              if (intensity > 0.8) {
                isHighlighted = true;
              }
            }

            drawX += offsetX;
            drawY += offsetY;

            if (alpha > 0.02 || isHighlighted) {
              const hoverDx = mousePos.x - centerX;
              const hoverDy = mousePos.y - centerY;
              const inHoverInvert = hoverDx * hoverDx + hoverDy * hoverDy <= hoverRadiusSq;

              const originalFillStyle = 'rgb(' + r + ', ' + g + ', ' + b + ')';
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
        requestAnimationFrame(render);
      };

      render();
    };

    img.src = IMG_SRC;
  }, [IMG_SRC, RESOLUTION, CONTRAST, CHARS, CUSTOM_COLOR, COLOR_MODE, CANVAS_BG, CELL_WIDTH_PX, PARTICLE_SPACING, mousePos]);

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
      className="w-full h-full overflow-hidden"
      style={{ backgroundColor: CANVAS_BG }}
      onMouseMove={(e) => {
        const point = getCanvasPoint(e.clientX, e.clientY);
        if (!point) return;
        setMousePos(point);
      }}
      onMouseLeave={() => setMousePos({ x: -1000, y: -1000 })}
    >
      <canvas ref={canvasRef} className="w-full h-full block cursor-crosshair" />
    </div>
  );
}

export const metadata = {
  title: 'ASCII Vision Export',
  description: 'Exported ASCII art from ASCII Vision Pro',
};