import { AssessResult, QuizAnswerResult, Visualization } from "./types";

const API_BASE = "/api";

function getHeaders(contentType: string = "application/json"): HeadersInit {
  const headers: Record<string, string> = {};
  if (contentType) {
    headers["Content-Type"] = contentType;
  }
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("chapter1_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
}

export async function register(email: string, name: string, password: string): Promise<{ token: string; user: { email: string; name: string } }> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ email, name, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Registration failed");
  }
  return res.json();
}

export async function login(email: string, password: string): Promise<{ token: string; user: { email: string; name: string } }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Login failed");
  }
  return res.json();
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, {
    method: "POST",
    headers: getHeaders(),
  }).catch(() => {});
  if (typeof window !== "undefined") {
    localStorage.removeItem("chapter1_token");
    localStorage.removeItem("chapter1_user");
  }
}

export async function createSession(subject: string): Promise<string> {
  const res = await fetch(`${API_BASE}/session/create`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ subject }),
  });
  if (!res.ok) throw new Error(`Failed to create session: ${res.statusText}`);
  const data = await res.json();
  return data.session_id;
}

export async function getSession(sessionId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/session/${sessionId}`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load session details");
  return res.json();
}

export async function listSessions(): Promise<{ sessions: any[] }> {
  const res = await fetch(`${API_BASE}/sessions`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error("Failed to list sessions");
  return res.json();
}

export async function deleteSession(sessionId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/session/${sessionId}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete session");
}

export async function getIndexStatus(): Promise<Record<string, { count: number; built: boolean; has_pdfs: boolean }>> {
  const res = await fetch(`${API_BASE}/index/status`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error("Failed to get index status");
  return res.json();
}

export async function buildIndex(subject: string): Promise<{ success: boolean; chunks: number }> {
  const res = await fetch(`${API_BASE}/index/build`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ subject }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to build index");
  }
  return res.json();
}

export async function streamExplain(
  sessionId: string,
  topic: string,
  onChunk: (text: string) => void,
  onDone: (data: { check_question: string; visualization: Visualization }) => void,
  onError: (err: string) => void
) {
  const response = await fetch(`${API_BASE}/explain`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ session_id: sessionId, topic }),
  });

  if (!response.ok) {
    onError(`Failed to explain: ${response.statusText}`);
    return;
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;
      try {
        const data = JSON.parse(trimmed.slice(6));
        if (data.type === "chunk") onChunk(data.content);
        else if (data.type === "done") onDone(data);
        else if (data.type === "error") onError(data.content);
      } catch (e) {
        console.error("Failed to parse SSE line:", trimmed, e);
      }
    }
  }

  if (buffer) {
    const trimmed = buffer.trim();
    if (trimmed && trimmed.startsWith("data: ")) {
      try {
        const data = JSON.parse(trimmed.slice(6));
        if (data.type === "chunk") onChunk(data.content);
        else if (data.type === "done") onDone(data);
        else if (data.type === "error") onError(data.content);
      } catch (e) {
        console.error("Failed to parse final SSE buffer:", trimmed, e);
      }
    }
  }
}

export async function streamFollowUp(
  sessionId: string,
  question: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: string) => void
) {
  const response = await fetch(`${API_BASE}/followup`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ session_id: sessionId, question }),
  });

  if (!response.ok) {
    onError(`Failed: ${response.statusText}`);
    return;
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;
      try {
        const data = JSON.parse(trimmed.slice(6));
        if (data.type === "chunk") onChunk(data.content);
        else if (data.type === "done") onDone();
        else if (data.type === "error") onError(data.content);
      } catch (e) {
        console.error("Failed to parse SSE line:", trimmed, e);
      }
    }
  }

  if (buffer) {
    const trimmed = buffer.trim();
    if (trimmed && trimmed.startsWith("data: ")) {
      try {
        const data = JSON.parse(trimmed.slice(6));
        if (data.type === "chunk") onChunk(data.content);
        else if (data.type === "done") onDone();
        else if (data.type === "error") onError(data.content);
      } catch (e) {
        console.error("Failed to parse final SSE buffer:", trimmed, e);
      }
    }
  }
}

export async function generateQuiz(sessionId: string) {
  const res = await fetch(`${API_BASE}/quiz/generate`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ session_id: sessionId }),
  });
  if (!res.ok) throw new Error("Failed to generate quiz");
  return res.json();
}

export async function submitQuizAnswer(sessionId: string, answer: string): Promise<QuizAnswerResult> {
  const res = await fetch(`${API_BASE}/quiz/answer`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ session_id: sessionId, answer }),
  });
  if (!res.ok) throw new Error("Failed to submit answer");
  return res.json();
}

export async function assess(sessionId: string, answer: string): Promise<AssessResult> {
  const res = await fetch(`${API_BASE}/assess`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ session_id: sessionId, answer }),
  });
  if (!res.ok) throw new Error("Failed to assess");
  return res.json();
}

export async function reexplain(sessionId: string, focus: string): Promise<{ content: string }> {
  const res = await fetch(`${API_BASE}/reexplain`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ session_id: sessionId, focus }),
  });
  if (!res.ok) throw new Error("Failed to reexplain");
  return res.json();
}

export async function uploadPdf(subject: string, file: File): Promise<{ success: boolean; filename: string }> {
  const formData = new FormData();
  formData.append("file", file);
  
  const res = await fetch(`${API_BASE}/upload/${subject}`, {
    method: "POST",
    headers: getHeaders(""), // Empty content type ensures browser formats multi-part boundary correctly
    body: formData,
  });
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to upload file");
  }
  return res.json();
}

export async function updateSessionSettings(sessionId: string, settings: any): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/session/${sessionId}/settings`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ settings }),
  });
  if (!res.ok) throw new Error("Failed to update session settings");
  return res.json();
}

export async function clearVisualizationCache(subject: string): Promise<{ success: boolean; deleted_count: number }> {
  const res = await fetch(`${API_BASE}/cache/clear`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ subject }),
  });
  if (!res.ok) throw new Error("Failed to clear visualization cache");
  return res.json();
}
