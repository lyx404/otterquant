/*
 * CustomCursor — Quandora brand accent
 * Circle cursor that follows the mouse pointer
 * Uses CSS variable --brand-accent to stay on-theme in light and dark modes.
 *
 * NOTE: mix-blend-mode: difference is intentionally NOT used because it causes
 * The brand accent can invert unpredictably on light backgrounds.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);

  const getCursorColor = useCallback(() => {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue("--brand-accent")
      .trim();
    return raw || "#dc4900";
  }, []);

  const getCursorAlpha = useCallback(
    (alpha: number) => {
      const hex = getCursorColor();
      if (!hex.startsWith("#") || hex.length < 7) {
        return `rgba(220, 73, 0, ${alpha})`;
      }
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    },
    [getCursorColor]
  );

  useEffect(() => {
    const cursor = cursorRef.current;
    const dot = dotRef.current;
    if (!cursor || !dot) return;

    let mouseX = 0;
    let mouseY = 0;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      gsap.set(dot, { x: mouseX, y: mouseY });
      gsap.to(cursor, {
        x: mouseX,
        y: mouseY,
        duration: 0.15,
        ease: "power2.out",
      });
    };

    const onMouseEnterHoverable = () => setIsHovering(true);
    const onMouseLeaveHoverable = () => setIsHovering(false);

    const addHoverListeners = () => {
      const hoverables = document.querySelectorAll(
        'a, button, [role="button"], select, input, textarea, [data-cursor-hover]'
      );
      hoverables.forEach((el) => {
        el.addEventListener("mouseenter", onMouseEnterHoverable);
        el.addEventListener("mouseleave", onMouseLeaveHoverable);
      });
      return hoverables;
    };

    document.addEventListener("mousemove", onMouseMove);
    let hoverables = addHoverListeners();

    const observer = new MutationObserver(() => {
      hoverables.forEach((el) => {
        el.removeEventListener("mouseenter", onMouseEnterHoverable);
        el.removeEventListener("mouseleave", onMouseLeaveHoverable);
      });
      hoverables = addHoverListeners();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      observer.disconnect();
      hoverables.forEach((el) => {
        el.removeEventListener("mouseenter", onMouseEnterHoverable);
        el.removeEventListener("mouseleave", onMouseLeaveHoverable);
      });
    };
  }, []);

  /* Update cursor appearance on hover state change & theme changes */
  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    if (isHovering) {
      const accent = getCursorColor();
      gsap.to(cursor, {
        width: 56,
        height: 56,
        borderColor: accent,
        backgroundColor: getCursorAlpha(0.1),
        duration: 0.3,
        ease: "power3.out",
      });
    } else {
      gsap.to(cursor, {
        width: 32,
        height: 32,
        borderColor: getCursorAlpha(0.5),
        backgroundColor: "transparent",
        duration: 0.3,
        ease: "power3.out",
      });
    }
  }, [isHovering, getCursorColor, getCursorAlpha]);

  /* Listen for theme changes (class toggle on <html>) to refresh colors */
  useEffect(() => {
    const cursor = cursorRef.current;
    const dot = dotRef.current;
    if (!cursor || !dot) return;

    const refreshColors = () => {
      const accent = getCursorColor();
      dot.style.backgroundColor = accent;
      if (!isHovering) {
        cursor.style.borderColor = getCursorAlpha(0.5);
      } else {
        cursor.style.borderColor = accent;
        cursor.style.backgroundColor = getCursorAlpha(0.1);
      }
    };

    const themeObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "class"
        ) {
          // Small delay to let CSS variables update
          requestAnimationFrame(refreshColors);
        }
      }
    });

    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => themeObserver.disconnect();
  }, [isHovering, getCursorColor, getCursorAlpha]);

  return (
    <>
      {/* Outer ring has no blend mode so the brand accent stays accurate. */}
      <div
        ref={cursorRef}
        className="pointer-events-none fixed top-0 left-0 z-[9999] rounded-full border will-change-transform"
        style={{
          width: 32,
          height: 32,
          transform: "translate(-50%, -50%)",
          borderColor: "var(--brand-accent)",
          opacity: 0.5,
        }}
      />
      {/* Inner dot */}
      <div
        ref={dotRef}
        className="pointer-events-none fixed top-0 left-0 z-[9999] w-[5px] h-[5px] rounded-full will-change-transform"
        style={{
          transform: "translate(-50%, -50%)",
          backgroundColor: "var(--brand-accent)",
        }}
      />
    </>
  );
}
