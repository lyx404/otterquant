import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const SCROLLBAR_ACTIVE_CLASS = "oq-scrollbar-active";
const scrollbarHideTimers = new WeakMap<Element, number>();

document.addEventListener(
  "scroll",
  event => {
    const scrollElement =
      event.target === document
        ? document.documentElement
        : event.target instanceof Element
          ? event.target
          : null;

    if (!scrollElement) return;

    scrollElement.classList.add(SCROLLBAR_ACTIVE_CLASS);

    const previousTimer = scrollbarHideTimers.get(scrollElement);
    if (previousTimer) window.clearTimeout(previousTimer);

    const hideTimer = window.setTimeout(() => {
      scrollElement.classList.remove(SCROLLBAR_ACTIVE_CLASS);
      scrollbarHideTimers.delete(scrollElement);
    }, 1000);

    scrollbarHideTimers.set(scrollElement, hideTimer);
  },
  { capture: true, passive: true },
);

createRoot(document.getElementById("root")!).render(<App />);
