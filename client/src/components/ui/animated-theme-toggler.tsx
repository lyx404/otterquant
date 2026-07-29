import { useCallback, useRef } from "react";
import { Moon, Sun } from "lucide-react";
import { flushSync } from "react-dom";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";

interface AnimatedThemeTogglerProps
  extends Omit<React.ComponentPropsWithoutRef<"button">, "onClick"> {
  duration?: number;
  onThemeChange?: () => void;
}

export const AnimatedThemeToggler = ({
  children,
  className,
  duration = 400,
  onThemeChange,
  ...props
}: AnimatedThemeTogglerProps) => {
  const { theme, toggleTheme, switchable } = useTheme();
  const isDark = theme === "dark";
  const buttonRef = useRef<HTMLButtonElement>(null);
  const changeTheme = onThemeChange ?? toggleTheme;

  const handleToggle = useCallback(() => {
    if (!changeTheme) return;

    const button = buttonRef.current;
    if (!button) {
      changeTheme();
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      changeTheme();
      return;
    }

    const { top, left, width, height } = button.getBoundingClientRect();
    const x = left + width / 2;
    const y = top + height / 2;
    const viewportWidth =
      window.visualViewport?.width ?? window.innerWidth;
    const viewportHeight =
      window.visualViewport?.height ?? window.innerHeight;

    const maxRadius = Math.hypot(
      Math.max(x, viewportWidth - x),
      Math.max(y, viewportHeight - y)
    );

    // Fallback for browsers without View Transition API
    if (typeof (document as any).startViewTransition !== "function") {
      changeTheme();
      return;
    }

    const transition = (document as any).startViewTransition(() => {
      flushSync(() => {
        changeTheme();
      });
    });

    const ready = transition.ready;
    if (ready && typeof ready.then === "function") {
      ready.then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${maxRadius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration,
            easing: "cubic-bezier(0.25, 1, 0.5, 1)",
            pseudoElement: "::view-transition-new(root)",
          }
        );
      });
    }
  }, [changeTheme, duration]);

  if (!switchable) return null;

  return (
    <button
      type="button"
      ref={buttonRef}
      onClick={handleToggle}
      className={cn(
        children == null
          ? "relative inline-flex items-center justify-center rounded-full p-2 text-muted-foreground transition-colors hover:text-foreground"
          : undefined,
        className
      )}
      {...props}
    >
      {children ?? (
        <>
          {isDark ? (
            <Sun className="h-3.5 w-3.5 transition-colors" />
          ) : (
            <Moon className="h-3.5 w-3.5 transition-colors" />
          )}
          <span className="sr-only">Toggle theme</span>
        </>
      )}
    </button>
  );
};
