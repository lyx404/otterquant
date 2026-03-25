/*
 * Auth Page — Login / Register
 * Indigo/Sky + Slate Design System
 * Fields: Email, Password, Email Verification Code
 * Tabs to switch between Login and Register modes
 * Animated transitions with GSAP
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useOnboarding } from "@/App";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import gsap from "gsap";
import {
  Zap,
  Mail,
  Lock,
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
} from "lucide-react";

type AuthMode = "login" | "register";

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const { login } = useAuth();
  const { onboarded } = useOnboarding();
  const [, navigate] = useLocation();
  const formRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Entrance animation
  useEffect(() => {
    if (!cardRef.current) return;
    gsap.fromTo(
      cardRef.current,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }
    );
  }, []);

  // Form transition on mode switch
  useEffect(() => {
    if (!formRef.current) return;
    gsap.fromTo(
      formRef.current,
      { opacity: 0, x: mode === "register" ? 16 : -16 },
      { opacity: 1, x: 0, duration: 0.3, ease: "power2.out" }
    );
  }, [mode]);

  // Countdown timer for verification code
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSendCode = useCallback(async () => {
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    setSending(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1200));
    setSending(false);
    setCodeSent(true);
    setCountdown(60);
    toast.success("Verification code sent to your email");
  }, [email]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email || !email.includes("@")) {
        toast.error("Please enter a valid email address");
        return;
      }
      if (!password || password.length < 6) {
        toast.error("Password must be at least 6 characters");
        return;
      }
      if (!verifyCode || verifyCode.length < 4) {
        toast.error("Please enter the verification code");
        return;
      }

      setSubmitting(true);
      // Simulate API call
      await new Promise((r) => setTimeout(r, 1000));
      setSubmitting(false);

      login(email);
      toast.success(
        mode === "login" ? "Welcome back!" : "Account created successfully!"
      );

      // Register → always go to Launch Guide
      // Login → go to Launch Guide if not onboarded, otherwise Dashboard
      if (mode === "register") {
        navigate("/launch-guide");
      } else {
        navigate(onboarded ? "/" : "/launch-guide");
      }
    },
    [email, password, verifyCode, mode, login, navigate, onboarded]
  );

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setVerifyCode("");
    setCodeSent(false);
    setCountdown(0);
  };

  return (
    <div className="min-h-[calc(100vh-44px)] bg-background flex items-center justify-center px-4 py-12">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-primary/[0.03] blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-80 h-80 rounded-full bg-secondary/[0.03] blur-3xl" />
      </div>

      <div ref={cardRef} className="w-full max-w-[400px] relative z-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663325188422/YmxnXmKxyGfXhEgxEBqPXF/otter-logo_ef58ab33.png" alt="Otter" className="w-10 h-10 rounded-full object-cover" />
          <span className="font-semibold text-xl tracking-tight text-foreground">
            Otter
          </span>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8">
          {/* Mode Tabs */}
          <div className="flex gap-1 p-1 bg-muted rounded-xl mb-6">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  mode === m
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "login" ? "Log In" : "Sign Up"}
              </button>
            ))}
          </div>

          {/* Title */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "login"
                ? "Enter your credentials to access your alphas"
                : "Start mining alphas with AI-powered agents"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div ref={formRef} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors duration-200"
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "login" ? "Enter password" : "Min 6 characters"}
                    className="w-full h-10 pl-10 pr-10 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors duration-200"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Verification Code */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                  Email Verification Code
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={verifyCode}
                      onChange={(e) =>
                        setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      placeholder="Enter code"
                      className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/60 font-mono tracking-widest transition-colors duration-200"
                      maxLength={6}
                      inputMode="numeric"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSendCode}
                    disabled={sending || countdown > 0}
                    className="h-10 px-3 text-xs font-medium whitespace-nowrap shrink-0"
                  >
                    {sending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : countdown > 0 ? (
                      `${countdown}s`
                    ) : codeSent ? (
                      "Resend"
                    ) : (
                      "Send Code"
                    )}
                  </Button>
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-10 mt-2 font-medium text-sm"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {mode === "login" ? "Log In" : "Create Account"}
                {!submitting && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
            </div>
          </form>

          {/* Footer */}
          <p className="text-xs text-muted-foreground text-center mt-5">
            {mode === "login" ? (
              <>
                Don't have an account?{" "}
                <button
                  onClick={() => switchMode("register")}
                  className="text-primary hover:underline font-medium"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => switchMode("login")}
                  className="text-primary hover:underline font-medium"
                >
                  Log in
                </button>
              </>
            )}
          </p>
        </div>

        {/* Terms */}
        <p className="text-[11px] text-muted-foreground/60 text-center mt-4 leading-relaxed">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
