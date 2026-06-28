import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import type { BaseMessage } from "@langchain/core/messages";
import type { z } from "zod";

/**
 * Single model tier: Gemini Flash for every node, including critique/synthesis.
 * Gemini Pro was paywalled off the free tier in Apr 2026 — see PRD §10.
 */
function getFlashModel(temperature = 0.3) {
  return new ChatGoogleGenerativeAI({
    // Pinned, not "-latest": that alias resolved to gemini-3.5-flash, a
    // preview model capped at a brutal 20 requests/DAY on the free tier.
    // gemini-2.5-flash is the established model with the documented
    // ~10 RPM / much higher RPD free tier this project is built around.
    model: "gemini-2.5-flash",
    temperature,
    apiKey: process.env.GOOGLE_API_KEY,
    // withRetry() below is the single source of retry/backoff — disable
    // LangChain's own internal retries so they don't compound with ours.
    maxRetries: 0,
  });
}

const MAX_ATTEMPTS = 3;
const DEFAULT_BACKOFF_MS = 15_000;
const MAX_BACKOFF_MS = 35_000;

function isRateLimitError(err: unknown): boolean {
  return err instanceof Error && /429|Too Many Requests/i.test(err.message);
}

/**
 * Measured live: the free tier for gemini-flash-latest (-> gemini-3.5-flash)
 * is 5 requests/min, not the ~10 documented elsewhere. Google's 429 body
 * includes a `Please retry in Ns` hint — honor it instead of guessing.
 */
function parseRetryDelayMs(message: string): number {
  const match = message.match(/retry in ([\d.]+)s/i);
  if (!match) return DEFAULT_BACKOFF_MS;
  return Math.min(Math.ceil(parseFloat(match[1]) * 1000) + 1000, MAX_BACKOFF_MS);
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isRateLimitError(err) || attempt === MAX_ATTEMPTS) throw err;
      await new Promise((resolve) =>
        setTimeout(resolve, parseRetryDelayMs((err as Error).message))
      );
    }
  }
  throw lastError;
}

export async function invokeFlash(
  messages: BaseMessage[],
  temperature = 0.3
): Promise<string> {
  return withRetry(async () => {
    const response = await getFlashModel(temperature).invoke(messages);
    return response.content.toString().trim();
  });
}

export async function invokeFlashStructured<Schema extends z.ZodType>(
  schema: Schema,
  messages: BaseMessage[],
  temperature = 0.1
): Promise<z.infer<Schema>> {
  return withRetry(async () => {
    const result = await getFlashModel(temperature)
      .withStructuredOutput(schema)
      .invoke(messages);
    return result as z.infer<Schema>;
  });
}
