import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useAppLanguage } from "@/contexts/AppLanguageContext";
import { toast } from "sonner";
import gsap from "gsap";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Languages,
  Loader2,
} from "lucide-react";

type AuthMode = "login" | "register" | "forgot";
type AuthFieldErrors = Partial<Record<"email" | "verificationCode" | "nickname" | "password" | "terms", string>>;

export default function Auth() {
  const { uiLang, setUiLang } = useAppLanguage();
  const tr = (en: string, zh: string) => (uiLang === "zh" ? zh : en);
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});

  const { login } = useAuth();
  const [, navigate] = useLocation();
  const panelRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!panelRef.current) return;
    gsap.fromTo(
      panelRef.current,
      { opacity: 0, y: 28, scale: 0.98 },
      { opacity: 1, y: 0, scale: 1, duration: 0.48, ease: "power3.out" }
    );
  }, []);

  useEffect(() => {
    if (!formRef.current) return;
    gsap.fromTo(
      formRef.current,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.22, ease: "power2.out" }
    );
  }, [mode]);

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const timer = window.setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [countdown]);

  const handleSendCode = useCallback(async () => {
    if (!email || !email.includes("@")) {
      setFieldErrors((current) => ({
        ...current,
        email: tr("Please enter a valid email address", "请输入有效邮箱地址"),
      }));
      return;
    }
    setFieldErrors((current) => ({ ...current, email: undefined }));
    setSending(true);
    await new Promise((resolve) => window.setTimeout(resolve, 800));
    setSending(false);
    setCodeSent(true);
    setCountdown(60);
    toast.success(tr("Verification code sent", "验证码已发送"));
  }, [email, tr]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      const nextErrors: AuthFieldErrors = {};

      if (!email || !email.includes("@")) {
        nextErrors.email = tr("Please enter a valid email address", "请输入有效邮箱地址");
      }

      if (mode === "register" && !nickname.trim()) {
        nextErrors.nickname = tr("Please set a nickname", "请设置昵称");
      }

      if (mode === "register" && !verificationCode.trim()) {
        nextErrors.verificationCode = tr("Please enter the verification code", "请输入验证码");
      }

      if (mode !== "forgot" && (!password || password.length < 6)) {
        nextErrors.password = tr("Password must be at least 6 characters", "密码至少需要 6 位");
      }

      if (mode === "register" && !termsAccepted) {
        nextErrors.terms = tr("Please agree to the terms and privacy policy", "请先同意服务条款和隐私政策");
      }

      if (Object.keys(nextErrors).length > 0) {
        setFieldErrors(nextErrors);
        return;
      }

      if (mode === "forgot") {
        await handleSendCode();
        return;
      }

      setFieldErrors({});

      setSubmitting(true);
      await new Promise((resolve) => window.setTimeout(resolve, 700));
      setSubmitting(false);

      login(email);
      toast.success(
        mode === "login"
          ? tr("Welcome back!", "欢迎回来")
          : mode === "register"
            ? tr("Account created", "账号创建成功")
            : tr("Password reset", "密码已重设")
      );
      navigate("/");
    },
    [email, verificationCode, nickname, password, mode, termsAccepted, handleSendCode, login, navigate, tr]
  );

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    if (nextMode !== "register") {
      setNickname("");
      setVerificationCode("");
    }
    setTermsAccepted(false);
    setCodeSent(false);
    setCountdown(0);
    setFieldErrors({});
  };

  const submitLabel = mode === "login" ? tr("Log in", "登录") : mode === "register" ? tr("Create account", "注册") : tr("Send code", "发送验证码");

  return (
    <main className="game-auth" aria-label={tr("Login and registration", "登录注册")}>
      <style>{`
        @font-face {
          font-family: "阿里妈妈方圆体 VF Regular";
          src:
            url("https://lzcdn.dianpusoft.cn/fonts/AlimamaFangYuanTiVF/AlimamaFangYuanTiVF-Thin.woff2") format("woff2"),
            url("https://lzcdn.dianpusoft.cn/fonts/AlimamaFangYuanTiVF/AlimamaFangYuanTiVF-Thin.woff") format("woff");
          font-display: swap;
          font-weight: 100 900;
          font-style: normal;
        }

        .game-auth {
          --auth-text: #794f27;
          --auth-body: #725d42;
          --auth-border: #c4b89e;
          --auth-shadow: #bdaea0;
          --auth-cream: #fff7df;
          --auth-paper: #fffdf4;
          position: relative;
          min-height: 100svh;
          overflow: hidden;
          color: var(--auth-text);
          background: #5DBFF6;
          font-family: "阿里妈妈方圆体 VF Regular", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
          image-rendering: pixelated;
          isolation: isolate;
        }

        .auth-hud {
          display: none;
        }

        .auth-stat {
          min-width: 156px;
          height: 54px;
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 0 16px 0 12px;
          color: #3f3d48;
          background: var(--auth-cream);
          border: 3px solid rgba(196, 184, 158, .95);
          border-radius: 14px;
          box-shadow: 0 4px 0 rgba(189, 174, 160, .58);
          font-size: 23px;
          font-weight: 950;
          line-height: 1;
          white-space: nowrap;
        }

        .auth-stat img {
          width: 34px;
          height: 34px;
          object-fit: contain;
          image-rendering: auto;
        }

        .auth-stat--cash img {
          width: 42px;
          height: 27px;
        }

        .auth-menu {
          appearance: none;
          width: 72px;
          height: 72px;
          position: relative;
          display: grid;
          place-items: start center;
          padding: 0;
          background: transparent;
          border: 0;
          color: #fffdf4;
          cursor: pointer;
          font: inherit;
        }

        .auth-menu img {
          width: 48px;
          height: 48px;
          object-fit: contain;
          filter: drop-shadow(0 2px 0 rgba(55, 42, 30, .34));
        }

        .auth-menu span {
          position: absolute;
          left: 50%;
          bottom: 0;
          transform: translateX(-50%);
          color: #fffdf4;
          font-size: 15px;
          font-weight: 950;
          line-height: 1;
          text-shadow:
            -2px -2px 0 rgba(91, 60, 35, .88),
            2px -2px 0 rgba(91, 60, 35, .88),
            -2px 2px 0 rgba(91, 60, 35, .88),
            2px 2px 0 rgba(91, 60, 35, .88);
          white-space: nowrap;
        }

        .game-auth__scene {
          position: relative;
          z-index: 1;
          min-height: 100svh;
          display: grid;
          place-items: center;
          padding: 156px 24px 56px;
        }

        .auth-language {
          appearance: none;
          position: absolute;
          top: 32px;
          right: 34px;
          z-index: 2;
          height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 12px;
          color: var(--auth-text);
          background: rgba(255, 253, 244, .92);
          border: 2px solid rgba(196, 184, 158, .88);
          border-radius: 8px;
          box-shadow: none;
          cursor: pointer;
          font: inherit;
          font-size: 13px;
          font-weight: 950;
          line-height: 1;
          white-space: nowrap;
        }

        .auth-language:hover,
        .auth-language:focus-visible {
          background: #fffdf4;
          outline: none;
        }

        .auth-shell {
          width: min(430px, 92vw);
          display: grid;
          gap: 12px;
        }

        .auth-panel {
          padding: 18px;
          background: rgba(255, 253, 244, .96);
          border: 0;
          border-radius: 10px;
          box-shadow:
            0 0 0 3px rgba(255, 253, 244, .72),
            0 0 0 rgba(0, 0, 0, 0);
        }

        .auth-panel__head {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 0 8px 10px;
          text-align: center;
        }

        .auth-brand {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 0;
        }

        .auth-brand__logo {
          width: 200px;
          height: auto;
          display: block;
          padding-bottom: 2px;
          object-fit: contain;
        }

        .auth-brand p {
          margin: 2px 0 0;
          color: rgba(255, 253, 244, .86);
          font-size: 11px;
          font-weight: 800;
          line-height: 1.35;
          text-align: center;
        }

        .auth-tabs {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          padding: 2px;
          margin: -6px 0 22px;
          background: rgba(247, 243, 223, .78);
          border: 2px solid rgba(196, 184, 158, .72);
          border-radius: 8px;
        }

        .auth-tab {
          appearance: none;
          height: 40px;
          color: rgba(121, 79, 39, .72);
          background: transparent;
          border: 0;
          border-radius: 6px;
          cursor: pointer;
          font: inherit;
          font-size: 14px;
          font-weight: 950;
        }

        .auth-tab.is-active {
          color: #5a3e00;
          background: #ffd557;
          box-shadow: none;
        }

        .auth-tab:hover,
        .auth-tab:focus-visible {
          background: rgba(255, 213, 87, .14);
          outline: none;
        }

        .auth-tab.is-active:hover,
        .auth-tab.is-active:focus-visible {
          background: #ffd557;
        }

        .auth-reset-copy {
          position: relative;
          min-height: 34px;
          margin-bottom: 18px;
          padding-left: 46px;
          text-align: left;
        }

        .auth-reset-back {
          appearance: none;
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 34px;
          height: 34px;
          display: inline-grid;
          place-items: center;
          color: var(--auth-text);
          background: #fff8e8;
          border: 2px solid var(--auth-border);
          border-radius: 6px;
          box-shadow: none;
          cursor: pointer;
        }

        .auth-reset-back:hover,
        .auth-reset-back:focus-visible {
          background: #fff4d7;
          outline: none;
        }

        .auth-reset-copy h2 {
          margin: 0 0 2px;
          color: var(--auth-text);
          font-size: 20px;
          font-weight: 950;
          line-height: 1.15;
        }

        .auth-reset-copy p {
          margin: 0;
          color: rgba(114, 93, 66, .62);
          font-size: 12px;
          font-weight: 800;
          line-height: 1.5;
        }

        .auth-form {
          display: grid;
          gap: 2px;
        }

        .auth-form--reset {
          gap: 2px;
        }

        .auth-form--reset .auth-agreement,
        .auth-form--reset .auth-forgot {
          display: none;
        }

        .auth-form--reset .auth-reset-email {
          display: grid;
          gap: 6px;
          padding-top: 8px;
        }

        .auth-field {
          display: grid;
          gap: 6px;
        }

        .auth-field--hidden {
          display: none;
        }

        .auth-field label {
          color: rgba(90, 50, 29, .84);
          font-size: 11px;
          font-weight: 950;
          line-height: 1;
        }

        .auth-input-wrap {
          position: relative;
        }

        .auth-input {
          width: 100%;
          height: 42px;
          box-sizing: border-box;
          padding: 0 12px;
          color: var(--auth-text);
          background: #fff9e9;
          border: 2px solid rgba(196, 184, 158, .9);
          border-radius: 6px;
          box-shadow: none;
          font: inherit;
          font-size: 13px;
          font-weight: 800;
          outline: none;
        }

        .auth-input:focus {
          border-color: #f8c840;
          box-shadow: none;
        }

        .auth-input::placeholder {
          color: rgba(114, 93, 66, .48);
        }

        .auth-field-feedback {
          min-height: 14px;
          margin: -1px 0 0;
          color: #b42318;
          font-size: 10px;
          font-weight: 900;
          line-height: 1.4;
        }

        .auth-field-feedback.is-success {
          color: #16794c;
        }

        .auth-forgot {
          appearance: none;
          justify-self: end;
          margin: -20px 0 0;
          padding: 0;
          color: rgba(121, 79, 39, .82);
          background: transparent;
          border: 0;
          cursor: pointer;
          font: inherit;
          font-size: 11px;
          font-weight: 950;
          line-height: 1.2;
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .auth-forgot:hover,
        .auth-forgot:focus-visible {
          color: var(--auth-text);
          outline: none;
        }

        .auth-agreement {
          display: grid;
          gap: 4px;
          margin: -4px 0 6px;
        }

        .auth-agreement__control {
          display: flex;
          align-items: flex-start;
          gap: 7px;
          color: rgba(114, 93, 66, .58);
          font-size: 10px;
          font-weight: 750;
          line-height: 1.45;
          cursor: pointer;
        }

        .auth-agreement input {
          width: 13px;
          height: 13px;
          flex: 0 0 auto;
          margin: 1px 0 0;
          accent-color: #d6b645;
        }

        .auth-agreement__error {
          min-height: 14px;
          color: #b42318;
          font-size: 10px;
          font-weight: 900;
          line-height: 1.4;
        }

        .auth-password-toggle {
          appearance: none;
          position: absolute;
          right: 9px;
          top: 50%;
          transform: translateY(-50%);
          width: 28px;
          height: 28px;
          display: inline-grid;
          place-items: center;
          color: rgba(121, 79, 39, .56);
          background: transparent;
          border: 0;
          cursor: pointer;
        }

        .auth-code-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 104px;
          gap: 8px;
        }

        .auth-send,
        .auth-submit {
          appearance: none;
          border: 0;
          cursor: pointer;
          font: inherit;
          font-weight: 950;
        }

        .auth-send {
          height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          color: rgba(90, 50, 29, .9);
          background: #fff8e8;
          border: 2px solid rgba(196, 184, 158, .9);
          border-radius: 6px;
          box-shadow: none;
          font-size: 12px;
        }

        .auth-send:disabled {
          cursor: wait;
          opacity: .68;
        }

        .auth-send:hover,
        .auth-send:focus-visible {
          background: #fff3cf;
          outline: none;
        }

        .auth-submit {
          height: 46px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 12px;
          color: #5a3e00;
          background: #ffd557;
          border-radius: 7px;
          box-shadow: none;
          font-size: 15px;
        }

        .auth-submit:disabled {
          cursor: wait;
          opacity: .72;
        }

        .auth-submit:hover,
        .auth-submit:focus-visible {
          background: #ffd557;
          outline: none;
        }

        .auth-footer {
          margin: 0 0 -4px;
          padding-top: 8px;
          color: rgba(0, 0, 0, .3);
          font-size: 12px;
          font-weight: 750;
          line-height: 1.45;
          text-align: center;
        }

        .auth-footer button {
          appearance: none;
          color: #ffffff;
          background: transparent;
          border: 0;
          cursor: pointer;
          font: inherit;
          font-weight: 950;
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .auth-terms {
          position: relative;
          z-index: 2;
          margin: -2px 8px 0;
          color: rgba(0, 0, 0, .3);
          font-size: 10px;
          font-weight: 750;
          line-height: 1.5;
          text-align: center;
        }

        @media (max-width: 980px) {
          .auth-hud {
            left: 18px;
            right: 18px;
          }

          .auth-hud__nav {
            display: none;
          }

          .auth-stat {
            min-width: 0;
            height: 46px;
            padding: 0 10px;
            font-size: 17px;
          }

          .auth-stat img {
            width: 28px;
            height: 28px;
          }
        }

        @media (max-width: 560px) {
          .auth-language {
            top: 18px;
            right: 18px;
            height: 38px;
            padding: 0 10px;
            font-size: 12px;
          }

          .auth-brand__logo {
            width: 132px;
          }

          .auth-hud__stats {
            gap: 6px;
          }

          .auth-stat {
            font-size: 14px;
            gap: 6px;
          }

          .game-auth__scene {
            padding: 118px 14px 32px;
          }

          .auth-panel {
            padding: 14px;
          }

          .auth-code-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <section className="game-auth__scene">
        <button
          className="auth-language"
          type="button"
          aria-label={uiLang === "zh" ? "Switch to English" : "切换为中文"}
          onClick={() => setUiLang(uiLang === "zh" ? "en" : "zh")}
        >
          <Languages size={17} strokeWidth={2.8} aria-hidden="true" />
          <span>{uiLang === "zh" ? "中 / EN" : "EN / 中"}</span>
        </button>
        <div className="auth-shell">
          <header className="auth-panel__head">
            <div className="auth-brand">
              <div>
                <img className="auth-brand__logo" src="/assets/quandora-logo.svg" alt="Quandora" />
                <p>{tr("Start your AI factor mining journey.", "开启你的 AI 因子挖掘之旅")}</p>
              </div>
            </div>
          </header>

          <div className="auth-panel" ref={panelRef}>
            {mode === "forgot" ? (
              <div className="auth-reset-copy">
                <button
                  className="auth-reset-back"
                  type="button"
                  aria-label={tr("Back to log in", "返回登录")}
                  onClick={() => switchMode("login")}
                >
                  <ArrowLeft size={18} strokeWidth={3} />
                </button>
                <h2>{tr("Reset password", "重置密码")}</h2>
                <p>{tr("Enter your registered email. We will send a verification code to your inbox.", "输入注册邮箱，我们会向你的邮箱发送验证码。")}</p>
              </div>
            ) : (
              <div className="auth-tabs" role="tablist" aria-label={tr("Auth mode", "登录注册方式")}>
                {(["login", "register"] as const).map((item) => (
                  <button
                    className={`auth-tab${mode === item ? " is-active" : ""}`}
                    type="button"
                    role="tab"
                    aria-selected={mode === item}
                    key={item}
                    onClick={() => switchMode(item)}
                  >
                    {item === "login" ? tr("Log in", "登录") : tr("Sign up", "注册")}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className={`auth-form${mode === "forgot" ? " auth-form--reset" : ""}`} ref={formRef}>
              {mode === "forgot" && (
                <div className="auth-field auth-reset-email">
                  <label htmlFor="auth-reset-email">{tr("Email", "邮箱")}</label>
                  <div className="auth-input-wrap">
                    <input
                      id="auth-reset-email"
                      className="auth-input"
                      type="email"
                      value={email}
                      aria-invalid={Boolean(fieldErrors.email)}
                      aria-describedby="auth-reset-email-feedback"
                      onChange={(event) => {
                        setEmail(event.target.value);
                        setFieldErrors((current) => ({ ...current, email: undefined }));
                      }}
                      placeholder={tr("Enter registered email", "输入注册邮箱")}
                      autoComplete="email"
                    />
                  </div>
                  <span id="auth-reset-email-feedback" className={`auth-field-feedback${codeSent ? " is-success" : ""}`}>
                    {fieldErrors.email || (codeSent ? tr("Verification code sent", "验证码已发送") : " ")}
                  </span>
                </div>
              )}
              <div className={`auth-field${mode === "forgot" ? " auth-field--hidden" : ""}`}>
                <label htmlFor="auth-email">{tr("Email", "邮箱")}</label>
                <div className="auth-input-wrap">
                  <input
                    id="auth-email"
                    className="auth-input"
                    type="email"
                    value={email}
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby="auth-email-feedback"
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setFieldErrors((current) => ({ ...current, email: undefined }));
                    }}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>
                <span id="auth-email-feedback" className="auth-field-feedback">{fieldErrors.email || " "}</span>
              </div>

              {mode === "register" && (
                <div className="auth-field">
                  <label htmlFor="auth-verification-code">{tr("Verification code", "验证码")}</label>
                  <div className="auth-code-row">
                    <input
                      id="auth-verification-code"
                      className="auth-input"
                      type="text"
                      inputMode="numeric"
                      value={verificationCode}
                      aria-invalid={Boolean(fieldErrors.verificationCode)}
                      aria-describedby="auth-verification-code-feedback"
                      onChange={(event) => {
                        setVerificationCode(event.target.value);
                        setFieldErrors((current) => ({ ...current, verificationCode: undefined }));
                      }}
                      placeholder={tr("Enter code", "输入验证码")}
                      autoComplete="one-time-code"
                    />
                    <button
                      className="auth-send"
                      type="button"
                      disabled={sending || countdown > 0}
                      onClick={handleSendCode}
                    >
                      {sending ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : countdown > 0 ? (
                        `${countdown}s`
                      ) : codeSent ? (
                        tr("Resend", "重新发送")
                      ) : (
                        tr("Send", "发送")
                      )}
                    </button>
                  </div>
                  <span id="auth-verification-code-feedback" className={`auth-field-feedback${codeSent && !fieldErrors.verificationCode ? " is-success" : ""}`}>
                    {fieldErrors.verificationCode || (codeSent ? tr("Verification code sent", "验证码已发送") : " ")}
                  </span>
                </div>
              )}

              {mode === "register" && (
                <div className="auth-field">
                  <label htmlFor="auth-nickname">{tr("Nickname", "设置昵称")}</label>
                  <div className="auth-input-wrap">
                    <input
                      id="auth-nickname"
                      className="auth-input"
                      type="text"
                      value={nickname}
                      aria-invalid={Boolean(fieldErrors.nickname)}
                      aria-describedby="auth-nickname-feedback"
                      onChange={(event) => {
                        setNickname(event.target.value);
                        setFieldErrors((current) => ({ ...current, nickname: undefined }));
                      }}
                      placeholder={tr("Set nickname", "设置昵称")}
                      autoComplete="nickname"
                    />
                  </div>
                  <span id="auth-nickname-feedback" className="auth-field-feedback">{fieldErrors.nickname || " "}</span>
                </div>
              )}

              {mode !== "forgot" && (
              <div className="auth-field">
                <label htmlFor="auth-password">{tr("Password", "密码")}</label>
                <div className="auth-input-wrap">
                  <input
                    id="auth-password"
                    className="auth-input"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby="auth-password-feedback"
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setFieldErrors((current) => ({ ...current, password: undefined }));
                    }}
                    placeholder={mode === "login" ? tr("Enter password", "请输入密码") : tr("At least 6 characters", "至少 6 位")}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                  />
                  <button
                    className="auth-password-toggle"
                    type="button"
                    aria-label={showPassword ? tr("Hide password", "隐藏密码") : tr("Show password", "显示密码")}
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? <EyeOff size={16} strokeWidth={3} /> : <Eye size={16} strokeWidth={3} />}
                  </button>
                </div>
                <span id="auth-password-feedback" className="auth-field-feedback">{fieldErrors.password || " "}</span>
                {mode === "login" && (
                  <button className="auth-forgot" type="button" onClick={() => switchMode("forgot")}>
                    {tr("Forgot password?", "忘记密码？")}
                  </button>
                )}
              </div>
              )}

              {mode === "register" && (
                <div className="auth-agreement">
                  <label className="auth-agreement__control">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(event) => {
                        setTermsAccepted(event.target.checked);
                        setFieldErrors((current) => ({ ...current, terms: undefined }));
                      }}
                    />
                    <span>{tr(
                      "By creating an account, I agree to Quandora's Terms of Service and Privacy Policy.",
                      "创建账户即表示我同意 Quandora 的服务条款和隐私政策。"
                    )}</span>
                  </label>
                  <span className="auth-agreement__error">{fieldErrors.terms || " "}</span>
                </div>
              )}

              <button className="auth-submit" type="submit" disabled={submitting || (mode === "forgot" && (sending || countdown > 0))}>
                {submitting || sending ? <Loader2 size={16} className="animate-spin" /> : null}
                <span>{mode === "forgot" && countdown > 0 ? `${countdown}s` : submitLabel}</span>
                {!submitting && mode !== "forgot" && <ArrowRight size={16} strokeWidth={3} />}
              </button>
              </div>
            </form>
          </div>
          {mode !== "forgot" && (
          <p className="auth-footer">
            {mode === "login" ? (
              <>
                {tr("No account yet?", "还没有账号？")}{" "}
                <button type="button" onClick={() => switchMode("register")}>{tr("Sign up", "立即注册")}</button>
              </>
            ) : (
              <>
                {tr("Already have an account?", "已有账号？")}{" "}
                <button type="button" onClick={() => switchMode("login")}>{tr("Log in", "去登录")}</button>
              </>
            )}
          </p>
          )}
          <p className="auth-terms">
            {tr("By continuing, you agree to the service terms and privacy policy.", "继续即表示同意服务条款与隐私政策。")}
          </p>
        </div>
      </section>
    </main>
  );
}
