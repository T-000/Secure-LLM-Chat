import { NextRequest } from "next/server";
import { ChatRequestSchema } from "@/lib/schema";
import { analyzePrompt } from "@/lib/security";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ ok: false, error: "Invalid request" }), { status: 400 });
  }
  const { messages } = parsed.data;
  const lastUser = [...messages].reverse().find(m => m.role === "user");
  const risk = analyzePrompt(lastUser?.content ?? "");

  const enc = new TextEncoder();
  const chunks = [
    "This is a placeholder streaming response.",
    " We'll wire up the real model next.",
  ];
  let i = 0;

  const stream = new ReadableStream({
    start(controller) {
      const timer = setInterval(() => {
        if (i >= chunks.length) {
          clearInterval(timer);
          controller.close();
        } else {
          controller.enqueue(enc.encode(chunks[i++]));
        }
      }, 300);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Risk-Score": String(risk.score),
      "Cache-Control": "no-store",
    },
  });
}
