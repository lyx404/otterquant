import { Check, Clipboard } from "lucide-react";
import { useState } from "react";

type CodeBlockTab = {
  label: string;
  code: string;
  language?: string;
};

type CodeBlockProps = {
  code?: string;
  language?: string;
  tabs?: CodeBlockTab[];
  copyLabel?: string;
  copiedLabel?: string;
};

export function CodeBlock({
  code,
  language,
  tabs,
  copyLabel = "Copy",
  copiedLabel = "Copied",
}: CodeBlockProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const activeCode = tabs?.[activeTab]?.code ?? code ?? "";
  const activeLanguage = tabs?.[activeTab]?.language ?? language;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(activeCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-[8px] border border-[#ded7d0] bg-[#fffdfb] text-[#2f2924] dark:border-[#4b4036] dark:bg-[#1d1814] dark:text-[#f7f1ea]">
      <div className="flex min-h-9 items-center justify-between border-b border-[#e9e3dd] bg-[#faf8f6] pl-1.5 pr-2 dark:border-[#4b4036] dark:bg-[#241e1a]">
        {tabs?.length ? (
          <div className="flex h-9 items-end gap-0.5" role="tablist">
            {tabs.map((tab, index) => (
              <button
                key={tab.label}
                type="button"
                role="tab"
                aria-selected={activeTab === index}
                onClick={() => setActiveTab(index)}
                className={`h-9 border-b-2 px-2.5 text-[10px] font-semibold transition-colors ${activeTab === index ? "border-[#dc4900] text-[#171411] dark:text-[#f7f1ea]" : "border-transparent text-[#8c8378] hover:text-[#4a443d] dark:hover:text-[#d5c9bc]"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : (
          <span className="px-2.5 font-mono text-[10px] text-[#8c8378]">{activeLanguage}</span>
        )}
        <button
          type="button"
          onClick={copyCode}
          aria-label={copyLabel}
          className="flex h-6 items-center gap-1 rounded-[5px] px-1.5 text-[10px] font-medium text-[#766d64] transition-colors hover:bg-[#f0ece8] hover:text-[#4a443d] dark:text-[#cfc2b7] dark:hover:bg-[#332a24] dark:hover:text-[#f7f1ea]"
        >
          {copied ? <Check className="h-3 w-3 text-[#1f8a5b]" /> : <Clipboard className="h-3 w-3" />}
          {copied ? copiedLabel : copyLabel}
        </button>
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap px-3.5 py-3 font-mono text-[11px] leading-[1.6] text-[#332d27] dark:text-[#ece3dc]">
        <code>{activeCode}</code>
      </pre>
    </div>
  );
}
