"use client";

import { useState } from "react";
import { QuizQuestion } from "@/lib/types";
import ArrowIcon from "./ArrowIcon";

interface Props {
  question: QuizQuestion;
  questionNumber: number;
  totalQuestions: number;
  difficulty: number;
  onAnswer: (answer: string) => Promise<{
    correct: boolean;
    explanation: string;
    correct_answer: string;
    correct_text: string;
  }>;
  onNext: () => void;
}

const DIFF_META: Record<
  number,
  { label: string; bg: string; text: string; shadow: string }
> = {
  1: {
    label: "BASIC",
    bg: "bg-neo-green",
    text: "text-black",
    shadow: "shadow-neo-sm",
  },
  2: {
    label: "APPLICATION",
    bg: "bg-neo-secondary",
    text: "text-black",
    shadow: "shadow-neo-sm",
  },
  3: {
    label: "ANALYSIS",
    bg: "bg-neo-accent",
    text: "text-white",
    shadow: "shadow-neo-sm",
  },
};

export default function QuizCard({
  question,
  questionNumber,
  totalQuestions,
  difficulty,
  onAnswer,
  onNext,
}: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<{
    correct: boolean;
    explanation: string;
    correct_answer: string;
    correct_text: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const diff = DIFF_META[difficulty] ?? DIFF_META[1];
  const optionEntries = Object.entries(question.options) as [string, string][];

  async function handleSelect(option: string) {
    if (selected || loading) return;
    setSelected(option);
    setLoading(true);
    try {
      const res = await onAnswer(option);
      setResult(res);
    } finally {
      setLoading(false);
    }
  }

  function optionClasses(key: string): string {
    const base =
      "w-full flex items-start gap-4 p-4 border-4 border-black text-left transition-all duration-100 font-serif font-medium text-sm text-black";
    if (!result) {
      if (selected === key)
        return `${base} bg-neo-muted translate-x-1 translate-y-1`;
      return `${base} bg-white cursor-pointer hover:bg-neo-muted hover:-translate-y-0.5 hover:shadow-neo-sm`;
    }
    if (key === result.correct_answer) return `${base} bg-neo-green`;
    if (key === selected && !result.correct) return `${base} bg-neo-accent text-white`;
    return `${base} bg-white opacity-40`;
  }

  return (
    <div className="space-y-5">
      {/* ── Header row ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        {/* Difficulty badge */}
        <div
          className={`${diff.bg} ${diff.text} ${diff.shadow} border-4 border-black px-3 py-1 text-[10px] font-black uppercase tracking-widest`}
        >
          {diff.label}
        </div>

        {/* Progress pips */}
        <div className="flex gap-1.5" aria-label={`Question ${questionNumber} of ${totalQuestions}`}>
          {Array.from({ length: totalQuestions }).map((_, i) => (
            <div
              key={i}
              className={`h-2 border-2 border-black transition-all duration-200 ${
                i < questionNumber - 1
                  ? "w-6 bg-neo-green"
                  : i === questionNumber - 1
                  ? "w-6 bg-neo-accent"
                  : "w-3 bg-white"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Q label */}
      <p className="text-[10px] font-black uppercase tracking-widest text-black/40">
        Question {questionNumber} / {totalQuestions}
      </p>

      {/* Question text */}
      <p className="font-serif font-medium text-base leading-snug text-black">{question.question}</p>

      {/* ── Options ─────────────────────────────────────────────── */}
      <div className="space-y-3">
        {optionEntries.map(([key, value]) => (
          <button
            key={key}
            id={`option-${key}`}
            onClick={() => handleSelect(key)}
            disabled={!!selected}
            className={optionClasses(key)}
          >
            {/* Key indicator */}
            <div
              className={`w-8 h-8 border-4 border-black font-black text-sm flex items-center justify-center flex-shrink-0 ${
                result && key === result.correct_answer
                  ? "bg-neo-green text-black"
                  : result && key === selected && !result.correct
                  ? "bg-black text-white"
                  : "bg-black text-neo-muted"
              }`}
            >
              {key}
            </div>
            <span className="leading-relaxed pt-0.5 flex-1">{value}</span>

            {/* Verdict icon */}
            {result && key === result.correct_answer && (
              <span className="font-black text-base ml-auto flex-shrink-0">✓</span>
            )}
            {result && key === selected && !result.correct && key !== result.correct_answer && (
              <span className="font-black text-base ml-auto flex-shrink-0 text-white">✗</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Result feedback ──────────────────────────────────────── */}
      {result && (
        <div
          className={`border-4 border-black shadow-neo-sm p-5 ${
            result.correct ? "bg-neo-green" : "bg-neo-accent"
          }`}
        >
          <p
            className={`font-black text-sm uppercase tracking-wide mb-1 ${
              result.correct ? "text-black" : "text-white"
            }`}
          >
            {result.correct
              ? "✓ Correct!"
              : `✗ Answer: ${result.correct_answer}. ${result.correct_text}`}
          </p>
          {result.explanation && (
            <p
              className={`font-serif text-sm font-medium leading-relaxed ${
                result.correct ? "text-black" : "text-white"
              }`}
            >
              {result.explanation}
            </p>
          )}
        </div>
      )}

      {/* ── Next button ─────────────────────────────────────────── */}
      {result && (
        <div className="flex justify-end">
          <button
            id="quiz-next"
            onClick={onNext}
            className="neo-btn bg-black text-white shadow-neo-sm px-6 py-3 text-sm flex items-center gap-2 group"
          >
            <span>
              {questionNumber < totalQuestions
                ? "Next Question"
                : "See Results"}
            </span>
            <ArrowIcon className="group-hover:translate-x-1" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}