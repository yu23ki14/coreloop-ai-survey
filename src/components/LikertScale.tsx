"use client";

import { LIKERT_SCALE_OPTIONS, DONT_KNOW_OPTION, type LikertValue } from "@/lib/survey-data";
import { Typography } from "./Typography";

interface LikertScaleProps {
  value: LikertValue | null;
  onChange: (value: LikertValue) => void;
  disabled?: boolean;
}

const LIKERT_SELECTED_STYLES: Record<string, string> = {
  strongly_agree: "bg-blue-600 text-white border-blue-600 shadow-sm",
  agree: "bg-blue-500 text-white border-blue-500 shadow-sm",
  neutral: "bg-gray-500 text-white border-gray-500 shadow-sm",
  disagree: "bg-orange-500 text-white border-orange-500 shadow-sm",
  strongly_disagree: "bg-red-500 text-white border-red-500 shadow-sm",
};

const LIKERT_EMOJIS: Record<string, string> = {
  strongly_agree: "👍",
  agree: "🙂",
  neutral: "😐",
  disagree: "🙁",
  strongly_disagree: "👎",
};

export default function LikertScale({
  value,
  onChange,
  disabled,
}: LikertScaleProps) {
  const isDontKnow = value === "dont_know";

  return (
    <div className="space-y-3">
      {/* 5-point Likert scale */}
      <div className="flex gap-1.5">
        {LIKERT_SCALE_OPTIONS.map((option) => {
          const isSelected = value === option.value && !isDontKnow;

          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.value)}
              aria-label={option.label}
              aria-pressed={isSelected}
              className={`flex-1 min-w-0 flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-lg border text-center font-medium transition-all
                ${
                  isSelected
                    ? LIKERT_SELECTED_STYLES[option.value]
                    : isDontKnow
                      ? "bg-gray-50 text-text-muted border-border/50 opacity-60"
                      : "bg-white text-text-secondary border-border hover:border-primary/40 hover:text-primary"
                }
                ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              `}
            >
              <span className="text-lg leading-none" aria-hidden="true">
                {LIKERT_EMOJIS[option.value]}
              </span>
              <Typography size="small" className="leading-tight sm:text-sm">
                {option.label}
              </Typography>
            </button>
          );
        })}
      </div>

      {/* Separated "don't know" checkbox */}
      <label
        className={`flex items-center gap-2 cursor-pointer select-none
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <input
          type="checkbox"
          checked={isDontKnow}
          disabled={disabled}
          onChange={() => {
            if (isDontKnow) {
              onChange(null as unknown as LikertValue);
            } else {
              onChange(DONT_KNOW_OPTION.value);
            }
          }}
          className="w-4 h-4 rounded border-gray-300 text-gray-500 focus:ring-gray-400 accent-gray-500"
        />
        <Typography size="regular" muted>{DONT_KNOW_OPTION.label}</Typography>
      </label>
    </div>
  );
}
