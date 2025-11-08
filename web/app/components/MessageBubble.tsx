"use client";

type Risk = { score: number; hits: { type: string; snippet: string }[] } | undefined;

export default function MessageBubble({
  role, content, risk,
}: { role: "user" | "assistant" | "system" | "audit"; content: string; risk?: Risk }) {
  const isUser = role === "user";
  return (
    <div className={`w-full flex ${isUser ? "justify-end" : "justify-start"} my-2`}>
      <div className={`max-w-[80%] rounded-2xl p-3 shadow text-sm whitespace-pre-wrap
        ${isUser ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 dark:text-gray-100"}`}>
        {content}
        {!!risk && risk.score > 0 && (
          <div className="mt-2 inline-flex items-center gap-2 text-xs text-red-600">
            <span className="font-medium">Potential override detected</span>
            <span className="rounded bg-red-100 px-2 py-0.5">{risk.score.toFixed(2)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
