"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// --- TYPES ---
export interface ConversationResult {
  topic: string;
  mode: "dojo" | "nexus";
  learningContext: {
    goal?: string;
    level?: string;
    timeAvailable?: string;
    preferredStyle?: string;
  };
}

export interface ConversationalUIProps {
  context: "onboarding" | "dashboard" | "nexus";
  onComplete: (result: ConversationResult) => void;
  initialTopic?: string; // Pre-seeded topic from dashboard
}

interface ConversationOption {
  label: string;
  value: string;
  emoji?: string;
}

interface Message {
  role: "user" | "ai";
  content: string;
  options?: ConversationOption[];
}

export default function ConversationalUI({ context, onComplete, initialTopic }: ConversationalUIProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputText, setInputText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Initial greeting or query
  useEffect(() => {
    const init = async () => {
      // If we are given an initial topic (e.g., from Dashboard), we can send it right away.
      if (initialTopic) {
        await handleUserSubmit(initialTopic);
        return;
      }

      // Otherwise, start with generic greeting.
      const initialMessage: Message = {
        role: "ai",
        content: "Hello! What brings you to Learning Dojo today?",
        options: [
          { label: "Learn something new", value: "Learn something new", emoji: "🌱" },
          { label: "Explore a topic", value: "Explore visually", emoji: "🕸️" },
          { label: "Upload syllabus", value: "Upload my syllabus", emoji: "📄" },
          { label: "Practice skills", value: "Practice skills", emoji: "🎯" },
          { label: "Custom", value: "Other", emoji: "✏️" }
        ],
      };
      setMessages([initialMessage]);
    };
    init();
  }, [initialTopic]); // Run once

  async function callAPI(newMessages: Message[]) {
    setIsLoading(true);
    try {
      const step = newMessages.filter((m) => m.role === "user").length;
      
      const payload = {
        messages: newMessages,
        context,
        step,
      };

      const res = await fetch("/api/conversation-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("API failed");
      
      const data = await res.json();
      
      if (data.isComplete && data.result) {
        // Store break preferences if provided
        if (data.result.breakPrefs) {
          try {
            localStorage.setItem("breakPrefs", JSON.stringify(data.result.breakPrefs));
          } catch (e) {
            console.warn("Failed to store breakPrefs:", e);
          }
        }
        onComplete(data.result);
        return; // Done
      }

      setMessages((prev) => [
        ...prev,
        { role: "ai", content: data.message, options: data.options },
      ]);
    } catch (e) {
      console.error(e);
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: "Oops, I encountered a tiny hiccup. Could you try explaining that one more time?" }
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  const handleUserSubmit = async (text: string) => {
    if (!text.trim() || isLoading) return;
    
    // Clear the options from the last message so they don't stay visible
    const newMessages = [...messages];
    if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === "ai") {
      newMessages[newMessages.length - 1].options = undefined;
    }

    const userMsg: Message = { role: "user", content: text };
    newMessages.push(userMsg);
    
    setMessages(newMessages);
    setInputText("");
    
    await callAPI(newMessages);
  };

  const currentStepCount = Math.min(4, Math.max(1, messages.filter(m => m.role === 'user').length + 1));

  return (
    <div className="flex flex-col h-full w-full max-w-xl mx-auto bg-[var(--bg-primary)] px-2">
      {/* Progress Dots */}
      <div className="flex items-center justify-center gap-2 py-4 fade-in">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: step <= currentStepCount ? "var(--accent)" : "var(--border)",
              transition: "background-color 300ms ease",
            }}
          />
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto pb-6 px-2" style={{ scrollBehavior: "smooth" }}>
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => {
            const isAI = msg.role === "ai";
            const isLast = i === messages.length - 1;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex flex-col mb-6 ${isAI ? "items-start" : "items-end"}`}
              >
                <div
                  style={{
                    maxWidth: "85%",
                    padding: "14px 18px",
                    fontSize: "15px",
                    lineHeight: 1.5,
                    color: isAI ? "var(--text-primary)" : "#fff",
                    backgroundColor: isAI ? "var(--bg-card)" : "var(--accent)",
                    border: isAI ? "1px solid var(--border)" : "none",
                    borderRadius: "20px",
                    borderTopLeftRadius: isAI ? "4px" : "20px",
                    borderTopRightRadius: isAI ? "20px" : "4px",
                  }}
                >
                  {msg.content}
                </div>
                
                {/* Options (only show on the very last AI message) */}
                {isAI && isLast && msg.options && msg.options.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex flex-wrap gap-2 mt-4"
                  >
                    {msg.options.map((opt, optIdx) => (
                      <button
                        key={optIdx}
                        onClick={() => handleUserSubmit(opt.value)}
                        className="scale-in"
                        style={{
                          animationDelay: `${optIdx * 50}ms`,
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "8px 16px",
                          fontSize: "14px",
                          fontWeight: 500,
                          color: "var(--text-secondary)",
                          backgroundColor: "transparent",
                          border: "1px solid var(--border)",
                          borderRadius: "999px",
                          cursor: "pointer",
                          transition: "all 150ms ease",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)";
                          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--accent-soft)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
                        }}
                      >
                        {opt.emoji && <span className="text-[16px]">{opt.emoji}</span>}
                        {opt.label}
                      </button>
                    ))}
                    {/* Always ensure custom option is available to focus input */}
                    {!msg.options.some(o => o.label.toLowerCase() === 'custom' || o.label.toLowerCase().includes('type')) && (
                      <button
                        onClick={() => inputRef.current?.focus()}
                        className="scale-in"
                        style={{
                          animationDelay: `${msg.options.length * 50}ms`,
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "8px 16px",
                          fontSize: "14px",
                          fontWeight: 500,
                          color: "var(--text-secondary)",
                          backgroundColor: "transparent",
                          border: "1px dashed var(--border)",
                          borderRadius: "999px",
                          cursor: "pointer",
                          transition: "all 150ms ease",
                        }}
                      >
                        <span className="text-[16px]">✏️</span> Type my own
                      </button>
                    )}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {isLoading && (
          <motion.div
             initial={{ opacity: 0 }} animate={{ opacity: 1 }}
             className="flex items-start mb-6"
          >
            <div
              style={{
                padding: "16px",
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "20px",
                borderTopLeftRadius: "4px",
              }}
              className="flex items-center gap-1.5"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </motion.div>
        )}
      </div>

      {/* Input Area */}
      <div className="py-4 mt-auto">
        <div style={{ position: "relative" }}>
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleUserSubmit(inputText);
            }}
            placeholder="Or type your answer..."
            disabled={isLoading}
            style={{
              width: "100%",
              padding: "16px 52px 16px 20px",
              fontSize: "15px",
              backgroundColor: "var(--bg-card)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              outline: "none",
              transition: "border-color 150ms ease",
              boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
          />
          <button
            onClick={() => handleUserSubmit(inputText)}
            disabled={!inputText.trim() || isLoading}
            style={{
              position: "absolute",
              right: "8px",
              top: "50%",
              transform: "translateY(-50%)",
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              backgroundColor: inputText.trim() ? "var(--accent)" : "transparent",
              color: inputText.trim() ? "#fff" : "var(--text-muted)",
              border: "none",
              cursor: inputText.trim() && !isLoading ? "pointer" : "default",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 150ms ease",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
