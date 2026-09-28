// src/lib/openai.ts
import OpenAI from "openai";

/**
 * OpenAI is optional. The SDK constructor throws when no API key is present,
 * so the client is built on demand rather than at module load — otherwise
 * importing this file would break the whole route for deployments that never
 * configured a key, before their own fallback path could run.
 */
let client: OpenAI | null = null;

export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function getOpenAIClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}
