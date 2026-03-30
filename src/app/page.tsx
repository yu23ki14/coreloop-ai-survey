"use client";

import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { SURVEY_INTRO } from "@/lib/survey-data";
import SurveyPage1 from "@/components/SurveyPage1";
import SurveyPage2 from "@/components/SurveyPage2";
import Link from "next/link";
import FraudEducationCarousel from "@/components/FraudEducationCarousel";

type SurveyState = "intro" | "page1" | "page2" | "complete";

export default function Home() {
  const [state, setState] = useState<SurveyState>("intro");
  const [sessionId, setSessionId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [page1Data, setPage1Data] = useState<{
    interestLevel: number;
    answers: Record<string, { likert: string; freetext: string }>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("survey_session_id");
    if (stored) {
      setSessionId(stored);
    } else {
      const newId = uuidv4();
      sessionStorage.setItem("survey_session_id", newId);
      setSessionId(newId);
    }

    const storedState = sessionStorage.getItem("survey_state");
    if (storedState === "page2") {
      const storedPage1 = sessionStorage.getItem("survey_page1_data");
      if (storedPage1) {
        setPage1Data(JSON.parse(storedPage1));
        setState("page2");
      }
    }
  }, []);

  const handlePage1Submit = async (data: {
    interestLevel: number;
    answers: Record<string, { likert: string; freetext: string }>;
  }) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          page: 1,
          data: {
            ...data,
            userAgent: navigator.userAgent,
          },
        }),
      });

      if (!response.ok) throw new Error("Failed to submit page 1");

      setPage1Data(data);
      sessionStorage.setItem("survey_page1_data", JSON.stringify(data));
      sessionStorage.setItem("survey_state", "page2");
      setState("page2");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Submit error:", err);
      setError("回答の送信に失敗しました。もう一度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePage2Submit = async (data: {
    followupQuestions: { id: string; text: string }[];
    followupAnswers: Record<string, string>;
    additionalComments: string;
  }) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          page: 2,
          data,
        }),
      });

      if (!response.ok) throw new Error("Failed to submit page 2");

      sessionStorage.removeItem("survey_state");
      sessionStorage.removeItem("survey_page1_data");
      setState("complete");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Submit error:", err);
      setError("回答の送信に失敗しました。もう一度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <header className="border-b border-border bg-white sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <h1 className="text-base font-bold text-primary leading-tight">
            {SURVEY_INTRO.title}
          </h1>
          {(state === "page1" || state === "page2") && (
            <span className="text-xs text-text-muted bg-surface px-2.5 py-1 rounded-full">
              {state === "page1" ? "1" : "2"} / 2 ページ
            </span>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
        {/* Error banner */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start justify-between gap-3">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600 shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Intro */}
        {state === "intro" && (
          <div className="space-y-8 py-4">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-text">
                {SURVEY_INTRO.subtitle}
              </h2>
              <p className="text-sm text-text-muted">
                {SURVEY_INTRO.estimatedTime}
              </p>
            </div>

            <FraudEducationCarousel />

            <div className="bg-white border border-border rounded-2xl p-6 space-y-4">
              <div className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                {SURVEY_INTRO.description}
              </div>
              <hr className="border-border" />
              <div className="space-y-2">
                <div className="flex items-start gap-2.5">
                  <svg className="w-4 h-4 text-text-muted shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <p className="text-xs text-text-muted leading-relaxed">
                    {SURVEY_INTRO.privacyNote}
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <svg className="w-4 h-4 text-text-muted shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <p className="text-xs text-text-muted leading-relaxed">
                    {SURVEY_INTRO.aiNote}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={() => { setState("page1"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="px-10 py-3.5 bg-primary text-white rounded-xl text-base font-semibold hover:bg-primary-light transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
              >
                調査を始める
              </button>
            </div>
          </div>
        )}

        {/* Page 1 */}
        {state === "page1" && (
          <SurveyPage1 onSubmit={handlePage1Submit} isSubmitting={isSubmitting} />
        )}

        {/* Page 2 */}
        {state === "page2" && page1Data && (
          <SurveyPage2
            page1Answers={page1Data.answers}
            onSubmit={handlePage2Submit}
            isSubmitting={isSubmitting}
          />
        )}

        {/* Complete */}
        {state === "complete" && (
          <div className="text-center py-20 space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 border-2 border-green-200">
              <svg
                className="w-8 h-8 text-success"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-text">
                ご回答ありがとうございました
              </h2>
              <p className="text-text-secondary max-w-md mx-auto leading-relaxed">
                いただいたご意見は、今後の熟議型世論調査での論点整理に活用させていただきます。
                みなさまの声が、より良い政策づくりの一助となります。
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-white mt-12 py-5">
        <div className="max-w-2xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-text-muted">
          <p>市民意識調査プロジェクト</p>
          <Link href="/transparency" className="hover:text-accent underline underline-offset-2">
            AIの使用について
          </Link>
        </div>
      </footer>
    </div>
  );
}
