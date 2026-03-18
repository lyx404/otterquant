/*
 * NotFound — Modern Developer Tool Aesthetic
 * Pure Tailwind classes — zero inline styles
 */
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6 bg-red-500/10">
        <AlertCircle className="w-8 h-8 text-red-500" />
      </div>
      <h1 className="text-7xl font-medium tracking-tighter leading-none mb-2 text-foreground">404</h1>
      <h2 className="text-lg font-medium mb-4 text-muted-foreground">Page Not Found</h2>
      <p className="text-sm mb-8 max-w-md text-muted-foreground/60">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <button
        onClick={() => setLocation("/")}
        className="h-10 px-6 rounded-full text-sm font-medium flex items-center gap-2 transition-all duration-200 bg-primary text-white hover:bg-primary/90"
      >
        <Home className="w-4 h-4" />
        Go Home
      </button>
    </div>
  );
}
