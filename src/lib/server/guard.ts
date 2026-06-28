import type { Memo, ResolvedEntity } from "../agent/state";

export interface CachedResult {
  memo: Memo;
  resolvedEntity: ResolvedEntity | null;
  errors: string[];
}

/**
 * In-memory only — resets on cold start and isn't shared across serverless
 * instances. Good enough to absorb repeat lookups within a warm instance;
 * see PRD §15. A durable store (Upstash/Vercel KV) is the documented
 * "what I'd improve" upgrade.
 */
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const memoCache = new Map<string, { result: CachedResult; expiresAt: number }>();

function cacheKey(companyName: string) {
  return companyName.trim().toLowerCase();
}

export function getCachedResult(companyName: string): CachedResult | null {
  const entry = memoCache.get(cacheKey(companyName));
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoCache.delete(cacheKey(companyName));
    return null;
  }
  return entry.result;
}

export function setCachedResult(companyName: string, result: CachedResult) {
  memoCache.set(cacheKey(companyName), { result, expiresAt: Date.now() + CACHE_TTL_MS });
}

const MAX_REQUESTS_PER_IP_PER_HOUR = 10;
const ipRequestLog = new Map<string, number[]>();

/** True if this IP is still within budget (and records the attempt). */
export function checkIpRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - 60 * 60 * 1000;
  const timestamps = (ipRequestLog.get(ip) ?? []).filter((t) => t > windowStart);
  if (timestamps.length >= MAX_REQUESTS_PER_IP_PER_HOUR) {
    ipRequestLog.set(ip, timestamps);
    return false;
  }
  timestamps.push(now);
  ipRequestLog.set(ip, timestamps);
  return true;
}

/**
 * Gemini's free tier is ~10 RPM and a single run already burns ~7 of that
 * budget — concurrent runs across visitors would blow through it. Cap to
 * one in-flight graph run at a time for the whole deployment.
 */
let activeRun: Promise<void> | null = null;
let releaseActiveRun: (() => void) | null = null;

export function isResearchInFlight(): boolean {
  return activeRun !== null;
}

export function beginRun(): () => void {
  activeRun = new Promise<void>((resolve) => {
    releaseActiveRun = resolve;
  });
  return () => {
    releaseActiveRun?.();
    activeRun = null;
    releaseActiveRun = null;
  };
}
