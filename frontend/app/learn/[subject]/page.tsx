"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ExplanationCard from "@/components/ExplanationCard";
import VisualPanel from "@/components/VisualPanel";
import QuizCard from "@/components/QuizCard";
import Sidebar from "@/components/Sidebar";
import MarkdownText from "@/components/MarkdownText";
import {
  streamExplain,
  streamFollowUp,
  generateQuiz,
  submitQuizAnswer,
  assess,
  reexplain,
  createSession,
  getSession,
  listSessions,
  deleteSession,
  updateSessionSettings,
} from "@/lib/api";
import ArrowIcon from "@/components/ArrowIcon";
import {
  Stage,
  Visualization,
  QuizQuestion,
  SessionHistoryItem,
  AssessResult,
} from "@/lib/types";

/* ── Metadata ──────────────────────────────────────────────────── */
const SUBJECT_NAMES: Record<string, string> = {
  dsa:      "Data Structures & Algorithms",
  dvlsi:    "Digital VLSI",
  cs:       "Control Systems",
  networks: "Computer Networks",
};

const SUBJECT_EXAMPLES: Record<string, string> = {
  dsa:      '"recursion", "linked list", or "dijkstra\'s algorithm"',
  dvlsi:    '"sequential circuits", "CMOS gates", or "setup/hold time"',
  cs:       '"PID controller", "transfer function", or "bode plot"',
  networks: '"TCP handshake", "IP routing", or "OSI layers"',
};

/* ── Message union type ────────────────────────────────────────── */
type Message =
  | { id: string; role: "user"; content: string }
  | { id: string; role: "assistant"; type: "explanation" | "followup" | "reexplanation"; content: string; streaming?: boolean }
  | { id: string; role: "system"; content: string }
  | { id: string; role: "quiz" }
  | { id: string; role: "check" }
  | { id: string; role: "clarify" }
  | { id: string; role: "prerequisites"; prerequisites: string[] }
  | { id: string; role: "assess_result"; result: AssessResult };

/* ── Small shared Star ─────────────────────────────────────────── */
const Star = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
  </svg>
);

/* ════════════════════════════════════════════════════════════════ */
export default function LearnPage({
  params,
}: {
  params: { subject: string };
}) {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const subject      = params.subject;
  const subjectName  = SUBJECT_NAMES[subject] ?? subject;

  /* ── Core state ──────────────────────────────────────────────── */
  const [sessionId, setSessionId]           = useState("");
  const [stage, setStage]                   = useState<Stage>("topic");
  const [currentTopic, setCurrentTopic]     = useState("");
  const [sessionHistory, setSessionHistory] = useState<SessionHistoryItem[]>([]);
  const [messages, setMessages]             = useState<Message[]>([]);
  const [visualization, setVisualization]   = useState<Visualization | null>(null);
  const [vizLoading, setVizLoading]         = useState(false);
  const [sessionSettings, setSessionSettings] = useState<any>({ tutor_style: "balanced" });

  async function handleUpdateSettings(settings: any) {
    setSessionSettings(settings);
    if (sessionId) {
      try {
        await updateSessionSettings(sessionId, settings);
      } catch (e) {
        console.error("Failed to save settings on backend", e);
      }
    }
  }

  /* ── Input state ─────────────────────────────────────────────── */
  const [topicInput, setTopicInput]       = useState("");
  const [followUpInput, setFollowUpInput] = useState("");
  const [checkInput, setCheckInput]       = useState("");
  const [isStreaming, setIsStreaming]     = useState(false);
  const [isLoading, setIsLoading]         = useState(false);
  const [error, setError]                 = useState<string | null>(null);

  /* ── Quiz state ──────────────────────────────────────────────── */
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizIndex, setQuizIndex]         = useState(0);
  const [quizScore, setQuizScore]         = useState(0);
  const [quizDifficulty, setQuizDifficulty] = useState(1);
  const [quizPrerequisites, setQuizPrerequisites] = useState<string[]>([]);

  /* ── UI state ────────────────────────────────────────────────── */
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const checkRef   = useRef<HTMLTextAreaElement>(null);

  const [previousSessions, setPreviousSessions] = useState<any[]>([]);

  /* ── Load previous sessions list ── */
  const fetchPreviousSessions = useCallback(async () => {
    try {
      const data = await listSessions();
      setPreviousSessions(data.sessions || []);
    } catch (e) {
      console.error("Failed to load previous sessions", e);
    }
  }, []);

  /* ── Load session details ── */
  useEffect(() => {
    if (!sessionId) return;
    setIsLoading(true);
    setError(null);
    getSession(sessionId)
      .then((s) => {
        setStage(s.stage || "topic");
        setCurrentTopic(s.topic || "");
        setSessionHistory(s.session_history || []);
        setQuizDifficulty(s.quiz_difficulty || 1);
        setQuizIndex(s.quiz_index || 0);
        setQuizScore(s.quiz_score || 0);
        setQuizQuestions(s.quiz || []);
        const globalStyle = typeof window !== "undefined" ? (localStorage.getItem("chapter1_tutor_style") || "balanced") : "balanced";
        let currentSettings = s.settings || {};
        if (currentSettings.tutor_style !== globalStyle) {
          currentSettings = { ...currentSettings, tutor_style: globalStyle };
          updateSessionSettings(sessionId, currentSettings).catch(console.error);
        }
        setSessionSettings(currentSettings);
        
        // Reconstruct messages array from conversation_history
        const history = s.conversation_history || [];
        const reconstructed: Message[] = [];
        let hasExplanation = false;
        
        history.forEach((m: any, idx: number) => {
          if (m.role === "user") {
            reconstructed.push({
              id: `h-user-${idx}`,
              role: "user",
              content: m.content
            });
          } else if (m.role === "assistant") {
            if (!hasExplanation && s.explanation && m.content.includes(s.explanation.slice(0, 50))) {
              hasExplanation = true;
              reconstructed.push({
                id: `h-assistant-exp-${idx}`,
                role: "assistant",
                type: "explanation",
                content: s.explanation
              });
            } else {
              reconstructed.push({
                id: `h-assistant-fu-${idx}`,
                role: "assistant",
                type: "followup",
                content: m.content
              });
            }
          }
        });

        // Restore active stage indicators if we are currently in quiz, check or clarify
        if (s.stage === "quiz") {
          reconstructed.push({ id: `quiz-restore`, role: "quiz" });
        } else if (s.stage === "check") {
          reconstructed.push({ id: `check-restore`, role: "check" });
        } else if (s.stage === "clarify") {
          reconstructed.push({ id: `clarify-restore`, role: "clarify" });
        }
        
        setMessages(reconstructed);
        
        if (s.visualization) {
          setVisualization(s.visualization);
        } else {
          setVisualization(null);
        }
      })
      .catch((e) => {
        console.error("Failed to load session details", e);
        setError("Failed to load session details");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [sessionId]);

  /* ── Load sessions list ── */
  useEffect(() => {
    fetchPreviousSessions();
  }, [sessionId, fetchPreviousSessions]);

  /* ── Load session from list ── */
  function handleLoadSession(sid: string) {
    router.replace(`/learn/${subject}?session=${sid}`);
    setSessionId(sid);
    setSidebarOpen(false);
  }

  /* ── Delete session from list ── */
  function handleDeleteSession(sid: string) {
    setSessionToDelete(sid);
  }

  async function confirmDeleteSession() {
    if (!sessionToDelete) return;
    try {
      await deleteSession(sessionToDelete);
      await fetchPreviousSessions();
      if (sessionToDelete === sessionId) {
        await handleNewTopic();
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSessionToDelete(null);
    }
  }

  /* ── Init session ── */
  useEffect(() => {
    const sid = searchParams.get("session");
    if (sid) {
      setSessionId(sid);
    } else {
      createSession(subject).then((id) => {
        setSessionId(id);
        router.replace(`/learn/${subject}?session=${id}`);
      });
    }
  }, [subject]);

  /* ── Auto-scroll ─────────────────────────────────────────────── */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Helpers ─────────────────────────────────────────────────── */
  const addMsg = useCallback((msg: Message) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  /* ── Topic learn helper ───────────────────────────────────────── */
  async function startLearningTopic(topic: string) {
    if (isStreaming || !sessionId) return;
    setError(null);
    setCurrentTopic(topic);
    setMessages([]);
    setQuizPrerequisites([]);

    addMsg({ id: `u-${Date.now()}`, role: "user", content: topic });

    const msgId = `exp-${Date.now()}`;
    addMsg({ id: msgId, role: "assistant", type: "explanation", content: "", streaming: true });

    setIsStreaming(true);
    setVizLoading(true);

    try {
      await streamExplain(
        sessionId,
        topic,
        (chunk) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msgId ? { ...m, content: (m as any).content + chunk } : m
            )
          );
        },
        (data) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === msgId ? { ...m, streaming: false } : m))
          );
          setVisualization(data.visualization);
          setVizLoading(false);
          setStage("explore");
        },
        (err) => {
          setError(err);
          setIsStreaming(false);
          setVizLoading(false);
          setMessages((prev) =>
            prev.map((m) => (m.id === msgId ? { ...m, streaming: false } : m))
          );
        }
      );
    } finally {
      setIsStreaming(false);
    }
  }

  /* ── Topic submit ────────────────────────────────────────────── */
  async function handleTopicSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topicInput.trim()) return;
    const topic = topicInput.trim();
    setTopicInput("");
    await startLearningTopic(topic);
  }

  /* ── Follow-up ───────────────────────────────────────────────── */
  async function handleFollowUp(e: React.FormEvent) {
    e.preventDefault();
    if (!followUpInput.trim() || isStreaming || !sessionId) return;
    const question = followUpInput.trim();
    setFollowUpInput("");

    addMsg({ id: `u-${Date.now()}`, role: "user", content: question });

    const msgId = `fu-${Date.now()}`;
    addMsg({ id: msgId, role: "assistant", type: "followup", content: "", streaming: true });

    setIsStreaming(true);

    const questionLower = question.toLowerCase();
    const triggerWords = ["diagram", "visual", "sketch", "animation", "chart", "graph", "visualisation", "flowchart", "draw"];
    const conceptKeywords = ["recursion", "sorting", "linked list", "binary tree", "stack", "queue", "hash table", "graph", "prim", "kruskal", "dijkstra", "shortest path", "minimum spanning", "routing", "ospf", "pid", "flip flop", "cmos", "tcp", "os scheduling", "page replacement", "packet", "frame"];
    const hasConceptKeyword = conceptKeywords.some(k => questionLower.includes(k));
    const hasTriggerWord = triggerWords.some(w => questionLower.includes(w));
    const shouldUpdateViz = hasConceptKeyword || hasTriggerWord || !visualization;

    if (shouldUpdateViz) {
      setVizLoading(true);
    }

    try {
      await streamFollowUp(
        sessionId,
        question,
        (chunk) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msgId ? { ...m, content: (m as any).content + chunk } : m
            )
          );
        },
        (data) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === msgId ? { ...m, streaming: false } : m))
          );
          if (data && data.visualization) {
            setVisualization(data.visualization);
          }
          setVizLoading(false);
        },
        (err) => {
          setError(err);
          setVizLoading(false);
          setMessages((prev) =>
            prev.map((m) => (m.id === msgId ? { ...m, streaming: false } : m))
          );
        }
      );
    } finally {
      setIsStreaming(false);
    }
  }

  /* ── Start quiz ──────────────────────────────────────────────── */
  async function handleStartQuiz() {
    if (isLoading || !sessionId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await generateQuiz(sessionId);
      setQuizQuestions(data.questions);
      setQuizIndex(0);
      setQuizScore(0);
      setStage("quiz");
      addMsg({ id: `quiz-${Date.now()}`, role: "quiz" });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }

  /* ── Quiz answer ─────────────────────────────────────────────── */
  async function handleQuizAnswer(answer: string) {
    const res = await submitQuizAnswer(sessionId, answer);
    setQuizScore(res.quiz_score);
    if (res.prerequisites) {
      setQuizPrerequisites(res.prerequisites);
    }
    return {
      correct: res.correct,
      explanation: res.explanation,
      correct_answer: res.correct_answer,
      correct_text: res.correct_text,
    };
  }

  /* ── Quiz next ───────────────────────────────────────────────── */
  async function handleQuizNext(questionNumber: number) {
    const isLast = questionNumber >= quizQuestions.length;
    if (!isLast) { setQuizIndex((i) => i + 1); return; }

    const total = quizQuestions.length;
    const score = quizScore;

    /* Perfect → level up */
    if (score === total && quizDifficulty < 3) {
      setQuizDifficulty((d) => d + 1);
      addMsg({ id: `sys-${Date.now()}`, role: "system", content: `PERFECT SCORE — LEVEL UP: HARDER QUESTIONS INCOMING` });
      setIsLoading(true);
      try {
        const data = await generateQuiz(sessionId);
        setQuizQuestions(data.questions);
        setQuizIndex(0);
        setQuizScore(0);
        setMessages((prev) => [
          ...prev.filter((m) => m.role !== "quiz"),
          { id: `quiz-${Date.now()}`, role: "quiz" },
        ]);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    /* Failed → clarify instead of auto re-explain */
    if (score < 2) {
      addMsg({ id: `sys-${Date.now()}`, role: "system", content: `SCORE ${score}/${total} — LET'S CLARIFY THE CONFUSING PARTS` });
      setStage("clarify");
      setQuizDifficulty(1);
      addMsg({ id: `clarify-${Date.now()}`, role: "clarify" });
      return;
    }

    /* Passed → prerequisites check or application check */
    if (quizPrerequisites && quizPrerequisites.length > 0) {
      setStage("prerequisites");
      addMsg({ id: `prereq-${Date.now()}`, role: "prerequisites", prerequisites: quizPrerequisites });
    } else {
      addMsg({ id: `sys-${Date.now()}`, role: "system", content: `QUIZ DONE — ${score}/${total}. NOW APPLY IT.` });
      setStage("check");
      addMsg({ id: `check-${Date.now()}`, role: "check" });
    }
  }

  /* ── Application check ───────────────────────────────────────── */
  async function handleCheckSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!checkInput.trim() || isLoading || !sessionId) return;
    const answer = checkInput.trim();
    setCheckInput("");

    addMsg({ id: `u-${Date.now()}`, role: "user", content: answer });
    setIsLoading(true);

    try {
      const result = await assess(sessionId, answer);
      addMsg({ id: `ar-${Date.now()}`, role: "assess_result", result });

      if (result.next_stage === "topic") {
        setSessionHistory((prev) => [
          ...prev,
          { topic: currentTopic, understood: true, score: result.score },
        ]);
        setStage("topic");
        setCurrentTopic("");
        setVisualization(null);
      } else if (result.next_stage === "check") {
        setStage("check");
      } else if (result.next_stage === "clarify") {
        setStage("clarify");
        addMsg({ id: `clarify-${Date.now()}`, role: "clarify" });
      }

      if (result.reexplanation) {
        addMsg({ id: `re-${Date.now()}`, role: "assistant", type: "reexplanation", content: result.reexplanation });
        setStage("check");
        addMsg({ id: `check2-${Date.now()}`, role: "check" });
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }

  /* ── Clarify ─────────────────────────────────────────────────── */
  async function handleClarify(focus: "concept" | "syntax" | "analogy") {
    setIsLoading(true);
    addMsg({ id: `u-${Date.now()}`, role: "user", content: `Re-explain: ${focus}` });
    try {
      const data = await reexplain(sessionId, focus);
      addMsg({ id: `re-${Date.now()}`, role: "assistant", type: "reexplanation", content: data.content });
      setStage("check");
      addMsg({ id: `check-${Date.now()}`, role: "check" });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }

  /* ── New topic ───────────────────────────────────────────────── */
  async function handleNewTopic() {
    if (!sessionId) return;
    setIsLoading(true);
    try {
      const id = await createSession(subject);
      const globalStyle = typeof window !== "undefined" ? (localStorage.getItem("chapter1_tutor_style") || "balanced") : "balanced";
      try {
        await updateSessionSettings(id, { tutor_style: globalStyle });
      } catch (e) {
        console.error(e);
      }
      setSessionId(id);
      router.replace(`/learn/${subject}?session=${id}`);
      setStage("topic");
      setCurrentTopic("");
      setVisualization(null);
      setMessages([]);
      setSidebarOpen(false);
      setError(null);
      setQuizPrerequisites([]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }

  /* ── Derive application check question ──────────────────────── */
  function getCheckQuestion(): string {
    const expMsg = messages.find(
      (m) => m.role === "assistant" && (m as any).type === "explanation"
    ) as any;
    if (!expMsg) return "Explain the concept in your own words.";
    const match = expMsg.content.match(/\*\*Check\*\*:?\s*([\s\S]*?)$/i);
    return match ? match[1].trim() : "Explain the concept in your own words.";
  }

  /* ══════════════════════════════════════════════════════════════ */
  /* ── Render individual messages ─────────────────────────────── */
  /* ══════════════════════════════════════════════════════════════ */
  function renderMessage(msg: Message) {
    switch (msg.role) {

      /* User bubble */
      case "user":
        return (
          <div key={msg.id} className="flex justify-end">
            <div className="max-w-[78%] border-4 border-black bg-neo-muted shadow-neo-sm px-4 py-3 font-serif font-medium text-sm text-black">
              {msg.content}
            </div>
          </div>
        );

      /* AI bubble */
      case "assistant": {
        const m = msg as any;
        return (
          <div key={msg.id} className="flex items-start">
            <div className="flex-1 border-4 border-black bg-white shadow-neo-sm p-4">
              {m.type === "reexplanation" ? (
                <>
                  <p className="text-[10px] font-black uppercase tracking-widest mb-3 border-b-2 border-black pb-2 text-neo-accent">
                    RE-EXPLANATION
                  </p>
                  <MarkdownText text={m.content} />
                </>
              ) : m.type === "explanation" ? (
                <ExplanationCard text={m.content} streaming={m.streaming} />
              ) : (
                <MarkdownText
                  text={m.content}
                  className={m.streaming ? "streaming-cursor" : ""}
                />
              )}
            </div>
          </div>
        );
      }

      /* System pill */
      case "system":
        return (
          <div key={msg.id} className="flex justify-center">
            <div className="border-4 border-black bg-black text-neo-muted px-5 py-2 text-[10px] font-black uppercase tracking-widest shadow-neo-sm">
              {msg.content}
            </div>
          </div>
        );

      /* Quiz card */
      case "quiz":
        return (
          <div
            key={msg.id}
            className="border-4 border-black bg-white shadow-neo-lg p-5"
          >
            <div className="text-[10px] font-black uppercase tracking-widest mb-4 border-b-4 border-black pb-2 flex items-center gap-2">
              <Star size={12} className="text-neo-accent" />
              QUIZ — {currentTopic}
            </div>
            {quizQuestions[quizIndex] && (
              <QuizCard
                key={quizIndex}
                question={quizQuestions[quizIndex]}
                questionNumber={quizIndex + 1}
                totalQuestions={quizQuestions.length}
                difficulty={quizDifficulty}
                onAnswer={handleQuizAnswer}
                onNext={() => handleQuizNext(quizIndex + 1)}
              />
            )}
          </div>
        );

      /* Prerequisites */
      case "prerequisites":
        return (
          <div
            key={msg.id}
            className="border-4 border-black bg-white shadow-neo-lg p-5"
          >
            <p className="text-[10px] font-black uppercase tracking-widest mb-4 border-b-4 border-black pb-2 text-neo-accent">
              PREREQUISITE RECOMMENDATIONS
            </p>
            <p className="text-sm font-serif font-medium text-black mb-4 leading-relaxed">
              Based on your quiz performance, we discovered the following underlying prerequisite concepts. Would you like help studying any of these first?
            </p>
            <div className="flex flex-col gap-2">
              {msg.prerequisites.map((topic, idx) => (
                <button
                  key={idx}
                  onClick={() => startLearningTopic(topic)}
                  className="neo-btn w-full bg-neo-muted text-black shadow-neo-sm py-3 px-4 text-sm justify-start hover:bg-neo-secondary text-left font-extrabold"
                >
                  Learn: {topic} →
                </button>
              ))}
              <button
                onClick={() => {
                  setStage("check");
                  addMsg({ id: `check-${Date.now()}`, role: "check" });
                }}
                className="neo-btn w-full bg-black text-white shadow-neo-sm py-3 px-4 text-sm justify-center font-extrabold"
              >
                No, proceed to Application Check →
              </button>
            </div>
          </div>
        );

      /* Application check */
      case "check": {
        const checkQ = getCheckQuestion();
        return (
          <div
            key={msg.id}
            className="border-4 border-black bg-neo-muted shadow-neo-lg p-5"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 border-4 border-black bg-black text-neo-muted font-black text-lg flex items-center justify-center flex-shrink-0">
                ?
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest mb-1.5">
                  APPLICATION CHECK
                </p>
                <p className="text-sm font-serif font-medium text-black leading-snug">{checkQ}</p>
              </div>
            </div>
            <form onSubmit={handleCheckSubmit} className="space-y-3">
              <textarea
                ref={checkRef}
                value={checkInput}
                onChange={(e) => setCheckInput(e.target.value)}
                placeholder="Your answer — plain English is fine, pseudocode works too..."
                rows={3}
                className="neo-input resize-none px-4 py-3 text-sm focus:bg-white font-serif font-medium"
                style={{ border: "4px solid #000" }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleCheckSubmit(e as any);
                  }
                }}
              />
              <button
                type="submit"
                disabled={!checkInput.trim() || isLoading}
                className="neo-btn w-full bg-black text-white shadow-neo-sm py-3 text-sm flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  "Assessing..."
                ) : (
                  <>
                    <span>Submit Answer</span>
                    <ArrowIcon size={16} />
                  </>
                )}
              </button>
            </form>
          </div>
        );
      }

      /* Clarify options */
      case "clarify":
        return (
          <div
            key={msg.id}
            className="border-4 border-black bg-neo-accent shadow-neo-lg p-5"
          >
            <p className="text-sm font-heading font-bold tracking-wide mb-4 text-white">
              Which part is unclear?
            </p>
            <div className="space-y-2">
              {[
                { key: "concept" as const, label: "A) The concept itself" },
                { key: "syntax"  as const, label: "B) The code / syntax" },
                { key: "analogy" as const, label: "C) The analogy"       },
              ].map((opt) => (
                <button
                  key={opt.key}
                  id={`clarify-${opt.key}`}
                  onClick={() => handleClarify(opt.key)}
                  disabled={isLoading}
                  className="neo-btn w-full bg-white shadow-neo-sm py-3 px-4 text-sm justify-start"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        );

      /* Assess result */
      case "assess_result": {
        const r = (msg as any).result as AssessResult;
        const isUnderstood = r.verdict === "UNDERSTOOD";
        const isPartial    = r.verdict === "PARTIAL";
        const bg   = isUnderstood ? "bg-neo-green"     : isPartial ? "bg-neo-secondary" : "bg-neo-accent";
        const text = isUnderstood ? "text-black"        : isPartial ? "text-black"       : "text-white";
        const icon = isUnderstood ? "✓"                 : isPartial ? "~"                : "✗";
        const label= isUnderstood ? "UNDERSTOOD"        : isPartial ? "PARTIALLY RIGHT"  : "LET'S REVISIT";

        return (
          <div
            key={msg.id}
            className={`border-4 border-black ${bg} shadow-neo-sm p-4`}
          >
            <p className={`font-black text-sm uppercase tracking-widest mb-1 ${text}`}>
              {icon} {label}
            </p>
            <p className={`text-sm font-serif font-medium leading-relaxed ${text}`}>{r.feedback}</p>
            {isUnderstood && (
              <>
                {r.recommendations && r.recommendations.length > 0 ? (
                  <div className="mt-4 pt-3 border-t-2 border-black/10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-black/50 mb-2">
                      Suggested next topics — would you like help with any of these?
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {r.recommendations.map((rec, idx) => (
                        <button
                          key={idx}
                          onClick={() => startLearningTopic(rec)}
                          className="neo-btn bg-white text-black text-xs px-3 py-1.5 shadow-neo-sm hover:bg-neo-secondary"
                        >
                          {rec} →
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] font-black uppercase tracking-widest text-black/50 mt-2">
                    Ask another topic when ready.
                  </p>
                )}
              </>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  }

  /* ════════════════════════════════════════════════════════════════ */
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-neo-bg">

      {/* ── Top nav ────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 border-b-4 border-black px-4 py-3 flex items-center gap-4 bg-white">
        {/* Hamburger */}
        <button
          id="sidebar-toggle"
          onClick={() => setSidebarOpen(true)}
          className="w-10 h-10 border-4 border-black flex items-center justify-center font-black text-lg hover:bg-neo-muted transition-colors duration-100 shadow-neo-sm"
          aria-label="Open sidebar"
        >
          ≡
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer flex-shrink-0" onClick={() => router.push("/")}>
          <img src="/logo.png" alt="Chapter1 Logo" className="h-10 w-auto" />
          <span className="font-heading font-black text-xl uppercase tracking-tighter hidden sm:block">
            Chapter1
          </span>
        </div>

        <span className="text-black/30 hidden sm:inline">|</span>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => router.push("/subjects")}
            className="font-heading font-bold text-sm uppercase tracking-tight hover:text-neo-accent transition-colors duration-100 truncate"
          >
            {subjectName}
          </button>
          {currentTopic && (
            <>
              <span className="text-black/30 flex-shrink-0">/</span>
              <span className="font-heading font-bold text-sm uppercase tracking-tight truncate neo-badge scale-90 origin-left">
                {currentTopic}
              </span>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          {stage !== "topic" && (
            <button
              id="new-topic-btn"
              onClick={handleNewTopic}
              className="neo-btn bg-neo-bg shadow-neo-sm px-4 py-2 text-xs"
            >
              New Topic
            </button>
          )}
        </div>
      </header>

      {/* ── Main ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left — Chat (60%) */}
        <div className="flex flex-col w-full lg:w-[60%] border-r-4 border-black">

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 bg-neo-bg bg-dots">

            {/* Empty state */}
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-4">
                <div
                  className="font-black text-[96px] leading-none select-none -rotate-2"
                  style={{ WebkitTextStroke: "4px #000", color: "transparent" }}
                >
                  ?
                </div>
                <h2 className="font-heading font-bold text-2xl tracking-tight">
                  What do you want to learn?
                </h2>
                <p className="text-sm font-serif font-medium text-black max-w-sm leading-snug">
                  Type a topic — like {SUBJECT_EXAMPLES[subject] || '"recursion"'}
                </p>
              </div>
            )}

            {messages.map((msg) => renderMessage(msg))}

            {/* Quiz me CTA (shown in explore stage) */}
            {stage === "explore" && !isStreaming && messages.length > 0 && (
              <div className="pt-2">
                <button
                  id="quiz-me-btn"
                  onClick={handleStartQuiz}
                  disabled={isLoading}
                  className="neo-btn w-full bg-neo-accent text-white shadow-neo py-4 text-sm"
                >
                  {isLoading ? (
                    "Generating quiz..."
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      I understand — Quiz me <ArrowIcon size={16} />
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="border-4 border-black bg-neo-accent text-white shadow-neo-sm p-3 text-xs font-black uppercase tracking-widest">
                Error: {error}
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* ── Bottom input bar ─────────────────────────────────── */}
          <div className="flex-shrink-0 border-t-4 border-black p-4 bg-white">

            {stage === "topic" && (
              <form onSubmit={handleTopicSubmit} className="flex gap-2">
                <input
                  id="topic-input"
                  type="text"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  placeholder="What do you want to learn today?"
                  disabled={isStreaming}
                  className="neo-input flex-1 px-4 py-3 text-sm font-serif font-medium"
                  autoFocus
                  autoComplete="off"
                />
                <button
                  id="topic-submit"
                  type="submit"
                  disabled={!topicInput.trim() || isStreaming}
                  className="neo-btn bg-neo-accent text-white shadow-neo-sm px-6 py-3 text-sm flex-shrink-0 flex items-center gap-2"
                >
                  {isStreaming ? (
                    "..."
                  ) : (
                    <>
                      <span>Go</span>
                      <ArrowIcon size={16} />
                    </>
                  )}
                </button>
              </form>
            )}

            {stage === "explore" && (
              <form onSubmit={handleFollowUp} className="flex gap-2">
                <input
                  id="followup-input"
                  type="text"
                  value={followUpInput}
                  onChange={(e) => setFollowUpInput(e.target.value)}
                  placeholder={`Ask a follow-up about ${currentTopic}...`}
                  disabled={isStreaming}
                  className="neo-input flex-1 px-4 py-3 text-sm font-serif font-medium"
                  autoComplete="off"
                />
                <button
                  id="followup-submit"
                  type="submit"
                  disabled={!followUpInput.trim() || isStreaming}
                  className="neo-btn bg-neo-accent text-white shadow-neo-sm px-5 py-3 text-sm flex-shrink-0 flex items-center gap-2"
                >
                  <span>Ask</span>
                  <ArrowIcon size={16} />
                </button>
              </form>
            )}

            {(stage === "quiz" || stage === "check" || stage === "clarify" || stage === "prerequisites") && (
              <p className="text-[11px] font-black uppercase tracking-widest text-center text-black/50">
                {stage === "quiz"
                  ? "Select an answer above"
                  : stage === "check"
                  ? "Answer the question above — Ctrl+Enter to submit"
                  : stage === "clarify"
                  ? "Choose what to re-explain above"
                  : "Choose a topic above or proceed"}
              </p>
            )}
          </div>
        </div>

        {/* Right — Visual Panel (40%) */}
        <div className="hidden lg:flex lg:w-[40%] flex-col">
          <VisualPanel
            visualization={visualization}
            topic={currentTopic}
            subject={subject}
            loading={vizLoading}
          />
        </div>
      </div>

      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        subject={subject}
        subjectName={subjectName}
        stage={stage}
        currentTopic={currentTopic}
        sessionHistory={sessionHistory}
        onNewTopic={handleNewTopic}
        onChangeSubject={() => router.push("/subjects")}
        sessionId={sessionId}
        previousSessions={previousSessions}
        onLoadSession={handleLoadSession}
        onDeleteSession={handleDeleteSession}
      />

      {/* ── Custom Centered Delete Confirmation Modal ──────────────── */}
      {sessionToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="border-4 border-black bg-neo-bg shadow-neo-lg p-6 max-w-sm w-full relative z-[100]">
            <div className="neo-badge bg-neo-accent text-white mb-4 uppercase">
              Delete Session
            </div>
            <h3 className="font-heading font-bold text-xl mb-3 text-black">
              Are you sure?
            </h3>
            <p className="font-serif font-medium text-sm text-black/80 leading-relaxed mb-6">
              This action is permanent and cannot be undone. You will lose all conversation history and quiz progress in this session.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setSessionToDelete(null)}
                className="neo-btn bg-white text-black shadow-neo-sm px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteSession}
                className="neo-btn bg-neo-accent text-white shadow-neo-sm px-4 py-2 text-sm"
              >
                Delete Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
