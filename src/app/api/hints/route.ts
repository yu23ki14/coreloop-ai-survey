import { NextRequest, NextResponse } from "next/server";
import { callOpenRouter } from "@/lib/openrouter";
import { SURVEY_QUESTIONS, LIKERT_OPTIONS } from "@/lib/survey-data";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      questionId,
      likertAnswer,
      currentText,
      previousAnswers,
      hintSystemPrompt: customHintPrompt,
    }: {
      questionId: string;
      likertAnswer: string;
      currentText: string;
      previousAnswers: Record<string, { likert: string; freetext: string }>;
      hintSystemPrompt?: string;
    } = body;

    // Use predefined question's prompt, or custom prompt for AI-generated questions
    const question = SURVEY_QUESTIONS.find((q) => q.id === questionId);
    const systemPrompt = question?.hintSystemPrompt || customHintPrompt;

    if (!systemPrompt) {
      return NextResponse.json(
        { error: "Invalid question ID and no custom prompt provided" },
        { status: 400 }
      );
    }

    // Format previous answers for context
    const prevAnswersFormatted = Object.entries(previousAnswers || {})
      .map(([qId, ans]) => {
        const q = SURVEY_QUESTIONS.find((sq) => sq.id === qId);
        const likertLabel =
          LIKERT_OPTIONS.find((o) => o.value === ans.likert)?.label || ans.likert;
        return `${q?.id?.toUpperCase() || qId.toUpperCase()}: ${likertLabel}${ans.freetext ? ` - "${ans.freetext}"` : ""}`;
      })
      .join("\n");

    const likertLabel =
      LIKERT_OPTIONS.find((o) => o.value === likertAnswer)?.label ||
      likertAnswer ||
      "未回答";

    const userMessage = `回答者のこの設問への回答（リッカート尺度）: ${likertLabel}
回答者のこれまでの全回答:
${prevAnswersFormatted || "（まだ他の設問には回答していません）"}
回答者の現在の自由記述: ${currentText || "（まだ何も書いていません）"}

上記を踏まえ、回答者がさらに考えを深めるための問いかけを一文で提示してください。パッと読んで理解できる簡潔な文にしてください。`;

    const hint = await callOpenRouter(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      { maxTokens: 256, temperature: 0.7 }
    );

    return NextResponse.json({ hint });
  } catch (error) {
    console.error("Hint generation error:", error);
    return NextResponse.json(
      { error: "ヒントの生成中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}
