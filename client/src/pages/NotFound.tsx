/*
 * NotFound — Katana Deep Navy Design System
 * bg-0: #0d111c | Primary: #0058ff | Danger: #f12211
 */
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
        style={{ backgroundColor: "rgba(241,34,17,0.10)" }}
      >
        <AlertCircle className="w-8 h-8" style={{ color: "#f12211" }} />
      </div>
      <h1 className="text-7xl font-medium tracking-tighter leading-none mb-2" style={{ color: "rgba(236,238,243,0.92)" }}>404</h1>
      <h2 className="text-lg font-medium mb-4" style={{ color: "rgba(236,238,243,0.48)" }}>Page Not Found</h2>
      <p className="text-sm mb-8 max-w-md" style={{ color: "rgba(236,238,243,0.32)" }}>
        The page you are looking for doesn't exist or has been moved.
      </p>
      <button
        onClick={() => setLocation("/")}
        className="h-10 px-6 rounded-[9999px] text-sm font-medium flex items-center gap-2 transition-all duration-250"
        style={{ backgroundColor: "#0058ff", color: "#fff" }}
      >
        <Home className="w-4 h-4" />
        Go Home
      </button>
    </div>
  );
}
