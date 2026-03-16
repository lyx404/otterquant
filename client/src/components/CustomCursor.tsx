/*
 * CustomCursor — Acid Green Design System
 * Circle cursor with mix-blend-mode: difference
 * Enlarges and turns acid green on hoverable elements
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

    // Position state
    let mouseX = 0;
    let mouseY = 0;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      // Dot follows instantly
      gsap.set(dot, { x: mouseX, y: mouseY });

      // Ring follows with slight lag
      gsap.to(cursor, {
        x: mouseX,
        y: mouseY,
        duration: 0.15,
        ease: "power2.out",
      });
    };

    const onMouseEnterHoverable = () => setIsHovering(true);
    const onMouseLeaveHoverable = () => setIsHovering(false);

    // Attach hover listeners to all clickable elements
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

    // Initial attach + MutationObserver for dynamic elements
    let hoverables = addHoverListeners();

    const observer = new MutationObserver(() => {
      // Cleanup old
      hoverables.forEach((el) => {
        el.removeEventListener("mouseenter", onMouseEnterHoverable);
        el.removeEventListener("mouseleave", onMouseLeaveHoverable);
      });
      // Re-attach
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

  // Animate ring size on hover state change
  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    if (isHovering) {
      gsap.to(cursor, {
        width: 56,
        height: 56,
        borderColor: "#C5FF4A",
        backgroundColor: "rgba(197, 255, 74, 0.06)",
        duration: 0.3,
        ease: "power3.out",
      });
    } else {
      gsap.to(cursor, {
        width: 32,
        height: 32,
        borderColor: "rgba(255, 255, 255, 0.5)",
        backgroundColor: "transparent",
        duration: 0.3,
        ease: "power3.out",
      });
    }
  }, [isHovering]);

  return (
    <>
      {/* Ring */}
      <div
        ref={cursorRef}
        className="pointer-events-none fixed top-0 left-0 z-[9999] rounded-full border"
        style={{
          width: 32,
          height: 32,
          borderColor: "rgba(255, 255, 255, 0.5)",
          borderWidth: 1,
          transform: "translate(-50%, -50%)",
          mixBlendMode: "difference",
          willChange: "transform, width, height",
        }}
      />
      {/* Dot */}
      <div
        ref={dotRef}
        className="pointer-events-none fixed top-0 left-0 z-[9999] rounded-full"
        style={{
          width: 5,
          height: 5,
          backgroundColor: "#C5FF4A",
          transform: "translate(-50%, -50%)",
          willChange: "transform",
        }}
      />
    </>
  );
}
