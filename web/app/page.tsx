"use client";
import { useRef, useState } from "react";
import MessageBubble from "./components/MessageBubble";
import SettingsPanel, { Settings } from "./components/SettingsPanel";
import clsx from "clsx";

type Message = {
  id: string;
  role: "user" | "assistant" | "system" | "audit";
  content: string;
  risk?: { score: number; hits: any[] };
};

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([
    { id: "init", role: "assistant", content: "👋 Hello! I’m ready to chat securely." },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setStreaming] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [tokens, setTokens] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [settings, setSettings] = useState<Settings>({
    system: "You are a helpful assistant focused on clarity and security.",
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
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
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
      });

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

        if (first) {
          setLatency(Math.round(performance.now() - t0));
          first = false;
        }

        acc += text;
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.role === "assistant") last.content = acc;
          else
            copy.push({
              id: "assist-" + Date.now(),
              role: "assistant",
              content: acc,
              risk: { score: riskScore, hits: [] },
            });
          return copy;
        });
      }
    } catch {
      setMessages((m) => [
        ...m,
        { id: "err", role: "assistant", content: "⚠️ Request aborted or failed." },
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
    <main className="min-h-screen flex flex-col text-white bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-[#2563eb] transition-colors duration-500">
      {/* 顶部 */}
      <header className="mx-auto w-full max-w-4xl px-6 pt-6 pb-2">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Secure LLM Chat</h1>
            <div className="mt-1 text-xs text-blue-100/90">
              <span className="mr-3">Latency: {latency ?? "-"} ms</span>
              <span>Tokens: {tokens ?? "-"}</span>
            </div>
          </div>
          <div className="hidden md:block rounded-2xl bg-blue-300/20 backdrop-blur-md p-2 shadow-md">
            <SettingsPanel value={settings} onChange={setSettings} />
          </div>
        </div>
      </header>

      {/* 聊天区 */}
      <section className="mx-auto w-full max-w-4xl px-6 flex-1">
        <div className="h-full rounded-3xl bg-[#3b82f6]/20 backdrop-blur-lg shadow-[0_8px_30px_rgba(0,0,0,0.2)] p-5 overflow-y-auto">
          {messages.length === 0 && (
            <div className="text-center text-blue-100/70 mt-24">
              👋 Start a conversation…
            </div>
          )}
          <div className="flex flex-col gap-3">
            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                role={m.role}
                content={m.content}
                risk={m.risk}
                isStreaming={isStreaming}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 输入区 */}
      <footer className="w-full py-6 flex justify-center">
        <div className="relative w-[min(92%,720px)] max-w-2xl">
          <div className="rounded-2xl bg-[#60a5fa]/30 backdrop-blur-md shadow-lg">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSend()}
              placeholder={isStreaming ? "Waiting..." : "Type your message…"}
              disabled={isStreaming}
              className={clsx(
                "w-full h-[56px] px-4 pr-28 outline-none bg-transparent text-[15px] leading-6 text-white placeholder:text-blue-100/70",
                isStreaming && "opacity-70"
              )}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2">
              <button
                onClick={onSend}
                disabled={isStreaming}
                className="px-3 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-400 transition text-white disabled:opacity-50"
              >
                Send
              </button>
              <button
                onClick={onStop}
                disabled={!isStreaming}
                className="px-3 py-1.5 rounded-xl bg-blue-300/40 hover:bg-blue-400/40 transition text-white disabled:opacity-50"
              >
                Stop
              </button>
            </div>
          </div>
          <div className="mt-1 text-[11px] text-blue-100/70 text-right">
            Press ⏎ to send
          </div>
        </div>
      </footer>
    </main>
  );
}
