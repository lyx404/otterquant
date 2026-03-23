/*
 * CustomCursor — Indigo/Sky + Slate Design System
 * Circle cursor with mix-blend-mode: difference
 * Uses CSS variable --primary to stay on-theme in both light & dark modes
 * Light primary: #4F46E5 (Indigo-600) / Dark primary: #818CF8 (Indigo-400)
 */
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);

  /* Read the current --primary CSS variable value */
  const getPrimaryColor = () => {
    return getComputedStyle(document.documentElement)
      .getPropertyValue("--primary")
      .trim();
  };

  /* Derive a semi-transparent version of primary for hover bg */
  const getPrimaryAlpha = (alpha: number) => {
    const hex = getPrimaryColor();
    // Convert hex to rgb
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

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

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    if (isHovering) {
      const primary = getPrimaryColor();
      gsap.to(cursor, {
        width: 56,
        height: 56,
        borderColor: primary,
        backgroundColor: getPrimaryAlpha(0.08),
        duration: 0.3,
        ease: "power3.out",
      });
    } else {
      const primary = getPrimaryColor();
      gsap.to(cursor, {
        width: 32,
        height: 32,
        borderColor: getPrimaryAlpha(0.4),
        backgroundColor: "transparent",
        duration: 0.3,
        ease: "power3.out",
      });
    }
  }, [isHovering]);

  return (
    <>
      <div
        ref={cursorRef}
        className="pointer-events-none fixed top-0 left-0 z-[9999] rounded-full border mix-blend-difference will-change-transform"
        style={{
          width: 32,
          height: 32,
          transform: "translate(-50%, -50%)",
          borderColor: "var(--primary)",
          opacity: 0.4,
        }}
      />
      <div
        ref={dotRef}
        className="pointer-events-none fixed top-0 left-0 z-[9999] w-[5px] h-[5px] rounded-full bg-primary will-change-transform"
        style={{
          transform: "translate(-50%, -50%)",
        }}
      />
    </>
  );
}
