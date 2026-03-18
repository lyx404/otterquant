/*
 * CustomCursor — Indigo/Sky + Slate Design System
 * Circle cursor with mix-blend-mode: difference
 * Enlarges and turns indigo (#4F46E5) on hoverable elements
 */
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);

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
      gsap.to(cursor, {
        width: 56,
        height: 56,
        borderColor: "#818CF8",
        backgroundColor: "rgba(129, 140, 248, 0.06)",
        duration: 0.3,
        ease: "power3.out",
      });
    } else {
      gsap.to(cursor, {
        width: 32,
        height: 32,
        borderColor: "rgba(148, 163, 184, 0.4)",
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
        className="pointer-events-none fixed top-0 left-0 z-[9999] rounded-full border border-slate-400/40 mix-blend-difference will-change-transform"
        style={{
          width: 32,
          height: 32,
          transform: "translate(-50%, -50%)",
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
