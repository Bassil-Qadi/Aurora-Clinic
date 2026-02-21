// src/lib/openai.ts
import OpenAI from "openai";

export const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // make sure you have this in your .env
});