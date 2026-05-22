import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    const onMouseMove = (e: MouseEvent) => {
      gsap.to(cursor, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.12,
        ease: "power3.out",
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

    gsap.to(cursor, {
      scale: isHovering ? 1.14 : 1,
      rotate: isHovering ? -8 : -14,
      duration: 0.22,
      ease: "power3.out",
    });
  }, [isHovering]);

  return (
    <>
      <style>{`
        .island-cursor {
          --cursor-ink: #794f27;
          --cursor-cream: #fff9e8;
          --cursor-cream-deep: #f2dfae;
          --cursor-mint: #19c8b9;
          pointer-events: none;
          position: fixed;
          left: 0;
          top: 0;
          z-index: 9999;
          width: 34px;
          height: 43px;
          transform: translate(-8px, -7px) rotate(-14deg);
          transform-origin: 8px 7px;
          will-change: transform;
          filter:
            drop-shadow(0 3px 0 #bdaea0)
            drop-shadow(0 7px 10px rgba(61, 52, 40, .18));
        }

        .island-cursor::before {
          content: "";
          position: absolute;
          left: 4px;
          top: 1px;
          width: 19px;
          height: 31px;
          background:
            radial-gradient(circle at 39% 20%, rgba(255,255,255,.75) 0 13%, transparent 14%),
            linear-gradient(155deg, var(--cursor-cream) 0 18%, var(--cursor-cream-deep) 100%);
          border: 3px solid var(--cursor-ink);
          border-radius: 16px 15px 12px 14px / 18px 15px 12px 12px;
          clip-path: polygon(0 0, 100% 44%, 63% 50%, 85% 98%, 62% 100%, 39% 54%, 0 76%);
        }

        .island-cursor::after {
          content: "";
          position: absolute;
          left: 18px;
          top: 22px;
          width: 10px;
          height: 10px;
          background: var(--cursor-mint);
          border: 2px solid var(--cursor-ink);
          border-radius: 50%;
          opacity: 0;
          transform: scale(.4);
          transition:
            opacity .18s ease,
            transform .18s ease;
        }

        .island-cursor.is-hovering::after {
          opacity: 1;
          transform: scale(1);
        }

        .island-cursor__spark {
          position: absolute;
          left: 22px;
          top: 6px;
          width: 7px;
          height: 7px;
          background: #ffcc00;
          border: 1.5px solid var(--cursor-ink);
          transform: rotate(45deg) scale(.85);
          opacity: 0;
          transition:
            opacity .18s ease,
            transform .18s ease;
        }

        .island-cursor.is-hovering .island-cursor__spark {
          opacity: 1;
          transform: rotate(45deg) scale(1);
        }

        @media (pointer: coarse), (prefers-reduced-motion: reduce) {
          .island-cursor {
            display: none;
          }
        }
      `}</style>
      <div
        ref={cursorRef}
        className={`island-cursor${isHovering ? " is-hovering" : ""}`}
        aria-hidden="true"
      >
        <span className="island-cursor__spark" />
      </div>
    </>
  );
}
