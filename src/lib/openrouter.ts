const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function callOpenRouter(
  messages: ChatMessage[],
  options?: {
    maxTokens?: number;
    temperature?: number;
  }
): Promise<string> {
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
  return data.choices?.[0]?.message?.content ?? "";
}

// Model info for transparency page
export const MODEL_INFO = {
  id: "google/gemini-3-flash-preview",
  name: "Gemini 3 Flash Preview",
  provider: "Google (via OpenRouter)",
  description:
    "Google の Gemini 3 Flash Preview モデルを OpenRouter 経由で使用しています。回答のヒント生成と、フォローアップ質問の生成に使用されます。",
};
