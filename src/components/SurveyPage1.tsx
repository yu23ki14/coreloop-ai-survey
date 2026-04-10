"use client";

import { useState } from "react";
import {
  getFreetextGuide,
  getStarterSentences,
  INTEREST_OPTIONS,
  INTEREST_REASONS,
  type LikertValue,
  SURVEY_QUESTIONS,
} from "@/lib/survey-data";
import FreeTextWithHints from "./FreeTextWithHints";
import LikertScale from "./LikertScale";
import ProgressBar, { scrollToFirstUnanswered } from "./ProgressBar";
import { Title, Typography } from "./Typography";

const INTEREST_ID = "q-interest";

interface SurveyPage1Props {
  onSubmit: (data: {
    interestLevel: number;
    interestReasons: string[];
    interestOtherText: string;
    answers: Record<string, { likert: string; freetext: string }>;
  }) => void;
  isSubmitting: boolean;
  onAnswerChange?: (
    questionId: string,
    data: { likert?: string; freetext?: string; questionText?: string },
  ) => void;
  onInterestChange?: (data: {
    interestLevel?: number;
    interestReasons?: string[];
    interestOtherText?: string;
  }) => void;
  initialAnswers?: Record<string, { likert: string; freetext: string }>;
  initialInterest?: {
    level: number | null;
    reasons: string[];
    otherText: string;
  };
}

export default function SurveyPage1({
  onSubmit,
  isSubmitting,
  onAnswerChange,
  onInterestChange,
  initialAnswers,
  initialInterest,
}: SurveyPage1Props) {
  const [interestLevel, setInterestLevel] = useState<number | null>(
    initialInterest?.level ?? null,
  );
  const [interestReasons, setInterestReasons] = useState<string[]>(
    initialInterest?.reasons ?? [],
  );
  const [interestOtherText, setInterestOtherText] = useState(
    initialInterest?.otherText ?? "",
  );
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

  const toggleInterestReason = (value: string) => {
    setInterestReasons((prev) => {
      const next = prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value];
      onInterestChange?.({ interestReasons: next });
      return next;
    });
  };

  const setLikert = (qId: string, value: LikertValue) => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        likert: value,
        freetext: prev[qId]?.freetext || "",
      },
    }));
    const question = SURVEY_QUESTIONS.find((q) => q.id === qId);
    onAnswerChange?.(qId, { likert: value, questionText: question?.text });
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
    const question = SURVEY_QUESTIONS.find((q) => q.id === qId);
    onAnswerChange?.(qId, { freetext: value, questionText: question?.text });
  };

  const progressDots = [
    { id: INTEREST_ID, answered: interestLevel !== null },
    ...SURVEY_QUESTIONS.map((q) => ({
      id: `q-${q.id}`,
      answered: !!answers[q.id]?.likert,
    })),
  ];

  const canSubmit =
    interestLevel !== null &&
    SURVEY_QUESTIONS.every((q) => answers[q.id]?.likert);

  const handleSubmit = () => {
    if (!canSubmit || !interestLevel) {
      scrollToFirstUnanswered(progressDots);
      return;
    }
    const formattedAnswers: Record<
      string,
      { likert: string; freetext: string }
    > = {};
    for (const q of SURVEY_QUESTIONS) {
      formattedAnswers[q.id] = {
        likert: answers[q.id]?.likert || "",
        freetext: answers[q.id]?.freetext || "",
      };
    }
    onSubmit({
      interestLevel,
      interestReasons,
      interestOtherText,
      answers: formattedAnswers,
    });
  };

  // Build previousAnswers for hints context
  const previousAnswersForHints = Object.fromEntries(
    Object.entries(answers)
      .filter(([, v]) => v.likert)
      .map(([k, v]) => [k, { likert: v.likert || "", freetext: v.freetext }]),
  );

  return (
    <div className="space-y-6">
      {/* Progress dots */}
      <ProgressBar dots={progressDots} />

      {/* Interest Level */}
      <section
        id={INTEREST_ID}
        className="bg-white border border-border rounded-2xl p-3 sm:p-6"
      >
        <div className="mb-4">
          <div className="flex gap-2 items-start">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
              0
            </span>
            <Title>
              オンライン広告詐欺の問題について、どの程度関心をお持ちですか？
            </Title>
          </div>
        </div>

        <div className="flex gap-1.5">
          {INTEREST_OPTIONS.map((opt) => {
            const isSelected = interestLevel === parseInt(opt.value, 10);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  const val = parseInt(opt.value, 10);
                  setInterestLevel(val);
                  onInterestChange?.({ interestLevel: val });
                }}
                aria-label={opt.label}
                aria-pressed={isSelected}
                className={`flex-1 min-w-0 flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-lg border text-center font-medium transition-all
                  ${
                    isSelected
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white text-text-secondary border-border hover:border-blue-400/40 hover:text-blue-500"
                  }
                `}
              >
                <Typography
                  size="small"
                  className={`leading-tight !text-xs sm:!text-sm ${isSelected ? "!text-white !font-semibold" : ""}`}
                >
                  {opt.label}
                </Typography>
              </button>
            );
          })}
        </div>

        {interestLevel !== null && (
          <div className="border-t border-border/60 pt-4 mt-5">
            <Typography as="p" size="regular" weight="bold" className="mb-3">
              この問題を知ったきっかけを教えてください（複数選択可）
            </Typography>
            <div className="flex flex-wrap gap-2">
              {INTEREST_REASONS.map((reason) => {
                const isSelected = interestReasons.includes(reason.value);
                return (
                  <button
                    key={reason.value}
                    type="button"
                    onClick={() => toggleInterestReason(reason.value)}
                    className={`px-3.5 py-2 rounded-lg border text-sm font-medium transition-all
                      ${
                        isSelected
                          ? "bg-accent/10 text-accent border-accent shadow-sm"
                          : "bg-white text-text-secondary border-border hover:border-accent/40 hover:text-accent"
                      }
                    `}
                  >
                    {reason.label}
                  </button>
                );
              })}
            </div>
            {interestReasons.includes("other") && (
              <textarea
                value={interestOtherText}
                onChange={(e) => setInterestOtherText(e.target.value)}
                placeholder="きっかけを教えてください"
                className="mt-3 w-full rounded-lg border border-border p-3 text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:border-primary/40 resize-none"
                rows={2}
              />
            )}
          </div>
        )}
      </section>

      {/* Questions Q1-Q13 */}
      {SURVEY_QUESTIONS.map((question, index) => {
        const hasLikert = !!answers[question.id]?.likert;

        return (
          <section
            key={question.id}
            id={`q-${question.id}`}
            className="bg-white border border-border rounded-2xl p-3 sm:p-6"
          >
            {/* Question header */}
            <div className="mb-4">
              <div className="flex gap-2 items-start">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                  {index + 1}
                </span>
                <Title>{question.text}</Title>
              </div>
            </div>

            {/* Likert Scale */}
            <div className={`${hasLikert ? "mb-5" : ""}`}>
              <LikertScale
                value={answers[question.id]?.likert || null}
                onChange={(val) => setLikert(question.id, val)}
              />
            </div>

            {/* Free text with AI hints (shown after Likert selection) */}
            {hasLikert && (
              <div className="border-t border-border/60 pt-4">
                <FreeTextWithHints
                  questionId={question.id}
                  likertAnswer={answers[question.id]?.likert || null}
                  value={answers[question.id]?.freetext || ""}
                  onChange={(val) => setFreetext(question.id, val)}
                  previousAnswers={previousAnswersForHints}
                  starterSentences={getStarterSentences(
                    question,
                    answers[question.id]?.likert || null,
                  )}
                  guide={getFreetextGuide(
                    question,
                    answers[question.id]?.likert || null,
                  )}
                />
              </div>
            )}
          </section>
        );
      })}

      {/* Submit */}
      <div className="flex flex-col items-center gap-3 pt-2 pb-4">
        {!canSubmit && (
          <Typography as="p" size="regular" muted className="text-center">
            全ての設問の選択式に回答すると次のページに進めます。
            <br />
            <Typography as="span" size="small" muted>
              自由記述はスキップできます。
            </Typography>
          </Typography>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
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
            "次のページへ進む →"
          )}
        </button>
      </div>
    </div>
  );
}
