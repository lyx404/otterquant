/*
 * NotFound — Acid Green Design System
 * #0B0B0B bg, #C5FF4A accent
 */
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
        style={{ backgroundColor: "rgba(248,113,113,0.10)" }}
      >
        <AlertCircle className="w-8 h-8" style={{ color: "rgb(248,113,113)" }} />
      </div>
      <h1 className="text-7xl font-medium tracking-tighter leading-none text-white mb-2">404</h1>
      <h2 className="text-lg font-medium mb-4" style={{ color: "rgba(255,255,255,0.50)" }}>Page Not Found</h2>
      <p className="text-sm mb-8 max-w-md" style={{ color: "rgba(255,255,255,0.40)" }}>
        The page you are looking for doesn't exist or has been moved.
      </p>
      <button
        onClick={() => setLocation("/")}
        className="h-10 px-6 rounded-md text-sm font-medium flex items-center gap-2 transition-all"
        style={{ backgroundColor: "#C5FF4A", color: "#0B0B0B" }}
      >
        <Home className="w-4 h-4" />
        Go Home
      </button>
    </div>
  );
}
