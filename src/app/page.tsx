"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function LandingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [exploreInput, setExploreInput] = useState("");

  const [commitInput, setCommitInput] = useState("");
  const [commitStep, setCommitStep] = useState<0 | 1 | 2>(0);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedGoal, setSelectedGoal] = useState("");

  const [isUploading, setIsUploading] = useState(false);

  const handleExplore = () => {
    if (!exploreInput.trim()) return;
    router.push(`/nexus?topic=${encodeURIComponent(exploreInput.trim())}`);
  };

  const handleCommitContinue = () => {
    if (!commitInput.trim()) return;
    setCommitStep(1);
  };

  const handleRoleSelect = (value: string) => {
    setSelectedRole(value);
    setCommitStep(2);
  };

  const handleGoalSelect = (value: string) => {
    setSelectedGoal(value);
    router.push(
      `/roadmap?topic=${encodeURIComponent(commitInput.trim())}` +
        `&role=${encodeURIComponent(selectedRole)}` +
        `&experience=${encodeURIComponent(value)}`
    );
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", "syllabus");

      const res = await fetch("/api/upload-syllabus", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      localStorage.setItem("generatedCourse", JSON.stringify(data));

      router.push(
        `/roadmap?topic=${encodeURIComponent(data.courseTitle || "Uploaded Syllabus")}` +
          `&role=Student&experience=Deep Dive&fromSyllabus=true`
      );
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const pillBase = "px-4 py-2 rounded-full border text-sm transition-all";

  return (
    <main className="min-h-screen bg-black bg-[radial-gradient(ellipse_at_center,_#0f172a_0%,_#000_70%)] flex items-center justify-center p-6">
      <div className="w-full max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-8 backdrop-blur-sm flex flex-col gap-6">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="8" y1="31" x2="15" y2="22" stroke="#374151" strokeWidth="1.5" />
              <line x1="15" y1="22" x2="23" y2="10" stroke="#374151" strokeWidth="1.5" />
              <line x1="23" y1="10" x2="32" y2="14" stroke="#374151" strokeWidth="1.5" />
              <line x1="15" y1="22" x2="30" y2="30" stroke="#374151" strokeWidth="1.5" />
              <circle cx="8" cy="31" r="2.6" fill="#2dd4bf" />
              <circle cx="15" cy="22" r="2.6" fill="#2dd4bf" />
              <circle cx="23" cy="10" r="2.6" fill="#2dd4bf" />
              <circle cx="32" cy="14" r="2.6" fill="#2dd4bf" />
              <circle cx="30" cy="30" r="2.6" fill="#2dd4bf" />
            </svg>

            <div>
              <h2 className="text-2xl font-bold text-white">Start Exploring</h2>
              <p className="text-sm text-gray-400">You have a curiosity. Follow it anywhere.</p>
            </div>

            <input
              value={exploreInput}
              onChange={(e) => setExploreInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleExplore();
              }}
              placeholder="What are you curious about?"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 transition-colors"
            />

            <button
              onClick={handleExplore}
              className="w-full py-3 rounded-xl border border-teal-500 text-teal-400 hover:bg-teal-500/10 transition-all font-medium"
            >
              Open the Map →
            </button>
          </div>

          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-8 backdrop-blur-sm flex flex-col gap-6">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 28H24" stroke="#374151" strokeWidth="2" strokeDasharray="3 3" />
              <path d="M24 22L34 28L24 34" stroke="#2dd4bf" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>

            <div>
              <h2 className="text-2xl font-bold text-white">Start Learning</h2>
              <p className="text-sm text-gray-400">You have a goal. Get a structured path to it.</p>
            </div>

            {commitStep === 0 && (
              <>
                <input
                  value={commitInput}
                  onChange={(e) => setCommitInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCommitContinue();
                  }}
                  placeholder="What do you want to master?"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 transition-colors"
                />
                <button
                  onClick={handleCommitContinue}
                  className="w-full py-3 rounded-xl border border-teal-500 text-teal-400 hover:bg-teal-500/10 transition-all font-medium"
                >
                  Continue →
                </button>
              </>
            )}

            {commitStep === 1 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider">I am a...</p>
                <div className="grid grid-cols-2 gap-3">
                  {["Student", "Professional", "Self-taught", "Researcher"].map((role) => (
                    <button
                      key={role}
                      onClick={() => handleRoleSelect(role)}
                      className={`${pillBase} ${
                        selectedRole === role
                          ? "border-teal-500 bg-teal-500/10 text-teal-300"
                          : "border-gray-700 text-gray-400 hover:border-gray-500"
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {commitStep === 2 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider">I want to...</p>
                <div className="flex flex-wrap gap-3">
                  {["Understand it", "Build with it", "Ace an exam"].map((goal) => (
                    <button
                      key={goal}
                      onClick={() => handleGoalSelect(goal)}
                      className={`${pillBase} ${
                        selectedGoal === goal
                          ? "border-teal-500 bg-teal-500/10 text-teal-300"
                          : "border-gray-700 text-gray-400 hover:border-gray-500"
                      }`}
                    >
                      {goal}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>

        <div className="mt-8 text-center">
          {isUploading ? (
            <span className="text-gray-500 text-sm">Processing...</span>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-gray-600 hover:text-gray-400 text-sm transition-colors"
            >
              📋 Have a syllabus or textbook? Upload it
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFileUpload}
          />
        </div>
      </div>
    </main>
  );
}
