import { useEffect, useRef } from "react";
import { playType, soundThemes, type SoundName } from "@/lib/sounds";
import {
  applySoundSettings,
  readSoundSettings,
  subscribeSoundSettings,
} from "@/lib/soundPreferences";

const INTERACTIVE_SELECTOR = [
  "button",
  "a[href]",
  "summary",
  '[role="button"]',
  '[role="link"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="switch"]',
  "[aria-haspopup]",
  "[data-sound]",
].join(",");

const TYPING_INPUT_TYPES = new Set([
  "email",
  "number",
  "password",
  "search",
  "tel",
  "text",
  "url",
]);
const COMPONENT_SOUND_INPUT_SELECTOR = '[data-sound-input="component"]';
const COMPONENT_SOUND_BUTTON_SELECTOR = '[data-sound-button="component"]';
const COMPONENT_SOUND_MENU_SELECTOR = '[data-sound-menu="component"]';
const TYPING_SOUND_MIN_INTERVAL_MS = 34;

function isDisabled(element: Element) {
  if (element.getAttribute("aria-disabled") === "true") return true;
  if (element.hasAttribute("data-disabled")) return true;
  if (element instanceof HTMLButtonElement) return element.disabled;
  if (element instanceof HTMLInputElement) return element.disabled;
  if (element instanceof HTMLSelectElement) return element.disabled;
  if (element instanceof HTMLTextAreaElement) return element.disabled;
  return false;
}

function closestInteractive(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  return target.closest(INTERACTIVE_SELECTOR);
}

function play(name: SoundName, step?: number) {
  try {
    soundThemes.clearChime.play(name, step);
  } catch {
    // Audio feedback should never block the primary interaction.
  }
}

function soundForInteraction(element: Element): SoundName {
  const explicitSound = element.getAttribute("data-sound") as SoundName | null;
  if (explicitSound) return explicitSound;

  const role = element.getAttribute("role");
  if (role === "tab") return "tab";
  if (role === "menuitem" || role === "option") return "select";

  if (role === "switch") {
    return element.getAttribute("aria-checked") === "true" ? "toggleOff" : "toggleOn";
  }

  if (element.hasAttribute("aria-haspopup")) {
    return element.getAttribute("aria-expanded") === "true" ? "close" : "menuOpen";
  }

  if (element instanceof HTMLAnchorElement) return "select";
  return "click";
}

function isTypingTarget(target: EventTarget | null) {
  if (target instanceof HTMLTextAreaElement) return true;
  if (!(target instanceof HTMLInputElement)) return false;
  return TYPING_INPUT_TYPES.has(target.type || "text");
}

function shouldPlayTypingSound(event: KeyboardEvent) {
  const target = event.target;

  if (!isTypingTarget(target)) return false;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return false;
  if (event.defaultPrevented || event.isComposing) return false;
  if (target.disabled || target.readOnly) return false;
  if (event.metaKey || event.ctrlKey || event.altKey) return false;

  return event.key.length === 1 || event.key === "Backspace" || event.key === "Delete";
}

function isComponentSoundInput(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(COMPONENT_SOUND_INPUT_SELECTOR));
}

function isComponentSoundButton(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(COMPONENT_SOUND_BUTTON_SELECTOR));
}

function isComponentSoundMenu(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(COMPONENT_SOUND_MENU_SELECTOR));
}

export default function SoundFeedback() {
  const lastTypingSoundRef = useRef(0);
  const lastSliderSoundRef = useRef(0);

  useEffect(() => {
    applySoundSettings(readSoundSettings());
    const unsubscribeSoundSettings = subscribeSoundSettings(applySoundSettings);

    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLSelectElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (isComponentSoundButton(event.target)) return;
      if (isComponentSoundMenu(event.target)) return;

      const element = closestInteractive(event.target);
      if (!element || isDisabled(element)) return;

      play(soundForInteraction(element));
    };

    const handleChange = (event: Event) => {
      const target = event.target;

      if (target instanceof HTMLInputElement) {
        if (isDisabled(target)) return;
        if (target.type === "checkbox") {
          play(target.checked ? "check" : "uncheck");
          return;
        }
        if (target.type === "radio") {
          play("radio");
          return;
        }
        if (target.type === "range") {
          play("snap");
          return;
        }
      }

      if (target instanceof HTMLSelectElement && !isDisabled(target)) {
        play("select");
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const now = window.performance.now();

      if (
        isComponentSoundInput(event.target) ||
        !shouldPlayTypingSound(event) ||
        now - lastTypingSoundRef.current < TYPING_SOUND_MIN_INTERVAL_MS
      ) {
        return;
      }

      lastTypingSoundRef.current = now;
      try {
        playType(event.key);
      } catch {
        // Audio feedback should never block typing.
      }
    };

    const handleInput = (event: Event) => {
      const now = window.performance.now();
      const target = event.target;

      if (target instanceof HTMLInputElement && target.type === "range") {
        if (now - lastSliderSoundRef.current < 70) return;
        lastSliderSoundRef.current = now;
        play("slider");
      }
    };

    document.addEventListener("click", handleClick);
    document.addEventListener("change", handleChange);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("input", handleInput);

    return () => {
      unsubscribeSoundSettings();
      document.removeEventListener("click", handleClick);
      document.removeEventListener("change", handleChange);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("input", handleInput);
    };
  }, []);

  return null;
}
