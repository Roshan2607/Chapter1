"use client";

import React from "react";

interface Props {
  text: string;
  className?: string;
}

function parseInline(text: string): React.ReactNode[] {
  // Split on inline bold (**bold**) and inline code (`code`)
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-extrabold text-black">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="font-mono bg-neutral-100 text-neo-accent px-1.5 py-0.5 rounded text-xs border border-black/10 font-bold"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export default function MarkdownText({ text, className = "" }: Props) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let currentList: { type: "ul" | "ol"; items: string[] } | null = null;
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let codeBlockLang = "";

  const flushList = (key: number) => {
    if (!currentList) return;
    if (currentList.type === "ul") {
      elements.push(
        <ul key={`list-${key}`} className="list-disc pl-6 my-3 space-y-2">
          {currentList.items.map((item, idx) => (
            <li
              key={idx}
              className="font-serif text-sm font-medium leading-relaxed text-black"
            >
              {parseInline(item)}
            </li>
          ))}
        </ul>
      );
    } else {
      elements.push(
        <ol key={`list-${key}`} className="list-decimal pl-6 my-3 space-y-2">
          {currentList.items.map((item, idx) => (
            <li
              key={idx}
              className="font-serif text-sm font-medium leading-relaxed text-black"
            >
              {parseInline(item)}
            </li>
          ))}
        </ol>
      );
    }
    currentList = null;
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Handle block-level code blocks
    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        const codeText = codeBlockLines.join("\n");
        elements.push(
          <div
            key={`code-${index}`}
            className="border-4 border-black shadow-neo-sm overflow-hidden bg-neutral-900 my-4 text-left"
          >
            <div className="bg-black text-white px-4 py-2 flex items-center justify-between border-b-4 border-black">
              <span className="text-[11px] font-mono text-neutral-400">
                {codeBlockLang || "code"}
              </span>
            </div>
            <pre className="p-4 text-xs font-mono overflow-x-auto text-neutral-200 leading-relaxed bg-neutral-900">
              <code>{codeText}</code>
            </pre>
          </div>
        );
        codeBlockLines = [];
        inCodeBlock = false;
        codeBlockLang = "";
      } else {
        if (currentList) {
          flushList(index);
        }
        inCodeBlock = true;
        codeBlockLang = trimmed.slice(3).trim();
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      return;
    }

    // Match bullet lists (*, -, •)
    const ulMatch = line.match(/^\s*[-*•]\s+(.*)/);
    // Match numbered lists (1., 2.)
    const olMatch = line.match(/^\s*\d+\.\s+(.*)/);

    if (ulMatch) {
      if (currentList && currentList.type !== "ul") {
        flushList(index);
      }
      if (!currentList) {
        currentList = { type: "ul", items: [] };
      }
      currentList.items.push(ulMatch[1]);
    } else if (olMatch) {
      if (currentList && currentList.type !== "ol") {
        flushList(index);
      }
      if (!currentList) {
        currentList = { type: "ol", items: [] };
      }
      currentList.items.push(olMatch[1]);
    } else {
      if (currentList) {
        flushList(index);
      }
      if (trimmed) {
        elements.push(
          <p
            key={`p-${index}`}
            className={`font-serif text-sm font-medium leading-relaxed text-black mb-3 ${className}`}
          >
            {parseInline(line)}
          </p>
        );
      } else {
        // Render spacing for double newlines
        elements.push(<div key={`space-${index}`} className="h-2" />);
      }
    }
  });

  if (currentList) {
    flushList(lines.length);
  }

  if (inCodeBlock && codeBlockLines.length > 0) {
    const codeText = codeBlockLines.join("\n");
    elements.push(
      <div
        key="code-unclosed"
        className="border-4 border-black shadow-neo-sm overflow-hidden bg-neutral-900 my-4 text-left"
      >
        <div className="bg-black text-white px-4 py-2 flex items-center justify-between border-b-4 border-black">
          <span className="text-[11px] font-mono text-neutral-400">
            {codeBlockLang || "code"}
          </span>
        </div>
        <pre className="p-4 text-xs font-mono overflow-x-auto text-neutral-200 leading-relaxed bg-neutral-900">
          <code>{codeText}</code>
        </pre>
      </div>
    );
  }

  return <div className="space-y-1">{elements}</div>;
}
