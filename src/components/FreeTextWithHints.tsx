"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { LikertValue, FreetextGuide } from "@/lib/survey-data";

interface FreeTextWithHintsProps {
  questionId: string;
  likertAnswer: LikertValue | null;
  value: string;
  onChange: (value: string) => void;
  previousAnswers: Record<string, { likert: string; freetext: string }>;
  starterSentences: string[];
  guide: FreetextGuide | null;
}

export default function FreeTextWithHints({
  questionId,
  likertAnswer,
  value,
  onChange,
  previousAnswers,
  starterSentences,
  guide,
}: FreeTextWithHintsProps) {
  const [hint, setHint] = useState<string>("");
  const [isLoadingHint, setIsLoadingHint] = useState(false);
  const [showStarters, setShowStarters] = useState(true);
  const [showEditEncouragement, setShowEditEncouragement] = useState(false);
  const [hintVisible, setHintVisible] = useState(true);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastHintTextRef = useRef<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Hide starters once user has typed something
  useEffect(() => {
    if (value.length > 0) {
      setShowStarters(false);
    }
  }, [value]);

  // Fetch hint function
  const fetchHint = useCallback(
    async (text: string) => {
      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Don't fetch if text hasn't meaningfully changed
      if (text === lastHintTextRef.current) return;
      lastHintTextRef.current = text;

      const controller = new AbortController();
      abortControllerRef.current = controller;
      setIsLoadingHint(true);

      try {
        const response = await fetch("/api/hints", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionId,
            likertAnswer,
            currentText: text,
            previousAnswers,
          }),
          signal: controller.signal,
        });

        if (!response.ok) throw new Error("Hint fetch failed");
        const data = await response.json();

        if (!controller.signal.aborted) {
          // Fade transition
          setHintVisible(false);
          setTimeout(() => {
            setHint(data.hint);
            setHintVisible(true);
          }, 300);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        console.error("Hint fetch error:", err);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingHint(false);
        }
      }
    },
    [questionId, likertAnswer, previousAnswers]
  );

  // Debounced hint trigger on text change
  const handleTextChange = (newText: string) => {
    onChange(newText);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const sentenceEnded =
      newText.length > 0 &&
      (newText.endsWith("。") ||
        newText.endsWith(".\n") ||
        newText.endsWith("\n"));

    if (sentenceEnded && newText.length > 10) {
      debounceTimerRef.current = setTimeout(() => fetchHint(newText), 300);
    } else if (newText.length > 5) {
      debounceTimerRef.current = setTimeout(() => fetchHint(newText), 2000);
    }
  };

  // Manual refresh button
  const handleManualRefresh = () => {
    fetchHint(value);
  };

  // Starter sentence click
  const handleStarterClick = (sentence: string) => {
    onChange(sentence);
    setShowStarters(false);
    setShowEditEncouragement(true);
    setTimeout(() => setShowEditEncouragement(false), 5000);
    textareaRef.current?.focus();
    setTimeout(() => {
      containerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 100);
    setTimeout(() => fetchHint(sentence), 500);
  };

  // Fetch initial hint when likert answer changes
  useEffect(() => {
    if (likertAnswer && !value) {
      const timer = setTimeout(() => fetchHint(""), 500);
      return () => clearTimeout(timer);
    }
  }, [likertAnswer, fetchHint, value]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  return (
    <div ref={containerRef} className="space-y-3">
      {/* Header */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-text-secondary">
            {guide?.label || "そう思う理由を教えてください"}
            <span className="text-text-muted font-normal ml-1">（任意）</span>
          </p>
          {value.length > 0 && (
            <span className="text-xs text-text-muted tabular-nums">
              {value.length}文字
            </span>
          )}
        </div>
      </div>

      {/* Starter sentences */}
      {showStarters && likertAnswer && (
        <div className="space-y-1.5">
          <p className="text-xs text-text-muted">
            クリックして回答を始められます：
          </p>
          <div className="flex flex-col gap-1.5">
            {starterSentences.map((sentence, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleStarterClick(sentence)}
                className="starter-chip text-left text-sm px-3.5 py-2.5 rounded-lg border border-border bg-surface hover:bg-surface-dark text-text-secondary leading-relaxed"
              >
                {sentence}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Encouragement micro-copy */}
      {showEditEncouragement && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100">
          <svg className="w-3.5 h-3.5 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-blue-600">
            このまま送信もできますが、自分の言葉で書き直したり書き足すとより良い回答になります
          </p>
        </div>
      )}

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => handleTextChange(e.target.value)}
        placeholder="あなたの考えを自由にお書きください..."
        rows={4}
        className="w-full px-4 py-3 rounded-lg border border-border bg-white text-text resize-y text-sm leading-relaxed placeholder:text-text-muted"
      />

      {/* AI Hint area */}
      {(hint || isLoadingHint) && (
        <div className="relative rounded-lg p-4 bg-amber-50/60 border border-amber-200/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-amber-700/80 flex items-center gap-1.5">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              考えるヒント
              {isLoadingHint && (
                <span className="inline-block w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              )}
            </span>
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isLoadingHint}
              className="text-xs text-amber-600 hover:text-amber-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              別のヒント
            </button>
          </div>
          <p
            className={`text-sm text-amber-900/80 leading-relaxed transition-all duration-300 ${
              hintVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
            }`}
          >
            {hint}
          </p>
        </div>
      )}
    </div>
  );
}
