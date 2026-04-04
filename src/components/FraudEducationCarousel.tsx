"use client";

import { useState, useCallback, useEffect, useRef } from "react";

interface Slide {
  title: string;
  body: string;
  icon: React.ReactNode;
}

const SLIDES: Slide[] = [
  {
    title: "詐欺広告とは？",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
    body: "SNSやウェブサイトに表示される偽の広告のことです。有名人の写真や名前を無断で使い、「必ず儲かる投資法」などと謳って、お金を騙し取る手口が急増しています。2025年の被害額は約1,274億円（前年比46%増）で過去最悪を記録しました。",
  },
  {
    title: "よくある手口",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    body: "著名人になりすました投資勧誘広告、AIで生成されたディープフェイク動画、「期間限定」「今だけ無料」と焦らせる偽キャンペーンなど、巧妙な手口が使われています。LINEグループに誘導し、サクラが「儲かった」と煽る手口もあります。",
  },
  {
    title: "なぜ対策が必要？",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    body: "現在の日本では対応が複数の省庁にまたがり、プラットフォーム事業者への規制も十分ではありません。この調査では、どのような対策をとるべきか、あなたの意見を聞かせてください。市民の声を集め、より良い政策づくりに活かします。",
  },
];

const AUTOPLAY_INTERVAL = 5000;
const SWIPE_THRESHOLD = 50;

export default function FraudEducationCarousel() {
  const [current, setCurrent] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const isPausedRef = useRef(false);

  // Check prefers-reduced-motion
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mql.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Autoplay
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (prefersReducedMotion) return;
    timerRef.current = setInterval(() => {
      if (!isPausedRef.current) {
        setCurrent((prev) => (prev + 1) % SLIDES.length);
      }
    }, AUTOPLAY_INTERVAL);
  }, [prefersReducedMotion]);

  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [resetTimer]);

  const goTo = useCallback((index: number) => {
    setCurrent(index);
    resetTimer();
  }, [resetTimer]);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % SLIDES.length);
    resetTimer();
  }, [resetTimer]);

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
    resetTimer();
  }, [resetTimer]);

  // Touch swipe handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    isPausedRef.current = true;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    isPausedRef.current = false;
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    // Only trigger if horizontal swipe is dominant
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_THRESHOLD) {
      if (dx < 0) next();
      else prev();
    }
  }, [next, prev]);

  const handleTouchCancel = useCallback(() => {
    isPausedRef.current = false;
    touchStartRef.current = null;
  }, []);

  const slide = SLIDES[current];

  return (
    <div
      className="bg-white border border-border rounded-2xl overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      {/* Slide content */}
      <div className="relative">
        <div className="p-6 space-y-4 min-h-[240px]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
              {slide.icon}
            </div>
            <span className="text-[15px] font-semibold text-text leading-relaxed">{slide.title}</span>
          </div>
          <span className="text-sm font-normal text-text-secondary leading-relaxed block">
            {slide.body}
          </span>
        </div>

        {/* Navigation arrows */}
        <button
          onClick={prev}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 border border-border shadow-sm flex items-center justify-center text-text-muted hover:text-text hover:bg-white transition-colors"
          aria-label="前へ"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={next}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 border border-border shadow-sm flex items-center justify-center text-text-muted hover:text-text hover:bg-white transition-colors"
          aria-label="次へ"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Dots + counter */}
      <div className="flex items-center justify-center gap-2 pb-4">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`w-2 h-2 rounded-full transition-all ${
              i === current
                ? "bg-accent w-5"
                : "bg-border-dark hover:bg-text-muted"
            }`}
            aria-label={`スライド ${i + 1}`}
          />
        ))}
        <span className="text-sm font-normal text-text-muted leading-relaxed ml-2">
          {current + 1} / {SLIDES.length}
        </span>
      </div>
    </div>
  );
}
