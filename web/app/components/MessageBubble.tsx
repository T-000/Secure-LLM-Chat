"use client";

import React from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import clsx from "clsx";
import TypingDots from "./TypingDots";

/** 通用的 code 渲染器 props */
type CodeProps = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLElement>,
  HTMLElement
> & {
  inline?: boolean;
  children?: React.ReactNode;
};

type Risk = { score: number; hits: { type: string; snippet: string }[] } | undefined;

export default function MessageBubble({
  role,
  content,
  risk,
  isStreaming,
}: {
  role: "user" | "assistant" | "system" | "audit";
  content: string;
  risk?: Risk;
  isStreaming?: boolean;
}) {
  const isUser = role === "user";

  const bubbleClass = clsx(
    "relative max-w-[85%] rounded-3xl px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,.07)]",
    "backdrop-blur-md transition-all duration-300 border",
    isUser
      ? "text-white bg-gradient-to-br from-indigo-600 to-blue-600 border-white/10 ring-1 ring-white/10"
      : "text-gray-900 dark:text-gray-100 bg-white/55 dark:bg-zinc-900/55 border-white/20 dark:border-white/10"
  );

  const haloClass = clsx(
    "absolute -inset-[1.5px] rounded-3xl pointer-events-none blur-[10px] opacity-70",
    isUser
      ? "bg-[conic-gradient(from_180deg_at_50%_50%,#60a5fa_0%,#4f46e5_40%,#06b6d4_70%,#60a5fa_100%)]"
      : "bg-[conic-gradient(from_180deg_at_50%_50%,#a7f3d0_0%,#60a5fa_45%,#f0abfc_85%,#a7f3d0_100%)]",
    "mask-gradient animate-ambient"
  );

  /** 小按钮：复制代码 */
  function CopyBtn({ text }: { text: string }) {
    return (
      <button
        type="button"
        className="absolute top-2 right-2 rounded-md border border-white/15 bg-white/10 px-2 py-1 text-[11px] text-white/90 hover:bg-white/20 active:scale-[0.98]"
        onClick={() => navigator.clipboard.writeText(text)}
        title="Copy code"
      >
        Copy
      </button>
    );
  }

  /** 代码块渲染器（安全无类型冲突版本） */
  const CodeBlock = ({ inline, className, children, ...props }: CodeProps) => {
  if (inline) {
    return (
      <code
        className={clsx(
          "rounded-md bg-zinc-100 px-1.5 py-0.5 text-[12px] dark:bg-zinc-800",
          className
        )}
        {...props}
      >
        {children}
      </code>
    );
  }

  const text = String(children ?? "");

  // 关键：先转 any 再移除 ref，避免类型冲突
  const anyProps = props as any;
  const { ref: _ignoreRef, ...rest } = anyProps as Record<string, unknown>;

  const preProps: React.HTMLAttributes<HTMLPreElement> = {
    ...rest,
    className: clsx(
      "rounded-xl p-3 pr-10 text-[12px] leading-6 overflow-x-auto",
      "bg-zinc-900 text-zinc-50 shadow-inner border border-white/10",
      className
    ),
  };

  return (
    <div className="relative group">
      <pre {...preProps}>{children}</pre>
      <button
        type="button"
        className="absolute top-2 right-2 rounded-md border border-white/15 bg-white/10 px-2 py-1 text-[11px] text-white/90 hover:bg-white/20 active:scale-[0.98]"
        onClick={() => navigator.clipboard.writeText(text)}
        title="Copy code"
      >
        Copy
      </button>
    </div>
  );
};


  const components: Partial<Components> = { code: CodeBlock as Components["code"] };

  return (
    <div className={clsx("w-full flex my-2", isUser ? "justify-end" : "justify-start")}>
      <div className="relative">
        {!isUser && <div aria-hidden className={haloClass} />}

        <div className={bubbleClass}>
          {!isUser && (
            <div className="absolute inset-x-3 top-1 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent animate-sheen" />
          )}

          {/* Markdown 渲染内容 */}
          <div className={clsx("prose prose-sm dark:prose-invert max-w-none", isUser && "prose-invert")}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
              {content}
            </ReactMarkdown>
          </div>

          {/* 安全风险提示 */}
          {!!risk && risk.score > 0 && (
            <div className="mt-3 text-xs text-red-600 flex flex-wrap items-center gap-2">
              <span className="font-medium">⚠️ Potential risk detected</span>
              <span className="rounded bg-red-100 px-2 py-0.5 dark:bg-red-900/40">
                score {risk.score.toFixed(2)}
              </span>
            </div>
          )}

          {/* 打字状态 */}
          {!isUser && isStreaming && (
            <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              typing <TypingDots />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
