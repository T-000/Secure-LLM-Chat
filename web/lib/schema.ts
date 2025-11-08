import { z } from "zod";

export const MessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string().min(1),
});

export const SettingsSchema = z.object({
  system: z.string().default("You are a helpful, secure assistant."),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(64).max(4096).default(1024),
});

export const ChatRequestSchema = z.object({
  messages: z.array(MessageSchema).min(1),
  settings: SettingsSchema,
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;
