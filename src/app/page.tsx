"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";

// ─────────────────────────────────────────────────────────────
// POSITIONAL CONTROLS — tweak these values to nudge any layer.
// Positive translateX → right, negative → left
// Positive translateY → down,  negative → up
// ─────────────────────────────────────────────────────────────
const POSITION = {
  badge:    { x: 0,  y: 0  },   // "AI-Powered Learning OS" pill
  heading:  { x: 0,  y: 0  },   // H1 main heading
  subtitle: { x: 0,  y: 8  },   // one-liner below H1
  ctas:     { x: 0,  y: 16 },   // button row
  ticker:   { x: 0,  y: 0  },   // bottom tool ticker
} as const;

// ─────────────────────────────────────────────────────────────
// TICKER CHIP — small labelled pill
// ─────────────────────────────────────────────────────────────
const TOOLS = ["Dojo", "Nexus", "Smart Reader", "Syllabus Sync", "AI Chat", "Feynman Mode", "Nexus Map"];

function ToolTicker() {
  return (
    <div
      className="flex items-center gap-3 overflow-x-auto pb-1 max-w-lg mx-auto"
      style={{
        transform: `translate(${POSITION.ticker.x}px, ${POSITION.ticker.y}px)`,
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      {TOOLS.map((t) => (
        <span
          key={t}
          className="shrink-0 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "rgba(255,255,255,0.65)",
            backdropFilter: "blur(4px)",
          }}
        >
          {t}
        </span>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main
      style={{
        position: "relative",
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* ── BACKGROUND IMAGE ──────────────────────────── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "url('/background1.png')",
          backgroundSize: "cover",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
          zIndex: 0,
        }}
      />

      {/* ── DARK OVERLAY — softens the image so text pops ── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.65) 100%)",
          zIndex: 1,
        }}
      />

      {/* ── THEME TOGGLE (top-right, above everything) ─── */}
      {/* The global ThemeToggle in layout already renders; 
          we override its position here with a local one for the landing page */}
      <div style={{ position: "fixed", top: 16, right: 16, zIndex: 100 }}>
        <ThemeToggle standalone />
      </div>

      {/* ── HERO CONTENT ───────────────────────────────── */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          padding: "0 24px",
          width: "100%",
          maxWidth: "860px",
          gap: "0px",
        }}
      >
        {/* BADGE */}
        {mounted && (
          <span
            className="fade-in"
            style={{
              transform: `translate(${POSITION.badge.x}px, ${POSITION.badge.y}px)`,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 14px",
              borderRadius: "999px",
              fontSize: "12px",
              fontWeight: 500,
              letterSpacing: "0.05em",
              background: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.22)",
              color: "rgba(255,255,255,0.85)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              marginBottom: "28px",
              whiteSpace: "nowrap",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--accent)",
                display: "inline-block",
              }}
            />
            AI-Powered Learning OS
          </span>
        )}

        {/* H1 */}
        <h1
          className="slide-up"
          style={{
            transform: `translate(${POSITION.heading.x}px, ${POSITION.heading.y}px)`,
            fontSize: "clamp(2.5rem, 7vw, 4.5rem)",
            fontWeight: 700,
            fontFamily: "var(--font-inter), sans-serif",
            lineHeight: 1.1,
            color: "#FFFFFF",
            letterSpacing: "-0.02em",
            marginBottom: "20px",
            textShadow: "0 2px 24px rgba(0,0,0,0.5)",
          }}
        >
          Learn Anything.
          <br />
          <span style={{ color: "var(--accent)", filter: "drop-shadow(0 0 20px rgba(96,165,250,0.4))" }}>
            Master Everything.
          </span>
        </h1>

        {/* SUBTITLE */}
        <p
          className="slide-up"
          style={{
            transform: `translate(${POSITION.subtitle.x}px, ${POSITION.subtitle.y}px)`,
            fontSize: "clamp(1rem, 2.5vw, 1.2rem)",
            color: "rgba(255,255,255,0.72)",
            maxWidth: "520px",
            lineHeight: 1.6,
            marginBottom: "36px",
            animationDelay: "60ms",
          }}
        >
          AI-personalized learning paths built from first principles — videos, quizzes, and context in one intelligent workspace.
        </p>

        {/* CTAs */}
        <div
          className="slide-up"
          style={{
            transform: `translate(${POSITION.ctas.x}px, ${POSITION.ctas.y}px)`,
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            justifyContent: "center",
            animationDelay: "120ms",
            marginBottom: "60px",
          }}
        >
          {/* PRIMARY */}
          <button
            id="cta-start-learning"
            onClick={() => router.push("/onboarding")}
            className="scale-in"
            style={{
              padding: "14px 28px",
              borderRadius: "10px",
              background: "var(--accent)",
              color: "#fff",
              fontWeight: 600,
              fontSize: "15px",
              border: "none",
              cursor: "pointer",
              letterSpacing: "0.01em",
              boxShadow: "0 4px 30px rgba(96,165,250,0.35)",
              transition: "background-color 150ms ease, transform 150ms ease, box-shadow 150ms ease",
              animationDelay: "180ms",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--accent-hover)";
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 8px 40px rgba(96,165,250,0.45)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--accent)";
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 30px rgba(96,165,250,0.35)";
            }}
          >
            Start Learning →
          </button>

          {/* SECONDARY */}
          <button
            id="cta-explore-topics"
            onClick={() => router.push("/nexus")}
            className="scale-in"
            style={{
              padding: "14px 28px",
              borderRadius: "10px",
              background: "rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.90)",
              fontWeight: 500,
              fontSize: "15px",
              border: "1px solid rgba(255,255,255,0.22)",
              cursor: "pointer",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              letterSpacing: "0.01em",
              transition: "background-color 150ms ease, border-color 150ms ease, transform 150ms ease",
              animationDelay: "220ms",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.14)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.4)";
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.22)";
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
            }}
          >
            Explore Topics
          </button>
        </div>

        {/* TOOL TICKER */}
        <ToolTicker />
      </div>
    </main>
  );
}
