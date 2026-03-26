"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import ConversationalUI, { ConversationResult } from "@/components/ConversationalUI";

// ─────────────────────────────────
// TYPES
// ─────────────────────────────────
interface RecentSession {
  topic: string;
  timestamp: number;
  route?: string;
}

// ─────────────────────────────────
// QUICK ACTION CARD
// ─────────────────────────────────
function QuickAction({
  emoji,
  label,
  sub,
  onClick,
}: {
  emoji: string;
  label: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="slide-up"
      style={{
        flex: "1 1 160px",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: "6px",
        padding: "16px",
        borderRadius: "10px",
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        cursor: "pointer",
        textAlign: "left",
        transition: "border-color 150ms ease, background-color 150ms ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)";
        (e.currentTarget as HTMLButtonElement).style.background = "var(--accent-soft)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
        (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-card)";
      }}
    >
      <span style={{ fontSize: "20px" }}>{emoji}</span>
      <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{label}</span>
      <span style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.4 }}>{sub}</span>
    </button>
  );
}

// ─────────────────────────────────
// RECENT SESSION CARD
// ─────────────────────────────────
function SessionCard({ session, onClick }: { session: RecentSession; onClick: () => void }) {
  const ago = (() => {
    const diff = Date.now() - session.timestamp;
    const m = Math.floor(diff / 60000);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (d > 0) return `${d}d ago`;
    if (h > 0) return `${h}h ago`;
    if (m > 0) return `${m}m ago`;
    return "just now";
  })();

  return (
    <button
      onClick={onClick}
      className="slide-up"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        padding: "14px 16px",
        borderRadius: "10px",
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
        transition: "border-color 150ms ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-hover)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
        <span
          style={{
            fontSize: "13px",
            fontWeight: 500,
            color: "var(--text-primary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {session.topic}
        </span>
        <span style={{ fontSize: "10px", color: "var(--text-muted)", flexShrink: 0 }}>{ago}</span>
      </div>
      <span style={{ fontSize: "11px", color: "var(--accent)" }}>Continue →</span>
    </button>
  );
}

// ─────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────
export default function AppDashboard() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [query, setQuery] = useState("");
  const [sessions, setSessions] = useState<RecentSession[]>([]);
  const [showChatOverlay, setShowChatOverlay] = useState(false);
  const [chatTopic, setChatTopic] = useState("");

  // Load recent sessions from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("recentSessions");
      if (raw) {
        const parsed: RecentSession[] = JSON.parse(raw);
        setSessions(parsed.slice(0, 4));
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSubmit = () => {
    const topic = query.trim();
    if (!topic) return;

    // Trigger the conversational overlay
    setChatTopic(topic);
    setShowChatOverlay(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSubmit();
  };

  const handleChatComplete = (result: ConversationResult) => {
    try {
      localStorage.setItem("learningContext", JSON.stringify(result.learningContext));

      const route = result.mode === "nexus" 
        ? `/nexus` 
        : `/roadmap?topic=${encodeURIComponent(result.topic)}`;

      const session = { topic: result.topic, timestamp: Date.now(), route };
      const raw = localStorage.getItem("recentSessions");
      const prev = raw ? JSON.parse(raw) : [];
      const updated = [session, ...prev.filter((s: { topic: string }) => s.topic !== result.topic)].slice(0, 20);
      localStorage.setItem("recentSessions", JSON.stringify(updated));
      
      router.push(route);
    } catch { 
      // Fallback
      const route = result.mode === "nexus" 
        ? `/nexus` 
        : `/roadmap?topic=${encodeURIComponent(result.topic)}`;
      router.push(route);
    }
  };

  return (
    <>
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 24px",
          background: "var(--bg-primary)",
        }}
      >
        <div style={{ width: "100%", maxWidth: "680px" }}>

          {/* ── GREETING ─────────────────────────── */}
          <h1
            className="slide-up"
            style={{
              fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
              fontWeight: 700,
              color: "var(--text-primary)",
              textAlign: "center",
              marginBottom: "36px",
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
            }}
          >
            What do you want to{" "}
            <span style={{ color: "var(--accent)" }}>learn today?</span>
          </h1>

          {/* ── MAIN INPUT ────────────────────────── */}
          <div
            className="slide-up"
            style={{
              position: "relative",
              marginBottom: "24px",
              animationDelay: "40ms",
            }}
          >
            <input
              ref={inputRef}
              id="dashboard-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Quantum computing, Machine learning, Stoicism..."
              autoComplete="off"
              style={{
                width: "100%",
                padding: "18px 56px 18px 20px",
                borderRadius: "12px",
                fontSize: "15px",
                color: "var(--text-primary)",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 150ms ease, box-shadow 150ms ease",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--accent)";
                e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-soft)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            {/* Send button */}
            <button
              onClick={handleSubmit}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: query.trim() ? "var(--accent)" : "var(--border)",
                border: "none",
                cursor: query.trim() ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                transition: "background-color 150ms ease",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>

          {/* ── QUICK ACTIONS ─────────────────────── */}
          <div
            className="slide-up"
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              marginBottom: "48px",
              animationDelay: "80ms",
            }}
          >
            <QuickAction
              emoji="📄"
              label="Upload Syllabus"
              sub="Generate a roadmap from your PDF"
              onClick={() => router.push("/dashboard")}
            />
            <QuickAction
              emoji="🕸️"
              label="Explore Nexus"
              sub="Visual knowledge graph explorer"
              onClick={() => router.push("/nexus")}
            />
            <QuickAction
              emoji="📚"
              label="Smart Reader"
              sub="AI margin notes for any book"
              onClick={() => router.push("/reader")}
            />
          </div>

          {/* ── RECENT SESSIONS ───────────────────── */}
          {sessions.length > 0 && (
            <div className="slide-up" style={{ animationDelay: "120ms" }}>
              <h2
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--text-muted)",
                  marginBottom: "12px",
                }}
              >
                Recent Sessions
              </h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: "8px",
                }}
              >
                {sessions.map((s, i) => (
                  <SessionCard
                    key={i}
                    session={s}
                    onClick={() => {
                      const route = s.route || `/roadmap?topic=${encodeURIComponent(s.topic)}`;
                      router.push(route);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {sessions.length === 0 && (
            <p
              style={{
                textAlign: "center",
                fontSize: "13px",
                color: "var(--text-muted)",
                marginTop: "16px",
              }}
            >
              Your recent sessions will appear here once you start learning.
            </p>
          )}
        </div>
      </div>

      {/* ── CHAT OVERLAY (SLIDE UP) ──────────────── */}
      {showChatOverlay && (
        <div
          className="slide-up"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "var(--bg-primary)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "20px 24px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: 600, color: "var(--text-primary)" }}>
                Refining your path
              </h2>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                Just a few quick questions to personalize the experience.
              </p>
            </div>
            <button
              onClick={() => setShowChatOverlay(false)}
              style={{
                background: "var(--bg-card)",
                color: "var(--text-muted)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "8px 12px",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 500,
              }}
            >
              Close
            </button>
          </div>

          {/* Chat Interface */}
          <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
            <ConversationalUI
              context="dashboard"
              initialTopic={chatTopic}
              onComplete={handleChatComplete}
            />
          </div>
        </div>
      )}
    </>
  );
}
