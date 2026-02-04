"use client";
import { useState } from "react";
import { motion } from "framer-motion";

export interface OnboardingData {
  role: string;
  experience: string;
  topic: string;
}

interface OnboardingProps {
  onComplete: (data: OnboardingData) => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState("");
  const [experience, setExperience] = useState("");
  const [topic, setTopic] = useState("");

  const handleFinish = () => {
    if (topic.trim()) {
      onComplete({ role, experience, topic });
    }
  };

  return (
    <div className="relative z-50 w-full max-w-2xl text-center bg-gray-900 p-8 rounded-2xl border border-gray-800 shadow-2xl">
      
      {/* STEP 1: WHO ARE YOU? */}
      {step === 1 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <h2 className="text-4xl font-bold tracking-tight text-white">Hi! Who are you?</h2>
          <p className="text-gray-400">Help us tailor your learning path.</p>
          
          <div className="grid grid-cols-2 gap-4">
            {["Student", "Professional", "Hobbyist", "Founder"].map((r) => (
              <button
                key={r}
                onClick={() => { setRole(r); setStep(2); }}
                className={`p-6 rounded-xl text-lg font-medium transition-all duration-300 border ${role === r ? 'bg-teal-900/50 border-teal-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}
              >
                {r}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* STEP 2: EXPERIENCE LEVEL */}
      {step === 2 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <h2 className="text-4xl font-bold tracking-tight text-white">What&apos;s your vibe?</h2>
          <p className="text-gray-400">How deep do you want to go?</p>
          
          <div className="grid grid-cols-1 gap-4">
            {[
              { label: "Just Exploring", sub: "I want a quick overview." },
              { label: "Deep Dive", sub: "I want to master every detail." },
              { label: "Project Based", sub: "I want to build something NOW." },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => { setExperience(item.label); setStep(3); }}
                className="p-6 rounded-xl text-left border bg-gray-800 border-gray-700 hover:border-teal-500 hover:bg-gray-700 transition-all group"
              >
                <div className="text-xl font-bold text-white group-hover:text-teal-400">{item.label}</div>
                <div className="text-sm text-gray-500 mt-1">{item.sub}</div>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* STEP 3: THE TOPIC */}
      {step === 3 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <h2 className="text-4xl font-bold tracking-tight text-white">What is your mission?</h2>
          <div className="relative">
            <input
              type="text"
              placeholder="e.g. Learn React, Master Python..."
              className="w-full bg-transparent border-b-2 border-gray-700 text-3xl py-4 focus:outline-none focus:border-teal-500 text-center text-white transition-colors placeholder-gray-600"
              autoFocus
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleFinish()}
            />
          </div>
          
          <button
            onClick={handleFinish}
            disabled={!topic}
            className="mt-8 bg-teal-500 hover:bg-teal-400 text-black font-bold py-3 px-10 rounded-full transition-all transform hover:scale-105 disabled:opacity-50 disabled:scale-100"
          >
            Enter The Dojo →
          </button>
        </motion.div>
      )}
    </div>
  );
}
