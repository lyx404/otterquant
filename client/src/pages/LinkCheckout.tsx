import { useMemo, useState } from "react";

function LinkLogo() {
  return (
    <div className="inline-flex items-center gap-2">
      <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#00d66f]">
        <span className="h-3 w-3 rotate-45 border-r-[4px] border-t-[4px] border-black" />
      </span>
      <span className="text-[34px] font-bold leading-none tracking-[-0.04em] text-black">link</span>
    </div>
  );
}

export default function LinkCheckout() {
  const [email, setEmail] = useState("");
  const amount = useMemo(() => {
    if (typeof window === "undefined") return "20.00";
    const params = new URLSearchParams(window.location.search);
    const value = Number(params.get("amount"));
    return Number.isFinite(value) && value > 0 ? value.toFixed(2) : "20.00";
  }, []);
  const hasEmail = email.trim().length > 0;

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-black">
      <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-[620px] flex-col items-center">
        <LinkLogo />

        <h1 className="mt-8 text-center text-[31px] font-bold leading-tight tracking-[-0.03em] text-black">
          快速、安全的结账
        </h1>
        <p className="mt-3 text-center text-[20px] leading-7 text-[#667085]">
          在接受 Link 的任何地方更快地支付。
        </p>

        <section className="mt-9 w-full rounded-[18px] border border-[#e2e8f0] bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
          <h2 className="text-[20px] font-bold text-black">{hasEmail ? "注册" : "注册或登录"}</h2>

          {hasEmail ? (
            <div className="mt-7 overflow-hidden rounded-lg border border-[#d7dee8]">
              <label className="block bg-[#e8f0fe] px-5 py-3">
                <span className="block text-[17px] leading-6 text-[#667085]">邮件地址</span>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-0.5 w-full border-0 bg-transparent p-0 text-[20px] leading-7 text-black outline-none"
                  autoFocus
                />
              </label>
              <div className="flex items-center gap-5 border-t border-[#d7dee8] px-5 py-4">
                <span className="text-[25px] leading-none">🇺🇸</span>
                <span className="text-[18px] text-black">+1</span>
                <input
                  className="min-w-0 flex-1 border-0 bg-transparent text-[20px] leading-7 text-black outline-none placeholder:text-[#667085]"
                  placeholder="手机号码"
                />
              </div>
            </div>
          ) : (
            <label className="mt-7 block rounded-lg border border-[#d7dee8] px-5 py-5">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full border-0 bg-transparent text-[20px] leading-7 text-black outline-none placeholder:text-[#667085]"
                placeholder="邮件地址"
                autoFocus
              />
            </label>
          )}

          {hasEmail ? (
            <button className="mt-6 h-[66px] w-full rounded-lg bg-[#00d66f] text-[20px] font-semibold text-[#087943] transition hover:bg-[#00c967]">
              继续支付
            </button>
          ) : null}
        </section>

        <button
          disabled
          className="mt-10 h-[66px] w-full rounded-lg bg-[#e9edf2] text-[20px] font-bold text-[#8a9896]"
        >
          支付 US${amount}
        </button>

        <div className="mt-auto pt-16 text-center text-[15px] text-[#8b95ad]">
          条款・隐私・Cookie 设置
        </div>
      </div>
    </main>
  );
}
