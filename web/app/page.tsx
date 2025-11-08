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
  const [latency, setLatency] = useState<number | null>(null);
  const [tokens, setTokens] = useState<number | null>(null);
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
    setLatency(null);
    setTokens(null);

    const t0 = performance.now();

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
      if (!res.ok) {
        const err = await res.text();
        setMessages(m => [...m, {
          id: "cap-" + Date.now(),
          role: "assistant",
          content: "The model is temporarily at capacity. I tried fallback models, but none were available.\nPlease try again in a moment.",
        }]);
        setStreaming(false);
        return;
      }




      const riskScore = Number(res.headers.get("X-Risk-Score") ?? "0");
      let acc = "";
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");
      const decoder = new TextDecoder();
      let first = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);

        // 首字节到达算首包时延
        if (first) {
          setLatency(Math.round(performance.now() - t0));
          first = false;
        }

        acc += text;

        const parts = acc.split("[__METRICS__]");
        const display = parts[0];
        const metrics = parts[1];

        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.role === "assistant") {
            last.content = display;
            last.risk = { score: riskScore, hits: [] };
          } else {
            copy.push({
              id: "assist-" + Date.now(),
              role: "assistant",
              content: display,
              risk: { score: riskScore, hits: [] },
            });
          }
          return copy;
        });

        if (metrics) {
          try {
            const meta = JSON.parse(metrics.trim());
            setLatency(meta.latencyMs ?? null);
            setTokens(meta.usage?.totalTokens ?? null);
          } catch {
            // ignore bad json
          }
        }
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
    <main className="min-h-screen flex flex-col mx-auto max-w-4xl p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-950 dark:via-slate-900 dark:to-black transition-colors duration-500">

      <div className="rounded-3xl border border-zinc-200/50 dark:border-zinc-700/50 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md shadow-inner p-6 min-h-[60vh] overflow-y-auto transition-all duration-300">

        <h1 className="text-2xl font-semibold">Secure LLM Chat</h1>
        <div className="text-xs text-gray-600 dark:text-gray-400">
          <span className="mr-3">Latency: {latency ?? "-"} ms</span>
          <span>Tokens: {tokens ?? "-"}</span>
        </div>
      </div>

      <div className="rounded-2xl border p-4 min-h-[60vh]">
        {messages.map((m) => (
          <MessageBubble key={m.id} role={m.role} content={m.content} risk={m.risk} />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-4 mt-4">
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-full border px-4 py-2 shadow-sm bg-white/80 dark:bg-zinc-800/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
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
            className="px-4 py-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50"
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
// VPCwC0MnR6M8GusLs8ubFG57jjIc2ZRf