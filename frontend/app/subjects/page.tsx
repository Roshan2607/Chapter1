"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getIndexStatus, buildIndex, createSession, uploadPdf, updateSessionSettings } from "@/lib/api";
import ArrowIcon from "@/components/ArrowIcon";
import ScrollReveal from "@/components/ScrollReveal";

const Star = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
  </svg>
);

interface SubjectDef {
  key: string;
  name: string;
  description: string;
  tag: string;
  accent: string;         /* bg class */
  accentText: string;     /* text class on accent bg */
  accentBorder: string;   /* border class inside accent zone */
}

const SUBJECTS: SubjectDef[] = [
  {
    key: "dsa",
    name: "Data Structures & Algorithms",
    description: "Trees, graphs, sorting, hashing, dynamic programming, and core problem-solving.",
    tag: "CSE",
    accent: "bg-neo-accent",
    accentText: "text-white",
    accentBorder: "border-white/50",
  },
  {
    key: "dvlsi",
    name: "Digital VLSI",
    description: "Logic gates, sequential circuits, CMOS design, timing analysis, and verification.",
    tag: "ECE",
    accent: "bg-neo-secondary",
    accentText: "text-black",
    accentBorder: "border-black/30",
  },
  {
    key: "cs",
    name: "Control Systems",
    description: "Feedback loops, transfer functions, stability criteria, and response analysis.",
    tag: "ECE",
    accent: "bg-neo-muted",
    accentText: "text-black",
    accentBorder: "border-black/30",
  },
  {
    key: "networks",
    name: "Computer Networks",
    description: "OSI layers, routing algorithms, TCP/IP stack, congestion control, and protocols.",
    tag: "CSE",
    accent: "bg-black",
    accentText: "text-white",
    accentBorder: "border-white/30",
  },
];

const SUBJECT_SHADOWS: Record<string, string> = {
  dsa: "hover:shadow-[12px_12px_0px_0px_#FF6B6B]",
  dvlsi: "hover:shadow-[12px_12px_0px_0px_#FFD93D]",
  cs: "hover:shadow-[12px_12px_0px_0px_#C4B5FD]",
  networks: "hover:shadow-[12px_12px_0px_0px_#000]",
};

const SUBJECT_HOVER_TEXTS: Record<string, string> = {
  dsa: "group-hover:text-neo-accent",
  dvlsi: "group-hover:text-neo-secondary",
  cs: "group-hover:text-[#8B5CF6]",
  networks: "group-hover:text-neutral-700",
};

const SUBJECT_HOVER_BG: Record<string, string> = {
  dsa: "hover:bg-neo-accent hover:text-white",
  dvlsi: "hover:bg-neo-secondary hover:text-black",
  cs: "hover:bg-neo-muted hover:text-black",
  networks: "hover:bg-black hover:text-white",
};

export default function SubjectsPage() {
  const router = useRouter();
  const [indexStatus, setIndexStatus] = useState<Record<string, any>>({});
  const [building, setBuilding] = useState<string | null>(null);
  const [starting, setStarting] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchStatus(); }, []);

  async function fetchStatus() {
    try {
      const s = await getIndexStatus();
      setIndexStatus(s);
    } catch { /* no backend yet */ }
  }

  async function handleStart(key: string) {
    setStarting(key);
    setError(null);
    try {
      const sid = await createSession(key);
      localStorage.setItem(`session_${key}`, sid);
      const globalStyle = typeof window !== "undefined" ? (localStorage.getItem("chapter1_tutor_style") || "balanced") : "balanced";
      try {
        await updateSessionSettings(sid, { tutor_style: globalStyle });
      } catch (e) {
        console.error(e);
      }
      router.push(`/learn/${key}?session=${sid}`);
    } catch (e: any) {
      setError(
        e.message ||
        "Could not connect to backend. Make sure the server is running on port 8000."
      );
      setStarting(null);
    }
  }

  async function handleBuild(key: string) {
    setBuilding(key);
    setError(null);
    try {
      await buildIndex(key);
      await fetchStatus();
    } catch (e: any) {
      setError(e.message || "Failed to build index.");
    } finally {
      setBuilding(null);
    }
  }

  async function handleUpload(key: string, file: File) {
    setUploading(key);
    setError(null);
    try {
      await uploadPdf(key, file);
      await fetchStatus();
      
      // Poll backend every 3s to track background indexing progress
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        try {
          const s = await getIndexStatus();
          setIndexStatus(s);
          if (s[key]?.built) {
            clearInterval(interval);
          }
        } catch {}
        if (attempts >= 15) {
          clearInterval(interval);
        }
      }, 3000);
    } catch (e: any) {
      setError(e.message || "Failed to upload file.");
    } finally {
      setUploading(null);
    }
  }

  return (
    <div className="min-h-screen bg-neo-bg bg-dots">
      {/* ── Nav ──────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white border-b-4 border-black px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            id="nav-back"
            onClick={() => router.push("/")}
            className="neo-btn bg-neo-bg shadow-neo-sm px-4 py-2 text-sm flex items-center gap-2 group"
          >
            <ArrowIcon direction="left" size={16} />
            <span>Back</span>
          </button>
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => router.push("/")}>
            <img src="/logo.png" alt="Chapter1 Logo" className="h-20 w-auto" />
            <span className="font-heading font-black text-4xl uppercase tracking-tighter hidden sm:block">
              Chapter1
            </span>
          </div>
          <div className="w-[88px] hidden sm:block" /> {/* Spacer to balance logo */}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-14">
        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="relative mb-14">
          {/* Decorative floating shapes (SVG stars) */}
          <div className="absolute right-10 top-0 text-neo-secondary animate-bounce pointer-events-none opacity-40 hidden md:block" style={{ animationDuration: '4s' }}>
            <Star size={36} />
          </div>
          <div className="absolute right-40 bottom-0 text-neo-muted animate-spin-slow pointer-events-none opacity-40 hidden md:block">
            <Star size={24} />
          </div>
          <div className="absolute left-1/2 top-10 text-neo-accent animate-sticker pointer-events-none opacity-30 hidden lg:block" style={{ animationDuration: '3.5s' }}>
            <Star size={20} />
          </div>

          <div className="neo-badge mb-6 inline-block rotate-[-1deg]">
            <Star size={10} className="inline mr-1 mb-0.5" /> Step 01 of 02
          </div>
          <h1 className="font-heading font-black leading-[0.88] tracking-tighter mb-5">
            <span className="block text-5xl sm:text-7xl md:text-8xl text-black">
              Choose your
            </span>
            <span className="block text-5xl sm:text-7xl md:text-8xl text-neo-accent">
              subject.
            </span>
          </h1>
          <p className="text-base font-serif font-medium text-black max-w-2xl border-l-8 border-black pl-5 leading-snug">
            Drop a textbook PDF to ground explanations in your exact curriculum.
            Works without one — the AI falls back to training data.
          </p>
        </div>

        {/* ── Error ───────────────────────────────────────────────── */}
        {error && (
          <div className="neo-shadow-sm border-4 border-black bg-neo-accent text-white p-4 mb-8 font-black text-sm uppercase tracking-wide">
            Error: {error}
          </div>
        )}

        {/* ── Subject grid ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {SUBJECTS.map((s, i) => {
            const status = indexStatus[s.key];
            const isBuilt = status?.built;
            const hasPdfs = status?.has_pdfs;
            const isBuilding = building === s.key;
            const isStarting = starting === s.key;

            const statusLabel = isBuilt
              ? `${status.count} chunks`
              : hasPdfs
              ? "Needs index"
              : "No PDF";

            return (
              <ScrollReveal
                key={s.key}
                delay={i * 100}
                className={`neo-card bg-white shadow-neo overflow-hidden flex flex-col relative group transition-all duration-300 ease-out hover:-translate-y-2 hover:-translate-x-1 ${SUBJECT_SHADOWS[s.key]}`}
              >
                {/* Accent border strip on the left */}
                <div className="absolute top-0 left-0 w-2 h-full bg-black z-20" />
                <div className={`absolute top-0 left-2 w-2 h-full ${s.accent} z-20`} />

                {/* Coloured header strip */}
                <div
                  className={`${s.accent} border-b-4 border-black px-6 py-4 pl-10 flex items-center justify-between transition-colors duration-300`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`border-2 ${s.accentBorder} ${s.accentText} font-sans font-bold text-[10px] uppercase tracking-widest px-2 py-0.5`}
                    >
                      {s.tag}
                    </span>
                    <span
                      className={`font-sans font-bold text-[10px] uppercase tracking-widest ${s.accentText} opacity-70`}
                    >
                      {s.key}
                    </span>
                  </div>
                  {/* Index status */}
                  <span
                    className={`border-2 ${s.accentBorder} ${s.accentText} font-sans font-bold text-[10px] uppercase tracking-widest px-2 py-0.5`}
                  >
                    {statusLabel}
                  </span>
                </div>

                {/* Card body */}
                <div className="p-6 pl-10 flex flex-col justify-between flex-1 min-h-[300px]">
                  <div>
                    <h2 className={`font-heading font-black text-2xl tracking-tight mb-3 transition-colors duration-200 ${SUBJECT_HOVER_TEXTS[s.key]}`}>
                      {s.name}
                    </h2>
                    <p className="font-serif font-medium text-sm text-black leading-relaxed mb-6">
                      {s.description}
                    </p>

                    {/* Active Textbooks List */}
                    {status?.pdf_files && status.pdf_files.length > 0 && (
                      <div className="mb-6 border-4 border-black bg-stone-50 p-3 shadow-neo-sm">
                        <p className="text-[10px] font-sans font-black uppercase tracking-widest text-neo-accent mb-2">
                          Active textbooks ({status.pdf_files.length})
                        </p>
                        <ul className="text-xs font-bold text-black/80 list-disc list-inside space-y-1">
                          {status.pdf_files.map((name: string) => (
                            <li key={name} className="truncate" title={name}>
                              {name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div>
                    {/* Actions */}
                    <div className="flex gap-3">
                      <button
                        id={`start-${s.key}`}
                        onClick={() => handleStart(s.key)}
                        disabled={!!isStarting || !!building}
                        className={`flex-1 neo-btn ${s.accent} ${s.accentText} shadow-neo py-3.5 text-sm flex items-center justify-center gap-2 group/btn`}
                      >
                        <span>{isStarting ? "Starting..." : "Start learning"}</span>
                        {!isStarting && <ArrowIcon className="group-hover/btn:translate-x-1" size={16} />}
                      </button>

                      {hasPdfs && !isBuilt && (
                        <button
                          id={`index-${s.key}`}
                          onClick={() => handleBuild(s.key)}
                          disabled={!!isBuilding}
                          className="neo-btn bg-white shadow-neo-sm px-4 py-3.5 text-xs font-bold"
                        >
                          {isBuilding ? (
                            <span className="flex items-center gap-2">
                              <span className="w-3 h-3 border-[3px] border-black border-t-transparent animate-spin block" />
                              Indexing
                            </span>
                          ) : (
                            "Index PDF"
                          )}
                        </button>
                      )}
                    </div>

                    <div className={`mt-4 border-2 border-dashed border-black p-3 relative text-center transition-colors duration-150 ${SUBJECT_HOVER_BG[s.key]}`}>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUpload(s.key, file);
                        }}
                        disabled={uploading === s.key}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        title="Upload PDF"
                      />
                      <p className="text-[11px] font-sans font-bold uppercase tracking-widest pointer-events-none">
                        {uploading === s.key 
                          ? "Uploading & indexing..." 
                          : hasPdfs 
                            ? "Add another textbook (PDF)" 
                            : "Click to upload textbook (PDF)"}
                      </p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </main>
    </div>
  );
}
