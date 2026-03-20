"use client";

import { useState } from "react";
import { SURVEY_QUESTIONS, INTEREST_OPTIONS, getFreetextGuide, getStarterSentences, type LikertValue } from "@/lib/survey-data";
import LikertScale from "./LikertScale";
import FreeTextWithHints from "./FreeTextWithHints";
import ProgressBar from "./ProgressBar";

interface SurveyPage1Props {
  onSubmit: (data: {
    interestLevel: number;
    answers: Record<string, { likert: string; freetext: string }>;
  }) => void;
  isSubmitting: boolean;
}

export default function SurveyPage1({ onSubmit, isSubmitting }: SurveyPage1Props) {
  const [interestLevel, setInterestLevel] = useState<number | null>(null);
  const [answers, setAnswers] = useState<
    Record<string, { likert: LikertValue | null; freetext: string }>
  >({});

  const setLikert = (qId: string, value: LikertValue) => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: { ...prev[qId], likert: value, freetext: prev[qId]?.freetext || "" },
    }));
  };

  const setFreetext = (qId: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: { ...prev[qId], likert: prev[qId]?.likert || null, freetext: value },
    }));
  };

  // Calculate progress (global: interest + Q1-6 + Q7-10 = 11)
  const totalRequired = 11;
  const completedCount =
    (interestLevel ? 1 : 0) +
    SURVEY_QUESTIONS.filter((q) => answers[q.id]?.likert).length;

  const canSubmit = interestLevel !== null && SURVEY_QUESTIONS.every((q) => answers[q.id]?.likert);

  const handleSubmit = () => {
    if (!canSubmit || !interestLevel) return;
    const formattedAnswers: Record<string, { likert: string; freetext: string }> = {};
    for (const q of SURVEY_QUESTIONS) {
      formattedAnswers[q.id] = {
        likert: answers[q.id]?.likert || "",
        freetext: answers[q.id]?.freetext || "",
      };
    }
    onSubmit({ interestLevel, answers: formattedAnswers });
  };

  // Build previousAnswers for hints context
  const previousAnswersForHints = Object.fromEntries(
    Object.entries(answers)
      .filter(([, v]) => v.likert)
      .map(([k, v]) => [k, { likert: v.likert || "", freetext: v.freetext }])
  );

  return (
    <div className="space-y-6">
      {/* Progress */}
      <ProgressBar
        current={completedCount}
        total={totalRequired}
        label={`${completedCount}/${totalRequired} 問回答済み`}
      />

      {/* Interest Level */}
      <section className="bg-white border border-border rounded-2xl p-5 sm:p-6">
        <h3 className="text-[15px] font-semibold text-text mb-1.5">
          はじめに：この問題への関心度を教えてください
        </h3>
        <p className="text-sm text-text-muted mb-4">
          SNSなどに表示される偽の広告による詐欺問題について、どの程度関心をお持ちですか？
        </p>
        <div className="flex flex-wrap gap-2">
          {INTEREST_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setInterestLevel(parseInt(opt.value))}
              className={`likert-option px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                interestLevel === parseInt(opt.value)
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-white text-text-secondary border-border hover:border-primary/40 hover:text-primary"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Questions Q1-Q6 */}
      {SURVEY_QUESTIONS.map((question, index) => {
        const hasLikert = !!answers[question.id]?.likert;

        return (
          <section
            key={question.id}
            className="bg-white border border-border rounded-2xl p-5 sm:p-6"
          >
            {/* Question header */}
            <div className="mb-4">
              <p className="text-xs text-text-muted mb-2">{question.description}</p>
              <div className="flex gap-3 items-start">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                  {index + 1}
                </span>
                <h3 className="text-[15px] font-semibold text-text leading-relaxed">
                  {question.text}
                </h3>
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
                  starterSentences={getStarterSentences(question, answers[question.id]?.likert || null)}
                  guide={getFreetextGuide(question, answers[question.id]?.likert || null)}
                />
              </div>
            )}
          </section>
        );
      })}

      {/* Submit */}
      <div className="flex flex-col items-center gap-3 pt-2 pb-4">
        {!canSubmit && (
          <p className="text-sm text-text-muted text-center">
            全ての設問の選択式に回答すると次のページに進めます。
            <br />
            <span className="text-xs">自由記述はスキップできます。</span>
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
            "次のページへ進む →"
          )}
        </button>
      </div>
    </div>
  );
}
