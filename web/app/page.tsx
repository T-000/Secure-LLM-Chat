"use client";
import { useRef, useState } from "react";
import MessageBubble from "./components/MessageBubble";
import SettingsPanel, { Settings } from "./components/SettingsPanel";

type Message = {
  id: string;
  role: "user" | "assistant" | "system" | "audit";
  content: string;
  risk?: { score: number; hits: any[] };
};

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([
    { id: "w1", role: "assistant", content: "Hello! Secure LLM Chat is ready." },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const [settings, setSettings] = useState<Settings>({
    system: "You are a helpful, secure assistant.",
    temperature: 0.7,
    maxTokens: 1024,
  });

  async function onSend() {
    if (!input.trim() || isStreaming) return;
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: input };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    const controller = new AbortController();
    abortRef.current = controller;
    setStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [
            { role: "system", content: settings.system },
            ...messages.map((m) => ({
              role: m.role === "user" ? "user" : "assistant",
              content: m.content,
            })),
            { role: "user", content: userMsg.content },
          ],
          settings,
        }),
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
      });

      const riskScore = Number(res.headers.get("X-Risk-Score") ?? "0");
      let acc = "";
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value);
        setMessages((m) => {
          const copy = [...m];
          const last = copy[copy.length - 1];
          if (last?.role === "assistant") {
            last.content = acc;
          } else {
            copy.push({
              id: "assist-" + Date.now(),
              role: "assistant",
              content: acc,
              risk: { score: riskScore, hits: [] },
            });
          }
          return copy;
        });
      }
    } catch {
      setMessages((m) => [
        ...m,
        { id: "err", role: "assistant", content: "Request aborted or failed." },
      ]);
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function onStop() {
    abortRef.current?.abort();
  }

  return (
    <main className="mx-auto max-w-4xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Secure LLM Chat</h1>
      </div>

      <div className="rounded-2xl border p-4 min-h-[60vh]">
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            role={m.role}
            content={m.content}
            risk={m.risk}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-4 mt-4">
        <div className="flex gap-2">
          <input
            className="flex-1 rounded border px-3 py-2"
            placeholder="Type something..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSend()}
          />
          <button
            className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
            onClick={onSend}
            disabled={isStreaming}
          >
            Send
          </button>
          <button
            className="px-4 py-2 rounded border disabled:opacity-50"
            onClick={onStop}
            disabled={!isStreaming}
          >
            Stop
          </button>
        </div>
        <div className="rounded-2xl border p-2">
          <SettingsPanel value={settings} onChange={setSettings} />
        </div>
      </div>
    </main>
  );
}
