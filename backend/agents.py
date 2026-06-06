import json
import logging
import os
from pathlib import Path
from typing import Generator

from groq import Groq, RateLimitError
from dotenv import load_dotenv

# Explicitly load .env from the same directory as this file
load_dotenv(Path(__file__).parent / ".env")

logger = logging.getLogger(__name__)

_client: Groq = None

def get_client() -> Groq:
    global _client
    if _client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY not set in environment")
        _client = Groq(api_key=api_key)
    return _client


MODEL = "llama-3.3-70b-versatile"
FALLBACK_MODEL = "llama-3.1-8b-instant"


def create_chat_completion(client: Groq, **kwargs) -> any:
    """Wrapper that tries MODEL first and falls back to FALLBACK_MODEL on rate limits (429)."""
    try:
        return client.chat.completions.create(**kwargs)
    except Exception as e:
        status_code = getattr(e, "status_code", None)
        is_rate_limit = isinstance(e, RateLimitError) or status_code == 429 or "rate_limit" in str(e).lower() or "429" in str(e)
        if is_rate_limit:
            logger.warning(f"Rate limit (429) hit for model {kwargs.get('model')}. Falling back to {FALLBACK_MODEL}.")
            kwargs["model"] = FALLBACK_MODEL
            return client.chat.completions.create(**kwargs)
        raise e


def parse_json_safely(raw: str) -> dict:
    """Safely extracts and parses JSON from raw LLM output, stripping markdown code fences."""
    raw_cleaned = raw.strip()
    if raw_cleaned.startswith("```"):
        first_newline = raw_cleaned.find("\n")
        if first_newline != -1:
            raw_cleaned = raw_cleaned[first_newline:].strip()
        if raw_cleaned.endswith("```"):
            raw_cleaned = raw_cleaned[:-3].strip()
    
    start_brace = raw_cleaned.find("{")
    start_bracket = raw_cleaned.find("[")
    
    start_idx = -1
    end_char = ""
    
    if start_brace != -1 and (start_bracket == -1 or start_brace < start_bracket):
        start_idx = start_brace
        end_char = "}"
    elif start_bracket != -1:
        start_idx = start_bracket
        end_char = "]"
        
    if start_idx != -1:
        end_idx = raw_cleaned.rfind(end_char)
        if end_idx != -1 and end_idx > start_idx:
            raw_cleaned = raw_cleaned[start_idx : end_idx + 1]
            
    return json.loads(raw_cleaned)


def explainer_stream(topic: str, context: str, session_history: list, tutor_style: str = "balanced") -> Generator:
    """Stream structured explanation for a topic."""
    client = get_client()

    style_instruction = ""
    if tutor_style == "analogy-first":
        style_instruction = "IMPORTANT style instruction: Focus on explaining the topic via an illustrative and vivid real-world analogy FIRST, before diving into dry technical points. Your Explanation section should lead with or heavily focus on the analogy intuition."
    elif tutor_style == "socratic":
        style_instruction = "IMPORTANT style instruction: Take a Socratic approach. Do not give the answers away completely. Provide structured clues, prompt the student to think, and ask guiding questions to let them figure out the core logic themselves. Keep explanations minimal and question-driven."
    elif tutor_style == "code-first":
        style_instruction = "IMPORTANT style instruction: Focus on implementation details first. Show practical, step-by-step calculations or Python/pseudocode snippets immediately, and explain how the lines of code or values operate to represent the concept."
    elif tutor_style == "elia5":
        style_instruction = "IMPORTANT style instruction: Explain Like I'm 5 (ELIA5). Use extremely simple, clear, and non-technical language. Do not use intimidating jargon. Explain it as if you are talking to a smart child using fun, basic metaphors."

    history_str = ""
    if session_history:
        covered = [h["topic"] for h in session_history]
        history_str = f"\nTopics already covered this session: {', '.join(covered)}. Build on these where relevant but don't repeat them."

    context_str = f"\n\nTextbook context:\n{context}" if context else ""

    system = f"""You are a sharp tutor for engineering students. No filler phrases. No "Great question!" or "Sure!".
{style_instruction}

Respond in EXACTLY this format with these exact section headers:

**Explanation**: [one sentence, what it is in plain language]

**Key Points**:
- [Key point 1 - one line, concrete]
- [Key point 2 - one line, concrete]
- [Key point 3 - one line, concrete]

**Analogy**: [one sentence real-world analogy]

**Example**:
[Either a self-contained Python code block wrapped in triple backticks (max 12 lines) OR a concrete numerical/logical calculation example with specific values (max 6 lines). Do NOT use Python code if the subject is not programming-based (e.g. for Subnet Mask, show a concrete IP/subnet calculation instead of Python code).]

**Check**: [one open-ended question the student must answer in their own words. Accept pseudocode — idea matters not syntax.]
{history_str}"""

    stream = create_chat_completion(
        client,
        model=MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": f"Explain: {topic}{context_str}"},
        ],
        stream=True,
        max_tokens=1000,
        temperature=0.5,
    )

    for chunk in stream:
        delta = chunk.choices[0].delta
        if delta.content:
            yield delta.content


def follow_up_stream(
    topic: str,
    question: str,
    context: str,
    conversation_history: list,
    session_history: list,
    tutor_style: str = "balanced",
) -> Generator:
    """Stream answer to a follow-up question."""
    client = get_client()

    style_instruction = ""
    if tutor_style == "analogy-first":
        style_instruction = "Use analogies and metaphors as much as possible to answer follow-up questions."
    elif tutor_style == "socratic":
        style_instruction = "Do not answer the question directly. Ask a guiding question or give a hint to lead the student to find the answer themselves."
    elif tutor_style == "code-first":
        style_instruction = "Provide a concrete code snippet or pseudocode step to answer the follow-up, keeping it under 10 lines."
    elif tutor_style == "elia5":
        style_instruction = "Explain your answer using very simple, child-friendly terms and metaphors."

    system = f"""You are a tutor. The student is learning about "{topic}".
{style_instruction}
Answer follow-up questions in 2-4 sentences or bullet points.
Stay on topic. If asked something unrelated, redirect: "Let's stay focused on {topic} for now."
Use pure Python only if showing code, under 10 lines, concrete values only.
No imports in code examples."""

    messages = [{"role": "system", "content": system}]
    # Add conversation history
    for msg in conversation_history[-6:]:
        messages.append(msg)
    messages.append({"role": "user", "content": question})

    stream = create_chat_completion(
        client,
        model=MODEL,
        messages=messages,
        stream=True,
        max_tokens=400,
        temperature=0.6,
    )

    for chunk in stream:
        delta = chunk.choices[0].delta
        if delta.content:
            yield delta.content


def assessor(topic: str, explanation: str, student_answer: str, session_history: list) -> dict:
    """Assess student's understanding. Non-streaming."""
    client = get_client()

    system = """Assess if the student understood the concept.
Be LENIENT — pseudocode and informal language are fine if the core idea is correct.
Score 4+ if the core concept is right, regardless of syntax or phrasing.

Scoring rubric:
5 = correct, well explained
4 = correct idea, minor gaps or informal phrasing (THIS IS FINE — reward understanding)
3 = partially right, missing one key piece
2 = some awareness but real misconception present
1 = wrong or no attempt

Return ONLY valid JSON, no other text:
{
  "score": <1-5>,
  "verdict": "<UNDERSTOOD|PARTIAL|CONFUSED>",
  "feedback": "<one sentence>",
  "recommendations": ["<related/underlying concept 1>", "<related/underlying concept 2>"]
}

VERDICT mapping:
- score 4-5 → UNDERSTOOD (In this case, fill 'recommendations' with 2-3 specific related/underlying concepts to learn next)
- score 3 → PARTIAL (set 'recommendations' to empty array [])
- score 1-2 → CONFUSED (set 'recommendations' to empty array [])"""

    try:
        response = create_chat_completion(
            client,
            model=MODEL,
            messages=[
                {"role": "system", "content": system},
                {
                    "role": "user",
                    "content": f"Topic: {topic}\n\nOriginal explanation given:\n{explanation}\n\nStudent's answer:\n{student_answer}",
                },
            ],
            max_tokens=300,
            temperature=0.3,
            response_format={"type": "json_object"}
        )
        raw = response.choices[0].message.content.strip()
        return parse_json_safely(raw)
    except Exception as e:
        logger.error(f"Assessor error: {e}")
        return {"score": 3, "verdict": "PARTIAL", "feedback": "Could not fully assess — try explaining again.", "recommendations": []}


def reexplainer(topic: str, context: str, focus: str, session_history: list) -> str:
    """Re-explain from scratch with different angle. Non-streaming."""
    client = get_client()

    focus_map = {
        "concept": "Focus on the core concept and what it does. Use a different real-world analogy.",
        "syntax": "Focus on the code mechanics. Show a step-by-step trace with concrete values.",
        "analogy": "Use a completely different analogy. Focus on intuition, no code.",
    }
    focus_instruction = focus_map.get(focus, "Re-explain from a fresh angle.")

    context_str = f"\n\nTextbook context:\n{context}" if context else ""

    system = f"""Re-explain {topic} from scratch. Simpler, different angle.
{focus_instruction}
3-4 sentences or bullet points. End with one simple check question.
No filler phrases."""

    try:
        response = create_chat_completion(
            client,
            model=MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": f"Re-explain {topic}{context_str}"},
            ],
            max_tokens=400,
            temperature=0.7,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Reexplainer error: {e}")
        return f"Let's try again with {topic}. The core idea is: [explanation unavailable — check API key]."


def quiz_generator(topic: str, context: str, difficulty: int) -> list:
    """Generate 3 MCQ questions. Non-streaming."""
    client = get_client()

    difficulty_map = {
        1: "basic conceptual implementation and system behavior",
        2: "scenario application (apply the concept to a real troubleshooting or coding setup)",
        3: "advanced analysis (evaluate performance, edge cases, diagnosis, or system stability)",
    }
    diff_desc = difficulty_map.get(difficulty, "basic implementation")

    context_str = f"\n\nTextbook context:\n{context}" if context else ""

    system = f"""You are a university engineering professor designing rigorous exam questions.
Generate 3 MCQ questions about "{topic}" for a student.

Difficulty level: {diff_desc}

Strict Rules:
1. NO simple recall or definition questions. Do NOT ask questions like "What is X?" or "Which of the following defines X?".
2. Every question MUST be dynamic and scenario-based, featuring real-world engineering setups, system faults, code tracing, protocol header states, or circuit troubleshooting.
3. Distractors (wrong options) must represent common student misconceptions or logical errors, not obvious filler.
4. Each option should require active reasoning to evaluate.
5. Provide a clear, detailed step-by-step conceptual or mathematical explanation for the correct choice.

Return ONLY a valid JSON object with a "questions" key containing the list of 3 questions:
{{
  "questions": [
    {{
      "question": "[Scenario-based question text]",
      "options": {{"A": "...", "B": "...", "C": "...", "D": "..."}},
      "answer": "B",
      "explanation": "[Detailed step-by-step diagnostic explanation]"
    }}
  ]
}}"""

    try:
        response = create_chat_completion(
            client,
            model=MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": f"Generate quiz questions for: {topic}{context_str}"},
            ],
            max_tokens=1500,
            temperature=0.6,
            response_format={"type": "json_object"}
        )
        raw = response.choices[0].message.content.strip()
        data = parse_json_safely(raw)
        return data.get("questions", [])
    except Exception as e:
        logger.error(f"Quiz generator error: {e}")
        return [
            {
                "question": f"What is the behavior of {topic} under a standard load?",
                "options": {"A": "Option A", "B": "Option B", "C": "Option C", "D": "Option D"},
                "answer": "A",
                "explanation": "Could not generate quiz — check API connection.",
            }
        ]


def visualization_generator(topic: str, concept_description: str, context: str) -> dict:
    """Generate a visualization (p5.js or mermaid diagram) for a concept. Non-streaming."""
    client = get_client()

    system = """You are a master of creative coding and interactive education. Generate a self-contained visualization for an engineering or computer science concept.

Choose the best representation format:
- "mermaid": Use if the concept is structural, hierarchical, or logical (e.g. binary trees, BSTs, AVL trees, general graphs, network topologies, TCP/IP/OSI layers, sequence flows, state machines, packet encapsulation, flowcharts, queues/stacks structures).
- "p5js": Use if the concept is dynamic, mathematical, continuous, or requires physical animations (e.g. sorting array bar swaps, PID loop responses, CMOS transistor switches, Bode plots, Fourier waveforms).

Theme (Neo-Brutalism style matching the main site):
- Background: cream background (#FFFDF5)
- Border: thick black border (strokeWeight(3) or solid borders)
- Accent colors: Crimson (#FF6B6B), Purple (#7678ED), Yellow (#F7B801), Green (#38B000).

Format rules:
1. For "mermaid":
   - Return a valid, clean Mermaid diagram (e.g. graph TD, sequenceDiagram, stateDiagram-v2).
   - Draw elements clearly and label them. Avoid special characters in node IDs (or wrap them in double quotes like A["Node A"]).
   - Edge arrows must be valid (e.g., use `A -->|Label| B` or `A -- Label --> B`). Do NOT append trailing arrowhead symbols inside or after the label (e.g., do NOT write `A -->|Label|> B`).
   - Do NOT style diagram syntax keywords (e.g., do NOT write `style graph fill:...` or `style flowchart fill:...` as `graph` and `flowchart` are reserved keywords and will cause syntax errors). Only style defined node IDs (e.g., `style A fill:...`).
2. For "p5js":
   - Return raw self-contained p5.js code (setup(), draw(), mousePressed(), etc.) with a responsive canvas (createCanvas(windowWidth, windowHeight)).
   - Implement windowResized() { resizeCanvas(windowWidth, windowHeight); }.
   - Keep code concise, clean, and under 200 lines. Use loops/arrays instead of hardcoding repetitive step-by-step logic.
   - Separate workspace layout: Left/Right Side Console Panel card (for text logs/DSU states), Main Workspace (for graph/tree), and Bottom Controls Bar (for buttons).
   - ALWAYS call noStroke() right before rendering text using text() to prevent blurry outlines.

Return ONLY a valid JSON object, with no markdown code fences:
{
  "type": "mermaid" | "p5js",
  "code": "[The Mermaid syntax string OR raw p5.js code]"
}"""

    prompt = f"""Create a visualization for: {topic}

Concept: {concept_description}

Decide on the format ('mermaid' or 'p5js') and return the valid JSON containing the code."""

    try:
        response = create_chat_completion(
            client,
            model=MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            max_tokens=3000,
            temperature=0.5,
            response_format={"type": "json_object"}
        )
        raw = response.choices[0].message.content.strip()
        data = parse_json_safely(raw)
        return {
            "type": data.get("type", "p5js"),
            "code": data.get("code", "")
        }
    except Exception as e:
        logger.error(f"visualization_generator error: {e}")
        return {
            "type": "p5js",
            "code": _fallback_p5js(topic)
        }


def _escape_js_string(s: str) -> str:
    return s.replace('\\', '\\\\').replace("'", "\\'").replace('\n', ' ')


def _fallback_p5js(topic: str) -> str:
    topic_escaped = _escape_js_string(topic)
    return f"""
function setup() {{
  createCanvas(600, 400);
  textAlign(CENTER, CENTER);
}}
function draw() {{
  background(255);
  fill('#1E293B');
  textSize(18);
  text('{topic_escaped}', width/2, height/2 - 20);
  textSize(13);
  fill('#64748B');
  text('Visualization loading...', width/2, height/2 + 20);
}}
"""


def discover_prerequisites(topic: str, context: str) -> list:
    """Discover 2-3 underlying prerequisite concepts for a topic. Non-streaming."""
    client = get_client()

    system = """You are an engineering curriculum designer. Identify 2-3 essential underlying or prerequisite concepts that are necessary to fully understand the given topic.
For example, prerequisites for "Dijkstra's Algorithm" might be "Breadth-First Search (BFS)" and "Priority Queue / Min-Heap".
Prerequisites for "TCP Handshake" might be "IP Packets" and "Connectionless vs Connection-oriented".

Return ONLY a valid JSON object with a 'prerequisites' key pointing to a list of strings:
{
  "prerequisites": [
    "Prerequisite Topic 1",
    "Prerequisite Topic 2"
  ]
}"""

    context_str = f"\n\nTextbook context:\n{context}" if context else ""

    try:
        response = create_chat_completion(
            client,
            model=MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": f"Discover prerequisites for: {topic}{context_str}"},
            ],
            max_tokens=200,
            temperature=0.3,
            response_format={"type": "json_object"}
        )
        raw = response.choices[0].message.content.strip()
        data = parse_json_safely(raw)
        return data.get("prerequisites", [])
    except Exception as e:
        logger.error(f"discover_prerequisites error: {e}")
        return []

