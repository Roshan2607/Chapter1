"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthContext";
import ArrowIcon from "@/components/ArrowIcon";
import ScrollReveal from "@/components/ScrollReveal";
import { clearVisualizationCache } from "@/lib/api";

/* ── Shared primitives ───────────────────────────────────────── */
const Star = ({
  size = 24,
  className = "",
}: {
  size?: number;
  className?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
  </svg>
);

function MarqueeStrip() {
  const text =
    "★ RAW SYLLABUS INGESTION ★ DYNAMIC KNOWLEDGE GRAPH ★ ADAPTIVE RE-EXPLANATIONS ★ CONTINUOUS ASSESSMENT ★";
  return (
    <div className="overflow-hidden bg-neo-accent border-y-4 border-black py-4 relative">
      <div
        className="flex whitespace-nowrap animate-marquee will-change-transform"
        aria-hidden="true"
      >
        {[text, text].map((t, i) => (
          <span
            key={i}
            className="text-white font-black uppercase tracking-widest text-base flex-shrink-0 px-6"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

const STATS = [
  { value: "4", label: "AI AGENTS", sub: "working in sequence" },
  { value: "RAG", label: "GROUNDED", sub: "from your textbook" },
  { value: "3×", label: "DIFFICULTY", sub: "progressive quizzes" },
  { value: "0", label: "HALLUCINATIONS", sub: "from curriculum only" },
];

const STEPS = [
  {
    n: "01",
    title: "ASK A TOPIC",
    desc: "Type any concept from your syllabus. The AI retrieves your textbook — not the internet.",
    bg: "bg-neo-muted",
  },
  {
    n: "02",
    title: "EXPLORE FREELY",
    desc: "Read a structured explanation, see an interactive visual, ask unlimited follow-up questions.",
    bg: "bg-white",
  },
  {
    n: "03",
    title: "GET TESTED",
    desc: "Take a quiz across 3 difficulty levels. Scoring below 40% triggers an automatic re-explanation.",
    bg: "bg-neo-secondary",
  },
  {
    n: "04",
    title: "APPLY IT",
    desc: "Finish with an open-ended application question. The AI checks your reasoning — not your syntax.",
    bg: "bg-neo-accent",
  },
];

export default function HomePage() {
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tutorStyle, setTutorStyle] = useState("balanced");
  const [cacheStatus, setCacheStatus] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("chapter1_tutor_style") || "balanced";
      setTutorStyle(saved);
    }
  }, []);

  const handleTutorStyleChange = (val: string) => {
    setTutorStyle(val);
    localStorage.setItem("chapter1_tutor_style", val);
  };

  const handleClearAllCaches = async () => {
    setCacheStatus("Clearing...");
    try {
      await Promise.all([
        clearVisualizationCache("dsa"),
        clearVisualizationCache("dvlsi"),
        clearVisualizationCache("cs"),
        clearVisualizationCache("networks"),
      ]);
      setCacheStatus("Cache cleared ✓");
      setTimeout(() => setCacheStatus(null), 3000);
    } catch (e: any) {
      setCacheStatus(`Error: ${e.message || "Failed"}`);
      setTimeout(() => setCacheStatus(null), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-neo-bg bg-dots font-sans">
      {/* ── Nav ────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white border-b-4 border-black px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => router.push("/")}>
            <img src="/logo.png" alt="Chapter1 Logo" className="h-20 w-auto" />
            <span className="font-heading font-black text-4xl uppercase tracking-tighter hidden sm:block">
              Chapter1
            </span>
          </div>

          {/* Right */}
          <div className="flex items-center gap-5">
            {isAuthenticated ? (
              <>
                <span className="text-sm font-black uppercase text-black hidden md:inline">
                  Hello, {user?.name}
                </span>

                {/* Tutor Settings Widget */}
                <div className="relative">
                  <button
                    onClick={() => setSettingsOpen(!settingsOpen)}
                    className="text-xs font-black uppercase tracking-wider text-black hover:text-neo-accent transition-colors flex items-center gap-1.5"
                  >
                    <span>Tutor Settings</span>
                  </button>
                  {settingsOpen && (
                    <div className="absolute right-0 mt-3 w-64 border-4 border-black bg-white shadow-neo p-4 z-50 text-left">
                      <p className="text-[10px] font-black uppercase tracking-widest text-black/50 mb-2">
                        Tutor Persona
                      </p>
                      <select
                        value={tutorStyle}
                        onChange={(e) => handleTutorStyleChange(e.target.value)}
                        className="neo-input w-full px-2 py-1.5 text-xs font-sans font-bold bg-white mb-3"
                        style={{ border: "2px solid #000" }}
                      >
                        <option value="balanced">Balanced & Structured</option>
                        <option value="analogy-first">Analogy-First Explainer</option>
                        <option value="socratic">Socratic Guide</option>
                        <option value="code-first">Code/Logic-First</option>
                        <option value="elia5">Explain Like I'm 5</option>
                      </select>
                      
                      <button
                        onClick={handleClearAllCaches}
                        className="w-full border-2 border-black bg-neutral-50 hover:bg-neutral-100 text-[10px] font-black uppercase tracking-wider py-1.5 shadow-neo-sm"
                      >
                        Clear visuals cache
                      </button>
                      
                      {cacheStatus && (
                        <p className="text-[9px] font-black text-neo-accent mt-2 text-center">
                          {cacheStatus}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={logout}
                  className="text-xs font-black uppercase tracking-wider text-black hover:text-neo-accent transition-colors"
                >
                  Log Out
                </button>
                <button
                  id="nav-cta"
                  onClick={() => router.push("/subjects")}
                  className="neo-btn bg-neo-accent text-white shadow-neo-sm px-5 py-2 text-sm flex items-center gap-1.5 group"
                >
                  <span>Enter Platform</span>
                  <ArrowIcon size={14} className="text-white" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => router.push("/login")}
                  className="text-xs font-black uppercase tracking-wider text-black hover:text-neo-accent transition-colors"
                >
                  Log In
                </button>
                <button
                  id="nav-cta"
                  onClick={() => router.push("/login")}
                  className="neo-btn bg-neo-accent text-white shadow-neo-sm px-5 py-2 text-sm flex items-center gap-1.5 group"
                >
                  <span>Get Started</span>
                  <ArrowIcon size={14} className="text-white" />
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative max-w-7xl mx-auto px-6 pt-16 pb-12 lg:pt-24 lg:pb-20">
        <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-10 lg:gap-16 items-center">

          {/* Left */}
          <div className="relative z-10">
            {/* Floating badge */}
            <div className="neo-badge mb-8 inline-block animate-sticker rotate-[-2deg]">
              <Star size={10} className="inline mr-1 mb-0.5" />
              ADAPTIVE LEARNING SYSTEM
              <Star size={10} className="inline ml-1 mb-0.5" />
            </div>

            {/* Headline */}
            <h1 className="font-heading font-black leading-[0.88] tracking-tighter mb-6">
              <span className="block text-6xl sm:text-7xl md:text-8xl lg:text-[96px] text-black font-heading fade-up" style={{ animationDelay: "0ms" }}>
                DON'T KNOW
              </span>
              <span className="block text-6xl sm:text-7xl md:text-8xl lg:text-[96px] text-black font-heading fade-up" style={{ animationDelay: "100ms" }}>
                WHAT
              </span>
              <span className="block text-6xl sm:text-7xl md:text-8xl lg:text-[96px] text-neo-accent font-heading fade-up" style={{ animationDelay: "200ms" }}>
                YOU
              </span>
              <span className="block text-6xl sm:text-7xl md:text-8xl lg:text-[96px] text-neo-muted font-heading fade-up" style={{ animationDelay: "300ms" }}>
                DON'T KNOW?
              </span>
            </h1>

            {/* Sub-copy */}
            <p className="text-base sm:text-lg font-extrabold text-black leading-snug mb-10 max-w-xl border-4 border-black border-l-8 border-l-neo-accent pl-5 bg-white p-4 fade-up" style={{ animationDelay: "400ms" }}>
              Drop your PDF. Ask a topic. Get a structured explanation
              grounded in your syllabus, an interactive visual, and a quiz
              that adapts to what you do not know.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-wrap gap-4">
              <button
                id="hero-cta-primary"
                onClick={() => router.push("/subjects")}
                className="neo-btn bg-neo-accent text-white shadow-neo px-8 py-4 text-base flex items-center gap-2 group"
              >
                <span>Choose a Subject</span>
                <ArrowIcon size={18} className="text-white" />
              </button>
              <button
                id="hero-cta-secondary"
                onClick={() =>
                  document
                    .getElementById("how")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="neo-btn bg-white shadow-neo-sm px-8 py-4 text-base flex items-center gap-2 group"
              >
                <span>How It Works</span>
                <ArrowIcon direction="down" size={18} className="text-black" />
              </button>
            </div>

            <p className="mt-6 text-xs font-black uppercase tracking-widest text-black">
              Free · No login · No hallucination
            </p>
          </div>

          {/* Right — Chaos zone */}
          <div className="relative hidden lg:block fade-up" style={{ animationDelay: "300ms" }}>
            {/* Outer box */}
            <div className="border-4 border-black bg-neo-muted shadow-neo-xl p-10 rotate-1 relative overflow-hidden">
              {/* Halftone background */}
              <div className="absolute inset-0 bg-halftone opacity-[0.08] pointer-events-none" />

              {/* Solid PDF text */}
              <div className="font-heading font-black leading-none tracking-tighter relative z-10 select-none text-black mb-8" style={{ fontSize: "110px" }}>
                PDF
              </div>

              {/* Mini sticker cards spaced better to avoid collision */}
              <div className="absolute top-4 right-4 bg-white border-4 border-black shadow-neo-sm px-4 py-3 rotate-[3deg] z-20">
                <p className="text-[10px] font-black uppercase tracking-widest text-neo-accent">
                  RECURSION
                </p>
                <p className="text-xs font-black">UNDERSTOOD ✓</p>
              </div>

              <div className="absolute top-32 right-8 bg-neo-muted border-4 border-black shadow-neo px-4 py-3 -rotate-[2deg] z-20">
                <p className="text-[10px] font-black uppercase tracking-widest">
                  QUIZ SCORE
                </p>
                <p className="font-black text-2xl">3/3</p>
              </div>

              {/* Bottom stat chips */}
              <div className="flex gap-4 relative z-10">
                <div className="border-4 border-black bg-white px-4 py-3 shadow-neo-sm">
                  <p className="text-[9px] font-black uppercase tracking-widest">
                    Topics covered
                  </p>
                  <p className="font-black text-3xl">12</p>
                </div>
                <div className="border-4 border-black bg-neo-accent px-4 py-3 shadow-neo-sm">
                  <p className="text-[9px] font-black uppercase tracking-widest text-white">
                    Difficulty
                  </p>
                  <p className="font-black text-3xl text-white">L3</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Marquee ─────────────────────────────────────────────── */}
      <MarqueeStrip />

      {/* ── Stats row ───────────────────────────────────────────── */}
      <section className="py-16 bg-neo-bg">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {STATS.map((s, i) => (
              <ScrollReveal
                key={i}
                delay={i * 100}
                className="neo-card neo-card-lift bg-white shadow-neo p-6 text-center"
              >
                <div className="font-heading font-black text-5xl text-neo-accent mb-1">
                  {s.value}
                </div>
                <div className="font-heading font-black text-xs uppercase tracking-widest mb-1">
                  {s.label}
                </div>
                <div className="text-[11px] font-extrabold text-black/75 uppercase tracking-wide">
                  {s.sub}
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────── */}
      <section id="how" className="border-t-4 border-black">
        {/* Section header — black band */}
        <div className="bg-black border-b-4 border-black px-6 py-14">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <h2 className="font-heading font-black text-5xl sm:text-7xl tracking-tighter text-white">
                HOW IT
              </h2>
              <h2 className="font-heading font-black text-5xl sm:text-7xl tracking-tighter text-neo-accent -mt-2">
                WORKS.
              </h2>
            </div>
            <Star
              size={72}
              className="text-neo-accent animate-spin-slow hidden sm:block"
            />
          </div>
        </div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-b-4 border-black">
          {STEPS.map((step, i) => (
            <ScrollReveal
              key={i}
              delay={i * 100}
              className={`${step.bg} p-8 border-r-4 border-b-4 sm:border-b-0 border-black last:border-r-4 lg:last:border-r-0 neo-card-lift neo-card transition-all duration-200`}
              style={{ border: "none", borderRight: "4px solid #000" }}
            >
              <div className="font-heading font-black mb-4 leading-none select-none text-black/20" style={{ fontSize: "72px" }}>
                {step.n}
              </div>
              <h3 className="font-heading font-black text-lg uppercase tracking-tight mb-3">
                {step.title}
              </h3>
              <p className="font-extrabold text-sm text-black leading-relaxed">{step.desc}</p>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ── Methodology (RPKT) ─────────────────────────────────────── */}
      <section className="border-t-4 border-black bg-[#FFFDF5] py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-12 items-center">
            {/* Left */}
            <div>
              <div className="neo-badge mb-6 inline-block bg-neo-accent text-white">
                Core IP & Methodology
              </div>
              <h2 className="font-heading font-black text-4xl sm:text-5xl leading-none tracking-tighter text-black mb-6">
                RECURSIVE PREREQUISITE KNOWLEDGE TRACING <span className="text-neo-accent">(RPKT)</span>
              </h2>
              <p className="text-sm font-extrabold leading-relaxed text-black mb-6">
                Most adaptive learning systems rely on rigid, pre-authored knowledge graphs. Chapter1 operates on a dynamic framework developed to solve the <strong>"unknown unknowns"</strong> problem in self-directed education.
              </p>
              <div className="border-l-8 border-black pl-5 py-2">
                <p className="text-xs font-black uppercase tracking-widest text-black mb-1">
                  Scientific Basis
                </p>
                <p className="text-sm font-black italic">
                  "Students struggle to recognize what they don't know they need to learn. RPKT recursively traces prerequisites in real-time to locate the exact knowledge boundaries."
                </p>
              </div>
            </div>

            {/* Right — Concept cards */}
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                { n: "01", title: "Cognitive Load Control", desc: "Instead of forcing confused students to formulate search queries, our system tracks check-ins and routes them to clear, structured concept pathways.", bg: "bg-neo-secondary", text: "text-black" },
                { n: "02", title: "Prerequisite Calibration", desc: "When a quiz performance highlights a gap, the system doesn't just loop the same lecture—it suggests underlying mathematical/logical topics to calibrate baselines.", bg: "bg-neo-muted", text: "text-black" },
                { n: "03", title: "Active Clarification Loops", desc: "Quiz failures route users to clear categorization choices (Concept, Code/Syntax, or Analogy), dynamically generating targeted micro-explanations.", bg: "bg-neo-accent", text: "text-white" },
                { n: "04", title: "Continuous Assessment", desc: "Adaptive assessments check structural understanding and reasoning rather than syntax, keeping learning grounded in engineering syllabus parameters.", bg: "bg-white", text: "text-black" }
              ].map((item, idx) => (
                <ScrollReveal
                  key={idx}
                  delay={idx * 150}
                  className={`border-4 border-black ${item.bg} shadow-neo p-6`}
                >
                  <span className={`w-8 h-8 border-4 border-black bg-black text-${item.bg.replace("bg-", "") === "white" ? "white" : "neo-muted"} font-heading font-black text-xs flex items-center justify-center mb-4 shadow-neo-sm`}>
                    {item.n}
                  </span>
                  <h3 className={`font-heading font-black text-sm uppercase tracking-tight mb-2 ${item.text}`}>
                    {item.title}
                  </h3>
                  <p className={`text-xs font-extrabold leading-relaxed ${item.text}`}>
                    {item.desc}
                  </p>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────── */}
      <section className="bg-black border-t-4 border-black py-24 px-6">
        <ScrollReveal className="max-w-4xl mx-auto text-center">
          <h2 className="font-heading font-black mb-4 tracking-tighter">
            <span className="block text-5xl sm:text-7xl text-white font-heading">
              READY TO
            </span>
            <span className="block text-5xl sm:text-7xl text-neo-accent font-heading">
              LEARN?
            </span>
          </h2>
          <p className="text-white font-extrabold text-base mb-10 max-w-lg mx-auto">
            A complete learning pipeline that ingests your syllabus, generates interactive visualisations, and adapts to your knowledge gaps in real-time.
          </p>
          <button
            id="footer-cta"
            onClick={() => router.push(isAuthenticated ? "/subjects" : "/login")}
            className="neo-btn bg-neo-accent text-white shadow-neo-red px-12 py-5 text-xl flex items-center justify-center gap-2 mx-auto group"
          >
            <span>Get Started</span>
            <ArrowIcon size={20} className="text-white" />
          </button>
        </ScrollReveal>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="bg-black text-white border-t-4 border-black py-16 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Col 1 */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <img src="/logo.png" alt="Chapter1 Logo" className="h-16 w-auto bg-white p-1 border-2 border-white" />
              <span className="font-heading font-black uppercase tracking-tighter text-3xl text-white">
                Chapter1
              </span>
            </div>
            <p className="text-xs font-extrabold leading-relaxed text-neutral-200">
              Personalized, adaptive syllabus tutoring grounded in your textbook. Break the blind spot, master the unknown.
            </p>
            <p className="text-xs font-extrabold text-neutral-400">
              © {new Date().getFullYear()} Chapter1. All rights reserved.
            </p>
          </div>

          {/* Col 2 */}
          <div>
            <h4 className="text-xs font-heading font-black uppercase tracking-widest text-neo-accent mb-4">
              Platform
            </h4>
            <ul className="space-y-2 text-xs font-extrabold text-neutral-300">
              <li>
                <a onClick={() => router.push("/subjects")} className="hover:text-white cursor-pointer transition-colors">
                  Syllabus List
                </a>
              </li>
              <li>
                <a onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-white cursor-pointer transition-colors">
                  How it Works
                </a>
              </li>
              <li>
                <a onClick={() => router.push("/login")} className="hover:text-white cursor-pointer transition-colors">
                  Student Login
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3 */}
          <div>
            <h4 className="text-xs font-heading font-black uppercase tracking-widest text-neo-accent mb-4">
              Methodology
            </h4>
            <ul className="space-y-2 text-xs font-extrabold text-neutral-300">
              <li>
                <span className="text-neutral-300">
                  Recursive Tracing (RPKT)
                </span>
              </li>
              <li>
                <span className="text-neutral-300">
                  Active Clarification Loops
                </span>
              </li>
              <li>
                <span className="text-neutral-300">
                  Adaptive Assessments
                </span>
              </li>
            </ul>
          </div>

          {/* Col 4 */}
          <div>
            <h4 className="text-xs font-heading font-black uppercase tracking-widest text-neo-muted mb-4">
              Legal & Info
            </h4>
            <ul className="space-y-2 text-xs font-extrabold text-neutral-300">
              <li>
                <span className="text-neutral-300">
                  Built for Engineering Students
                </span>
              </li>
              <li>
                <span className="text-neutral-300">
                  Free & Open Source
                </span>
              </li>
              <li>
                <span className="text-neutral-300">
                  Built in Bengaluru
                </span>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}