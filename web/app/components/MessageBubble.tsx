"use client";
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import clsx from "clsx";
import TypingDots from "./TypingDots";

export default function MessageBubble({
  role,
  content,
  risk,
  isStreaming,
}: {
  role: "user" | "assistant" | "system" | "audit"; // ← 放宽类型
  content: string;
  risk?: { score: number };
  isStreaming?: boolean;
}) {
  const isUser = role === "user";
  return (
    <div className={clsx("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={clsx(
          "max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-md leading-relaxed",
          isUser
            ? "bg-blue-600 text-white" // user bubble
            : "bg-blue-100 text-blue-900" // assistant bubble
        )}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        {risk?.score && risk.score > 0 && (
          <div className="mt-2 text-xs text-red-600">
            ⚠️ Risk score: {risk.score.toFixed(2)}
          </div>
        )}
        {!isUser && isStreaming && (
          <div className="mt-1 text-xs text-blue-400">
            typing <TypingDots />
          </div>
        )}
      </div>
    </div>
  );
}
