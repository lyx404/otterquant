import { useEffect } from "react";
import { usePageTransition } from "@/contexts/PageTransitionContext";

const SCRATCH_CARD_SRC = "/scratch-card/index.html";

export default function ScratchCard() {
  const { navigateWithTransition } = usePageTransition();

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "scratch-card:back") {
        void navigateWithTransition("/");
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [navigateWithTransition]);

  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        background: "#c6d1f6",
      }}
      aria-label="幸运刮刮乐"
    >
      <iframe
        title="幸运刮刮乐"
        src={SCRATCH_CARD_SRC}
        style={{
          width: "100%",
          height: "100%",
          border: 0,
          display: "block",
        }}
      />
    </main>
  );
}
