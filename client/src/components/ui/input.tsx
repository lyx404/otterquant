import { useDialogComposition } from "@/components/ui/dialog";
import { useComposition } from "@/hooks/useComposition";
import { playType } from "@/lib/sounds";
import { cn } from "@/lib/utils";
import * as React from "react";

const TYPE_SOUND_INPUT_TYPES = new Set([
  "email",
  "number",
  "password",
  "search",
  "tel",
  "text",
  "url",
]);
const TYPE_SOUND_MIN_INTERVAL_MS = 34;

function shouldPlayTypeSound(event: React.KeyboardEvent<HTMLInputElement>) {
  const input = event.currentTarget;
  const isComposing = event.nativeEvent.isComposing;

  if (input.disabled || input.readOnly || isComposing) return false;
  if (event.metaKey || event.ctrlKey || event.altKey) return false;
  if (!TYPE_SOUND_INPUT_TYPES.has(input.type || "text")) return false;

  return event.key.length === 1 || event.key === "Backspace" || event.key === "Delete";
}

function Input({
  className,
  type,
  onKeyDown,
  onCompositionStart,
  onCompositionEnd,
  ...props
}: React.ComponentProps<"input">) {
  // Get dialog composition context if available (will be no-op if not inside Dialog)
  const dialogComposition = useDialogComposition();
  const lastTypeSoundAtRef = React.useRef(0);

  const playInputTypeSound = (key: string) => {
    const now = window.performance.now();

    if (now - lastTypeSoundAtRef.current < TYPE_SOUND_MIN_INTERVAL_MS) return;
    lastTypeSoundAtRef.current = now;

    try {
      playType(key);
    } catch {
      // Sound feedback should never block typing.
    }
  };

  // Add composition event handlers to support input method editor (IME) for CJK languages.
  const {
    onCompositionStart: handleCompositionStart,
    onCompositionEnd: handleCompositionEnd,
    onKeyDown: handleKeyDown,
  } = useComposition<HTMLInputElement>({
    onKeyDown: (e) => {
      // Check if this is an Enter key that should be blocked
      const isComposing = (e.nativeEvent as any).isComposing || dialogComposition.justEndedComposing();

      // If Enter key is pressed while composing or just after composition ended,
      // don't call the user's onKeyDown (this blocks the business logic)
      if (e.key === "Enter" && isComposing) {
        return;
      }

      // Otherwise, call the user's onKeyDown
      const shouldPlaySound = shouldPlayTypeSound(e);
      onKeyDown?.(e);
      if (shouldPlaySound && !e.defaultPrevented) {
        playInputTypeSound(e.key);
      }
    },
    onCompositionStart: e => {
      dialogComposition.setComposing(true);
      onCompositionStart?.(e);
    },
    onCompositionEnd: e => {
      // Mark that composition just ended - this helps handle the Enter key that confirms input
      dialogComposition.markCompositionEnd();
      // Delay setting composing to false to handle Safari's event order
      // In Safari, compositionEnd fires before the ESC keydown event
      setTimeout(() => {
        dialogComposition.setComposing(false);
      }, 100);
      onCompositionEnd?.(e);
    },
  });

  return (
    <input
      type={type}
      data-slot="input"
      data-sound-input="component"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      onKeyDown={handleKeyDown}
      {...props}
    />
  );
}

export { Input };
