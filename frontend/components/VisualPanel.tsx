"use client";

import { useState, useEffect } from "react";
import { Visualization } from "@/lib/types";
import ArrowIcon from "./ArrowIcon";

interface Props {
  visualization: Visualization | null;
  topic: string;
  subject: string;
  loading?: boolean;
}

const SUBJECT_LABELS: Record<string, string> = {
  dsa:      "DATA STRUCTURES",
  dvlsi:    "DIGITAL VLSI",
  cs:       "CONTROL SYSTEMS",
  networks: "COMPUTER NETWORKS",
};

/* p5.js sandboxed template — cream background to match neo-brutalism */
const P5_HTML = (code: string) => `<!DOCTYPE html>
<html>
<head>
  <script>
    // Prevent p5.js sensor checks from triggering Permissions Policy violations in sandboxed iframe
    try {
      Object.defineProperty(window, 'DeviceOrientationEvent', { value: undefined });
    } catch(e) {
      try { delete window.DeviceOrientationEvent; } catch(err) {}
    }
    try {
      Object.defineProperty(window, 'DeviceMotionEvent', { value: undefined });
    } catch(e) {
      try { delete window.DeviceMotionEvent; } catch(err) {}
    }

    window.onerror = function(message, source, lineno, colno, error) {
      const msg = String(message).toLowerCase();
      if (
        msg.includes("accelerometer") ||
        msg.includes("deviceorientation") ||
        msg.includes("devicemotion") ||
        msg.includes("permission")
      ) {
        return false; // Let browser ignore these warnings/non-fatal errors
      }

      document.body.innerHTML =
        '<div style="padding:24px;font-family:sans-serif;font-weight:700;color:#000;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;border:4px solid #FF6B6B;background:#FFFDF5">'
        + '<span style="color:#FF6B6B;font-size:12px;text-transform:uppercase;letter-spacing:.12em;font-weight:900">Visual Error</span>'
        + '<pre style="font-size:11px;font-family:monospace;color:#555;white-space:pre-wrap;word-break:break-all">' + message + '<\/pre>'
        + '<\/div>';
      return true;
    };
  <\/script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js"><\/script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #FFFDF5; overflow: hidden; }
    canvas { display: block; }
  </style>
</head>
<body>
<script>
${code}
<\/script>
</body>
</html>`;

/* Mermaid sandboxed template — themed with neobrutalist style variables */
const MERMAID_HTML = (code: string) => `<!DOCTYPE html>
<html>
<head>
  <script>
    window.onerror = function(message, source, lineno, colno, error) {
      document.body.innerHTML =
        '<div style="padding:24px;font-family:sans-serif;font-weight:700;color:#000;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;border:4px solid #FF6B6B;background:#FFFDF5">'
        + '<span style="color:#FF6B6B;font-size:12px;text-transform:uppercase;letter-spacing:.12em;font-weight:900">Mermaid Error</span>'
        + '<pre style="font-size:11px;font-family:monospace;color:#555;white-space:pre-wrap;word-break:break-all">' + message + '<\/pre>'
        + '<\/div>';
      return true;
    };
  <\/script>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js"><\/script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      background: #FFFDF5; 
      overflow: auto; 
      padding: 24px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      font-family: sans-serif;
    }
    .mermaid {
      background: #FFFDF5;
      padding: 24px;
      border: 4px solid #000000;
      box-shadow: 4px 4px 0px #000000;
      width: 100%;
      max-width: 900px;
    }
    .mermaid svg {
      width: 100% !important;
      height: auto !important;
      max-width: 100%;
    }
  </style>
</head>
<body>
  <pre class="mermaid">
${code}
  </pre>
  <script>
    try {
      mermaid.initialize({
        startOnLoad: true,
        theme: 'base',
        themeVariables: {
          background: '#FFFDF5',
          primaryColor: '#7678ED',
          primaryTextColor: '#000000',
          primaryBorderColor: '#000000',
          lineColor: '#000000',
          secondaryColor: '#FF6B6B',
          tertiaryColor: '#F7B801'
        }
      });
    } catch(e) {
      window.onerror(e.message);
    }
  <\/script>
</body>
</html>`;


/* ── Loading state ────────────────────────────────────────────── */
function LoadingState({ topic }: { topic: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-neo-bg bg-dots p-8">
      <div className="border-4 border-black bg-neo-secondary shadow-neo-lg p-8 -rotate-1">
        <p className="font-black text-base uppercase tracking-tight mb-4">
          GENERATING VISUAL...
        </p>
        {topic && (
          <p className="font-bold text-sm text-black/50 mb-4">for &ldquo;{topic}&rdquo;</p>
        )}
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-3 h-3 border-4 border-black bg-black animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Empty state ──────────────────────────────────────────────── */
function EmptyState({ subject }: { subject: string }) {
  const label = SUBJECT_LABELS[subject] ?? "LEARNING";
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-neo-bg bg-dots p-8">
      <div className="border-4 border-black bg-white shadow-neo-lg p-10 rotate-1 text-center">
        <div
          className="font-black text-7xl mb-4 select-none"
          style={{ WebkitTextStroke: "3px #000", color: "transparent" }}
        >
          V
        </div>
        <p className="font-black text-sm uppercase tracking-widest mb-2">{label}</p>
        <p className="text-xs font-bold text-black/40 max-w-[180px] mx-auto leading-snug">
          Ask a topic to see an interactive visualisation here
        </p>
      </div>
    </div>
  );
}

export default function VisualPanel({ visualization, topic, subject, loading }: Props) {
  const [iframeError, setIframeError] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => { setIframeError(false); }, [visualization]);

  /* ── Render the visual content ─────────────────────────────── */
  function renderContent() {
    if (loading) return <LoadingState topic={topic} />;
    if (!visualization) return <EmptyState subject={subject} />;

    /* External tool iframe (VisuAlgo, CircuitVerse) */
    if (visualization.type === "iframe" && !iframeError) {
      return (
        <div className="w-full h-full overflow-hidden relative">
          <iframe
            src={visualization.url}
            className="w-full border-0 absolute left-0"
            style={{
              top: 0,
              /* clip top nav of external sites (~70px) */
              height: "calc(100% + 70px)",
              marginTop: "-70px",
            }}
            sandbox="allow-scripts allow-same-origin allow-forms"
            onError={() => setIframeError(true)}
            title={`Visual: ${topic}`}
          />
        </div>
      );
    }

    /* p5.js generated sketch */
    if (visualization.type === "p5js" && visualization.code) {
      return (
        <iframe
          srcDoc={P5_HTML(visualization.code)}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin"
          title={`Visual: ${topic}`}
        />
      );
    }

    /* Mermaid diagram */
    if (visualization.type === "mermaid" && visualization.code) {
      let code = visualization.code;
      // Clean up common keyword styling typos (e.g. style graph fill:...)
      code = code.replace(/style\s+(?:graph|flowchart|sequenceDiagram|stateDiagram-v2)\s+[^;\n]+(?:;)?/gi, '');
      // Clean up common labeled arrow typos (e.g. -->|Label|>)
      code = code.replace(/-->\s*\|([^|]+)\|\s*>/g, '-->|$1|');

      return (
        <iframe
          srcDoc={MERMAID_HTML(code)}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin"
          title={`Visual: ${topic}`}
        />
      );
    }

    /* External URL (open in new tab) */
    if (visualization.type === "url") {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-neo-bg bg-dots gap-5 p-6">
          <p className="font-black text-sm uppercase tracking-wide">
            Opens in external tool
          </p>
          <a
            href={visualization.url}
            target="_blank"
            rel="noopener noreferrer"
            className="neo-btn bg-neo-secondary shadow-neo px-6 py-3 text-sm flex items-center gap-2 group"
          >
            <span>Open Tool</span>
            <ArrowIcon className="group-hover:translate-x-1" size={16} />
          </a>
        </div>
      );
    }

    return <EmptyState subject={subject} />;
  }

  return (
    <div
      className={`flex flex-col h-full bg-neo-bg ${
        fullscreen ? "fixed inset-0 z-50" : ""
      }`}
    >
      {/* Visual area */}
      <div className="flex-1 overflow-hidden relative">{renderContent()}</div>

      {/* Bottom label bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-t-4 border-black bg-white">
        <div className="flex items-center gap-2 min-w-0">
          {topic ? (
            <>
              <div className="w-2.5 h-2.5 border-[3px] border-black bg-neo-accent flex-shrink-0" />
              <span className="text-[11px] font-black uppercase tracking-tight truncate">
                {topic}
              </span>
            </>
          ) : (
            <span className="text-[11px] font-black uppercase tracking-widest text-black/30">
              NO TOPIC YET
            </span>
          )}
          {visualization?.label && (
            <span className="border-2 border-black bg-neo-secondary px-2 py-0.5 text-[9px] font-black uppercase tracking-widest flex-shrink-0">
              {visualization.label}
            </span>
          )}
        </div>

        <button
          onClick={() => setFullscreen((f) => !f)}
          className="w-8 h-8 border-2 border-black bg-neo-bg shadow-neo-sm flex items-center justify-center text-black hover:bg-neo-secondary transition-colors duration-100 flex-shrink-0 ml-2"
          title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
          aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {fullscreen ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}