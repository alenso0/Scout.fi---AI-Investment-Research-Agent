import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatGroq } from "@langchain/groq";
import type { BaseMessage } from "@langchain/core/messages";
import type { z } from "zod";

function getGeminiModel(temperature = 0.3) {
  return new ChatGoogleGenerativeAI({
    // Pinned, not "-latest": that alias resolved to gemini-3.5-flash, a
    // preview model with a 5 RPM ceiling. gemini-2.5-flash is the
    // established model this project is built around.
    model: "gemini-2.5-flash",
    temperature,
    apiKey: process.env.GOOGLE_API_KEY,
    maxRetries: 0,
  });
}

function getGroqModel(temperature = 0.3) {
  return new ChatGroq({
    model: "llama-3.3-70b-versatile",
    temperature,
    apiKey: process.env.GROQ_API_KEY,
    maxRetries: 0,
  });
}

/**
 * Measured live: this Google account's Gemini free tier caps at a flat 20
 * requests/day — and that cap applies identically across every Gemini
 * model tried, so switching Gemini models doesn't buy a fresh budget.
 * Falling back to Groq (a separate, much more generous free tier) on any
 * Gemini failure keeps a run usable instead of stalling on a quota that
 * won't reset for hours. See README "Key decisions" for the full story.
 */
export async function invokeFlash(
  messages: BaseMessage[],
  temperature = 0.3
): Promise<string> {
  const primary = getGeminiModel(temperature);
  const fallback = getGroqModel(temperature);
  const response = await primary.withFallbacks([fallback]).invoke(messages);
  return response.content.toString().trim();
}

export async function invokeFlashStructured<Schema extends z.ZodType>(
  schema: Schema,
  messages: BaseMessage[],
  temperature = 0.1
): Promise<z.infer<Schema>> {
  const primary = getGeminiModel(temperature).withStructuredOutput(schema);
  const fallback = getGroqModel(temperature).withStructuredOutput(schema);
  const result = await primary.withFallbacks([fallback]).invoke(messages);
  return result as z.infer<Schema>;
}
