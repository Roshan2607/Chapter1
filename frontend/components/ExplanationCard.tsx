"use client";

import { useState } from "react";
import { ExplanationSections } from "@/lib/types";
import MarkdownText from "./MarkdownText";

interface Props {
  text: string;
  streaming?: boolean;
}

function parseExplanation(text: string): ExplanationSections {
  const sections: ExplanationSections = {
    explanation: "",
    keyPoints: [],
    analogy: "",
    example: "",
    check: "",
  };

  const explMatch = text.match(
    /\*\*Explanation\*\*:?\s*([\s\S]*?)(?=\*\*Key Points\*\*|\*\*Analogy\*\*|$)/i
  );
  if (explMatch) sections.explanation = explMatch[1].trim();

  const kpMatch = text.match(
    /\*\*Key Points\*\*:?\s*([\s\S]*?)(?=\*\*Analogy\*\*|\*\*Example\*\*|$)/i
  );
  if (kpMatch) {
    sections.keyPoints = kpMatch[1]
      .trim()
      .split("\n")
      .map((l) => l.replace(/^[-•*]\s*/, "").trim())
      .filter(Boolean);
  }

  const analogyMatch = text.match(
    /\*\*Analogy\*\*:?\s*([\s\S]*?)(?=\*\*Example\*\*|\*\*Check\*\*|$)/i
  );
  if (analogyMatch) sections.analogy = analogyMatch[1].trim();

  const codeMatch = text.match(
    /\*\*Example\*\*:?\s*```(?:python)?\s*([\s\S]*?)```/i
  );
  if (codeMatch) {
    sections.example = codeMatch[1].trim();
    sections.isCode = true;
  } else {
    const exampleMatch = text.match(
      /\*\*Example\*\*:?\s*([\s\S]*?)(?=\*\*Check\*\*|$)/i
    );
    if (exampleMatch) {
      sections.example = exampleMatch[1].trim();
      sections.isCode = false;
    }
  }

  const checkMatch = text.match(/\*\*Check\*\*:?\s*([\s\S]*?)$/i);
  if (checkMatch) sections.check = checkMatch[1].trim();

  return sections;
}

export default function ExplanationCard({ text, streaming }: Props) {
  const [codeExpanded, setCodeExpanded] = useState(false);
  const sections = parseExplanation(text);

  const hasSections =
    sections.explanation ||
    sections.keyPoints.length > 0 ||
    sections.analogy ||
    sections.example ||
    sections.check;

  /* Raw fallback when still streaming and no structure parsed yet */
  if (!hasSections) {
    return (
      <p
        className={`text-sm font-bold leading-relaxed whitespace-pre-wrap ${
          streaming ? "streaming-cursor" : ""
        }`}
      >
        {text}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── 1. The Concept & Key Points ─────────────────────────── */}
      <div className="space-y-3">
        <h4 className="text-base font-heading font-bold tracking-wider text-neo-accent">
          01. Core Concept
        </h4>
        {sections.explanation && (
          <MarkdownText text={sections.explanation} />
        )}

        {sections.keyPoints.length > 0 && (
          <div className="border-4 border-black bg-neo-muted shadow-neo-sm p-5">
            <p className="text-[10px] font-black uppercase tracking-widest mb-4 border-b-2 border-black pb-2">
              Key Takeaways
            </p>
            <ul className="space-y-3">
              {sections.keyPoints.map((point, i) => (
                <li key={i} className="font-serif flex gap-3 text-sm font-medium text-black">
                  <span className="w-5 h-5 border-4 border-black bg-black text-neo-muted font-black text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ── 2. Real-World Analogy ───────────────────────────────── */}
      {sections.analogy && (
        <div className="space-y-3">
          <h4 className="text-base font-heading font-bold tracking-wider text-neo-accent">
            02. Real-World Analogy
          </h4>
          <div className="border-4 border-black bg-neo-secondary shadow-neo-sm p-5">
            <MarkdownText text={sections.analogy} className="italic" />
          </div>
        </div>
      )}

      {/* ── 3. Code / Practical Example ─────────────────────────── */}
      {sections.example && (
        <div className="space-y-3">
          <h4 className="text-base font-heading font-bold tracking-wider text-neo-accent">
            {sections.isCode ? "03. Code Example" : "03. Practical Example"}
          </h4>
          {sections.isCode ? (
            <div className="border-4 border-black shadow-neo-sm overflow-hidden bg-neutral-900">
              <div className="bg-black text-white px-4 py-2.5 flex items-center justify-between border-b-4 border-black">
                <div className="flex gap-1.5 items-center">
                  <span className="w-2 h-2 rounded-full bg-[#ff5f56]" />
                  <span className="w-2 h-2 rounded-full bg-[#ffbd2e]" />
                  <span className="w-2 h-2 rounded-full bg-[#27c93f]" />
                  <span className="text-[11px] font-mono ml-2 text-neutral-400">example.py</span>
                </div>
                <button
                  onClick={() => setCodeExpanded(!codeExpanded)}
                  className="text-[11px] font-black uppercase text-neo-accent hover:text-white transition-colors"
                >
                  {codeExpanded ? "▲ Hide" : "▼ Show"}
                </button>
              </div>
              {codeExpanded && (
                <div>
                  <pre className="p-4 text-xs font-mono overflow-x-auto text-neutral-200 leading-relaxed bg-neutral-900">
                    <code>{sections.example}</code>
                  </pre>
                  <div className="px-4 pb-4 bg-neutral-900 border-t-2 border-white/5 pt-3">
                    <a
                      href={`https://pythontutor.com/visualize.html#code=${encodeURIComponent(
                        sections.example
                      )}&mode=edit&origin=opt-frontend.js`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="neo-btn bg-neo-accent text-white shadow-neo-sm px-4 py-2 text-xs inline-flex font-black"
                    >
                      Visualise execution step-by-step →
                    </a>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="border-4 border-black bg-white shadow-neo-sm p-5">
              <MarkdownText text={sections.example} />
            </div>
          )}
        </div>
      )}

      {streaming && <div className="streaming-cursor h-4" />}
    </div>
  );
}