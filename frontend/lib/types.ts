export type Subject = "dsa" | "dvlsi" | "cs" | "networks";
export type Stage = "topic" | "explore" | "quiz" | "check" | "clarify" | "prerequisites";
export type Verdict = "UNDERSTOOD" | "PARTIAL" | "CONFUSED";
export type VisualizationType = "iframe" | "p5js" | "loading" | "empty";

export interface SubjectInfo {
  key: Subject;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export interface IndexStatus {
  count: number;
  built: boolean;
  has_pdfs: boolean;
}

export interface Visualization {
  type: "iframe" | "p5js" | "url" | "mermaid";
  url: string;
  code: string;
  label: string;
}

export interface QuizQuestion {
  question: string;
  options: { A: string; B: string; C: string; D: string };
  answer: string;
  explanation: string;
}

export interface QuizAnswerResult {
  correct: boolean;
  explanation: string;
  correct_answer: string;
  correct_text: string;
  next: "continue" | "complete" | "retry" | "level_up";
  quiz_score: number;
  quiz_index: number;
  total: number;
  prerequisites?: string[];
}

export interface AssessResult {
  score: number;
  verdict: Verdict;
  feedback: string;
  next_stage: Stage;
  reexplanation?: string;
  recommendations?: string[];
}

export interface SessionHistoryItem {
  topic: string;
  understood: boolean;
  score: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  type:
    | "text"
    | "explanation"
    | "followup"
    | "quiz"
    | "assessment"
    | "reexplanation"
    | "stage_transition";
  content: string;
  streaming?: boolean;
  timestamp: Date;
}

export interface ExplanationSections {
  explanation: string;
  keyPoints: string[];
  analogy: string;
  example: string;
  isCode?: boolean;
  check: string;
}
