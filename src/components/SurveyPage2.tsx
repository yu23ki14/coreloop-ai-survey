"use client";

import { useEffect, useState } from "react";
import type { LikertValue } from "@/lib/survey-data";
import FreeTextWithHints from "./FreeTextWithHints";
import LikertScale from "./LikertScale";
import ProgressBar, { scrollToFirstUnanswered } from "./ProgressBar";
import { Title, Typography } from "./Typography";

interface StarterSentences {
  agree: string[];
  disagree: string[];
  neutral: string[];
  dont_know: string[];
}

interface FreetextGuide {
  agree: string;
  disagree: string;
  neutral: string;
  dont_know: string;
}

interface FollowupQuestion {
  id: string;
  text: string;
  starterSentences?: StarterSentences;
  freetextGuide?: FreetextGuide;
}

interface SurveyPage2Props {
  page1Answers: Record<string, { likert: string; freetext: string }>;
  onSubmit: (data: {
    followupQuestions: { id: string; text: string }[];
    followupAnswers: Record<string, { likert: string; freetext: string }>;
    additionalComments: string;
  }) => void;
  isSubmitting: boolean;
  initialAnswers?: Record<string, { likert: string; freetext: string }>;
  onAnswerChange?: (
    questionId: string,
    data: {
      likert?: string;
      freetext?: string;
      questionText?: string;
      isFollowup?: boolean;
    },
  ) => void;
}

function getStartersForLikert(
  question: FollowupQuestion,
  likert: LikertValue | null,
): string[] {
  if (!likert || !question.starterSentences) return [];
  if (likert === "strongly_agree" || likert === "agree")
    return question.starterSentences.agree || [];
  if (likert === "strongly_disagree" || likert === "disagree")
    return question.starterSentences.disagree || [];
  if (likert === "neutral") return question.starterSentences.neutral || [];
  if (likert === "dont_know") return question.starterSentences.dont_know || [];
  return [];
}

function getGuideForLikert(
  question: FollowupQuestion,
  likert: LikertValue | null,
): { label: string } | null {
  if (!likert || !question.freetextGuide) return null;
  if (likert === "strongly_agree" || likert === "agree")
    return { label: question.freetextGuide.agree };
  if (likert === "strongly_disagree" || likert === "disagree")
    return { label: question.freetextGuide.disagree };
  if (likert === "neutral") return { label: question.freetextGuide.neutral };
  if (likert === "dont_know")
    return { label: question.freetextGuide.dont_know };
  return null;
}

export default function SurveyPage2({
  page1Answers,
  onSubmit,
  isSubmitting,
  initialAnswers,
  onAnswerChange,
}: SurveyPage2Props) {
  const [questions, setQuestions] = useState<FollowupQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [answers, setAnswers] = useState<
    Record<string, { likert: LikertValue | null; freetext: string }>
  >(() => {
    if (!initialAnswers) return {};
    const restored: Record<
      string,
      { likert: LikertValue | null; freetext: string }
    > = {};
    for (const [k, v] of Object.entries(initialAnswers)) {
      restored[k] = {
        likert: (v.likert as LikertValue) || null,
        freetext: v.freetext || "",
      };
    }
    return restored;
  });
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
        // Fallback handled by API, but just in case:
        setQuestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, [page1Answers]);

  const setLikert = (qId: string, value: LikertValue) => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        likert: value,
        freetext: prev[qId]?.freetext || "",
      },
    }));
    const question = questions.find((q) => q.id === qId);
    onAnswerChange?.(qId, {
      likert: value,
      questionText: question?.text,
      isFollowup: true,
    });
  };

  const setFreetext = (qId: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        likert: prev[qId]?.likert || null,
        freetext: value,
      },
    }));
    const question = questions.find((q) => q.id === qId);
    onAnswerChange?.(qId, {
      freetext: value,
      questionText: question?.text,
      isFollowup: true,
    });
  };

  const canSubmit =
    questions.length > 0 && questions.every((q) => answers[q.id]?.likert);

  const progressDots = questions.map((q) => ({
    id: `q-${q.id}`,
    answered: !!answers[q.id]?.likert,
  }));

  const handleSubmit = () => {
    if (!canSubmit) {
      scrollToFirstUnanswered(progressDots);
      return;
    }
    const formattedAnswers: Record<
      string,
      { likert: string; freetext: string }
    > = {};
    for (const q of questions) {
      formattedAnswers[q.id] = {
        likert: answers[q.id]?.likert || "",
        freetext: answers[q.id]?.freetext || "",
      };
    }
    onSubmit({
      followupQuestions: questions.map((q) => ({ id: q.id, text: q.text })),
      followupAnswers: formattedAnswers,
      additionalComments,
    });
  };

  // Build previousAnswers for hints (page1 + current page2 answers)
  const previousAnswersForHints: Record<
    string,
    { likert: string; freetext: string }
  > = {
    ...page1Answers,
    ...Object.fromEntries(
      Object.entries(answers)
        .filter(([, v]) => v.likert)
        .map(([k, v]) => [k, { likert: v.likert || "", freetext: v.freetext }]),
    ),
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-10 h-10 border-[3px] border-accent border-t-transparent rounded-full animate-spin" />
        <Typography as="p" size="regular" secondary>
          あなたの回答に合わせて追加の質問を準備しています...
        </Typography>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <ProgressBar dots={progressDots} />

      {/* Intro text */}
      <div className="bg-surface border border-border rounded-2xl p-3">
        <Typography as="p" size="regular" secondary>
          前のページのご回答をもとに、あなたの考え方をより深く理解するための質問を用意しました。
          それぞれの設問について、あなたの考えに最も近いものをお選びください。
        </Typography>
        {loadError && (
          <Typography as="p" size="small" className="text-warning mt-2">
            ※ 質問の生成に問題が発生したため、標準の質問を表示しています。
          </Typography>
        )}
      </div>

      {/* Follow-up Questions */}
      {questions.map((question, index) => {
        const hasLikert = !!answers[question.id]?.likert;

        return (
          <section
            key={question.id}
            id={`q-${question.id}`}
            className="bg-white border border-border rounded-2xl p-3 sm:p-6"
          >
            <div className="mb-4">
              <div className="flex gap-2 items-start">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-accent/10 text-accent text-xs font-bold shrink-0 mt-0.5">
                  {index + 14}
                </span>
                <Title>{question.text}</Title>
              </div>
            </div>

            <div className={`${hasLikert ? "mb-5" : ""}`}>
              <LikertScale
                value={answers[question.id]?.likert || null}
                onChange={(val) => setLikert(question.id, val)}
              />
            </div>

            {hasLikert && (
              <div className="border-t border-border/60 pt-4">
                <FreeTextWithHints
                  questionId={question.id}
                  questionText={question.text}
                  likertAnswer={answers[question.id]?.likert || null}
                  value={answers[question.id]?.freetext || ""}
                  onChange={(val) => setFreetext(question.id, val)}
                  previousAnswers={previousAnswersForHints}
                  starterSentences={getStartersForLikert(
                    question,
                    answers[question.id]?.likert || null,
                  )}
                  guide={getGuideForLikert(
                    question,
                    answers[question.id]?.likert || null,
                  )}
                />
              </div>
            )}
          </section>
        );
      })}

      {/* Additional Comments */}
      <section className="bg-white border border-border rounded-2xl p-3 sm:p-6">
        <Title className="mb-1">その他、ご意見があればお聞かせください</Title>
        <Typography as="p" size="regular" muted className="mb-3">
          （任意）
        </Typography>
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
          <Typography as="p" size="regular" muted>
            全ての設問に回答すると送信できます。
          </Typography>
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
