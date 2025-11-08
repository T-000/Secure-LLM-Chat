# Secure LLM Chat

A lightweight and secure LLM playground built with **Next.js** and **Mistral SDK**.  
Includes prompt-injection warnings, output auditing, and streaming chat UI.

---

## Features

- Chat interface with streaming responses
- Model settings: system prompt, temperature, max tokens
- Prompt-injection detection and risk scoring
- Output auditing for sensitive content or PII
- Server-side API proxy (API key never exposed to client)
- Basic rate limiting (1 request/sec per IP)
- Token usage and latency metrics
- Unit tests (Vitest) and optional E2E tests (Playwright)
- One-click deployment on Vercel

---

## Tech Stack

- **Frontend:** Next.js (App Router, TypeScript), shadcn/ui, Tailwind CSS  
- **Backend:** Next.js Route Handlers, Mistral SDK  
- **Validation:** Zod  
- **State:** React hooks or Zustand  
- **Testing:** Vitest, Playwright (optional)  
- **Deployment:** Vercel

---

## Quick Start

### Requirements
- Node.js 18+
- pnpm (install with `npm install -g pnpm`)

### Setup
```bash
git clone git@github.com:yourname/secure-llm-chat.git
cd secure-llm-chat
pnpm install
```

