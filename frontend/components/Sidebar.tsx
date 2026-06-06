"use client";

import { Stage, SessionHistoryItem } from "@/lib/types";
import ArrowIcon from "./ArrowIcon";

function formatSessionDate(dateStr: string): string {
  if (!dateStr) return "Today";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "Today";
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const sessionDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (sessionDate.getTime() === today.getTime()) {
      return "Today";
    } else if (sessionDate.getTime() === yesterday.getTime()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  } catch {
    return "Today";
  }
}

interface Props {
  open: boolean;
  onClose: () => void;
  subject: string;
  subjectName: string;
  stage: Stage;
  currentTopic: string;
  sessionHistory: SessionHistoryItem[];
  onNewTopic: () => void;
  onChangeSubject: () => void;
  sessionId?: string;
  previousSessions?: any[];
  onLoadSession?: (sessionId: string) => void;
  onDeleteSession?: (sessionId: string) => void;
}

const STAGE_LABELS: Record<Stage, string> = {
  topic:         "Waiting for topic",
  explore:       "Exploring",
  quiz:          "Quiz in progress",
  check:         "Application check",
  clarify:       "Clarifying",
  prerequisites: "Prerequisites",
};

const STAGE_BG: Record<Stage, string> = {
  topic:         "bg-white",
  explore:       "bg-neo-muted",
  quiz:          "bg-neo-secondary",
  check:         "bg-neo-accent",
  clarify:       "bg-black",
  prerequisites: "bg-neo-secondary",
};

const STAGE_TEXT: Record<Stage, string> = {
  topic:         "text-black",
  explore:       "text-black",
  quiz:          "text-black",
  check:         "text-white",
  clarify:       "text-neo-secondary",
  prerequisites: "text-black",
};

export default function Sidebar({
  open,
  onClose,
  subject,
  subjectName,
  stage,
  currentTopic,
  sessionHistory,
  onNewTopic,
  onChangeSubject,
  sessionId,
  previousSessions,
  onLoadSession,
  onDeleteSession,
}: Props) {
  return (
    <>
      {/* ── Backdrop ─────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* ── Panel ────────────────────────────────────────────────── */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 z-50 flex flex-col bg-neo-bg border-r-4 border-black transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ boxShadow: open ? "8px 0px 0px 0px rgba(0,0,0,0.15)" : "none" }}
        aria-label="Learning sidebar"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-neo-accent text-white border-b-4 border-black">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-0.5 text-white/80">
              Subject
            </p>
            <p className="font-heading font-bold text-sm leading-tight text-white">{subjectName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 border-4 border-black bg-black text-neo-accent font-black text-sm flex items-center justify-center hover:bg-white hover:text-black transition-colors duration-100"
            aria-label="Close sidebar"
          >
            x
          </button>
        </div>

        {/* Chats Panel Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Current Stage indicator */}
          <div className="px-5 py-4 border-b-4 border-black">
            <p className="text-[10px] font-black uppercase tracking-widest mb-3">
              Current Stage
            </p>
            <div
              className={`border-4 border-black ${STAGE_BG[stage]} ${STAGE_TEXT[stage]} shadow-neo-sm px-4 py-3 flex items-center gap-3`}
            >
              <span className="w-3 h-3 border-4 border-current flex-shrink-0" />
              <span className="text-xs font-heading font-bold uppercase tracking-tight">
                {STAGE_LABELS[stage]}
              </span>
            </div>

            {currentTopic && (
              <div className="mt-3 border-4 border-black bg-white shadow-neo-sm px-3.5 py-2.5 flex items-center gap-2">
                <span className="font-heading font-bold text-[10px] uppercase">Topic:</span>
                <span className="text-xs font-sans font-bold truncate">{currentTopic}</span>
              </div>
            )}
          </div>

          {/* Previous Chats list */}
          <div className="flex-1 border-b-4 border-black px-5 py-4 flex flex-col overflow-hidden">
            <p className="text-[10px] font-black uppercase tracking-widest mb-3 flex-shrink-0">
              Previous Chats
            </p>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {!previousSessions || previousSessions.length === 0 ? (
                <div className="border-2 border-black bg-white shadow-neo-sm p-4 text-center">
                  <p className="text-[11px] font-black uppercase tracking-widest text-black">
                    No previous chats
                  </p>
                </div>
              ) : (
                previousSessions.map((s) => (
                  <div
                    key={s.session_id}
                    className={`border-2 border-black bg-white p-2.5 shadow-neo-sm flex items-center justify-between gap-2 transition-transform duration-100 hover:-translate-y-0.5 hover:shadow-neo-sm ${
                      s.session_id === sessionId ? "border-neo-accent" : ""
                    }`}
                  >
                    <button
                      onClick={() => onLoadSession?.(s.session_id)}
                      className="flex-1 text-left min-w-0"
                    >
                      <p className="text-[9px] font-black uppercase text-neo-accent tracking-wider leading-none">
                        {s.subject.toUpperCase()}
                      </p>
                      <p className="text-xs font-black truncate leading-tight mt-0.5">
                        {s.topic ? s.topic : "New Session"}
                      </p>
                      <p className="text-[8px] font-extrabold text-neutral-400 leading-none mt-1">
                        {formatSessionDate(s.updated_at)}
                      </p>
                    </button>
                    <button
                      onClick={() => onDeleteSession?.(s.session_id)}
                      className="w-7 h-7 border-2 border-black bg-white hover:bg-neo-accent hover:text-white transition-colors flex items-center justify-center font-black text-xs"
                      title="Delete Chat"
                    >
                      x
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Completed topics */}
          {sessionHistory.length > 0 && (
            <div className="px-5 py-4 border-b-4 border-black">
              <p className="text-[10px] font-black uppercase tracking-widest mb-3">
                Completed ({sessionHistory.length})
              </p>
              <div className="space-y-2 max-h-[140px] overflow-y-auto">
                {sessionHistory.map((item, i) => (
                  <div
                    key={i}
                    className="border-2 border-black bg-white shadow-neo-sm p-2.5 flex items-center gap-3"
                  >
                    <div
                      className={`w-5 h-5 border-2 border-black font-black text-[9px] flex items-center justify-center flex-shrink-0 ${
                        item.understood ? "bg-neo-green" : "bg-neo-secondary"
                      }`}
                    >
                      {item.understood ? "✓" : "~"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-sans font-bold leading-tight truncate">
                        {item.topic}
                      </p>
                      <p className="text-[9px] font-extrabold text-black/50 uppercase tracking-widest">
                        {item.score}/5
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t-4 border-black">
          <button
            id="sidebar-change-subject"
            onClick={onChangeSubject}
            className="neo-btn w-full bg-white shadow-neo-sm py-3 text-sm flex items-center justify-center gap-2 group"
          >
            <ArrowIcon direction="left" size={16} className="text-black" />
            <span>Change Subject</span>
          </button>
        </div>
      </aside>
    </>
  );
}