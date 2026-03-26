"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ConversationalUI, { ConversationResult } from "@/components/ConversationalUI";

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillTopic = searchParams.get("topic") || "";

  const handleComplete = (result: ConversationResult) => {
    // Save to learningContext and recent sessions
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
    <div style={{ height: "100%", padding: "24px 0" }}>
      <div className="text-center mb-6 slide-up">
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          {prefillTopic ? `Let's build a path for "${prefillTopic}"` : "Let's map out your journey."}
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Answer a few quick questions to personalize your experience.
        </p>
      </div>

      <div className="h-[calc(100vh-200px)] slide-up" style={{ animationDelay: "100ms" }}>
        <ConversationalUI
          context="onboarding"
          onComplete={handleComplete}
          initialTopic={prefillTopic}
        />
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="h-full bg-[var(--bg-primary)]" />}>
      <OnboardingContent />
    </Suspense>
  );
}
