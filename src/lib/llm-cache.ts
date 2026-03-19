import { createAdminClient } from "./supabase";
import type { ChatMessage } from "./openrouter";

interface CacheEntry {
  cache_key: string;
  response: string;
  model: string;
  created_at: string;
}

/**
 * Generate a SHA-256 hash of the request parameters to use as cache key.
 * Uses Web Crypto API (available in Edge runtime).
 */
async function generateCacheKey(
  messages: ChatMessage[],
  model: string,
  maxTokens: number,
  temperature: number
): Promise<string> {
  const payload = JSON.stringify({ messages, model, maxTokens, temperature });
  const encoded = new TextEncoder().encode(payload);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Look up a cached LLM response by request parameters.
 */
export async function getCachedResponse(
  messages: ChatMessage[],
  model: string,
  maxTokens: number,
  temperature: number
): Promise<string | null> {
  try {
    const cacheKey = await generateCacheKey(messages, model, maxTokens, temperature);
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("llm_cache")
      .select("response")
      .eq("cache_key", cacheKey)
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return (data as CacheEntry).response;
  } catch {
    // Cache miss or error — just return null and let the caller make a fresh request
    return null;
  }
}

/**
 * Store an LLM response in the persistent cache.
 */
export async function setCachedResponse(
  messages: ChatMessage[],
  model: string,
  maxTokens: number,
  temperature: number,
  response: string
): Promise<void> {
  try {
    const cacheKey = await generateCacheKey(messages, model, maxTokens, temperature);
    const supabase = createAdminClient();

    await supabase.from("llm_cache").upsert(
      {
        cache_key: cacheKey,
        request_body: JSON.stringify({ messages, model, maxTokens, temperature }),
        response,
      },
      { onConflict: "cache_key" }
    );
  } catch {
    // Silently fail — caching is best-effort
    console.error("Failed to write LLM cache entry");
  }
}
