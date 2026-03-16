import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-full bg-negative/10 flex items-center justify-center mb-6">
        <AlertCircle className="w-8 h-8 text-negative" />
      </div>
      <h1 className="text-5xl font-heading font-bold text-foreground mb-2">404</h1>
      <h2 className="text-lg font-medium text-muted-foreground mb-4">Page Not Found</h2>
      <p className="text-sm text-muted-foreground mb-8 max-w-md">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Button
        onClick={() => setLocation("/")}
        className="bg-lime text-background hover:bg-lime/90 gap-2"
      >
        <Home className="w-4 h-4" />
        Go Home
      </Button>
    </div>
  );
}
