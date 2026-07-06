import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { playClick, playHover, playPop, playTap } from "@/lib/sounds";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-transparent shadow-xs hover:bg-accent dark:bg-transparent dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

type ButtonActivationSound = "click" | "tap" | "pop" | null;

const BUTTON_HOVER_SOUND_MIN_INTERVAL_MS = 140;

function isButtonSoundDisabled(element: Element, disabled?: boolean) {
  return (
    Boolean(disabled) ||
    element.getAttribute("aria-disabled") === "true" ||
    element.hasAttribute("data-disabled")
  );
}

function resolveButtonActivationSound(
  element: Element,
  pointerType: string | null,
): ButtonActivationSound {
  const explicitSound = element.getAttribute("data-sound");

  if (explicitSound === "none") return null;
  if (explicitSound === "pop") return "pop";
  if (explicitSound === "tap") return "tap";
  if (explicitSound === "click") return "click";

  return "tap";
}

function playButtonSound(sound: ButtonActivationSound | "hover") {
  try {
    if (sound === "click") playClick();
    if (sound === "tap") playTap();
    if (sound === "pop") playPop();
    if (sound === "hover") playHover();
  } catch {
    // Sound feedback should never block the button action.
  }
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  disabled,
  onClick,
  onPointerDown,
  onPointerEnter,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";
  const lastPointerTypeRef = React.useRef<string | null>(null);
  const lastHoverSoundAtRef = React.useRef(0);

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    lastPointerTypeRef.current = event.pointerType;
    onPointerDown?.(event);
  };

  const handlePointerEnter = (event: React.PointerEvent<HTMLButtonElement>) => {
    onPointerEnter?.(event);
    if (event.defaultPrevented) return;
    if (event.pointerType === "touch") return;
    if (isButtonSoundDisabled(event.currentTarget, disabled)) return;

    const now = window.performance.now();
    if (now - lastHoverSoundAtRef.current < BUTTON_HOVER_SOUND_MIN_INTERVAL_MS) return;
    lastHoverSoundAtRef.current = now;
    playButtonSound("hover");
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (isButtonSoundDisabled(event.currentTarget, disabled)) return;

    const sound = resolveButtonActivationSound(event.currentTarget, lastPointerTypeRef.current);
    lastPointerTypeRef.current = null;
    playButtonSound(sound);
  };

  return (
    <Comp
      {...props}
      data-slot="button"
      data-sound-button="component"
      disabled={disabled}
      className={cn(buttonVariants({ variant, size, className }))}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerEnter={handlePointerEnter}
    />
  );
}

export { Button, buttonVariants };
