import { NextRequest } from "next/server";
import { ChatRequestSchema } from "@/lib/schema";
import { analyzePrompt } from "@/lib/security";
import { auditOutput } from "@/lib/audit";
// import { simpleRateLimit } from "@/lib/rateLimit"; // optional

export const runtime = "nodejs";

// ---------- helper: parse SSE to plain text ----------
function sseToTextStream(res: Response, onChunk?: (t: string) => void) {
  if (!res.body) throw new Error("Empty body");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let idx;
          while ((idx = buffer.indexOf("\n\n")) !== -1) {
            const chunk = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            const line = chunk.trim();
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();

            if (payload === "[DONE]") {
              controller.close();
              return;
            }

            try {
              const json = JSON.parse(payload);
              const text =
                json?.choices?.[0]?.delta?.content ??
                json?.choices?.[0]?.message?.content ??
                json?.output_text ??
                json?.data?.content ??
                "";
              if (text) {
                onChunk?.(text);
                controller.enqueue(encoder.encode(text));
              }
            } catch {
              // ignore non-JSON lines
            }
          }
        }
      } finally {
        controller.close();
      }
    },
  });
}

// ---------- fallback if no API key ----------
function placeholderStream() {
  const enc = new TextEncoder();
  const chunks = [
    "Connected without an API key. ",
    "Set MISTRAL_API_KEY in .env.local to enable real streaming.",
  ];
  let i = 0;
  return new ReadableStream<Uint8Array>({
    start(controller) {
      const t = setInterval(() => {
        if (i >= chunks.length) {
          clearInterval(t);
          controller.close();
        } else controller.enqueue(enc.encode(chunks[i++]));
      }, 260);
    },
  });
}

// ---------- retry / model fallback helpers ----------
const MODEL_CANDIDATES = [
  process.env.MISTRAL_MODEL || "mistral-large-latest",
  "mistral-medium-latest",
  "mistral-small-latest",
  "open-mistral-7b",
];

async function requestUpstream({
  base,
  apiKey,
  model,
  settings,
  messages,
}: {
  base: string;
  apiKey: string;
  model: string;
  settings: { temperature?: number; maxTokens?: number };
  messages: { role: string; content: string }[];
}) {
  const body = JSON.stringify({
    model,
    stream: true,
    temperature: settings?.temperature ?? 0.7,
    max_tokens: settings?.maxTokens ?? 1024,
    messages,
  });

  return fetch(base, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body,
  });
}

async function requestWithRetries({
  base,
  apiKey,
  settings,
  messages,
}: {
  base: string;
  apiKey: string;
  settings: { temperature?: number; maxTokens?: number };
  messages: { role: string; content: string }[];
}) {
  let lastErrorText = "";
  for (const model of MODEL_CANDIDATES) {
    const res = await requestUpstream({ base, apiKey, model, settings, messages });
    if (res.ok && res.body) return { res, modelUsed: model };

    if ([429, 500, 502, 503, 504].includes(res.status)) {
      lastErrorText = await res.text().catch(() => "");
      await new Promise((r) => setTimeout(r, 400));
      continue;
    }

    const text = await res.text().catch(() => "");
    return { res, modelUsed: model, errorText: text || lastErrorText };
  }

  return { res: null as any, modelUsed: null as any, errorText: lastErrorText || "All models failed." };
}

// ---------- main handler ----------
export async function POST(req: NextRequest) {
  // optional rate limit
  // const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  // const rl = simpleRateLimit(ip, 1000);
  // if (!rl.allowed) return new Response("Too Many Requests", { status: 429 });

  const body = await req.json();
  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ ok: false, error: "Invalid request" }), { status: 400 });
  }

  const { messages, settings } = parsed.data;
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const risk = analyzePrompt(lastUser);

  const apiKey = process.env.MISTRAL_API_KEY;
  const base = process.env.MISTRAL_BASE || "https://api.mistral.ai/v1/chat/completions";

  if (!apiKey) {
    return new Response(placeholderStream(), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Risk-Score": String(risk.score),
        "Cache-Control": "no-store",
      },
    });
  }

  const t0 = Date.now();
  const tried = await requestWithRetries({ base, apiKey, settings, messages });

  if (!tried.res || !tried.res.ok || !tried.res.body) {
    const text = tried.errorText ?? "Model capacity issue";
    return new Response(
      `Upstream error (capacity/429 likely). Tried models: ${MODEL_CANDIDATES.join(", ")}\n${text}`,
      { status: 502 }
    );
  }

  let acc = "";
  const encoder = new TextEncoder();

  const sseStream = sseToTextStream(tried.res, (t) => (acc += t));

  const finalStream = new ReadableStream<Uint8Array>({
    start(controller) {
      const reader = sseStream.getReader();
      (async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) controller.enqueue(value);
          }

          const latencyMs = Date.now() - t0;
          const audit = auditOutput(acc);
          const metrics = `\n\n[__METRICS__] ${JSON.stringify({
            audit,
            latencyMs,
            modelUsed: tried.modelUsed,
          })}`;
          controller.enqueue(encoder.encode(metrics));
        } finally {
          controller.close();
        }
      })();
    },
  });

  return new Response(finalStream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Risk-Score": String(risk.score),
      "Cache-Control": "no-store",
    },
  });
}
