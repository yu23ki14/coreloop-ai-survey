const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// In-memory cache for LLM responses
const cache = new Map<string, { response: string; timestamp: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_CACHE_SIZE = 500;

function buildCacheKey(
  messages: ChatMessage[],
  options?: { maxTokens?: number; temperature?: number }
): string {
  return JSON.stringify({ messages, options: options ?? {} });
}

function evictExpiredEntries() {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      cache.delete(key);
    }
  }
}

export async function callOpenRouter(
  messages: ChatMessage[],
  options?: {
    maxTokens?: number;
    temperature?: number;
  }
): Promise<string> {
  const cacheKey = buildCacheKey(messages, options);

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.response;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_SUPABASE_URL || "https://citizen-survey.vercel.app",
      "X-Title": "市民意識調査 / Citizen Survey",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages,
      max_tokens: options?.maxTokens ?? 1024,
      temperature: options?.temperature ?? 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? "";

  // Store in cache
  if (cache.size >= MAX_CACHE_SIZE) {
    evictExpiredEntries();
    // If still too large, remove oldest entry
    if (cache.size >= MAX_CACHE_SIZE) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey) cache.delete(oldestKey);
    }
  }
  cache.set(cacheKey, { response: content, timestamp: Date.now() });

  return content;
}

// Model info for transparency page
export const MODEL_INFO = {
  id: "google/gemini-3-flash-preview",
  name: "Gemini 3 Flash Preview",
  provider: "Google (via OpenRouter)",
  description:
    "Google の Gemini 3 Flash Preview モデルを OpenRouter 経由で使用しています。回答のヒント生成と、フォローアップ質問の生成に使用されます。",
};
