"use client";

import { useState, useEffect } from "react";
import { type LikertValue } from "@/lib/survey-data";
import LikertScale from "./LikertScale";
import FreeTextWithHints from "./FreeTextWithHints";
import ProgressBar from "./ProgressBar";

interface FollowupQuestion {
  id: string;
  text: string;
  starters?: Record<string, string[]>;
  hintSystemPrompt?: string;
}

interface SurveyPage2Props {
  page1Answers: Record<string, { likert: string; freetext: string }>;
  onSubmit: (data: {
    followupQuestions: FollowupQuestion[];
    followupAnswers: Record<string, string>;
    followupFreetexts: Record<string, string>;
    additionalComments: string;
  }) => void;
  isSubmitting: boolean;
}

export default function SurveyPage2({
  page1Answers,
  onSubmit,
  isSubmitting,
}: SurveyPage2Props) {
  const [questions, setQuestions] = useState<FollowupQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [followupAnswers, setFollowupAnswers] = useState<Record<string, LikertValue | null>>({});
  const [followupFreetexts, setFollowupFreetexts] = useState<Record<string, string>>({});
  const [additionalComments, setAdditionalComments] = useState("");

  // Fetch AI-generated follow-up questions
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch("/api/generate-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: page1Answers }),
        });

        if (!response.ok) throw new Error("Failed to generate questions");
        const data = await response.json();
        setQuestions(data.questions);
      } catch (err) {
        console.error("Failed to generate follow-up questions:", err);
        setLoadError(true);
        setQuestions([
          { id: "q7", text: "テクノロジー企業は、政府よりも市民の安全を守る能力が高いと思う。" },
          { id: "q8", text: "多少の不便や制約があっても、詐欺被害を未然に防ぐための規制は必要だと思う。" },
          { id: "q9", text: "インターネット上の問題には、既存の法律の枠組みでは十分に対処できないと思う。" },
          { id: "q10", text: "詐欺被害が起きてから対処するよりも、事前に厳しく規制する方が社会全体のコストは低いと思う。" },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, [page1Answers]);

  const setAnswer = (qId: string, value: LikertValue) => {
    setFollowupAnswers((prev) => ({ ...prev, [qId]: value }));
  };

  const setFreetext = (qId: string, value: string) => {
    setFollowupFreetexts((prev) => ({ ...prev, [qId]: value }));
  };

  const page2AnsweredCount = questions.filter((q) => followupAnswers[q.id]).length;
  // Global progress: 7 from page 1 (interest + Q1-6) + page 2 answers
  const globalCompleted = 7 + page2AnsweredCount;
  const globalTotal = 11;
  const canSubmit = questions.length > 0 && questions.every((q) => followupAnswers[q.id]);

  const handleSubmit = () => {
    if (!canSubmit) return;
    const formattedAnswers: Record<string, string> = {};
    const formattedFreetexts: Record<string, string> = {};
    for (const q of questions) {
      formattedAnswers[q.id] = followupAnswers[q.id] || "";
      formattedFreetexts[q.id] = followupFreetexts[q.id] || "";
    }
    onSubmit({
      followupQuestions: questions,
      followupAnswers: formattedAnswers,
      followupFreetexts: formattedFreetexts,
      additionalComments,
    });
  };

  // Build previousAnswers context for hints (include page1 + page2 answers)
  const previousAnswersForHints: Record<string, { likert: string; freetext: string }> = {
    ...page1Answers,
    ...Object.fromEntries(
      Object.entries(followupAnswers)
        .filter(([, v]) => v)
        .map(([k, v]) => [k, { likert: v || "", freetext: followupFreetexts[k] || "" }])
    ),
  };

  // Get starter sentences for a question based on likert value
  const getStarters = (question: FollowupQuestion, likert: LikertValue | null): string[] => {
    if (!likert || !question.starters) return [];
    return question.starters[likert] || [];
  };

  // Get freetext guide label based on likert value
  const getGuide = (likert: LikertValue | null) => {
    if (!likert) return null;
    if (likert === "strongly_agree" || likert === "agree") return { label: "賛成する理由を教えてください" };
    if (likert === "strongly_disagree" || likert === "disagree") return { label: "反対する理由を教えてください" };
    if (likert === "neutral") return { label: "どちらとも言えないと感じる理由を教えてください" };
    if (likert === "dont_know") return { label: "わからないと感じる理由を教えてください" };
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-10 h-10 border-[3px] border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-text-secondary text-sm">
          あなたの回答に基づいて追加の質問を準備しています...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <ProgressBar
        current={globalCompleted}
        total={globalTotal}
        label={`${globalCompleted}/${globalTotal} 問回答済み`}
      />

      {/* Intro text */}
      <div className="bg-surface border border-border rounded-2xl p-5">
        <p className="text-sm text-text-secondary leading-relaxed">
          前のページのご回答をもとに、あなたの考え方をより深く理解するための質問を用意しました。
          それぞれの設問について、あなたの考えに最も近いものをお選びください。
        </p>
        {loadError && (
          <p className="text-xs text-warning mt-2">
            ※ 質問の生成に問題が発生したため、標準の質問を表示しています。
          </p>
        )}
      </div>

      {/* Follow-up Questions Q7-Q10 */}
      {questions.map((question, index) => {
        const hasLikert = !!followupAnswers[question.id];

        return (
          <section
            key={question.id}
            className="bg-white border border-border rounded-2xl p-5 sm:p-6"
          >
            <div className="mb-4">
              <div className="flex gap-3 items-start">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-accent/10 text-accent text-xs font-bold shrink-0 mt-0.5">
                  {index + 7}
                </span>
                <h3 className="text-[15px] font-semibold text-text leading-relaxed">
                  {question.text}
                </h3>
              </div>
            </div>

            <div className={`${hasLikert ? "mb-5" : ""}`}>
              <LikertScale
                value={followupAnswers[question.id] || null}
                onChange={(val) => setAnswer(question.id, val)}
              />
            </div>

            {/* Free text with AI hints (shown after Likert selection) */}
            {hasLikert && (
              <div className="border-t border-border/60 pt-4">
                <FreeTextWithHints
                  questionId={question.id}
                  likertAnswer={followupAnswers[question.id] || null}
                  value={followupFreetexts[question.id] || ""}
                  onChange={(val) => setFreetext(question.id, val)}
                  previousAnswers={previousAnswersForHints}
                  starterSentences={getStarters(question, followupAnswers[question.id] || null)}
                  guide={getGuide(followupAnswers[question.id] || null)}
                  hintSystemPrompt={question.hintSystemPrompt}
                />
              </div>
            )}
          </section>
        );
      })}

      {/* Additional Comments */}
      <section className="bg-white border border-border rounded-2xl p-5 sm:p-6">
        <h3 className="text-[15px] font-semibold text-text mb-1">
          その他、ご意見があればお聞かせください
        </h3>
        <p className="text-sm text-text-muted mb-3">（任意）</p>
        <textarea
          value={additionalComments}
          onChange={(e) => setAdditionalComments(e.target.value)}
          placeholder="オンライン広告詐欺対策について、他にお考えのことがあれば自由にお書きください..."
          rows={5}
          className="w-full px-4 py-3 rounded-lg border border-border bg-white text-text resize-y text-sm leading-relaxed placeholder:text-text-muted"
        />
      </section>

      {/* Submit */}
      <div className="flex flex-col items-center gap-3 pt-2 pb-4">
        {!canSubmit && (
          <p className="text-sm text-text-muted">
            全ての設問に回答すると送信できます。
          </p>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          className={`px-10 py-3.5 rounded-xl text-base font-semibold transition-all ${
            canSubmit && !isSubmitting
              ? "bg-primary text-white hover:bg-primary-light shadow-md hover:shadow-lg active:scale-[0.98]"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              送信中...
            </span>
          ) : (
            "回答を送信する"
          )}
        </button>
      </div>
    </div>
  );
}
